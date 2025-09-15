/**
 * 余额变动来源常量
 */
export const ACCOUNT_LOG_SOURCE = {
    RECHARGE: 1,
    SYSTEM: 2,
    CHAT: 3,
    AGENT_CHAT: 4,
    PLUGIN: 5,
} as const;

/**
 * 余额变动来源类型
 */
export type ACCOUNT_LOG_SOURCE_VALUE = (typeof ACCOUNT_LOG_SOURCE)[keyof typeof ACCOUNT_LOG_SOURCE];

/**
 * 余额变动枚举
 */
export enum ACCOUNT_LOG_TYPE {
    /**
     * 充值订单增加余额的变动
     */
    RECHARGE_INC = Number(`${ACCOUNT_LOG_SOURCE.RECHARGE}00`),
    RECHARGE_GIVE_INC = Number(`${ACCOUNT_LOG_SOURCE.RECHARGE}01`),
    RECHARGE_DEC = Number(`${ACCOUNT_LOG_SOURCE.RECHARGE}02`),
    /**
     * 系统增减算力
     */
    SYSTEM_MANUAL_INC = Number(`${ACCOUNT_LOG_SOURCE.SYSTEM}00`),
    SYSTEM_MANUAL_DEC = Number(`${ACCOUNT_LOG_SOURCE.SYSTEM}01`),
    /**
     * 对话增减算力
     */
    CHAT_DEC = Number(`${ACCOUNT_LOG_SOURCE.CHAT}00`),
    /**
     * 智能体对话增减算力
     */
    AGENT_CHAT_DEC = Number(`${ACCOUNT_LOG_SOURCE.AGENT_CHAT}00`),
    AGENT_GUEST_CHAT_DEC = Number(`${ACCOUNT_LOG_SOURCE.AGENT_CHAT}01`),
    /**
     * 插件增减算力
     */
    PLUGIN_DEC = Number(`${ACCOUNT_LOG_SOURCE.PLUGIN}00`),
}
export type ACCOUNT_LOG_TYPE_VALUE = (typeof ACCOUNT_LOG_TYPE)[keyof typeof ACCOUNT_LOG_TYPE];
export enum ACTION {
    DEC = 0,
    INC = 1,
}
export type ACTION_VALUE = (typeof ACTION)[keyof typeof ACTION];

/**
 * 余额变动描述
 */
export const ACCOUNT_LOG_TYPE_DESCRIPTION = {
    [ACCOUNT_LOG_TYPE.RECHARGE_INC]: "用户充值",
    [ACCOUNT_LOG_TYPE.RECHARGE_GIVE_INC]: "用户充值赠送",
    [ACCOUNT_LOG_TYPE.RECHARGE_DEC]: "用户充值退款",
    [ACCOUNT_LOG_TYPE.SYSTEM_MANUAL_INC]: "系统手动增加算力",
    [ACCOUNT_LOG_TYPE.SYSTEM_MANUAL_DEC]: "系统手动减扣算力",
    [ACCOUNT_LOG_TYPE.CHAT_DEC]: "基本对话",
    [ACCOUNT_LOG_TYPE.AGENT_CHAT_DEC]: "智能体对话",
    [ACCOUNT_LOG_TYPE.AGENT_GUEST_CHAT_DEC]: "链接分享智能体对话",
    [ACCOUNT_LOG_TYPE.PLUGIN_DEC]: "插件消耗",
} as const;
