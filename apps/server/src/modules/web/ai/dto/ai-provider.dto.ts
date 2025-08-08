import { PaginationDto } from "@common/dto/pagination.dto";
import { isEnabled } from "@common/utils/is.util";
import { PartialType } from "@nestjs/mapped-types";
import { ModelType } from "@sdk/ai";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    isArray,
    IsBoolean,
    IsDefined,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
    ValidateIf,
} from "class-validator";

/**
 * AI供应商查询DTO
 *
 * 参考AI模型查询DTO的设计，继承PaginationDto统一参数接收方式
 */
export class QueryAiProviderDto extends PaginationDto {
    /**
     * 搜索关键词（供应商名称、标识符或描述）
     */
    @IsOptional()
    @IsString({ message: "搜索关键词必须是字符串" })
    name?: string;

    /**
     * 支持的模型类型
     */
    @IsOptional()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    @IsArray({ message: "支持的模型类型必须是数组" })
    @Type(() => String)
    @IsString({ each: true, message: "支持的模型类型必须是字符串数组" })
    supportedModelTypes?: ModelType[];
}
