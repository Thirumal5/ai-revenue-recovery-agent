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
  language?: string; // "English", "Hinglish", "Hindi"
}

export interface AIDecision {
  chosen_action: string;
  confidence: string;
  reasoning: string;
  customer_message: string | null;
}

const SYSTEM_PROMPT = `You are a warm, highly empathetic, and professional Revenue Recovery Specialist at RecoverXAI. Your goal is to help customers resolve failed payments smoothly, respectfully, and effortlessly.

STRICT HUMAN-CENTRIC WRITING & DECISION RULES:
1. You may ONLY choose an action from the "allowed_actions" list given to you. Never invent a new action or suggest anything outside that list.
2. WRITING STYLE — 100% HUMAN & PERSUASIVE: Write clear, flawless, warm, and natural text. Avoid cold, robotic, AI-like template phrasing, stiff corporate jargon, or robotic bullet points.
3. MULTILINGUAL COMMUNICATION MODE:
   - If language is 'English': Write warm, natural, human English.
   - If language is 'Hinglish': Write natural, polite conversational Hindi using Latin/English script (e.g., "Hi Rahul, aapka payment complete nahi ho paya. Aap neeche diye gaye secure link se dobara try kar sakte hain.").
   - If language is 'Hindi': Write polite, elegant Hindi using standard Devanagari script (e.g., "नमस्ते राहुल, आपका हाल का भुगतान पूरा नहीं हो पाया...").
4. EMPATHETIC & ATTRACTIVE: Address the customer directly with a genuine human tone. Understand that payment glitches happen (e.g. temporary bank network timeout, expired card, or busy schedule). Offer help gently so they feel valued, respected, and motivated to complete their payment right away.
5. TAILORED MESSAGING BASED ON FAILURE REASON:
   - For Insufficient Funds / Bank Errors: Be reassuring. Gently invite them to retry their payment with a single click.
   - For Card Expired / Declined: Politely assist them in updating their card or choosing an alternate payment option (UPI/Netbanking) so their service remains active without interruption.
   - For Reminders: Provide a friendly, courteous check-in that makes paying convenient and hassle-free.
   - For Alternative Payment Methods: Suggest UPI, Net Banking, or credit/debit cards smoothly.
6. NEVER use aggressive, threatening, or overly pushy language. Never promise unauthorized discounts. Keep it elegant, trustworthy, and customer-first.
7. Learn from prior actions and previous observation outcomes. If a prior action was tried and the case remains open, select a different allowed strategy before resorting to ESCALATE_TO_HUMAN.
8. Respond ONLY with a single valid JSON object per the schema below.

RESPONSE SCHEMA:
{
  "chosen_action": "<one of the allowed_actions given to you, exactly as spelled>",
  "confidence": "<high | medium | low>",
  "reasoning": "<one short sentence explaining why this action fits, for the audit log>",
  "customer_message": "<warm, natural, persuasive human message text starting with a friendly greeting like 'Hi [Customer Name],' or 'Hello,' in the requested language>"
}`;

function buildUserPrompt(context: CaseContext): string {
  const lang = context.language || 'English';
  return `Here is the current case context:

case_type: ${context.caseType}
sub_reason: ${context.subReason}
amount: ₹${context.amount}
attempt_count_so_far: ${context.attemptCount}
days_since_first_event: ${context.daysSinceFirstEvent}
prior_actions_summary: ${context.priorActionsSummary || 'None'}
previous_observation_outcome: ${context.previousObservation || 'First attempt - no prior observation'}
promise_to_pay_status: ${context.promiseStatus}
target_language: ${lang}

allowed_actions: ${JSON.stringify(context.allowedActions)}

Analyze the failure sub_reason and case history. Choose the single best-fit action from allowed_actions. Write an exceptionally warm, natural, human-like, and persuasive customer message in ${lang} that makes it effortless for the customer to take action and complete their payment. Respond with ONLY the JSON object per the schema in the system prompt.`;
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
