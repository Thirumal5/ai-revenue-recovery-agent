/**
 * Step 4 — Groq Decision Service (Plain fetch, NO LangChain, NO OpenAI SDK)
 *
 * Calls the Groq API directly via fetch to get an AI decision on which
 * recovery action to take. Primary model: openai/gpt-oss-120b.
 * Includes automatic model fallback across active Groq models
 * (openai/gpt-oss-20b, groq/compound-mini) with exponential backoff to handle rate limits (429).
 *
 * The AI can ONLY choose from the allowed_actions provided — this is
 * enforced both in the prompt and validated after the response.
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
3. Learn from prior actions and previous observation outcomes. If a prior action (e.g. SEND_PAYMENT_LINK) was already executed and the case remains STILL_OPEN, do NOT repeat that exact same action if another safe recovery action (e.g. SEND_REMINDER or SUGGEST_ALTERNATIVE_PAYMENT) is available in allowed_actions. Diversify the recovery strategy before resorting to ESCALATE_TO_HUMAN.
4. If the context given to you is unclear, contradictory, or you are not confident any listed action is appropriate, you MUST choose "ESCALATE_TO_HUMAN" (or "CLOSE_NO_ACTION" if allowed for cart abandonment) instead of guessing.
5. Never draft a message that threatens the customer, implies legal action, promises a discount/refund, or uses urgent/aggressive language.
6. Draft empathetic, clear, and action-oriented messages tailored to the failure reason (e.g. for insufficient funds, suggest retrying or using an alternative payment method; for card expired, prompt updating card details).
7. You must respond with ONLY a single valid JSON object, matching exactly the schema below. No explanation text outside the JSON. No markdown code fences.

RESPONSE SCHEMA:
{
  "chosen_action": "<one of the allowed_actions given to you, exactly as spelled>",
  "confidence": "<high | medium | low>",
  "reasoning": "<one short sentence explaining why this action fits, for the audit log>",
  "customer_message": "<the drafted message text, or null if the chosen action does not require a message>"
}`;

function buildUserPrompt(context: CaseContext): string {
  return `Here is the current case context and history you must decide on:

case_type: ${context.caseType}
sub_reason: ${context.subReason}
amount: ₹${context.amount}
attempt_count_so_far: ${context.attemptCount}
days_since_first_event: ${context.daysSinceFirstEvent}
prior_actions_summary: ${context.priorActionsSummary}
previous_observation_outcome: ${context.previousObservation || 'First attempt - no prior observation'}
promise_to_pay_status: ${context.promiseStatus}

allowed_actions: ${JSON.stringify(context.allowedActions)}

Analyze the failure sub_reason, attempt count, and prior actions. Choose the single best-fit action from allowed_actions for this specific case. If a prior action was already tried and the case remains STILL_OPEN, prefer a DIFFERENT allowed recovery strategy (e.g., SEND_REMINDER or SUGGEST_ALTERNATIVE_PAYMENT) before choosing ESCALATE_TO_HUMAN. Draft an appropriate customer_message if the action contacts the customer. Respond with ONLY the JSON object per the schema in the system prompt.`;
}

function getFallbackDecision(context: CaseContext, reasoning: string): AIDecision {
  // Deterministic strategy fallback: pick the first allowed action that hasn't already been tried if available
  let chosenAction = context.allowedActions && context.allowedActions.length > 0
    ? context.allowedActions[0]
    : 'ESCALATE_TO_HUMAN';

  if (context.allowedActions && context.allowedActions.length > 1 && context.priorActionsSummary) {
    const untried = context.allowedActions.find(
      (act) => act !== 'ESCALATE_TO_HUMAN' && !context.priorActionsSummary.includes(act)
    );
    if (untried) {
      chosenAction = untried;
    }
  }

  return {
    chosen_action: chosenAction,
    confidence: 'low',
    reasoning,
    customer_message: null,
  };
}

export async function decideRecoveryAction(context: CaseContext): Promise<AIDecision> {
  const apiKey = process.env.GROQ_API_KEY;
  const primaryModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const candidateModels = Array.from(new Set([primaryModel, 'openai/gpt-oss-120b', 'groq/compound-mini', 'groq/compound']));

  if (!apiKey) {
    console.error('❌ GROQ_API_KEY is not set in .env');
    return getFallbackDecision(context, 'GROQ_API_KEY not configured');
  }

  for (const modelName of candidateModels) {
    try {
      let response: Response | null = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

        if (response.status === 429 && attempt < maxRetries) {
          const waitMs = attempt * 1500;
          console.warn(`⚠️ Groq API 429 on model ${modelName}. Retry ${attempt}/${maxRetries} in ${waitMs}ms...`);
          await new Promise((r) => setTimeout(r, waitMs));
        } else {
          break;
        }
      }

      if (response && response.status === 429) {
        console.warn(`⚠️ Model ${modelName} rate limited. Trying fallback candidate model...`);
        continue;
      }

      if (!response || !response.ok) {
        console.warn(`⚠️ Groq API model ${modelName} unavailable (${response?.status || 'network error'}). Trying fallback model...`);
        continue;
      }


      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`❌ Groq API returned empty content for model ${modelName}`);
        continue;
      }

      // Parse the JSON response
      let decision: AIDecision;
      try {
        decision = JSON.parse(content);
      } catch {
        console.error(`❌ Failed to parse Groq response as JSON (${modelName}):`, content);
        continue;
      }

      // Validate chosen_action is in the allowed list
      if (!context.allowedActions.includes(decision.chosen_action)) {
        console.error(`❌ AI (${modelName}) chose "${decision.chosen_action}" which is not in allowed actions: ${JSON.stringify(context.allowedActions)}`);
        return getFallbackDecision(
          context,
          `AI chose "${decision.chosen_action}" which is not in the allowed actions list`
        );
      }

      console.log(`🤖 AI Decision (${modelName}): ${decision.chosen_action} (${decision.confidence}) — ${decision.reasoning}`);

      return decision;
    } catch (error: any) {
      console.error(`❌ Groq API call failed for model ${modelName}:`, error.message);
      continue;
    }
  }

  // If all candidate models failed or were rate-limited, return deterministic policy fallback
  return getFallbackDecision(context, 'All Groq AI models rate-limited — using deterministic policy fallback');
}
