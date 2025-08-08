import { UserTerminal, UserTerminalType } from "@common/constants/status-codes.constant";
import { AppEntity } from "@common/decorators/app-entity.decorator";
import { User } from "@common/modules/auth/entities/user.entity";
import { PayConfigType } from "@modules/console/system/inerface/payconfig.constant";
import {
    Column,
    CreateDateColumn,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";

/**
 * 充值订单
 */
@AppEntity({ name: "recharge_order", comment: "充值订单" })
export class RechargeOrder {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 订单号
     */
    @Column({
        type: "varchar",
        comment: "订单号",
    })
    @Index()
    orderNo: string;

    @Column({
        type: "varchar",
        length: 128,
        comment: "第三方平台交易流水号",
        nullable: true,
    })
    transactionId: string;
    /**
     * 用户ID
     */
    @Column({
        // type: "uuid",
        comment: "用户ID",
    })
    @Index()
    userId: string;

    /**
     * 订单来源终端
     *
     * 1: PC, 2: H5, 3: 小程序, 4: APP
     */
    @Column({ type: "int", default: UserTerminal.PC })
    terminal: UserTerminalType;
    /**
     * 充值id
     */
    @Column({
        // type: "uuid",
        comment: "充值id",
    })
    @Index()
    rechargeId: string;

    @Column({
        type: "jsonb",
        comment: "充值快照",
    }) // 存储 JSON 数据，允许为空
    rechargeSnap: Record<string, any>;

    @Column({
        type: "int",
        comment: "支付类型",
    })
    payType: PayConfigType;

    @Column({
        type: "integer",
        comment: "充值的数量",
    })
    power: number;

    @Column({
        type: "integer",
        comment: "赠送的数量",
    })
    givePower: number;

    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "订单总价",
    })
    totalAmount: number;

    @Column({
        type: "decimal",
        precision: 10,
        scale: 2,
        comment: "实付金额",
    })
    orderAmount: number;

    @Column({
        type: "int",
        default: 0,
        comment: "支付状态",
    })
    payStatus: number;

    @Column({
        type: "timestamp with time zone",
        comment: "支付时间",
        nullable: true,
    })
    payTime?: Date;

    @Column({
        type: "int",
        default: 0,
        comment: "退款状态",
    })
    refundStatus: number;

    @Column({
        type: "timestamp with time zone",
        nullable: true,
        comment: "退款时间",
    })
    refundTime?: Date;

    @CreateDateColumn({
        type: "timestamp with time zone",
        comment: "创建时间",
    })
    createdAt: Date;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: User;
}
