import { z } from "zod";

export type DecisionIntent =
  | "conversation"
  | "requirement"
  | "quote_change"
  | "decision"
  | "question"
  | "file_update"
  | "risk"
  | "other";

export interface DecisionResult {
  intent: DecisionIntent;
  needsDeepAnalysisProbability: number;
  highRiskProbability: number;
  urgency: "low" | "normal" | "high" | "critical";
  provider: "jev-direct" | "rules";
}

export const stagingSchema = z.object({
  classification: z.enum(["conversation","requirement","quote_change","decision","question","file_update","risk","other"]),
  summary: z.string().max(1000),
  actionable: z.boolean(),
  requirementChanges: z.array(z.object({
    field: z.string().max(120),
    previous: z.string().max(500).nullable(),
    proposed: z.string().max(500),
    evidenceQuote: z.string().max(800),
  })).max(12),
  quoteChanges: z.array(z.object({
    field: z.string().max(120),
    previous: z.string().max(500).nullable(),
    proposed: z.string().max(500),
    evidenceQuote: z.string().max(800),
  })).max(12),
  openQuestions: z.array(z.string().max(800)).max(12),
  pendingActions: z.array(z.object({
    title: z.string().max(300),
    ownerHint: z.string().max(160),
    priority: z.enum(["low","normal","high","critical"]),
  })).max(12),
  risks: z.array(z.string().max(800)).max(12),
  confidence: z.number().min(0).max(1),
});

export type StagingAnalysis = z.infer<typeof stagingSchema>;

