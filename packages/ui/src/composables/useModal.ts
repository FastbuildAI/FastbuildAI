import ProModalUse from "@fastbuildai/ui/components/pro-modal-use.vue";
import type { Component } from "vue";

interface ModalOptions {
    /** 对话框类型，决定确认按钮的颜色 */
    color?: "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";
    /** 对话框标题 */
    title?: string;
    /** 对话框副标题 */
    description?: string;
    /** 对话框内容，可以是字符串或组件 */
    content?: string | Component;
    /** 是否显示确认按钮 */
    showConfirm?: boolean;
    /** 是否显示取消按钮 */
    showCancel?: boolean;
    /** 确认按钮文本 */
    confirmText?: string;
    /** 取消按钮文本 */
    cancelText?: string;
    /** 是否阻止点击外部关闭 */
    dismissible?: boolean;
    /** 自定义样式 */
    ui?: Record<string, string>;
    /** 内容区域的 ID，用于无障碍访问 */
    contentId?: string;
}

interface ModalResult {
    /** 用户是否点击了确认按钮 */
    confirm: boolean;
    /** 用户是否点击了取消按钮或关闭了对话框 */
    cancel: boolean;
}

/**
 * 模态框管理服务
 * 基于 Nuxt UI 的 overlay 系统封装，提供更简便的模态框管理方式
 */
export function useModal(options: ModalOptions = {}) {
    // 默认选项
    const defaultOptions: Required<ModalOptions> = {
        color: "primary",
        title: "温馨提示",
        description: " ",
        content: "",
        showConfirm: true,
        showCancel: true,
        confirmText: "确认",
        cancelText: "取消",
        dismissible: false,
        ui: { content: "!w-sm", },
        contentId: "",
    };

    // 合并选项
    const mergedOptions = { ...defaultOptions, ...options };
    console.log(mergedOptions);
    // 创建一个 overlay 实例
    const overlay = useOverlay();
    let resolveConfirm: (value: boolean) => void;
    let resolveCancel: (value: boolean) => void;

    const modal = overlay.create(ProModalUse, {
        props: {
            ...mergedOptions,
            confirm: () => {
                resolveConfirm(true);
            },
            cancel: () => {
                resolveCancel(true);
            },
        },
    });

    modal.open();

    return new Promise<ModalResult>((resolve) => {
        resolveConfirm = (value: boolean) => resolve({ confirm: value, cancel: false });
        resolveCancel = () => Promise.reject("点击取消");
    });
}

export default useModal;
