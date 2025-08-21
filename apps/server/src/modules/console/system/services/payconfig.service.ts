import { BaseService } from "@common/base/services/base.service";
import { HttpExceptionFactory } from "@common/exceptions/http-exception.factory";
import { PAY_EVENTS } from "@common/modules/pay/constants/pay-events.contant";
import { Payconfig } from "@modules/console/system/entities/payconfig.entity";
import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { UpdatePayconfigDto } from "../dto/update-payconfig";
import {
    BooleanNumber,
    type BooleanNumberType,
    type PayConfigType,
} from "../inerface/payconfig.constant";

@Injectable()
export class PayconfigService extends BaseService<Payconfig> {
    constructor(
        @InjectRepository(Payconfig) repository: Repository<Payconfig>,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super(repository);
    }
    /**
     * 获取支付配置列表
     *
     * @returns 支付配置列表(不分页)
     */
    async list(): Promise<Payconfig[]> {
        const queryBuilder = this.repository.createQueryBuilder("payconfig");
        queryBuilder
            .select([
                "payconfig.id",
                "payconfig.name",
                "payconfig.payType",
                "payconfig.isEnable",
                "payconfig.logo",
                "payconfig.sort",
                "payconfig.isDefault",
            ])
            .orderBy("sort", "DESC");
        return await queryBuilder.getMany();
    }

    /**
     * 根据id更改支付配置状态
     *
     * @param id 支付配置id
     * @param isEnable 是否启用
     * @returns 更新后的支付配置
     */
    async updateStatus(id: string, isEnable: BooleanNumberType): Promise<Partial<Payconfig>> {
        const payconfig = await this.repository.findOne({ where: { id } });
        if (!payconfig) {
            throw HttpExceptionFactory.notFound("支付配置不存在");
        }
        return await this.updateById(id, { isEnable });
    }
    /**
     * 根据id更新支付配置
     *
     * @param id 支付配置id
     * @param dto 更新后的支付配置
     * @returns 更新后的支付配置
     */
    async updatePayconfig(id: string, dto: UpdatePayconfigDto): Promise<Partial<Payconfig>> {
        const payconfig = await this.repository.findOne({ where: { id } });
        if (!payconfig) {
            throw HttpExceptionFactory.notFound("支付配置不存在");
        }
        Object.assign(payconfig, dto);
        const result = await this.repository.save(payconfig);

        this.eventEmitter.emit(PAY_EVENTS.REFRESH, payconfig.payType);

        return result;
    }

    /**
     * 根据支付方式获取支付配置
     *
     * @param payType 支付方式
     * @returns 支付配置
     */
    async getPayconfig(payType: PayConfigType) {
        const payconfig = await this.repository.findOne({
            where: { isEnable: BooleanNumber.YES, payType },
        });
        if (!payconfig) {
            throw HttpExceptionFactory.notFound("支付配置不存在");
        }
        return payconfig;
    }
}
