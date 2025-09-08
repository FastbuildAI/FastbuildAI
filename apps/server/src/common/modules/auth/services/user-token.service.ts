import { BaseService } from "@common/base/services/base.service";
import { UserTerminalType } from "@common/constants/status-codes.constant";
import { HttpExceptionFactory } from "@common/exceptions/http-exception.factory";
import { LoginUserPlayground } from "@common/interfaces/context.interface";
import { DictService } from "@common/modules/dict/services/dict.service";
import { CacheService } from "@core/cache/cache.service";
import { RedisService } from "@core/redis/redis.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";

import { UserToken } from "../entities/user-token.entity";

/**
 * 用户令牌服务
 *
 * 管理用户的登录令牌，支持多端登录控制和令牌失效管理
 */
@Injectable()
export class UserTokenService extends BaseService<UserToken> {
    /**
     * 令牌配置键
     */
    private readonly TOKEN_CONFIG_KEY = "token";

    /**
     * 令牌缓存前缀
     */
    private readonly TOKEN_CACHE_PREFIX = "auth:token:";

    /**
     * 令牌缓存时间（秒）
     * 默认5分钟，避免频繁查询数据库
     */
    private readonly TOKEN_CACHE_TTL = 300;

    constructor(
        @InjectRepository(UserToken)
        private readonly userTokenRepository: Repository<UserToken>,
        private readonly jwtService: JwtService,
        private readonly dictService: DictService,
        private readonly cacheService: CacheService,
        private readonly redisService: RedisService,
    ) {
        super(userTokenRepository);
    }

    /**
     * 创建用户令牌
     *
     * @param userId 用户ID
     * @param payload 令牌载荷
     * @param terminal 登录终端
     * @param ipAddress IP地址
     * @param userAgent 用户代理
     * @returns 创建的令牌信息
     */
    async createToken(
        userId: string,
        payload: LoginUserPlayground,
        terminal: UserTerminalType,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<{ token: string; expiresAt: Date }> {
        // 获取令牌配置
        const tokenConfig = await this.getTokenConfig();

        // 获取登录设置配置
        const loginSettings = await this.getLoginSettings();

        // 如果不允许多处登录，则撤销该用户在同一终端的所有其他令牌
        if (!loginSettings.allowMultipleLogin) {
            await this.revokeTokensByTerminal(userId, terminal);
        }

        // 生成JWT令牌
        const token = this.jwtService.sign(payload, {
            expiresIn: tokenConfig.expiresIn,
        });

        // 计算过期时间
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenConfig.expiresIn);

        // 创建令牌记录
        await this.create({
            userId,
            token,
            expiresAt,
            terminal,
            ipAddress,
            userAgent,
            lastActiveAt: new Date(),
            isRevoked: false,
        });

        return { token, expiresAt };
    }

