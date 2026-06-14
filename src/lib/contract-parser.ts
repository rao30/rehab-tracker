import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ParsedUnit {
  name: string;
  address?: string;
  budget: number;
  deadline?: string;
}

export interface ParsedMilestone {
  orderIndex: number;
  name: string;
  description: string;
  amountPerUnit: number;
  totalAmount: number;
  isAdvance?: boolean;
}

export interface ParsedContract {
  projectName: string;
  ownerName?: string;
  contractorName?: string;
  totalBudget: number;
  mobilizationAdvance?: number;
  units: ParsedUnit[];
  milestones: ParsedMilestone[];
  parsingMethod: "rules" | "gemini" | "claude";
  confidence: "high" | "medium" | "low";
}

function parseMoney(value: string): number {
  return parseFloat(value.replace(/[$,]/g, ""));
}

function extractAddresses(text: string): string[] {
  const shadybrook = text.match(/\d+\s+Shadybrook\s+Dr/gi);
  if (shadybrook?.length) {
    return Array.from(new Set(shadybrook.map((m) => m.trim())));
  }

  const located = text.match(/located\s+at\s+([^.\(]+)/i);
  if (located) {
    const parts = located[1].match(
      /\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:Dr|St|Ave|Rd|Blvd|Ln|Way|Ct)\b/gi
    );
    if (parts?.length) return Array.from(new Set(parts.map((m) => m.trim())));
  }

  const matches = text.match(
    /\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:Dr|St|Ave|Rd|Blvd|Ln|Way|Ct)\b/gi
  );
  return Array.from(new Set(matches?.map((m) => m.trim()) ?? [])).slice(0, 4);
}

function extractScopeDescription(block: string): string {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 15 &&
        !l.startsWith("Milestone") &&
        !l.match(/^\$/) &&
        !l.match(/^Total/i) &&
        !l.match(/^Draw Per/i)
    );
  return lines.slice(0, 4).join(" ").slice(0, 500) || block.slice(0, 200);
}

