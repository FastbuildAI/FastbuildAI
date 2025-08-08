import { BaseController } from "@common/base/controllers/base.controller";
import { BusinessCode } from "@common/constants/business-code.constant";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { BuildFileUrl } from "@common/decorators/file-url.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { HttpExceptionFactory } from "@common/exceptions/http-exception.factory";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import {
    CreateAiProviderDto,
    QueryAiProviderDto,
    UpdateAiProviderDto,
} from "./../dto/ai-provider.dto";
import { AiProviderService } from "./../services/ai-provider.service";

/**
 * AI供应商管理控制器（后台）
 *
 * 提供AI供应商的完整管理功能，包括CRUD操作和连接测试
 */
@ConsoleController("ai-providers", "AI供应商管理")
export class AiProviderController extends BaseController {
    constructor(private readonly aiProviderService: AiProviderService) {
        super();
    }

    /**
     * 创建AI供应商
     */
    @Post()
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "create",
        name: "创建AI供应商",
    })
    async create(@Body() dto: CreateAiProviderDto) {
        return await this.aiProviderService.createProvider(dto);
    }

    /**
     * 获取AI供应商列表（分页）
     */
    @Get()
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "list",
        name: "查看AI供应商",
    })
    async findAll(@Query() query: QueryAiProviderDto) {
        const queryOptions = {
            keyword: query.keyword,
            isActive: query.isActive,
            includeModels: query.includeModels || false,
        };

        return await this.aiProviderService.getProviderList(query, queryOptions, ["apiKey"]);
    }

    /**
     * 获取单个AI供应商详情
     */
    @Get(":id")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "detail",
        name: "查看AI供应商",
    })
    async findOne(@Param("id") id: string) {
        return await this.aiProviderService.getProviderDetail(id, []);
    }

    /**
     * 获取单个AI供应商详情（包含敏感信息）
     */
    @Get(":id/full")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "full-detail",
        name: "管理AI供应商",
    })
    async findOneFull(@Param("id") id: string) {
        return await this.aiProviderService.getProviderDetail(id);
    }

    /**
     * 更新AI供应商配置
     */
    @Patch(":id")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "update",
        name: "更新AI供应商",
    })
    async update(@Param("id") id: string, @Body() dto: UpdateAiProviderDto) {
        // 如果要启用供应商，检查是否已填写 apiKey
        if (dto.isActive === true) {
            const provider = await this.aiProviderService.findOneById(id);
            if (!provider) {
                throw HttpExceptionFactory.business("AI供应商不存在");
            }

            // 检查当前 apiKey 和更新的 apiKey
            const finalApiKey = dto.apiKey !== undefined ? dto.apiKey : provider.apiKey;
            if (!finalApiKey || finalApiKey.trim() === "") {
                throw HttpExceptionFactory.business("请先填写 API Key 后再启用供应商");
            }
        }

        return await this.aiProviderService.updateProvider(id, dto);
    }

    /**
     * 删除AI供应商
     */
    @Delete(":id")
    @Permissions({
        code: "delete",
        name: "删除AI供应商",
    })
    async remove(@Param("id") id: string) {
        // 检查是否为内置供应商
        const provider = await this.aiProviderService.findOneById(id);
        if (!provider) {
            throw HttpExceptionFactory.business("AI供应商不存在");
        }

        if (provider.isBuiltIn) {
            throw HttpExceptionFactory.business(
                "系统内置供应商不允许删除",
                BusinessCode.OPERATION_NOT_ALLOWED,
            );
        }

        await this.aiProviderService.deleteProvider(id);
        return { message: "AI供应商删除成功" };
    }

    /**
     * 批量删除AI供应商
     */
    @Delete()
    @Permissions({
        code: "batch-delete",
        name: "删除AI供应商",
    })
    async removeMany(@Body("ids") ids: string[]) {
        // 批量检查是否包含内置供应商
        const providers = await Promise.all(
            ids.map((id) => this.aiProviderService.findOneById(id)),
        );

        const builtInProviders = providers.filter((provider) => provider?.isBuiltIn);
        if (builtInProviders.length > 0) {
            const builtInNames = builtInProviders.map((p) => p.name).join("、");
            throw HttpExceptionFactory.business(
                `以下系统内置供应商不允许删除：${builtInNames}`,
                BusinessCode.OPERATION_NOT_ALLOWED,
            );
        }

        // 过滤掉不存在的供应商 ID
        const validIds = providers
            .map((provider, index) => (provider ? ids[index] : null))
            .filter((id) => id !== null);

        if (validIds.length === 0) {
            throw HttpExceptionFactory.business("没有找到可删除的AI供应商");
        }

        const deletePromises = validIds.map((id) => this.aiProviderService.deleteProvider(id));
        await Promise.all(deletePromises);
        return {
            message: `成功删除 ${validIds.length} 个AI供应商`,
            deleted: validIds.length,
        };
    }

    /**
     * 获取所有启用的供应商
     */
    @Get("active/all")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "active-all",
        name: "查看AI供应商",
    })
    async getActiveProviders() {
        return await this.aiProviderService.getActiveProviders(["apiKey"]);
    }

    /**
     * 根据供应商标识获取供应商
     */
    @Get("by-code/:provider")
    @BuildFileUrl(["**.iconUrl"])
    @Permissions({
        code: "by-code",
        name: "查看AI供应商",
    })
    async getProviderByCode(@Param("provider") provider: string) {
        const result = await this.aiProviderService.getProviderByCode(provider, ["apiKey"]);
        if (!result) {
            return { message: "供应商不存在" };
        }
        return result;
    }

    /**
     * 启用/禁用供应商
     */
    @Patch(":id/toggle-active")
    @Permissions({
        code: "toggle-active",
        name: "更新AI供应商",
    })
    async toggleActive(@Param("id") id: string, @Body("isActive") isActive: boolean) {
        // 如果要启用供应商，检查是否已填写 apiKey
        if (isActive === true) {
            const provider = await this.aiProviderService.findOneById(id);
            if (!provider) {
                throw HttpExceptionFactory.business("AI供应商不存在");
            }

            if (!provider.apiKey || provider.apiKey.trim() === "") {
                throw HttpExceptionFactory.business("请先填写 API Key 后再启用供应商");
            }
        }

        return await this.aiProviderService.updateProvider(
            id,
            { isActive },
            {
                excludeFields: ["apiKey"],
            },
        );
    }
}
