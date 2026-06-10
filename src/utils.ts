export function escapeHtml(text: string): string {
    return text
        .replace(/\n{3,}/g, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