    /**
     * 验证令牌
     *
     * 使用多级缓存策略，减少数据库压力：
     * 1. 先检查内存缓存
     * 2. 如果内存缓存中没有，再检查Redis缓存
     * 3. 如果两级缓存都没有，才查询数据库
     *
     * @param token JWT令牌
     * @returns 验证结果
     */
    async validateToken(
        token: string,
    ): Promise<{ isValid: boolean; payload?: any; error?: string }> {
        try {
            const cacheKey = `${this.TOKEN_CACHE_PREFIX}${token}`;

            const cachedResult = await this.cacheService.get<{
                isValid: boolean;
                payload?: any;
                error?: string;
            }>(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            const redisResult = await this.redisService.get<string>(cacheKey);
            if (redisResult) {
                const parsedResult = JSON.parse(redisResult);

                // 同时更新内存缓存
                await this.cacheService.set(cacheKey, parsedResult, this.TOKEN_CACHE_TTL);

                return parsedResult;
            }

            const tokenRecord = await this.findOne({
                where: { token },
            });

            // 如果令牌不存在
            if (!tokenRecord) {
                const result = { isValid: false, error: "令牌不存在" };
                await this.cacheTokenResult(cacheKey, result);
                return result;
            }

            // 如果令牌已被撤销
            if (tokenRecord.isRevoked) {
                const result = { isValid: false, error: "令牌已被撤销" };
                await this.cacheTokenResult(cacheKey, result);
                return result;
            }

            // 如果令牌已过期
            if (new Date() > tokenRecord.expiresAt) {
                const result = { isValid: false, error: "令牌已过期" };
                await this.cacheTokenResult(cacheKey, result);
                return result;
            }

            // 解析令牌
            const payload = this.jwtService.verify(token);

            // 更新最后活跃时间（异步执行，不阻塞响应）
            this.updateById(tokenRecord.id, {
                lastActiveAt: new Date(),
            }).catch((err) => {
                this.logger.warn(`更新令牌最后活跃时间失败: ${err.message}`);
            });

            // 缓存有效结果
            const result = { isValid: true, payload };
            await this.cacheTokenResult(cacheKey, result);

            return result;
        } catch (error) {
            this.logger.warn(`令牌验证失败: ${error.message}`);
            return { isValid: false, error: error.message };
        }
    }

    /**
     * 缓存令牌验证结果
     *
     * @param cacheKey 缓存键
     * @param result 验证结果
     */
    private async cacheTokenResult(
        cacheKey: string,
        result: { isValid: boolean; payload?: any; error?: string },
    ): Promise<void> {
        try {
            // 计算缓存过期时间
            // 如果令牌无效，缓存时间短一些，避免错误结果缓存过长
            const ttl = result.isValid ? this.TOKEN_CACHE_TTL : 60; // 无效令牌只缓存一分钟

            // 先更新内存缓存（快速访问）
            await this.cacheService.set(cacheKey, result, ttl);

            // 再更新Redis缓存（跨实例共享）
            await this.redisService.set(cacheKey, JSON.stringify(result), ttl);
        } catch (error) {
            this.logger.warn(`缓存令牌验证结果失败: ${error.message}`);
        }
    }

    /**
     * 撤销令牌
     *
     * @param token JWT令牌
     * @returns 是否成功撤销
     */
    async revokeToken(token: string): Promise<boolean> {
        try {
            const tokenRecord = await this.findOne({
                where: { token },
            });

            if (!tokenRecord) {
                return false;
            }

            await this.updateById(tokenRecord.id, {
                isRevoked: true,
            });

            // 清除缓存
            const cacheKey = `${this.TOKEN_CACHE_PREFIX}${token}`;
            await this.cacheService.del(cacheKey);
            await this.redisService.del(cacheKey);

            return true;
        } catch (error) {
            this.logger.error(`撤销令牌失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 撤销用户的所有令牌
     *
     * @param userId 用户ID
     * @returns 撤销的令牌数量
     */
    async revokeAllTokens(userId: string): Promise<number> {
        try {
            // 先查找要撤销的令牌，以便清理缓存
            const tokensToRevoke = await this.userTokenRepository.find({
                where: { userId, isRevoked: false },
            });

            // 更新数据库中的令牌状态
            const result = await this.userTokenRepository.update(
                { userId, isRevoked: false },
                { isRevoked: true },
            );

            // 清理被撤销令牌的缓存
            for (const tokenRecord of tokensToRevoke) {
                const cacheKey = `${this.TOKEN_CACHE_PREFIX}${tokenRecord.token}`;
                await this.cacheService.del(cacheKey);
                await this.redisService.del(cacheKey);
            }

            return result.affected || 0;
        } catch (error) {
            this.logger.error(`撤销用户所有令牌失败: ${error.message}`);
            return 0;
        }
    }

    /**
     * 撤销用户在特定终端的所有令牌
     *
     * @param userId 用户ID
     * @param terminal 终端类型
     * @returns 撤销的令牌数量
     */
    async revokeTokensByTerminal(userId: string, terminal: UserTerminalType): Promise<number> {
        try {
            // 先查找要撤销的令牌，以便清理缓存
            const tokensToRevoke = await this.userTokenRepository.find({
                where: { userId, terminal, isRevoked: false },
            });

            // 更新数据库中的令牌状态
            const result = await this.userTokenRepository.update(
                { userId, terminal, isRevoked: false },
                { isRevoked: true },
            );

            // 清理被撤销令牌的缓存
            for (const tokenRecord of tokensToRevoke) {
                const cacheKey = `${this.TOKEN_CACHE_PREFIX}${tokenRecord.token}`;
                await this.cacheService.del(cacheKey);
                await this.redisService.del(cacheKey);
            }

            return result.affected || 0;
        } catch (error) {
            this.logger.error(`撤销用户终端令牌失败: ${error.message}`);
            return 0;
        }
    }

    /**
     * 清理过期令牌
     *
     * @returns 清理的令牌数量
     */
    async cleanExpiredTokens(): Promise<number> {
        try {
            const result = await this.userTokenRepository.delete({
                expiresAt: LessThan(new Date()),
            });

            return result.affected || 0;
        } catch (error) {
            this.logger.error(`清理过期令牌失败: ${error.message}`);
            return 0;
        }
    }

    /**
     * 获取令牌配置
     *
     * @returns 令牌配置
     */
    private async getTokenConfig(): Promise<{ expiresIn: number }> {
        try {
            // 首先尝试从字典服务获取配置
            const config = await this.dictService.get<{ expiresIn: number }>(
                this.TOKEN_CONFIG_KEY,
                null, // 不设置默认值，如果没有找到会返回null
                "auth", // 指定分组为 auth
            );

            // 如果在字典服务中找到配置，则使用该配置
            if (config) {
                return config;
            }

            // 否则从环境变量中读取
            const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1d";

            // 将时间字符串转换为秒数
            const expiresIn = this.parseTimeToSeconds(jwtExpiresIn);

            return { expiresIn };
        } catch (error) {
            this.logger.warn(`获取令牌配置失败，使用默认配置: ${error.message}`);
            return { expiresIn: 86400 }; // 默认1天
        }
    }

    /**
     * 将时间字符串解析为秒数
     * 支持的格式：
     * - 纯数字：直接作为秒数
     * - 带单位：如 1d (1天)、2h (2小时)、30m (30分钟)、60s (60秒)
     *
     * @param time 时间字符串
     * @returns 秒数
     */
    private parseTimeToSeconds(time: string): number {
        if (!time) {
            return 86400; // 默认1天
        }

        // 如果是纯数字，直接返回
        if (/^\d+$/.test(time)) {
            return parseInt(time, 10);
        }

        const value = parseInt(time, 10);
        const unit = time.slice(String(value).length);

        switch (unit) {
            case "d": // 天
                return value * 24 * 60 * 60;
            case "h": // 小时
                return value * 60 * 60;
            case "m": // 分钟
                return value * 60;
            case "s": // 秒
                return value;
            default:
                this.logger.warn(`无法解析时间单位: ${unit}，使用默认值`);
                return 86400; // 默认1天
        }
    }

    /**
     * 获取登录设置配置
     *
     * @returns 登录设置配置
     */
    private async getLoginSettings(): Promise<{ allowMultipleLogin: boolean }> {
        try {
            const config = await this.dictService.get<{ allowMultipleLogin: boolean }>(
                "login_settings",
                { allowMultipleLogin: false }, // 默认不允许多处登录
                "auth",
            );

            return config;
        } catch (error) {
            this.logger.warn(`获取登录设置配置失败，使用默认配置: ${error.message}`);
            return { allowMultipleLogin: false }; // 默认不允许多处登录
        }
    }
}