function extractProjectName(text: string, addresses: string[]): string {
  if (addresses.length >= 2) {
    return `Renovation — ${addresses.join(" & ")}`;
  }
  if (addresses.length === 1) {
    return `Renovation — ${addresses[0]}`;
  }
  const scopeMatch = text.match(/located\s+at\s+([^\(]+)/i);
  if (scopeMatch) return `Renovation — ${scopeMatch[1].trim()}`;
  return "Renovation Project";
}

function findMilestoneAmounts(
  amounts: number[],
  unitCount: number
): { perUnit: number; total: number } | null {
  for (let i = 0; i < amounts.length; i++) {
    for (let j = i + 1; j < amounts.length; j++) {
      const perUnit = amounts[i];
      const total = amounts[j];
      if (perUnit > 0 && total === perUnit * unitCount) {
        return { perUnit, total };
      }
    }
  }

  const filtered = amounts.filter((a) => a >= 400 && a <= 5000);
  if (filtered.length >= 2) {
    const perUnit = filtered[filtered.length - 2];
    const total = filtered[filtered.length - 1];
    if (total >= perUnit) return { perUnit, total };
  }

  return null;
}

const MILESTONE_NAMES: Record<number, string> = {
  1: "Demo & Prep",
  2: "GoBoard & Waterproofing",
  3: "Drywall Prep",
  4: "Tile & Tubs",
  5: "Paint & Trim",
  6: "Electrical",
  7: "Fixtures & Final",
};

function parseMilestoneTable(text: string, unitCount: number = 2): ParsedMilestone[] {
  const milestones: ParsedMilestone[] = [];
  const normalized = text.replace(/\r\n/g, "\n");

  const parts = normalized.split(/Milestone\s+(\d+)\s*:/i);
  for (let i = 1; i < parts.length; i += 2) {
    const orderIndex = parseInt(parts[i], 10);
    const block = parts[i + 1] || "";
    if (isNaN(orderIndex)) continue;

    const nameLine = block.split("\n")[0]?.replace(/\s+/g, " ").trim() || "";
    const name =
      nameLine.replace(/\$\d.*/, "").trim() ||
      MILESTONE_NAMES[orderIndex] ||
      `Milestone ${orderIndex}`;

    const dollarMatches = block.match(/\$(\d[\d,]*\.\d{2})/g);
    if (!dollarMatches || dollarMatches.length < 2) continue;

    const amounts = dollarMatches.map(parseMoney);
    const pair = findMilestoneAmounts(amounts, unitCount);
    if (!pair) continue;

    const { perUnit, total } = pair;

    const resolvedName =
      name.length < 10 || name.endsWith("&")
        ? MILESTONE_NAMES[orderIndex] || name
        : name;

    if (perUnit > 0 && total > 0 && total >= perUnit) {
      milestones.push({
        orderIndex,
        name: resolvedName.slice(0, 120),
        description: extractScopeDescription(block),
        amountPerUnit: perUnit,
        totalAmount: total,
      });
    }
  }

  const seen = new Set<number>();
  return milestones
    .filter((m) => {
      if (seen.has(m.orderIndex)) return false;
      seen.add(m.orderIndex);
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function parseMobilizationAdvance(text: string): number | undefined {
  const match = text.match(/[Mm]obilization\s+advance[^$]*\$(\d[\d,]*\.\d{2})/);
  return match ? parseMoney(match[1]) : undefined;
}

function parseTotalBudget(text: string): number {
  const patterns = [
    /fixed,?\s+flat\s+fee\s+of\s+\$(\d[\d,]*\.\d{2})/i,
    /total[^$]*\$(\d[\d,]*\.\d{2})/i,
    /TOTALS\s+\$(\d[\d,]*\.\d{2})\s+\$(\d[\d,]*\.\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) return parseMoney(match[2]);
      return parseMoney(match[1]);
    }
  }

  return 0;
}

function parsePerUnitBudget(text: string, unitCount: number, totalBudget: number): number {
  const perUnitMatch = text.match(/\$(\d[\d,]*\.\d{2})\s+per\s+unit/i);
  if (perUnitMatch) return parseMoney(perUnitMatch[1]);
  if (unitCount > 0 && totalBudget > 0) return totalBudget / unitCount;
  return totalBudget;
}

function parseDeadlines(text: string, addresses: string[]): Map<string, string> {
  const deadlines = new Map<string, string>();
  for (const address of addresses) {
    const streetNum = address.match(/^\d+/)?.[0];
    if (!streetNum) continue;
    const pattern = new RegExp(
      `${streetNum}[^\\n]*?(?:no later than|by)\\s+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})`,
      "i"
    );
    const match = text.match(pattern);
    if (match) deadlines.set(address, match[1]);
  }
  return deadlines;
}

export function parseContractWithRules(text: string): ParsedContract {
  const addresses = extractAddresses(text);
  const totalBudget = parseTotalBudget(text);
  const mobilizationAdvance = parseMobilizationAdvance(text);
  const perUnitBudget = parsePerUnitBudget(text, addresses.length || 1, totalBudget);
  const deadlines = parseDeadlines(text, addresses);
  const milestones = parseMilestoneTable(text, addresses.length || 2);

  const units: ParsedUnit[] =
    addresses.length > 0
      ? addresses.map((address) => ({
          name: address,
          address,
          budget: perUnitBudget,
          deadline: deadlines.get(address),
        }))
      : [{ name: "Main Unit", budget: totalBudget || perUnitBudget }];

  const milestoneTotal = milestones.reduce((sum, m) => sum + m.totalAmount, 0);
  const confidence =
    milestones.length >= 3 && totalBudget > 0
      ? "high"
      : milestones.length > 0
        ? "medium"
        : "low";

  return {
    projectName: extractProjectName(text, addresses),
    ownerName: text.match(/between\s+([^(]+)\s*\(“Owner”\)/i)?.[1]?.trim(),
    contractorName: text.match(/and\s+([^(]+)\s*\(“Contractor”\)/i)?.[1]?.trim(),
    totalBudget: totalBudget || milestoneTotal,
    mobilizationAdvance,
    units,
    milestones,
    parsingMethod: "rules",
    confidence,
  };
}

const CONTRACT_SCHEMA = `{
  "projectName": "string",
  "ownerName": "string or null",
  "contractorName": "string or null",
  "totalBudget": number,
  "mobilizationAdvance": number or null,
  "units": [{ "name": "string", "address": "string or null", "budget": number, "deadline": "string or null" }],
  "milestones": [{
    "orderIndex": number,
    "name": "string",
    "description": "detailed scope required for this payment",
    "amountPerUnit": number,
    "totalAmount": number,
    "isAdvance": boolean
  }]
}`;

const CONTRACT_PROMPT = `You are a construction contract analyst. Extract payment milestones and project structure from this renovation contract.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
${CONTRACT_SCHEMA}

Rules:
- Extract every milestone/draw phase with exact dollar amounts
- Include mobilization/advance payments with isAdvance: true
- Split units/properties if the contract covers multiple addresses
- description should summarize scope required before payment release
- Use orderIndex starting at 1`;

function parseAIResponse(
  raw: string,
  method: "gemini" | "claude"
): ParsedContract | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Omit<ParsedContract, "parsingMethod" | "confidence">;
    return {
      ...parsed,
      parsingMethod: method,
      confidence: parsed.milestones?.length > 0 ? "high" : "medium",
    };
  } catch {
    return null;
  }
}

export async function parseContractWithGemini(text: string): Promise<ParsedContract> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return parseContractWithRules(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(
      `${CONTRACT_PROMPT}\n\nContract text:\n${text.slice(0, 28000)}`
    );
    const response = result.response.text();
    const parsed = parseAIResponse(response, "gemini");
    if (parsed) return parsed;
  } catch (error) {
    console.error("Gemini contract parsing failed:", error);
  }

  return parseContractWithRules(text);
}

export async function parseContractWithClaude(text: string): Promise<ParsedContract> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return parseContractWithRules(text);
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${CONTRACT_PROMPT}\n\nContract text:\n${text.slice(0, 28000)}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return parseContractWithRules(text);
  }

  const parsed = parseAIResponse(content.text, "claude");
  if (parsed) return parsed;

  return parseContractWithRules(text);
}

export async function parseContract(text: string): Promise<ParsedContract> {
  if (process.env.GEMINI_API_KEY) {
    return parseContractWithGemini(text);
  }

  const rulesResult = parseContractWithRules(text);
  if (rulesResult.confidence === "high" && rulesResult.milestones.length >= 3) {
    return rulesResult;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return parseContractWithClaude(text);
  }

  return rulesResult;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text;
}
