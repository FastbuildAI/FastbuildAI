<script lang="ts" setup>
import { ProPaginaction, useMessage, useModal, usePaging, usePollingTask } from "@fastbuildai/ui";
import type { DropdownMenuItem, TableColumn, TableRow } from "@nuxt/ui";
import { type Row } from "@tanstack/table-core";
import { useDebounceFn } from "@vueuse/core";
import { h, onMounted, reactive, resolveComponent, watch } from "vue";
import { useRouter } from "vue-router";

import type { Dataset, DatasetDocument, QueryDocumentParams } from "@/models/ai-datasets";
import { apiGetDocumentList } from "@/services/console/ai-datasets";

import { useDocumentActions } from "../useDatasets";

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UIcon = resolveComponent("UIcon");
const UInput = resolveComponent("UInput");
const TimeDisplay = resolveComponent("TimeDisplay");

// 路由实例
const router = useRouter();
const { t } = useI18n();
const { hasAccessByCodes } = useAccessControl();

const datasets = inject<Ref<Dataset>>("datasets");

const { deleteDocument, renameDocument, retryDocument, toggleDocumentEnabled } =
    useDocumentActions();

const toast = useMessage();
const { params: URLQueryParams } = useRoute();
const datasetId = computed(() => (URLQueryParams as Record<string, string>).id);
const datasetIdSafe = computed<string>(() => String(datasetId.value || ""));

// 表格实例 Refs
const table = useTemplateRef("table");

// 列表查询参数
const searchForm = reactive<QueryDocumentParams>({
    keyword: "",
    fileType: "",
    datasetId: datasetId.value,
});

// 列ID到中文名称的映射
const columnLabels = computed(() => ({
    select: t("console-common.select"),
    fileName: t("console-ai-datasets.documents.table.fileName"),
    fileSize: t("console-ai-datasets.documents.table.fileSize"),
    status: t("console-common.status"),
    progress: t("console-ai-datasets.documents.table.progress"),
    enabled: t("console-common.status"),
    characterCount: t("console-ai-datasets.documents.table.characterCount"),
    chunkCount: t("console-ai-datasets.documents.table.chunkCount"),
    createdAt: t("console-ai-datasets.documents.table.createdAt"),
    actions: t("console-common.operation"),
}));

// 分页查询文档
const { paging, getLists } = usePaging<DatasetDocument>({
    fetchFun: apiGetDocumentList,
    params: searchForm,
});

// 使用封装的轮询函数
const { start: startPolling, clear: stopPolling } = usePollingTask(
    async (stopFn) => {
        console.log("文档列表轮询执行中...");
        await getLists();

        if (!paging.needPolling) {
            stopFn();
        }
    },
    {
        interval: 1000,
    },
);

// 监听轮询状态
watch(
    () => paging.needPolling,
    (needPolling) => {
        if (needPolling) {
            startPolling();
        } else {
            stopPolling();
        }
    },
    { immediate: true },
);

// 状态映射
const statusMap = {
    processing: { label: t("console-common.processing"), color: "warning" as const },
    completed: { label: t("console-common.completed"), color: "success" as const },
    failed: { label: t("console-common.failed"), color: "error" as const },
    pending: { label: t("console-common.pending"), color: "neutral" as const },
    error: { label: t("console-ai-datasets.documents.error"), color: "error" as const },
} as const;

// 文件类型图标映射
const fileTypeIcons = {
    pdf: "i-lucide-file-text",
    doc: "i-lucide-file-text",
    docx: "i-lucide-file-text",
    txt: "i-lucide-file-text",
    md: "i-lucide-file-text",
    csv: "i-lucide-file-spreadsheet",
    xlsx: "i-lucide-file-spreadsheet",
    xls: "i-lucide-file-spreadsheet",
    default: "i-lucide-file",
};

