import { experimental_evaluate as evaluate, generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 30;

const requestSchema = z.object({
  roomId: z.string().min(1).max(200).optional(),
  latestMessage: z.string().min(1).max(12000),
  recentContext: z.array(z.string().max(4000)).max(20).default([]),
});

const deepSchema = z.object({
  classification: z.enum([
    'conversation',
    'requirement',
    'quote_change',
    'decision',
    'question',
    'file_update',
    'risk',
    'other',
  ]),
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
    priority: z.enum(['low', 'normal', 'high', 'critical']),
  })).max(12),
  risks: z.array(z.string().max(800)).max(12),
  confidence: z.number().min(0).max(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.VERCEL_ENV !== 'preview' || url.searchParams.get('smoke') !== '1') {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  return POST(new Request(request.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      roomId: 'smoke-eastframe',
      latestMessage: 'Quotation v3 updates total price from RMB 295,000 to RMB 320,000, delivery from 60 to 45 days, and wall panel thickness from 75mm to 100mm PU fireproof core.',
      recentContext: ['Buyer requires R-value >= 3.5 and 1.8 kPa wind-load connection verification.'],
    }),
  }));
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    const state = [
      ...body.recentContext.map((item, index) => `Context ${index + 1}: ${item}`),
      `Latest message: ${body.latestMessage}`,
    ].join('\n');

    const decision = await evaluate({
      model: 'typesafe-ai/jev',
      state,
      questions: {
        intent: {
          type: 'choice',
          instructions: 'Classify the latest message by the most important business function it performs.',
          criteria: {
            conversation: 'General coordination or social message with no project-state change.',
            requirement: 'Creates or changes a product, technical, quality, compliance, or delivery requirement.',
            quote_change: 'Creates or changes commercial price, scope, quantity, payment, lead time, or quotation terms.',
            decision: 'Records an approval, rejection, commitment, selection, or final choice.',
            question: 'Asks for clarification or missing information that blocks or advances the work.',
            file_update: 'Announces, submits, replaces, or refers to a project document or file version.',
            risk: 'Raises a meaningful commercial, technical, schedule, legal, quality, or delivery risk.',
            other: 'None of the above.',
          },
        },
        needsDeepAnalysis: {
          type: 'boolean',
          instructions: 'Would a deeper language model materially help extract structured project state, actions, or evidence from this message?',
        },
        highRisk: {
          type: 'boolean',
          instructions: 'Does this message affect money, contractual scope, delivery date, payment, compliance, acceptance, quality, or another field that must require human confirmation before becoming canonical?',
        },
        urgency: {
          type: 'score',
          instructions: 'Rate how urgently this message needs a human response or review.',
          criteria: ['low', 'normal', 'high', 'critical'],
        },
      },
      providerOptions: {
        gateway: {
          zeroDataRetention: true,
        },
      },
    });

    const intentAnswer = decision.answers.intent;
    const deepAnswer = decision.answers.needsDeepAnalysis;
    const highRiskAnswer = decision.answers.highRisk;

    const intent =
      typeof intentAnswer === 'object' && intentAnswer && 'choice' in intentAnswer
        ? String(intentAnswer.choice)
        : 'other';

    const deepProbability =
      typeof deepAnswer === 'object' && deepAnswer && 'probability' in deepAnswer
        ? Number(deepAnswer.probability)
        : 0;

    const highRiskProbability =
      typeof highRiskAnswer === 'object' && highRiskAnswer && 'probability' in highRiskAnswer
        ? Number(highRiskAnswer.probability)
        : 0;

    const shouldEscalate =
      deepProbability >= 0.5 ||
      highRiskProbability >= 0.35 ||
      ['requirement', 'quote_change', 'decision', 'file_update', 'risk'].includes(intent);

    let deepAnalysis: z.infer<typeof deepSchema> | null = null;

    if (shouldEscalate) {
      const result = await generateObject({
        model: 'deepseek/deepseek-v4.1-flash',
        schema: deepSchema,
        system: [
          'You are the SourceRating Project Room staging engine.',
          'Convert cross-company B2B conversation into proposed project state, never canonical state.',
          'Preserve exact commercial and technical facts and cite short evidence quotes from the supplied text.',
          'Do not invent missing values. Use empty arrays when there is nothing to extract.',
          'Any money, scope, delivery, payment, compliance, quality or acceptance change requires human review.',
          'Be concise and operational.',
        ].join(' '),
        prompt: state,
        providerOptions: {
          gateway: {
            zeroDataRetention: true,
          },
        },
      });

      deepAnalysis = result.object;
    }

    return Response.json({
      ok: true,
      roomId: body.roomId ?? null,
      decision: {
        intent,
        needsDeepAnalysisProbability: deepProbability,
        highRiskProbability,
        urgency: decision.answers.urgency,
        provider: 'typesafe-ai/jev',
      },
      deepAnalysis,
      deepModel: deepAnalysis ? 'deepseek/deepseek-v4.1-flash' : null,
      canonicalWrite: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      {
        ok: false,
        error: message,
        canonicalWrite: false,
      },
      { status: 400 },
    );
  }
}