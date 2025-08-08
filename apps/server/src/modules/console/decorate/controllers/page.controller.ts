import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Get, Param, Post } from "@nestjs/common";

import { LayoutConfigDto } from "../dto/layout.dto";
import { PageService } from "../services/page.service";

@ConsoleController("decorate-page", "布局配置")
export class PageController {
    constructor(private readonly pageService: PageService) {}

    /**
     * 根据类型获取布局配置
     * @param type 布局类型 (如: web)
     * @returns 布局配置
     */
    @Get("layout/:type")
    @Permissions({
        code: "get-layout",
        name: "获取布局配置",
        description: "根据类型获取布局配置",
    })
    async getLayoutByType(@Param("type") type: string) {
        const result = await this.pageService.findOne({
            where: { name: type },
        });

        if (!result) {
            // 如果不存在，返回默认配置
            return {
                data: { layout: "layout-1", menus: [] },
            };
        }

        // 直接返回 data 字段
        return {
            id: result.id,
            data: result.data || { layout: "layout-1", menus: [] },
        };
    }

    /**
     * 保存布局配置
     * @param type 布局类型 (如: web)
     * @param data 布局数据
     * @returns 保存结果
     */
    @Post("layout/:type")
    @Permissions({
        code: "save-layout",
        name: "保存布局配置",
        description: "保存布局配置",
    })
    async saveLayout(@Param("type") type: string, @Body() data: LayoutConfigDto) {
        // 先查找是否已存在该类型的配置
        const existing = await this.pageService.findOne({
            where: { name: type },
        });

        if (existing) {
            // 如果存在，更新配置
            const updated = await this.pageService.updateById(existing.id, {
                data: data,
            });
            return {
                id: updated.id,
                data: updated.data,
            };
        } else {
            // 如果不存在，创建新配置
            const newLayout = await this.pageService.create({
                name: type,
                data: data,
            });

            return {
                id: newLayout.id,
                data: newLayout.data,
            };
        }
    }
}
