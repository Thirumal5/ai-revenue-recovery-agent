/**
 * Step 4 — Groq Decision Service (Plain fetch, NO LangChain, NO OpenAI SDK)
 *
 * Calls the Groq API directly via fetch to get an AI decision on which
 * recovery action to take. Supports llama-3.3-70b-versatile and openai/gpt-oss-120b.
 *
 * The AI can ONLY choose from the allowed_actions provided — this is
 * enforced both in the prompt and validated after the response. Includes 429 rate limit retry logic.
 */

export interface CaseContext {
  caseType: string;
  subReason: string;
  amount: number;
  attemptCount: number;
  daysSinceFirstEvent: number;
  priorActionsSummary: string;
  promiseStatus: string;
  allowedActions: string[];
  previousObservation?: string;
}

export interface AIDecision {
  chosen_action: string;
  confidence: string;
  reasoning: string;
  customer_message: string | null;
}

const SYSTEM_PROMPT = `You are the decision-making component inside a Revenue Recovery Agent for a fintech platform. Your ONLY job is to choose ONE recovery action from a provided list of allowed actions, and draft a short customer-facing message if the chosen action requires one.

STRICT RULES YOU MUST FOLLOW:
1. You may ONLY choose an action from the "allowed_actions" list given to you. Never invent a new action or suggest anything outside that list.
2. You do not decide whether an action is safe to execute — a separate rules engine will check that. Your job is only to pick the best-fit action for the situation described.
3. If the context given to you is unclear, contradictory, or you are not confident any listed action is appropriate, you MUST choose "ESCALATE_TO_HUMAN" instead of guessing.
4. Never draft a message that threatens the customer, implies legal action, promises a discount/refund, or uses urgent/aggressive language.
5. Never draft a B2B message that sounds threatening or unprofessional.
6. You must respond with ONLY a single valid JSON object, matching exactly the schema below. No explanation text outside the JSON. No markdown code fences.

RESPONSE SCHEMA:
{
  "chosen_action": "<one of the allowed_actions given to you, exactly as spelled>",
  "confidence": "<high | medium | low>",
  "reasoning": "<one short sentence explaining why this action fits, for the audit log>",
  "customer_message": "<the drafted message text, or null if the chosen action does not require a message>"
}`;

function buildUserPrompt(context: CaseContext): string {
  return `Here is the current case you must decide on:

case_type: ${context.caseType}
sub_reason: ${context.subReason}
amount: ${context.amount}
attempt_count_so_far: ${context.attemptCount}
days_since_first_event: ${context.daysSinceFirstEvent}
prior_actions_summary: ${context.priorActionsSummary}
previous_observation_outcome: ${context.previousObservation || 'First attempt - no prior observation'}
promise_to_pay_status: ${context.promiseStatus}

allowed_actions: ${JSON.stringify(context.allowedActions)}

Choose the single best-fit action from allowed_actions for this specific case, and draft the customer_message if the chosen action requires one. Respond with ONLY the JSON object per the schema in the system prompt.`;
}

const FALLBACK_DECISION: AIDecision = {
  chosen_action: 'ESCALATE_TO_HUMAN',
  confidence: 'low',
  reasoning: 'AI response invalid or unparseable',
  customer_message: null,
};

export async function decideRecoveryAction(context: CaseContext): Promise<AIDecision> {
  const apiKey = process.env.GROQ_API_KEY;
  const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  if (!apiKey) {
    console.error('❌ GROQ_API_KEY is not set in .env');
    return { ...FALLBACK_DECISION, reasoning: 'GROQ_API_KEY not configured' };
  }

  try {
    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(context) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (response.status === 429) {
      console.warn('⚠️ Groq API rate limit hit (429). Waiting 1000ms before retry...');
      await new Promise((r) => setTimeout(r, 1000));
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(context) },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 512,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Groq API error (${response.status}):`, errorText);
      return { ...FALLBACK_DECISION, reasoning: `Groq API returned ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('❌ Groq API returned empty content');
      return { ...FALLBACK_DECISION, reasoning: 'Groq returned empty content' };
    }

    // Parse the JSON response
    let decision: AIDecision;
    try {
      decision = JSON.parse(content);
    } catch {
      console.error('❌ Failed to parse Groq response as JSON:', content);
      return { ...FALLBACK_DECISION, reasoning: 'AI response was not valid JSON' };
    }

    // Validate chosen_action is in the allowed list
    if (!context.allowedActions.includes(decision.chosen_action)) {
      console.error(`❌ AI chose "${decision.chosen_action}" which is not in allowed actions: ${JSON.stringify(context.allowedActions)}`);
      return {
        ...FALLBACK_DECISION,
        reasoning: `AI chose "${decision.chosen_action}" which is not in the allowed actions list`,
      };
    }

    console.log(`🤖 AI Decision: ${decision.chosen_action} (${decision.confidence}) — ${decision.reasoning}`);

    return decision;
  } catch (error: any) {
    console.error('❌ Groq API call failed:', error.message);
    return { ...FALLBACK_DECISION, reasoning: `Groq API call failed: ${error.message}` };
  }
}
