import OpenAI from "openai";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { DEFAULT_SYSTEM_PROMPT } from "./prompt";

dotenv.config();

const args = parseArgs({
    options: {
        "prompt-file": {
            type: "string",
        },
    },
    strict: false,
});

const token = process.env.BOT_TOKEN;
const promptFileArg = args.values["prompt-file"];
const promptFile = typeof promptFileArg === "string"
    ? promptFileArg
    : process.env["SYSTEM_PROMPT_FILE"];

if (!token) {
    console.error("[ERROR] 未设置 BOT_TOKEN 环境变量。");
    process.exit(1);
}

export const botToken = token;
export const model = process.env["MODEL"] || "deepseek/deepseek-v3.2";
export const apiKey = process.env["API_KEY"];
export const baseURL = process.env["BASE_URL"] || "https://openrouter.ai/api/v1";
export const systemPrompt = promptFile
    ? readFileSync(promptFile, "utf8").trim()
    : DEFAULT_SYSTEM_PROMPT;
export const allowedUserIds = new Set(
    (process.env["ALLOWED_USER_IDS"] || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
);

export const openaiClient = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL
});