function clampProbability(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function choiceValue(answer: unknown): string | null {
  if (!answer || typeof answer !== "object") return null;
  const value = (answer as Record<string, unknown>).choice;
  return typeof value === "string" ? value : null;
}

function noulProbability(answer: unknown): number {
  if (!answer || typeof answer !== "object") return 0;
  const record = answer as Record<string, unknown>;
  if (typeof record.noul === "number") return clampProbability(record.noul);
  if (typeof record.probability === "number") return clampProbability(record.probability);
  return 0;
}

function scoreIndex(answer: unknown): number {
  if (!answer || typeof answer !== "object") return 0;
  const record = answer as Record<string, unknown>;
  return typeof record.score === "number" ? Math.max(0, Math.min(3, Math.round(record.score))) : 0;
}

export function classifyWithRules(message: string): DecisionResult {
  const hasMoney = /(?:rmb|usd|thb|cny|price|quote|quotation|cost|payment|deposit|total)/i.test(message);
  const hasDelivery = /(?:delivery|lead\s*time|shipment|calendar\s*days?)/i.test(message);
  const hasRequirement = /(?:require|spec|specification|mm\b|kpa\b|r-value|panel|standard|thickness)/i.test(message);
  const hasDecision = /(?:approved|approve|agreed|accept|confirmed|finalize|proceed)/i.test(message);
  const hasQuestion = /\?|(?:can you|please confirm|could you)/i.test(message);
  const hasFile = /(?:attached|attachment|quotation|drawing|pdf|xlsx|dwg|revision|version|v\d+)/i.test(message);
  const hasRisk = /(?:risk|delay|late|fail|nonconform|issue|blocked)/i.test(message);

  let intent: DecisionIntent = "conversation";
  if (hasDecision) intent = "decision";
  else if (hasMoney || hasDelivery) intent = "quote_change";
  else if (hasRequirement) intent = "requirement";
  else if (hasFile) intent = "file_update";
  else if (hasRisk) intent = "risk";
  else if (hasQuestion) intent = "question";

  const highRisk = hasMoney || hasDelivery || hasDecision || hasRisk;
  const needsDeep = intent !== "conversation";

  return {
    intent,
    needsDeepAnalysisProbability: needsDeep ? 0.75 : 0.15,
    highRiskProbability: highRisk ? 0.8 : 0.1,
    urgency: hasRisk ? "high" : highRisk ? "normal" : "low",
    provider: "rules",
  };
}

export async function classifyWithJevDirect(state: string): Promise<DecisionResult | null> {
  const apiKey = process.env.SOURCERATING_JEV_API_KEY;
  if (!apiKey) return null;

  const endpoint = process.env.SOURCERATING_JEV_ENDPOINT || "https://api.typesafe.ai/v1/systemone";
  const model = process.env.SOURCERATING_JEV_MODEL || "jev-latest";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        state,
        questions: {
          intent: {
            type: "choice",
            instructions: "Classify the latest B2B project message by its most important business function.",
            criteria: {
              conversation: "General coordination with no project-state change.",
              requirement: "Creates or changes a technical, product, quality, compliance, or delivery requirement.",
              quote_change: "Creates or changes price, scope, quantity, payment, lead time, or quotation terms.",
              decision: "Records an approval, rejection, commitment, selection, or final choice.",
              question: "Requests clarification or missing information.",
              file_update: "Submits, replaces, or refers to a project document or version.",
              risk: "Raises a material commercial, technical, schedule, legal, quality, or delivery risk.",
              other: "None of the above."
            }
          },
          needs_deep_analysis: {
            type: "noul",
            instructions: "Would a language model materially help extract structured project state, actions, or evidence from this message?"
          },
          high_risk: {
            type: "noul",
            instructions: "Does this message affect money, contractual scope, delivery, payment, compliance, quality, or acceptance and require human confirmation before becoming canonical?"
          },
          urgency: {
            type: "score",
            instructions: "How urgently does this message need human review?",
            criteria: ["Low","Normal","High","Critical"]
          }
        }
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const json = await response.json();
    const answers = json?.answers ?? {};
    const rawIntent = choiceValue(answers.intent);
    const allowed: DecisionIntent[] = ["conversation","requirement","quote_change","decision","question","file_update","risk","other"];
    const intent = allowed.includes(rawIntent as DecisionIntent) ? rawIntent as DecisionIntent : "other";
    const urgencies: DecisionResult["urgency"][] = ["low","normal","high","critical"];

    return {
      intent,
      needsDeepAnalysisProbability: noulProbability(answers.needs_deep_analysis),
      highRiskProbability: noulProbability(answers.high_risk),
      urgency: urgencies[scoreIndex(answers.urgency)] ?? "normal",
      provider: "jev-direct",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWithDeepSeekDirect(state: string): Promise<StagingAnalysis | null> {
  const apiKey = process.env.SOURCERATING_DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const endpoint = process.env.SOURCERATING_DEEPSEEK_ENDPOINT || "https://api.deepseek.com/chat/completions";
  const model = process.env.SOURCERATING_DEEPSEEK_MODEL || "deepseek-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const prompt = [
    "Return valid JSON only.",
    "This is SourceRating staging analysis, never canonical state.",
    "Do not invent missing facts.",
    "Preserve exact money, quantities, dates, scope, and technical values.",
    "Use short evidenceQuote text from the supplied message when possible.",
    "Empty arrays are preferred over guessing.",
    "Any money, scope, delivery, payment, compliance, quality or acceptance change requires human review.",
    "Required JSON keys: classification, summary, actionable, requirementChanges, quoteChanges, openQuestions, pendingActions, risks, confidence.",
    "Project context:",
    state,
  ].join("\n");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are the SourceRating Project Room staging engine. Output JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2500,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    return stagingSchema.parse(JSON.parse(content));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function analyzeProjectMessage(state: string) {
  const rules = classifyWithRules(state);
  const jev = await classifyWithJevDirect(state);
  const decision = jev ?? rules;

  const shouldEscalate =
    decision.needsDeepAnalysisProbability >= 0.5 ||
    decision.highRiskProbability >= 0.35 ||
    ["requirement","quote_change","decision","file_update","risk"].includes(decision.intent);

  const deepAnalysis = shouldEscalate ? await generateWithDeepSeekDirect(state) : null;

  return {
    decision,
    deepAnalysis,
    aiStatus: {
      jevConfigured: Boolean(process.env.SOURCERATING_JEV_API_KEY),
      deepSeekConfigured: Boolean(process.env.SOURCERATING_DEEPSEEK_API_KEY),
      deepAnalysisRequested: shouldEscalate,
      deepAnalysisAvailable: Boolean(deepAnalysis),
    }
  };
}