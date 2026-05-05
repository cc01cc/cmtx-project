import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type HastNode = {
    type?: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
};

export type InlineStyleTheme = Record<string, string>;

function appendStyle(properties: Record<string, unknown>, styleText: string): void {
    const previous = typeof properties.style === "string" ? properties.style.trim() : "";
    properties.style = previous ? `${previous}; ${styleText}` : styleText;
}

function getSelector(tagName: string, parentTagName?: string): string {
    if (parentTagName === "pre" && tagName === "code") {
        return "pre code";
    }

    return tagName;
}

function applyStyleToElement(
    node: HastNode,
    tagName: string,
    theme: InlineStyleTheme,
    parentTagName?: string,
): void {
    const styleText = theme[getSelector(tagName, parentTagName)];

    if (!styleText) {
        return;
    }

    node.properties ??= {};
    appendStyle(node.properties, styleText);
}

function cleanLinkProperties(node: HastNode, tagName: string): void {
    if (tagName !== "a" || !node.properties) {
        return;
    }

    node.properties.target = undefined;
    node.properties.rel = undefined;
}

function visitChildren(
    children: HastNode[] | undefined,
    theme: InlineStyleTheme,
    parentTagName?: string,
): void {
    if (!Array.isArray(children)) {
        return;
    }

    for (const child of children) {
        applyInlineStyles(child, theme, parentTagName);
    }
}

function applyInlineStyles(node: HastNode, theme: InlineStyleTheme, parentTagName?: string): void {
    if (node.type !== "element" || typeof node.tagName !== "string") {
        visitChildren(node.children, theme, parentTagName);
        return;
    }

    const tagName = node.tagName.toLowerCase();
    applyStyleToElement(node, tagName, theme, parentTagName);
    cleanLinkProperties(node, tagName);
    visitChildren(node.children, theme, tagName);
}

function inlineStylePlugin(theme: InlineStyleTheme) {
    return function transformer(tree: HastNode): void {
        applyInlineStyles(tree, theme);
    };
}

export function renderMarkdownAsHtml(markdown: string, theme: InlineStyleTheme): string {
    return String(
        unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(() => inlineStylePlugin(theme))
            .use(rehypeStringify, { allowDangerousHtml: true })
            .processSync(markdown),
    );
}
