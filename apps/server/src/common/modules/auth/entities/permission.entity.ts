import { AppEntity } from "@common/decorators/app-entity.decorator";
import { IsOptional } from "class-validator";
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * 权限类型枚举
 */
export enum PermissionType {
    /**
     * 系统接口权限
     */
    SYSTEM = "system",

    /**
     * 插件接口权限
     */
    PLUGIN = "plugin",
}

/**
 * 权限实体
 *
 * 定义系统中的权限
 */
@AppEntity({ name: "permissions", comment: "权限管理" })
export class Permission {
    /**
     * 权限ID
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 权限编码
     *
     * 例如: "system:user:list", "system:user:add"
     */
    @Column({ unique: true })
    code: string;

    /**
     * 权限名称
     */
    @Column()
    name: string;

    /**
     * 权限描述
     */
    @Column({ nullable: true })
    description: string;

    /**
     * 权限分组
     *
     * 用于在前端界面中对权限进行分类显示
     */
    @Column({ nullable: true })
    group: string;

    /**
     * 权限分组名称
     *
     * 用于在前端界面中对权限进行分类显示
     */
    @IsOptional()
    @Column({ nullable: true })
    groupName?: string;

    /**
     * API路径
     *
     * 关联的API路径，用于自动权限匹配
     */
    @Column({ nullable: true })
    apiPath: string;

    /**
     * HTTP方法
     *
     * 关联的HTTP方法，用于自动权限匹配
     */
    @Column({ nullable: true })
    method: string;

    /**
     * 创建时间
     */
    @CreateDateColumn({ type: "timestamp with time zone" })
    createdAt: Date;

    /**
     * 更新时间
     */
    @UpdateDateColumn({ type: "timestamp with time zone" })
    updatedAt: Date;

    /**
     * 权限类型
     *
     * 区分系统接口权限和插件接口权限
     */
    @Column({
        type: "enum",
        enum: PermissionType,
        default: PermissionType.SYSTEM,
    })
    type: PermissionType;

    /**
     * 插件包名
     *
     * 当权限类型为插件时，记录所属的插件包名
     */
    @Column({ nullable: true })
    pluginPackName: string;

    /**
     * 是否废弃
     *
     * 标记权限是否已经废弃，废弃的权限将不再在前端显示
     */
    @Column({ default: false })
    isDeprecated: boolean;
}
