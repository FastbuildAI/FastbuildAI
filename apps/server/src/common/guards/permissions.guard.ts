import { BusinessCode } from "@common/constants/business-code.constant";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { ApiGroupItem } from "@modules/console/permission/permission.service";
import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { DECORATOR_KEYS } from "../constants/decorators-key.constant";
import { PermissionOptions } from "../decorators";
import { HttpExceptionFactory } from "../exceptions/http-exception.factory";
import { getContextPlayground, getOverrideMetadata } from "../utils/helper.util";
import { isEnabled } from "../utils/is.util";

/**
 * 权限守卫
 *
 * 验证用户是否具有访问特定路由所需的权限
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);

    constructor(
        private reflector: Reflector,
        private rolePermissionService: RolePermissionService,
    ) {}

    /**
     * 验证用户是否具有所需权限
     *
     * @param context 执行上下文
     * @returns 是否允许访问
     */
    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 获取路由所需的权限
        const systemPermissionsMetaData = getOverrideMetadata<PermissionOptions[]>(
            this.reflector,
            DECORATOR_KEYS.PERMISSIONS_KEY,
            context,
        );

        const permissionGroupMetaData = getOverrideMetadata<ApiGroupItem>(
            this.reflector,
            DECORATOR_KEYS.PERMISSION_GROUP_KEY,
            context,
        );

        const pluginPermissionsMetaData = getOverrideMetadata<PermissionOptions[]>(
            this.reflector,
            DECORATOR_KEYS.PLUGIN_PERMISSIONS_KEY,
            context,
        );

        const permissionsMetaData = [
            ...(systemPermissionsMetaData || []),
            ...(pluginPermissionsMetaData || []),
        ];

        // 如果没有设置权限要求，则允许访问
        if (!permissionsMetaData || permissionsMetaData.length === 0) {
            return true;
        }

        const requiredPermissions: string[] = permissionsMetaData.map(
            (item) => `${permissionGroupMetaData.code}:${item.code}`,
        );

        const { request, user } = getContextPlayground(context);

        // 确保用户已认证
        if (!user) {
            this.logger.warn(
                `尝试访问需要特定权限的路由，但用户未认证: ${request.method} ${request.url}`,
            );
            throw HttpExceptionFactory.unauthorized("未授权访问");
        }

        if (isEnabled(user.isRoot)) {
            return true;
        }

        // 从数据库中动态查询用户权限（并使用缓存提高性能）
        const hasPermission = await this.rolePermissionService.checkUserHasPermissions(
            user.id,
            requiredPermissions,
        );

        if (!hasPermission) {
            this.logger.warn(
                `用户 ${user.username} (ID: ${user.id}) 尝试访问需要权限 [${requiredPermissions.join(", ")}] 的路由，但没有足够权限`,
            );
            throw HttpExceptionFactory.forbidden("权限不足", BusinessCode.PERMISSION_DENIED);
        }

        return true;
    }
}
