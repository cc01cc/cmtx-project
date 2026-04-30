import { type InlineStyleTheme, renderMarkdownAsHtml } from "../../markdown/render-html.js";
import type { RenderResult } from "../../types.js";

const wechatTheme: InlineStyleTheme = {
    h1: "margin: 1.4em 0 0.8em; font-size: 1.55em; line-height: 1.4; font-weight: 700; color: #1f2328",
    h2: "margin: 1.3em 0 0.75em; font-size: 1.35em; line-height: 1.5; font-weight: 700; color: #1f2328",
    h3: "margin: 1.2em 0 0.7em; font-size: 1.15em; line-height: 1.5; font-weight: 700; color: #1f2328",
    h4: "margin: 1.1em 0 0.65em; font-size: 1.05em; line-height: 1.5; font-weight: 700; color: #1f2328",
    p: "margin: 0.9em 0; line-height: 1.75; color: #3f3f3f; text-align: justify",
    blockquote:
        "margin: 1em 0; padding: 0.75em 1em; color: #57606a; background: #f6f8fa; border-left: 4px solid #0969da; border-radius: 0 6px 6px 0",
    ul: "margin: 0.8em 0; padding-left: 1.4em; color: #3f3f3f; line-height: 1.75",
    ol: "margin: 0.8em 0; padding-left: 1.4em; color: #3f3f3f; line-height: 1.75",
    li: "margin: 0.35em 0",
    a: "color: #0969da; text-decoration: underline; word-break: break-all",
    strong: "font-weight: 700; color: #1f2328",
    em: "font-style: italic",
    hr: "margin: 1.5em 0; border: none; border-top: 1px solid #d0d7de",
    table: "display: table; width: 100%; margin: 1em 0; border-collapse: collapse; font-size: 0.95em; line-height: 1.6",
    thead: "background: #f6f8fa",
    th: "padding: 8px 10px; border: 1px solid #d0d7de; text-align: left; font-weight: 700; color: #1f2328",
    td: "padding: 8px 10px; border: 1px solid #d0d7de; color: #3f3f3f",
    img: "display: block; max-width: 100%; height: auto; margin: 1em auto; border-radius: 6px",
    pre: "margin: 1em 0; padding: 12px 16px; overflow-x: auto; background: #f6f8fa; border-radius: 8px; line-height: 1.6; font-size: 13px",
    code: "padding: 0.15em 0.35em; margin: 0 0.15em; font-size: 0.9em; font-family: Menlo, Consolas, monospace; background: #f6f8fa; border-radius: 4px",
    "pre code":
        "display: block; padding: 0; margin: 0; background: transparent; border-radius: 0; white-space: pre; font-size: inherit; font-family: Menlo, Consolas, monospace",
};

// TODO: 未来重构为 convert-md-to-html rule
//   设计：convert-md-to-html 规则接受一个主题配置文件参数
//   此规则将 markdown 渲染为 html（使用参数中的主题样式）
export function renderWechatMarkdown(markdown: string): RenderResult {
    const content = renderMarkdownAsHtml(markdown, wechatTheme);

    return {
        content,
        format: "html",
        platform: "wechat",
    };
}
