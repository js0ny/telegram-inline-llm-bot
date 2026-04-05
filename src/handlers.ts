import { InlineKeyboard, InlineQueryResultBuilder } from "grammy";

import { isAllowedUser } from "./auth";
import { model, openaiClient } from "./config";
import { SYSTEM_PROMPT } from "./prompt";
import { storeQuery, takeQuery } from "./query-store";
import { escapeHtml } from "./utils";

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
    const safeQuery = escapeHtml(query);

    const result = InlineQueryResultBuilder.article(queryId, "向 LLM 提问", {
        description: query,
        reply_markup: keyboard,
    }).text(`❓ ${safeQuery}\n\n⏳ 点击下方按钮获取回答`, {
        parse_mode: "HTML",
    });

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

    const safeQuery = escapeHtml(query);

    try {
        const thinkingText = `❓ ${safeQuery}\n\n⏳ 正在思考中…`;
        if (ctx.callbackQuery.inline_message_id) {
            await ctx.api.editMessageTextInline(
                ctx.callbackQuery.inline_message_id,
                thinkingText,
                { parse_mode: "HTML" },
            );
        } else if (ctx.callbackQuery.message) {
            await ctx.editMessageText(thinkingText, { parse_mode: "HTML" });
        }
    } catch {
    }

    try {
        const chatCompletion = await openaiClient.chat.completions.create({
            model,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: query },
            ],
        });

        const answer =
            chatCompletion.choices?.[0]?.message?.content?.trim() ??
            "❌ LLM 未返回有效内容。";

        console.log(`[llm_response] user=${ctx.from.id} length=${answer.length}`);

        const truncated =
            answer.length > 4000
                ? answer.slice(0, 4000) + "\n…(已截断)"
                : answer;

        const text = `❓ ${safeQuery}\n\n${truncated}`;

        if (ctx.callbackQuery.inline_message_id) {
            await ctx.api.editMessageTextInline(
                ctx.callbackQuery.inline_message_id,
                text,
                { parse_mode: "HTML" },
            );
        } else if (ctx.callbackQuery.message) {
            await ctx.editMessageText(text, { parse_mode: "HTML" });
        }
    } catch (err) {
        console.error("[callback_query] 请求 LLM 或编辑消息失败:", err);

        const errorText = `❓ ${safeQuery}\n\n❌ 请求失败，请稍后再试。`;

        try {
            if (ctx.callbackQuery.inline_message_id) {
                await ctx.api.editMessageTextInline(
                    ctx.callbackQuery.inline_message_id,
                    errorText,
                    { parse_mode: "HTML" },
                );
            } else if (ctx.callbackQuery.message) {
                await ctx.editMessageText(errorText, { parse_mode: "HTML" });
            }
        } catch (editErr) {
            console.error("[callback_query] 编辑错误消息也失败:", editErr);
        }
    }
}
