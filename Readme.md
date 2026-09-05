# RecoverXAI - Autonomous AI Revenue Recovery Agent

An event-driven platform designed for the Razorpay Buildathon to automatically recover failed payments and handle checkout abandonments using an autonomous AI Agent.

---

> [!NOTE]
> **DEMO ENVIRONMENT DISCLAIMER**  
> *This demo uses synthetic test customers and Razorpay Test Mode. Payment webhook processing is real within the configured test environment; no production customer or production payment is used.*

---

## 🚀 Progress Summary (Phases 1 – 14 Complete)

RecoverXAI is an end-to-end, production-ready AI Revenue Recovery Agent featuring an event processor, deterministic safety boundaries, LLM reasoning engine (Groq GPT-OSS-120B), real Razorpay test-mode tool execution & HMAC-SHA256 verified payment reconciliation, provider-based communication architecture (Email, SMS, WhatsApp), background autonomous scheduler, merchant-facing Recovery Playground dashboard, dev-only demo reset, and a 100% verified test suite across all project phases.

---

### Phase & Feature Breakdown

#### 🟢 Phase 14: Production Demo UX, Real Communication Readiness & Resend Email Provider
- **Resend Email Integration**: Real email transport implemented via official `resend` Node SDK (`ResendProvider`).
- **Canonical Provider Attribution**: `RESEND` canonical provider attribution in `MessageLog` and UI (`Provider: RESEND`).
- **Explicit Delivery Status**: API request acceptance records `deliveryStatus = 'SENT'` (never displays `DELIVERED` without webhook confirmation).
- **Merchant Recovery Playground**: Dedicated controlled entry point for merchant demonstrations.
- **Explicit Test Customer Labeling**: All synthetic profiles clearly tagged as `TEST CUSTOMER` to ensure clarity.
- **Editable Recovery Amount**: Default ₹1,000 editable amount input for recovery case creation.
- **Authoritative 11-Step Lifecycle Timeline**: Derived directly from database actions (`EVENT_RECEIVED` $\rightarrow$ `RECOVERED`).
- **Razorpay Test Mode Verification Card**: Direct interaction with real Razorpay Test Mode checkout link (`https://rzp.io/...`) and HMAC-SHA256 signature verification status.
- **Communication Attribution**: Explicit distinction between `SIMULATED` ("Email Simulation Recorded") and `REAL` provider delivery (`Provider: RESEND`).
- **Sanitized Webhook Inspection**: Sanitized metadata view (*Event*, *Signature: VERIFIED*, *Event ID*, *Payment ID*, *Case ID*, *Timestamp*).
- **Development-Only Demo Reset**: Safe `POST /api/demo/reset` endpoint and UI button protected by `NODE_ENV !== 'production'`.
- **Automated Test Suite (`src/agent/testPhase14.ts`)**: 100% passing test suite verifying startup customer isolation, synthetic customer validation, payment link creation, fail-closed HMAC signature verification, Resend provider integration, webhook reconciliation, and phase regressions.

---

## 📧 REAL EMAIL — RESEND

RecoverXAI supports REAL email delivery through **Resend** using the official `@resend` SDK.

`COMMUNICATION_MODE=SIMULATED` remains the default for safe local development and demonstrations.

### Enabling REAL Mode:
To enable real email dispatch for demonstrations:
1. Update `backend/.env`:
   ```env
   COMMUNICATION_MODE=REAL
   RESEND_API_KEY=your_resend_api_key_here
   RESEND_FROM_EMAIL=onboarding@resend.dev  # or your verified sender domain in Resend
   RESEND_FROM_NAME=RecoverXAI
   ```
2. SMS and WhatsApp remain provider-based (`SIMULATED` by default).

> [!IMPORTANT]
> **TEST MODE BOUNDARIES**  
> - Razorpay operates in **TEST MODE**.  
> - Customers created in the demo are synthetic test profiles.  
> - No production customer data or production payment credentials are used or exposed.

#### 🟢 Phase 11 – 13: Provider Communication Architecture, Razorpay Webhooks & Agent Hardening
- **Provider Architecture (`src/agent/providers/`)**: Decoupled messaging engine defining `ICommunicationProvider` and supported by `ProviderFactory` supporting `SIMULATED` and `REAL` (`SendGrid` and `Twilio`) modes based on `COMMUNICATION_MODE`.
- **Multi-Channel Dispatch**: Support for `EMAIL`, `SMS`, and `WHATSAPP` channels with database delivery logging in `MessageLog`.
- **Razorpay Webhook Verification (`POST /webhooks/razorpay`)**: Ingests `payment.captured`, `payment_link.paid`, and `order.paid` events. Strict fail-closed HMAC-SHA256 signature verification (HTTP 503 if secret missing, HTTP 401 if signature invalid).
- **Idempotency & Trustworthy Recovery**: Webhook events are checked for duplicate event IDs. Matching recovery cases are updated to `status = RECOVERED`, setting `observationOutcome = RECOVERED` and stopping further recovery attempts.
- **Opt-Out Safety Protections**: `SafetyEngine` enforces `emailOptOut`, `smsOptOut`, and `whatsappOptOut` preference checks prior to dispatch.
- **Enhanced Agent Drawer UI**: Visualizes communication mode (`REAL` vs `SIMULATED`), provider type, channel, delivery status, and provider message SID alongside verified Razorpay webhook trace.
- **Comprehensive Test Suite (`src/agent/testPhase11.ts`)**: 100% passing automated test suite verifying provider abstraction, multi-channel dispatch, safety opt-outs, webhook signature verification, idempotency, and recovery reconciliation.


