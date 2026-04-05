import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("[ERROR] 未设置 BOT_TOKEN 环境变量。");
    process.exit(1);
}

export const botToken = token;
export const model = process.env["MODEL"] || "deepseek/deepseek-v3.2";
export const apiKey = process.env["API_KEY"];
export const baseURL = process.env["BASE_URL"] || "https://openrouter.ai/api/v1";
export const allowedUserIds = new Set(
    (process.env["ALLOWED_USER_IDS"] || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
);

export const openaiClient = new OpenAI({
    apiKey: process.env["API_KEY"],
    baseURL: "https://openrouter.ai/api/v1",
});
