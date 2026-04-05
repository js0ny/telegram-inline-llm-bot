import { Bot } from "grammy";

import { allowedUserIds, botToken, model } from "./src/config";
import {
    handleCallbackQuery,
    handleInlineQuery,
    handleStart,
} from "./src/handlers";

const bot = new Bot(botToken);

bot.command("start", handleStart);
bot.on("inline_query", handleInlineQuery);
bot.on("callback_query:data", handleCallbackQuery);

console.log("[INFO] Bot 正在启动...");
console.log(
    `[startup] bot_token_present=${Boolean(botToken)} whitelist_size=${allowedUserIds.size} model=${model}`,
);

bot.start();
