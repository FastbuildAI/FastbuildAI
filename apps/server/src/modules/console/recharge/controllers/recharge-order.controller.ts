import { BaseController } from "@common/base/controllers/base.controller";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { BuildFileUrl } from "@common/decorators/file-url.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Get, Param, Post, Query } from "@nestjs/common";

import { QueryRechargeOrderDto } from "../dto/query-recharge-order.dto";
import { RechargeOrderService } from "../services/recharge-order.service";

@ConsoleController("recharge-order", "充值订单")
export class RechargeOrderController extends BaseController {
    constructor(private readonly rechargeOrderService: RechargeOrderService) {
        super();
    }
    @Get()
    @Permissions({
        code: "list",
        name: "充值订单列表",
        description: "充值订单列表",
    })
    @BuildFileUrl(["**.avatar"])
    async lists(@Query() queryRechargeOrderDto: QueryRechargeOrderDto) {
        return await this.rechargeOrderService.lists(queryRechargeOrderDto);
    }

    @Get(":id")
    @Permissions({
        code: "detail",
        name: "充值订单详情",
        description: "充值订单详情",
    })
    @BuildFileUrl(["**.avatar"])
    async detail(@Param("id") id: string) {
        return await this.rechargeOrderService.detail(id);
    }

    @Post("refund")
    @Permissions({
        code: "refund",
        name: "充值订单退款",
        description: "充值订单退款",
    })
    async refund(@Body("id") id: string) {
        await this.rechargeOrderService.refund(id);
        return { message: "退款成功" };
    }
}
