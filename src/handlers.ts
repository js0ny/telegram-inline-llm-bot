import { InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import type { InputRichMessage } from "grammy/types";

import { isAllowedUser } from "./auth";
import { model, openaiClient, systemPrompt } from "./config";
import { storeQuery, takeQuery } from "./query-store";
import { escapeHtml, stripRichMarkup } from "./utils";

const RICH_MESSAGE_LIMIT = 32768;
const TRUNCATION_SUFFIX = "\n\n…(已截断)";

function richMarkdown(markdown: string): InputRichMessage {
    return { markdown };
}

function questionPrefix(query: string): string {
    return `<p>❓ <strong>问题：</strong> ${escapeHtml(query)}</p>`;
}

function questionRichMessage(query: string, bodyMarkdown: string): InputRichMessage {
    return richMarkdown(`${questionPrefix(query)}\n\n${bodyMarkdown}`);
}

function fitRichMessageBody(query: string, bodyMarkdown: string): string {
    const prefixLength = questionPrefix(query).length + 2;
    const budget = RICH_MESSAGE_LIMIT - prefixLength - TRUNCATION_SUFFIX.length;

    if (budget <= 0) {
        return TRUNCATION_SUFFIX.trimStart();
    }

    return bodyMarkdown.length > budget
        ? bodyMarkdown.slice(0, budget) + TRUNCATION_SUFFIX
        : bodyMarkdown;
}

async function editRichMessage(ctx: any, richMessage: InputRichMessage) {
    if (ctx.callbackQuery.inline_message_id) {
        return ctx.api.editMessageTextInline(
            ctx.callbackQuery.inline_message_id,
            richMessage,
        );
    }

    if (ctx.callbackQuery.message) {
        return ctx.editMessageText(richMessage);
    }
}

async function editPlainText(ctx: any, query: string, body: string) {
    const text = `❓ 问题：${query}\n\n${body}`;

    if (ctx.callbackQuery.inline_message_id) {
        return ctx.api.editMessageTextInline(ctx.callbackQuery.inline_message_id, text);
    }

    if (ctx.callbackQuery.message) {
        return ctx.editMessageText(text);
    }
}

export async function handleStart(ctx: any) {
    console.log(`[start] user=${ctx.from?.id ?? "unknown"} chat=${ctx.chat.id}`);
    return ctx.reply(
        "你好！我是一个 Inline LLM Bot。\n" +
            "在任意聊天中输入 @<bot_username> <你的问题>，" +
            "选择结果后点击「获取回答」按钮即可。",
    );
}

export async function handleInlineQuery(ctx: any) {
    const query = ctx.inlineQuery.query.trim();

    if (!isAllowedUser(ctx.from.id)) {
        return ctx.answerInlineQuery([], {
            cache_time: 60,
            is_personal: true,
            button: {
                text: "你不在白名单中",
                start_parameter: "not_allowed",
            },
        });
    }

    if (!query) {
        return ctx.answerInlineQuery([]);
    }

    console.log(`[inline_query] user=${ctx.from.id} query="${query.slice(0, 80)}"`);

    const queryId = storeQuery(query);
    const keyboard = new InlineKeyboard().text("✨ 获取回答", `ask:${queryId}`);

    const result = InlineQueryResultBuilder.article(queryId, "向 LLM 提问", {
        description: query,
        reply_markup: keyboard,
    }).rich(questionRichMessage(query, "⏳ 点击下方按钮获取回答"));

    return ctx.answerInlineQuery([result], {
        cache_time: 0,
        is_personal: true,
    });
}

export async function handleCallbackQuery(ctx: any) {
    const data = ctx.callbackQuery.data;

    if (!isAllowedUser(ctx.from.id)) {
        return ctx.answerCallbackQuery({
            text: "你不在白名单中",
            show_alert: true,
        });
    }

    if (!data.startsWith("ask:")) {
        return ctx.answerCallbackQuery({ text: "未知操作" });
    }

    const queryId = data.slice(4);
    const query = takeQuery(queryId);

    if (!query) {
        return ctx.answerCallbackQuery({
            text: "该请求已过期，请重新发起提问",
            show_alert: true,
        });
    }

    console.log(`[callback_query] user=${ctx.from.id} query="${query.slice(0, 80)}"`);
    await ctx.answerCallbackQuery({ text: "正在请求 LLM…" });

    try {
        await editRichMessage(ctx, questionRichMessage(query, "⏳ 正在思考中…"));
    } catch {
    }

    try {
        const chatCompletion = await openaiClient.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query },
            ],
        });

        const answer =
            chatCompletion.choices?.[0]?.message?.content?.trim() ??
            "❌ LLM 未返回有效内容。";

        console.log(`[llm_response] user=${ctx.from.id} length=${answer.length}`);

        const bodyMarkdown = fitRichMessageBody(query, answer);
        const richMessage = questionRichMessage(query, bodyMarkdown);

        try {
            await editRichMessage(ctx, richMessage);
        } catch (editErr) {
            console.error("[callback_query] Rich Markdown 编辑失败，回退纯文本:", editErr);
            await editPlainText(ctx, query, stripRichMarkup(bodyMarkdown));
        }
    } catch (err) {
        console.error("[callback_query] 请求 LLM 或编辑消息失败:", err);

        try {
            await editRichMessage(ctx, questionRichMessage(query, "❌ 请求失败，请稍后再试。"));
        } catch (editErr) {
            console.error("[callback_query] 编辑错误消息也失败:", editErr);
        }
    }
}
