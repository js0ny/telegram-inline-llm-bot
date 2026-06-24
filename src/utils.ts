export function escapeHtml(text: string): string {
    return text
        .replace(/\n{3,}/g, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function stripRichMarkup(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, (block) =>
            block
                .replace(/^```[^\n]*\n?/, "")
                .replace(/\n?```$/, ""),
        )
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|li|h[1-6]|blockquote|tr|details|summary)>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/^\s{0,3}>\s?/gm, "")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+[.)]\s+/gm, "")
        .replace(/(^|[^\\])([*_~`|=])/g, "$1")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
