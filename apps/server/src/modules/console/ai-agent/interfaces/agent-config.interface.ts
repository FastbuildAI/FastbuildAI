/**
 * 自动追问配置类型
 */
export interface AutoQuestionsConfig {
    enabled: boolean;
    customRuleEnabled: boolean;
    customRule?: string;
}

/**
 * 快捷指令配置类型
 */
export interface QuickCommandConfig {
    avatar: string;
    name: string;
    content: string;
    replyType: "custom" | "model";
    replyContent: string;
}

/**
 * 模型配置类型
 */
export interface ModelConfig {
    /** 模型ID */
    id: string;
    /** 模型参数配置 */
    options?: {
        /** 温度参数 */
        temperature?: number;
        /** 最大Token数 */
        maxTokens?: number;
        /** Top P参数 */
        topP?: number;
        /** 频率惩罚 */
        frequencyPenalty?: number;
        /** 存在惩罚 */
        presencePenalty?: number;
        /** 停止词 */
        stop?: string[];
        /** 其他自定义参数 */
        [key: string]: any;
    };
}

/**
 * 表单字段配置类型
 */
export interface FormFieldConfig {
    /** 字段名 */
    name: string;
    /** 字段标签 */
    label: string;
    /** 字段类型 */
    type: "text" | "textarea" | "select";
    /** 是否必填 */
    required?: boolean;
    /** 选项列表（仅当type为select时使用） */
    options?:
        | string[]
        | Array<{
              label: string;
              value: string;
          }>;
}

/**
 * Token使用统计类型
 */
export interface TokenUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    // 兼容其他格式
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

/**
 * 聊天消息类型
 */
export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

/**
 * 知识库检索块类型
 */
export interface RetrievalChunk {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
    fileName?: string;
    chunkIndex?: number;
    datasetId?: string;
    datasetName?: string;
}

/**
 * 智能体对话引用来源
 */
export interface AgentReferenceSources {
    datasetId: string;
    datasetName?: string;
    userContent: string;
    retrievalMode?: string;
    duration?: number;
    chunks: RetrievalChunk[];
}

/**
 * AI响应原始数据类型
 */
export interface AIRawResponse {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    usage?: TokenUsage;
    choices?: Array<{
        index?: number;
        message?: {
            role?: string;
            content?: string;
        };
        finish_reason?: string;
        delta?: {
            content?: string;
        };
    }>;
    // 添加索引签名以兼容各种AI服务的响应格式
    [key: string]: unknown;
}

/**
 * 消息元数据类型
 */
export interface MessageMetadata {
    /** 引用来源 */
    references?: AgentReferenceSources[];
    /** 对话上下文 */
    context?: ChatMessage[];
    /** 问题建议 */
    suggestions?: string[];
    /** 深度思考数据 */
    reasoning?: {
        content: string;
        startTime: number;
        endTime: number;
        duration: number;
    };
    /** 其他扩展数据 */
    [key: string]: unknown;
}
