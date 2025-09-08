import { BaseController } from "@common/base/controllers/base.controller";
import { BooleanNumberType } from "@common/constants";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { BuildFileUrl } from "@common/decorators/file-url.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Playground } from "@common/decorators/playground.decorator";
import { HttpExceptionFactory } from "@common/exceptions/http-exception.factory";
import { UserPlayground } from "@common/interfaces/context.interface";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { DictService } from "@common/modules/dict/services/dict.service";
import { UUIDValidationPipe } from "@common/pipe/param-validate.pipe";
import { isEnabled } from "@common/utils/is.util";
import { LOGIN_TYPE } from "@fastbuildai/constants";
import { Body, Delete, Get, Inject, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { In } from "typeorm";

import { MenuService } from "../../menu/menu.service";
import { RoleService } from "../../role/role.service";
import { BatchUpdateUserDto } from "../dto/batch-update-user.dto";
import { CreateUserDto } from "../dto/create-user.dto";
import { BatchDeleteUserDto, DeleteUserDto } from "../dto/delete-user.dto";
import { LoginSettingsConfig } from "../dto/login-settings.dto";
import { QueryUserDto } from "../dto/query-user.dto";
import { UpdateUserBalanceDto, UpdateUserDto } from "../dto/update-user.dto";
import { UserService } from "../services/user.service";

/**
 * 用户管理控制器
 */
@ConsoleController("users", "用户管理")
export class UserController extends BaseController {
    /**
     * 构造函数
     *
     * @param userService 用户服务
     * @param menuService 菜单服务
     * @param rolePermissionService 角色权限服务
     * @param dictService 字典服务
     */
    constructor(
        private readonly userService: UserService,
        @Inject(MenuService)
        private readonly menuService: MenuService,
        @Inject(RolePermissionService)
        private readonly rolePermissionService: RolePermissionService,
        private readonly roleService: RoleService,
        private readonly dictService: DictService,
    ) {
        super();
    }

    /**
     * 获取当前用户信息、权限和菜单树
     *
     * @param user 当前登录用户
     * @returns 用户信息、权限码和菜单树
     */
    @Get("info")
    @BuildFileUrl(["**.avatar"])
    async getUserInfo(@Playground() user: UserPlayground) {
        // 获取用户信息（排除敏感字段）
        const userInfo = await this.userService.findOneById(user.id, {
            excludeFields: ["password"],
            relations: ["role"],
        });

        if (!userInfo) {
            throw HttpExceptionFactory.notFound("用户不存在");
        }

        // 获取用户的所有权限码
        const permissionCodes = await this.rolePermissionService.getUserPermissions(user.id);

        // 获取菜单树（根据用户权限筛选）
        const menuTree = await this.menuService.getMenuTreeByPermissions(
            userInfo.isRoot ? [] : permissionCodes,
        );

        return {
            user: {
                ...userInfo,
                permissions: userInfo.isRoot || permissionCodes.length > 0 ? 1 : 0,
            },
            permissions: permissionCodes,
            menus: menuTree,
        };
    }

    /**
     * 查询全部角色列表（不分页）
     *
     * @returns 全部角色列表
     */
    @Get("roles")
    @Permissions({
        code: "list",
        name: "查看角色",
        description: "查询全部角色列表",
    })
    async findAllRoles() {
        return this.roleService.findAll();
    }

    /**
     * 查询用户列表
     *
     * @param queryUserDto 查询用户DTO
     * @returns 用户列表和分页信息
     */
    @Get()
    @Permissions({
        code: "list",
        name: "查看用户列表",
        description: "分页查询用户列表",
    })
    @BuildFileUrl(["**.avatar"])
    async findAll(@Query() queryUserDto: QueryUserDto, @Playground() user: UserPlayground) {
        return await this.userService.list(queryUserDto, user);
    }

    /**
     * 更新用户
     *
     * @param id 用户ID
     * @param updateUserDto 更新用户DTO
     * @param currentUser 当前登录用户
     * @returns 更新后的用户
     *
     * 注意：更新成功后会清理该用户的角色与权限缓存，确保后续权限读取为最新。
     */
    @Patch(":id")
    @Permissions({
        code: "update",
        name: "更新用户",
        description: "更新用户信息",
    })
    @BuildFileUrl(["**.avatar"])
    async update(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
        @Playground() currentUser: UserPlayground,
    ) {
        const user = await this.userService.findOne({
            where: {
                id,
            },
        });

        if (!user) {
            throw HttpExceptionFactory.notFound("用户不存在");
        }

        let result;
        // 如果要修改的是超级管理员
        if (isEnabled(user.isRoot)) {
            // 只有超级管理员本人可以修改自己的信息
            if (currentUser.id !== id) {
                throw HttpExceptionFactory.unauthorized("暂无权限");
            }
            // 超级管理员可以修改自己的基本信息
            result = await this.userService.updateById(id, updateUserDto, {
                excludeFields: ["password"],
            });
        } else {
            result = await this.userService.updateById(id, updateUserDto, {
                excludeFields: ["password"],
            });
        }

        // 更新成功后清理该用户的权限相关缓存（忽略清理失败，不影响主流程）
        this.rolePermissionService
            .clearUserCache(id)
            .catch((e) => this.logger?.warn?.(`清理用户缓存失败: ${e.message}`));

        return result;
    }

    /**
     * 删除用户
     *
     * @param id 用户ID
     * @returns 是否成功
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除用户",
        description: "删除指定用户",
    })
    async remove(@Param() dto: DeleteUserDto) {
        const user = await this.userService.findOne({
            where: {
                id: dto.id,
            },
        });

        if (user) {
            if (isEnabled(user.isRoot)) {
                throw HttpExceptionFactory.unauthorized("暂无权限");
            } else {
                return {
                    success: await this.userService.delete(dto.id),
                };
            }
        } else {
            throw HttpExceptionFactory.notFound("用户不存在");
        }
    }

    /**
     * 批量删除用户
     *
     * @param ids 用户ID数组（UUID格式）
     * @returns 是否成功
     */
    @Post("batch-delete")
    @Permissions({
        code: "batch-delete",
        name: "删除用户",
        description: "批量删除用户",
    })
    async batchRemove(@Body() dto: BatchDeleteUserDto) {
        // 查询所有要删除的用户
        const users = await this.userService.findAll({
            where: {
                id: In(dto.ids),
            },
        });

        // 检查是否有超级管理员
        const rootUsers = users.filter((user) => isEnabled(user.isRoot));

        if (rootUsers.length > 0) {
            const rootUserIds = rootUsers.map((user) => user.id);
            throw HttpExceptionFactory.unauthorized(
                `超级管理员不可删除: ${rootUserIds.join(", ")}`,
            );
        }

        return {
            success: await this.userService.deleteMany(dto.ids),
        };
    }

    /**
     * 重置用户密码
     *
     * @param id 用户ID
     * @param password 新密码
     * @returns 是否成功
     */
    @Post("/reset-password/:id")
    @Permissions({
        code: "reset-password",
        name: "重置密码",
        description: "重置用户密码",
    })
    async resetPassword(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("password") password: string,
    ) {
        return await this.userService.resetPassword(id, password);
    }

    /**
     * 自动重置用户密码
     *
     * @param id 用户ID
     * @returns 重置后的新密码
     */
    @Post("/reset-password-auto/:id")
    @Permissions({
        code: "reset-password-auto",
        name: "自动重置密码",
        description: "自动生成随机密码并重置用户密码",
    })
    async resetPasswordAuto(@Param("id", UUIDValidationPipe) id: string) {
        // 生成随机密码
        const randomPassword = await this.userService.generateRandomPassword();

        // 重置用户密码
        await this.userService.resetPassword(id, randomPassword);

        // 返回生成的随机密码
        return {
            password: randomPassword,
        };
    }

    /**
     * 设置用户状态
     *
     * @param id 用户ID
     * @param status 状态（0: 禁用, 1: 启用）
     * @returns 更新后的用户
     */
    @Post("/status/:id")
    @Permissions({
        code: "update-status",
        name: "更新用户状态",
        description: "设置用户启用状态",
    })
    async setStatus(
        @Param("id", UUIDValidationPipe) id: string,
        @Body("status") status: BooleanNumberType,
    ) {
        return await this.userService.setUserStatus(id, status);
    }

    @Post("/change-balance/:id")
    @Permissions({
        code: "change-balance",
        name: "更新用户余额",
        description: "设置用户余额",
    })
    async changeBalance(
        @Param("id", UUIDValidationPipe) userId: string,
        @Body() dto: UpdateUserBalanceDto,
        @Playground() currentUser: UserPlayground,
    ) {
        return await this.userService.updateBalance(userId, dto, currentUser);
    }

    /**
     * 批量更新用户
     *
     * @param dto 批量更新用户DTO
     * @param currentUser 当前登录用户
     * @returns 更新结果
     */
    @Post("batch-update")
    @Permissions({
        code: "batch-update",
        name: "批量更新用户",
        description: "批量更新多个用户信息",
    })
    async batchUpdate(@Body() dto: BatchUpdateUserDto, @Playground() user: UserPlayground) {
        return await this.userService.batchUpdate(dto, user.id);
    }

    /**
     * 获取登录设置
     *
     * @returns 当前的登录设置配置
     */
    @Get("login-settings")
    @Permissions({
        code: "login-settings",
        name: "查看登录设置",
        description: "获取系统登录相关配置",
    })
    async getLoginSettings(): Promise<LoginSettingsConfig> {
        // 从字典服务获取登录设置配置
        const config = await this.dictService.get<LoginSettingsConfig>(
            "login_settings",
            this.getDefaultLoginSettings(),
            "auth",
        );

        return config;
    }

    /**
     * 设置登录设置
     *
     * @param config 登录设置配置
     * @returns 设置后的登录设置配置
     */
    @Post("login-settings")
    @Permissions({
        code: "set-login-settings",
        name: "设置登录设置",
        description: "设置系统登录相关配置",
    })
    async setLoginSettings(@Body() config: LoginSettingsConfig): Promise<LoginSettingsConfig> {
        // 验证配置的合理性
        this.validateLoginSettings(config);

        // 保存到字典服务
        await this.dictService.set("login_settings", config, {
            group: "auth",
            description: "系统登录设置配置",
        });

        return config;
    }

    /**
     * 创建用户
     *
     * @param createUserDto 创建用户DTO
     * @returns 创建的用户
     */
    @Post()
    @Permissions({
        code: "create",
        name: "创建用户",
        description: "创建新的用户账号",
    })
    @BuildFileUrl(["**.avatar"])
    async create(@Body() createUserDto: CreateUserDto) {
        return await this.userService.createUser(createUserDto);
    }

    /**
     * 查询单个用户
     *
     * @param id 用户ID
     * @returns 用户信息
     */
    @Get(":id")
    @Permissions({
        code: "detail",
        name: "查看用户详情",
        description: "根据ID查询用户信息",
    })
    @BuildFileUrl(["**.avatar"])
    async findOneById(@Param("id", UUIDValidationPipe) id: string) {
        const result = await this.userService.findOneById(id, {
            excludeFields: ["password", "openid"],
            relations: ["role"],
        });

        if (!result) {
            throw HttpExceptionFactory.notFound("用户不存在");
        }
        return result;
    }

    /**
     * 获取默认登录设置
     *
     * @returns 默认的登录设置配置
     */
    private getDefaultLoginSettings(): LoginSettingsConfig {
        return {
            allowedLoginMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.PHONE, LOGIN_TYPE.WECHAT],
            allowedRegisterMethods: [LOGIN_TYPE.ACCOUNT, LOGIN_TYPE.PHONE],
            defaultLoginMethod: LOGIN_TYPE.ACCOUNT,
            allowMultipleLogin: false,
            showPolicyAgreement: true,
        };
    }

    /**
     * 验证登录设置配置的合理性
     *
     * @param config 登录设置配置
     */
    private validateLoginSettings(config: LoginSettingsConfig): void {
        // 检查允许的登录方式不能为空
        if (!config.allowedLoginMethods || config.allowedLoginMethods.length === 0) {
            throw HttpExceptionFactory.paramError("至少需要启用一种登录方式");
        }

        // 检查默认登录方式必须在允许的登录方式中
        if (!config.allowedLoginMethods.includes(config.defaultLoginMethod)) {
            throw HttpExceptionFactory.paramError("默认登录方式必须在允许的登录方式列表中");
        }

        // 检查允许的注册方式不能为空
        if (!config.allowedRegisterMethods || config.allowedRegisterMethods.length === 0) {
            throw HttpExceptionFactory.paramError("至少需要启用一种注册方式");
        }

        // 检查登录方式和注册方式的值是否有效
        const validLoginTypes = Object.values(LOGIN_TYPE);

        for (const method of config.allowedLoginMethods) {
            if (!validLoginTypes.includes(method)) {
                throw HttpExceptionFactory.paramError(`无效的登录方式: ${method}`);
            }
        }

        for (const method of config.allowedRegisterMethods) {
            if (!validLoginTypes.includes(method)) {
                throw HttpExceptionFactory.paramError(`无效的注册方式: ${method}`);
            }
        }
    }
}
