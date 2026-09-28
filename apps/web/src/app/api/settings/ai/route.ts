import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface AiSettingsInfo {
  gemini: {
    keyConfigured: boolean;
    keyEnvVar: string;
    primaryModel: string;
    fallbackModels: string[];
    fileApiThresholdKb: number;
  };
  claude: {
    keyConfigured: boolean;
    keyEnvVar: string;
    model: string;
    maxTokens: number;
  };
}

export async function GET() {
  const geminiKey = (
    process.env.AGY_API_KEY ||
    process.env.AGY_KEY ||
    process.env.GEMINI_API_KEY
  )?.trim();

  const claudeKey = process.env.ANTHROPIC_API_KEY?.trim();

  const data: AiSettingsInfo = {
    gemini: {
      keyConfigured: !!geminiKey,
      keyEnvVar: process.env.AGY_API_KEY
        ? "AGY_API_KEY"
        : process.env.AGY_KEY
        ? "AGY_KEY"
        : "GEMINI_API_KEY",
      primaryModel: "gemini-3.8-flash",
      fallbackModels: [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-2.5-pro",
        "antigravity-preview-09-2026",
      ],
      fileApiThresholdKb: 10,
    },
    claude: {
      keyConfigured: !!claudeKey,
      keyEnvVar: "ANTHROPIC_API_KEY",
      model: "claude-haiku-4-5",
      maxTokens: 3200,
    },
  };

  return NextResponse.json({ success: true, data });
}