// 定义表格列
const columns: TableColumn<DatasetDocument>[] = [
    {
        accessorKey: "fileName",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.fileName}`),
        cell: ({ row }) => {
            return h("div", { class: "flex items-center gap-3" }, [
                h(UIcon, {
                    name:
                        fileTypeIcons[row.original.fileType as keyof typeof fileTypeIcons] ||
                        fileTypeIcons.default,
                    class: "text-primary size-5",
                }),
                h("div", { class: "flex-1 grid" }, [
                    h(
                        "p",
                        { class: "font-medium text-highlighted truncate" },
                        row.original.fileName,
                    ),
                ]),
            ]);
        },
    },
    {
        accessorKey: "fileSize",
        header: () => h("p", { class: "" }, `${columnLabels.value.fileSize}`),
        cell: ({ row }) => {
            const fileSize = row.getValue("fileSize") as number;
            return h("span", { class: "text-sm" }, formatFileSize(fileSize));
        },
    },
    {
        accessorKey: "enabled",
        header: () => h("p", { class: "" }, `${columnLabels.value.enabled}`),
        cell: ({ row }) => {
            const enabled = row.getValue("enabled") as boolean;
            const statusInfo = enabled
                ? { label: t("console-common.enabled"), color: "success" as const }
                : { label: t("console-common.disabled"), color: "error" as const };
            return h(
                UBadge,
                { color: statusInfo.color, variant: "subtle" },
                () => statusInfo.label,
            );
        },
    },
    {
        accessorKey: "characterCount",
        header: () =>
            h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.characterCount}`),
        cell: ({ row }) => {
            const characterCount = row.original.characterCount || 0;

            return h(
                "span",
                { class: "text-sm text-primary" },
                `${formatCompactNumber(characterCount)}`,
            );
        },
    },
    {
        accessorKey: "chunkCount",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.chunkCount}`),
        cell: ({ row }) => {
            const chunkCount = row.getValue("chunkCount") as number;
            return h(UBadge, { color: "primary", variant: "subtle" }, () => chunkCount.toString());
        },
    },
    {
        accessorKey: "status",
        header: () => h("p", { class: "" }, `${columnLabels.value.status}`),
        cell: ({ row }) => {
            const status = row.getValue("status") as keyof typeof statusMap;
            const statusInfo = statusMap[status];
            // 如果失败则显示错误信息
            if (status === "failed") {
                return h(
                    resolveComponent("UTooltip"),
                    {
                        text: row.original?.error,
                        delayDuration: 0,
                    },
                    {
                        default: () =>
                            h(
                                UBadge,
                                { color: statusInfo.color, variant: "subtle" },
                                () => statusInfo.label,
                            ),
                    },
                );
            }
            return h(
                UBadge,
                { color: statusInfo.color, variant: "subtle" },
                () => statusInfo.label,
            );
        },
    },
    {
        accessorKey: "progress",
        header: () => h("p", { class: "whitespace-nowrap" }, `${columnLabels.value.progress}`),
        cell: ({ row }) => {
            const progress = row.original.progress || 0;

            return h("span", { class: "text-sm text-primary" }, `${progress}%`);
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();

            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: columnLabels.value.createdAt,
                icon: isSorted
                    ? isSorted === "asc"
                        ? "i-lucide-arrow-up-narrow-wide"
                        : "i-lucide-arrow-down-wide-narrow"
                    : "i-lucide-arrow-up-down",
                class: "-mx-2.5",
                onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
            });
        },
        cell: ({ row }) => {
            const createdAt = row.getValue("createdAt") as string;
            return h(TimeDisplay, {
                datetime: createdAt,
                mode: "datetime",
            });
        },
    },
    {
        id: "actions",
        header: () => h("p", { class: "" }, `${columnLabels.value.actions}`),
        size: 80,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            return h(UDropdownMenu, { items: getRowItems(row) }, () => {
                return h(
                    UButton,
                    {
                        icon: "i-lucide-ellipsis-vertical",
                        color: "neutral",
                        variant: "ghost",
                        class: "ml-auto",
                    },
                    () => "",
                );
            });
        },
    },
];

// 操作栏
function getRowItems(row: Row<DatasetDocument>) {
    const document = row.original;
    const isEnabled = document.enabled;

    return [
        hasAccessByCodes(["ai-datasets-segments:list"])
            ? {
                  label: t("console-ai-datasets.documents.viewSegments"),
                  icon: "i-lucide-list",
                  onClick: () => {
                      router.push(
                          useRoutePath(
                              "ai-datasets-segments:list",
                              { id: datasetIdSafe.value },
                              { documentId: document.id },
                          ),
                      );
                  },
              }
            : null,
        hasAccessByCodes(["ai-datasets-documents:rename"])
            ? {
                  label: t("console-ai-datasets.documents.renameModal.title"),
                  icon: "i-lucide-pen-line",
                  onClick: () => handleRename(document),
              }
            : null,
        hasAccessByCodes(["ai-datasets-documents:set-enabled"])
            ? {
                  label: isEnabled
                      ? t("console-ai-datasets.documents.disable.title")
                      : t("console-ai-datasets.documents.enable.title"),
                  icon: isEnabled ? "i-lucide-eye-off" : "i-lucide-eye",
                  color: isEnabled ? "warning" : "primary",
                  onClick: () => toggleDocumentEnabled(document.id, !isEnabled, getLists),
              }
            : null,
        hasAccessByCodes(["ai-datasets-documents:retry"])
            ? {
                  label: t("console-ai-datasets.documents.retry.title"),
                  icon: "i-lucide-rotate-ccw",
                  color: "warning",
                  onClick: () => retryDocument(document.id, getLists),
              }
            : null,
        hasAccessByCodes(["ai-datasets-documents:delete"])
            ? {
                  label: t("console-common.delete"),
                  icon: "i-lucide-trash",
                  color: "error",
                  onSelect: () => handleDelete(document.id),
              }
            : null,
    ].filter(Boolean) as DropdownMenuItem[];
}

// 监听搜索条件变化，自动重新获取数据
watch(
    () => [searchForm.keyword, searchForm.fileType],
    () => {
        useDebounceFn(() => {
            paging.page = 1;
            getLists();
        }, 300)();
    },
    { deep: true },
);

// 删除文档
const handleDelete = async (id: string) => {
    await deleteDocument(id, getLists);
};

// 处理添加文件
const handleAddFile = () => {
    router.push(useRoutePath("ai-datasets-documents:create", { id: datasetIdSafe.value }));
};

// 重命名文档
const handleRename = async (document: DatasetDocument) => {
    await renameDocument(document, getLists);
};

// 点击表格行跳转分段
const handleRowClick = (row: TableRow<DatasetDocument>) => {
    if (!hasAccessByCodes(["ai-datasets-segments:list"])) return;
    router.push(
        useRoutePath(
            "ai-datasets-segments:list",
            { id: datasetIdSafe.value },
            { documentId: row.original.id },
        ),
    );
};

// 初始化
onMounted(() => getLists());

definePageMeta({ layout: "full-screen" });
</script>

<template>
    <div class="flex h-full w-full flex-col px-6">
        <div class="flex flex-col justify-center gap-1 pt-4">
            <h1 class="!text-lg font-bold">{{ t("console-ai-datasets.documents.title") }}</h1>
            <p class="text-muted-foreground text-sm">
                {{ t("console-ai-datasets.documents.description") }}
            </p>
        </div>

        <!-- 搜索区域 -->
        <div class="flex w-full justify-between gap-4 py-6 backdrop-blur-sm">
            <UInput
                v-model="searchForm.keyword"
                :placeholder="t('console-ai-datasets.documents.searchPlaceholder')"
                class="w-80"
                icon="i-lucide-search"
            />

            <div class="flex items-center gap-2 md:ml-auto">
                <UDropdownMenu
                    :items="
                        table?.tableApi
                            ?.getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => ({
                                label:
                                    columnLabels[column.id as keyof typeof columnLabels] ||
                                    column.columnDef.header,
                                type: 'checkbox' as const,
                                checked: column.getIsVisible(),
                                onUpdateChecked(checked: boolean) {
                                    table?.tableApi
                                        ?.getColumn(column.id)
                                        ?.toggleVisibility(!!checked);
                                },
                                onSelect(e?: Event) {
                                    e?.preventDefault();
                                },
                            }))
                    "
                    :content="{ align: 'end' }"
                >
                    <UButton
                        :label="t('console-common.showColumns')"
                        color="neutral"
                        variant="outline"
                        trailing-icon="i-lucide-chevron-down"
                    />
                </UDropdownMenu>

                <AccessControl :codes="['ai-datasets-documents:create']">
                    <UButton
                        :label="t('console-ai-datasets.documents.addFile')"
                        leading-icon="i-lucide-plus"
                        color="primary"
                        @click="handleAddFile"
                    />
                </AccessControl>
            </div>
        </div>

        <div class="flex h-full flex-col">
            <div class="table h-full">
                <!-- 表格区域 -->
                <UTable
                    :loading="paging.loading"
                    :data="paging.items"
                    :columns="columns"
                    class="h-full shrink-0"
                    ref="table"
                    selectable
                    sticky
                    :ui="{
                        base: 'table-fixed border-separate border-spacing-0',
                        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                        tbody: '[&>tr]:last:[&>td]:border-b-0',
                        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                        td: 'border-b border-default ',
                        tr: 'hover:bg-elevated/50',
                    }"
                    :onSelect="handleRowClick"
                />
            </div>
        </div>

        <!-- 分页 -->
        <div class="flex items-center justify-end gap-3 py-4">
            <div class="flex items-center gap-1.5">
                <ProPaginaction
                    v-model:page="paging.page"
                    v-model:size="paging.pageSize"
                    :total="paging.total"
                    @change="getLists"
                />
            </div>
        </div>
    </div>
</template>