#### 🟢 Phase 1: Project Setup & Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS fintech dashboard.
- **Backend**: Express + Node.js + TypeScript server.
- **API Health**: `/api/health` endpoint for live health monitoring.

#### 🟢 Phase 2: Database Architecture (Prisma + SQLite)
- **Database**: SQLite (`dev.db`) initialized via `@prisma/adapter-libsql` and Prisma ORM.
- **Models**:
  - `Customer`: Stores customer profiles (email, name).
  - `RecoveryCase`: Tracks case type (`payment_failure`, `subscription_failure`, etc.), amount, risk reason, classified `subReason`, attempt counts, contact timestamps, locking status, and real `razorpayPaymentLinkId`.
  - `AgentAction`: Full audit trail of classifier events, AI decisions, safety checks, and tool executions with JSON metadata.

#### 🟢 Phase 3: Event Simulator & Webhook Receiver
- Endpoint: `/webhooks/simulator`
- Receives simulated failure payloads (`payment.failed`, `subscription.halted`, `checkout.abandoned`).
- Maps event types to standardized categories (`payment_failure`, `subscription_failure`, `checkout_abandonment`).
- Automatically creates or links `Customer` and inserts an `OPEN` `RecoveryCase`.

#### 🟢 Phase 4 & 5: AI Agent Core Integration & Tool Execution
Built a modular 7-step agent orchestrator:
1. **Classifier (`src/agent/classifier.ts`)**: Pure TypeScript keyword classifier mapping raw error descriptions (e.g., `"Insufficient funds"`) to structured sub-reasons (`insufficient_funds`, `card_expired`, `upi_cap_exceeded`).
2. **Allowed Actions (`src/agent/allowedActions.ts`)**: Deterministic safety boundary function restricting valid actions based on case category and attempt count.
3. **Groq AI Decision Service (`src/agent/groqDecisionService.ts`)**: Direct integration with Groq API (`openai/gpt-oss-120b`) enforcing JSON output mode, system prompts, confidence scoring, and drafted customer communication.
4. **Safety Rules Engine (`src/agent/safetyEngine.ts`)**: Evaluates 5 strict rules (worker locking, boundary check, contact cooldown, attempt limits, and terminal status checks) before any tool can run.
5. **Tool Execution Engine (`src/agent/tools/`)**:
   - `sendPaymentLink.ts`: **REAL Razorpay API integration** using official `razorpay` SDK in Test Mode to create real payment links (`https://rzp.io/...`).
   - `sendCardUpdateReminder.ts`: Card update notifications logged to audit database.
   - `sendReminder.ts`: Customer reminder notifications logged to database.
   - `escalateToHuman.ts`: Permanent state transition to `ESCALATED`.
   - `closeCaseNoAction.ts`: Permanent state transition to `CLOSED_NO_RECOVERY`.
6. **Orchestrator (`src/agent/orchestrator.ts`)**: Pipeline manager with `try/finally` locking guarantees and counter integrity protection.

#### 🟢 Phase 6: Policy, Safety & Autonomous Agent Execution
- **Autonomous Background Scheduler (`src/agent/scheduler.ts`)**: Polls database every 30 seconds to process eligible cases without human UI interaction.
- **5 Deterministic Safety Rules**: Worker lock verification, allowed action boundary check, customer contact cooldown enforcement, maximum attempt limit check, and terminal status protection.
- **Counter & Lock Integrity**: `attemptCount` and `lastContactedAt` update **only** on successful tool execution (`toolResult.success === true`).
- **Automated Test Suite (`src/agent/testPhase6.ts`)**: Verified all 11 core scenarios (22 assertions total) with 100% pass rate.
- **Frontend SaaS Polish**: Complete production-ready fintech UI including real-time notification popovers, customer management page, database-backed analytics, and settings configuration panel.

---

## 🛠️ How to Run the Application

### 1. Backend Server
```bash
cd backend
npm run dev
# Starts server on http://localhost:3001
```

### 2. Frontend Dashboard
```bash
cd frontend
npm run dev
# Starts dashboard on http://localhost:5173
```

### 3. Run Automated Phase 6 Test Suite
```bash
cd backend
npx ts-node src/agent/testPhase6.ts
# Executes all 11 policy, safety, and autonomous execution tests
```

---

## 🧪 Testing the AI Agent

1. Open the **RecoverXAI Dashboard** in your browser (`http://localhost:5173`).
2. Click any simulation button in the Simulator drawer (e.g. **"Simulate: Insufficient Funds"**).
3. The backend immediately ingests the event and the **Autonomous AI Agent** processes it automatically.
4. Observe the **Live Agent Execution Output** showing:
   - Event classification
   - Allowed actions list
   - Groq LLM strategy decision
   - Safety rules verdict
   - **Clickable Real Razorpay Payment Link** (`https://rzp.io/...`)
