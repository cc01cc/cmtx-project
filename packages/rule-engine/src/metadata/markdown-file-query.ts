import type { ListOptions, MarkdownMetadata, QueryFilter } from "../types.js";
import { MarkdownMetadataExtractor } from "./markdown-metadata-extractor.js";

/**
 * 文档查询器
 * 提供文档的查询和检索功能
 *
 * @public
 */
export class MarkdownFileQuery {
    private documentManager: MarkdownMetadataExtractor;
    private basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath;
        this.documentManager = new MarkdownMetadataExtractor();
    }

    /**
     * 列出所有文档
     * @param options - 列出选项
     * @returns 文档列表
     */
    async list(options: ListOptions = {}): Promise<MarkdownMetadata[]> {
        const { sortBy = "date", descending = true } = options;

        const documents = await this.documentManager.extractFromDirectory(this.basePath);

        // 排序
        const sorted = this.sortDocuments(documents, sortBy, descending);

        return sorted;
    }

    /**
     * 按条件查询文档
     * @param filter - 查询条件
     * @returns 匹配的文档列表
     */
    async findBy(filter: QueryFilter): Promise<MarkdownMetadata[]> {
        const allDocuments = await this.list();
        return allDocuments.filter((doc) => this.matchesFilter(doc, filter));
    }

    /**
     * 按 ID 查找文档
     * @param id - 文档 ID
     * @returns 文档元数据或 null
     */
    async findById(id: string): Promise<MarkdownMetadata | null> {
        const documents = await this.findBy({ id });
        return documents.length > 0 ? documents[0] : null;
    }

    /**
     * 按标题查找文档
     * @param title - 文档标题
     * @returns 文档元数据或 null
     */
    async findByTitle(title: string): Promise<MarkdownMetadata | null> {
        const documents = await this.findBy({ title });
        return documents.length > 0 ? documents[0] : null;
    }

    /**
     * 获取标签列表
     * @returns 所有标签
     */
    async getTags(): Promise<string[]> {
        const documents = await this.list();
        const tags = new Set<string>();

        documents.forEach((doc) => {
            if (Array.isArray(doc.tags)) {
                doc.tags.forEach((tag) => tags.add(tag));
            }
        });

        return Array.from(tags).sort();
    }

    /**
     * 获取分类列表
     * @returns 所有分类
     */
    async getCategories(): Promise<string[]> {
        const documents = await this.list();
        const categories = new Set<string>();

        documents.forEach((doc) => {
            if (Array.isArray(doc.categories)) {
                doc.categories.forEach((cat) => categories.add(cat));
            }
        });

        return Array.from(categories).sort();
    }

    /**
     * 检查文档是否匹配过滤条件
     *
     * @param document - 文档元数据
     * @param filter - 过滤条件
     * @returns 是否匹配
     */
    private matchesFilter(document: MarkdownMetadata, filter: QueryFilter): boolean {
        return (
            this.checkIdMatch(document, filter.id) &&
            this.checkTitleMatch(document, filter.title) &&
            this.checkAuthorMatch(document, filter.author) &&
            this.checkTagMatch(document, filter.tag) &&
            this.checkCategoryMatch(document, filter.category) &&
            this.checkDateRangeMatch(document, filter.dateRange) &&
            this.checkSearchTextMatch(document, filter.searchText)
        );
    }

    /**
     * 检查 ID 匹配
     */
    private checkIdMatch(document: MarkdownMetadata, targetId?: string): boolean {
        if (!targetId) return true;
        return document.id === targetId;
    }

    /**
     * 检查标题匹配
     */
    private checkTitleMatch(document: MarkdownMetadata, targetTitle?: string): boolean {
        if (!targetTitle) return true;
        return document.title === targetTitle;
    }

    /**
     * 检查作者匹配
     */
    private checkAuthorMatch(document: MarkdownMetadata, targetAuthor?: string): boolean {
        if (!targetAuthor) return true;
        return document.author === targetAuthor;
    }

    /**
     * 检查标签匹配
     */
    private checkTagMatch(document: MarkdownMetadata, targetTag?: string): boolean {
        if (!targetTag) return true;
        if (!Array.isArray(document.tags)) return false;
        return document.tags.includes(targetTag);
    }

    /**
     * 检查分类匹配
     */
    private checkCategoryMatch(document: MarkdownMetadata, targetCategory?: string): boolean {
        if (!targetCategory) return true;
        if (!Array.isArray(document.categories)) return false;
        return document.categories.includes(targetCategory);
    }

    /**
     * 检查日期范围匹配
     */
    private checkDateRangeMatch(document: MarkdownMetadata, dateRange?: [string, string]): boolean {
        if (!dateRange || !document.date) return true;
        const docDate = new Date(document.date);
        const [startDate, endDate] = dateRange.map((d) => new Date(d));
        return docDate >= startDate && docDate <= endDate;
    }

    /**
     * 检查文本搜索匹配
     */
    private checkSearchTextMatch(document: MarkdownMetadata, searchText?: string): boolean {
        if (!searchText) return true;
        const normalizedSearch = searchText.toLowerCase();
        const searchableText = [
            document.title,
            document.author,
            ...(document.tags || []),
            ...(document.categories || []),
        ]
            .join(" ")
            .toLowerCase();
        return searchableText.includes(normalizedSearch);
    }

    /**
     * 对文档进行排序
     *
     * @param documents - 文档列表
     * @param field - 排序字段
     * @param descending - 是否降序
     * @returns 排序后的文档列表
     */
    private sortDocuments(
        documents: MarkdownMetadata[],
        field: string,
        descending: boolean,
    ): MarkdownMetadata[] {
        const comparator = this.createComparator(field, descending);
        return [...documents].sort(comparator);
    }

    /**
     * 创建比较器
     *
     * @param field - 排序字段
     * @param descending - 是否降序
     * @returns 比较器函数
     */
    private createComparator(
        field: string,
        descending: boolean,
    ): (a: MarkdownMetadata, b: MarkdownMetadata) => number {
        const comparator: (a: MarkdownMetadata, b: MarkdownMetadata) => number = (() => {
            switch (field) {
                case "date":
                    return (a, b) => {
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateA - dateB;
                    };
                case "title":
                    return (a, b) => (a.title || "").localeCompare(b.title || "", "zh-Hans-CN");
                case "id":
                    return (a, b) => (a.id || "").localeCompare(b.id || "", "zh-Hans-CN");
                default:
                    return (a, b) => {
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateA - dateB;
                    };
            }
        })();

        return descending ? (a, b) => comparator(b, a) : comparator;
    }
}
