# RecoverXAI - AI Revenue Recovery Agent

An event-driven platform designed for the Razorpay Buildathon to automatically recover failed payments and handle checkout abandonments using an autonomous AI Agent.

---

## 🚀 Progress Summary (Phases 1 – 5 Complete)

We have built an end-to-end, production-ready AI Revenue Recovery Agent featuring an event processor, deterministic safety boundary, LLM reasoning engine (Groq), real Razorpay test-mode tool execution, and an interactive dashboard.

---

### What I've Built:

#### 🟢 Phase 1: Project Setup & Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS dashboard application.
- **Backend**: Express + Node.js + TypeScript server listening on port 3001.
- **API Health**: `/api/health` endpoint for live health checks.

#### 🟢 Phase 2: Database Architecture (Prisma + SQLite)
- **Database**: SQLite (`dev.db`) initialized via `@prisma/adapter-libsql` and Prisma ORM.
- **Models**:
  - `Customer`: Stores customer profile (email, name).
  - `RecoveryCase`: Tracks case type (`payment_failure`, `subscription_failure`, etc.), amount, risk reason, classified `subReason`, attempt counts, contact timestamps, locking status, and real `razorpayPaymentLinkId`.
  - `AgentAction`: Full audit trail of classifier events, AI decisions, safety checks, and tool executions with JSON metadata.

#### 🟢 Phase 3: Event Simulator & Webhook Receiver
- Endpoint: `/webhooks/simulator`
- Receives simulated failure payloads (`payment.failed`, `subscription.halted`, `checkout.abandoned`).
- Maps event types to standardized categories (`payment_failure`, `subscription_failure`, `checkout_abandonment`).
- Automatically creates or links `Customer` and inserts an `OPEN` `RecoveryCase`.

#### 🟢 Phase 4 & 5: AI Agent Core Integration & Tool Execution
Built a 7-step modular agent orchestrator:

1. **Classifier (`src/agent/classifier.ts`)**: Pure TypeScript keyword classifier mapping raw error descriptions (e.g., `"Insufficient funds"`) to structured sub-reasons (`insufficient_funds`, `card_expired`, `upi_cap_exceeded`).
2. **Allowed Actions (`src/agent/allowedActions.ts`)**: Deterministic safety boundary function restricting valid actions based on case category and attempt count.
3. **Groq AI Decision Service (`src/agent/groqDecisionService.ts`)**: Direct integration with Groq API (`openai/gpt-oss-120b`) enforcing JSON output mode, system prompts, confidence scoring, and drafted customer communication.
4. **Safety Rules Engine (`src/agent/safetyEngine.ts`)**: Evaluates 4 strict rules (worker locking, boundary check, 24-hour contact cooldown, and terminal status checks) before any tool can run.
5. **Tool Execution Engine (`src/agent/tools/`)**:
   - `sendPaymentLink.ts`: **REAL Razorpay API integration** using official `razorpay` SDK in Test Mode to create real payment links (`https://rzp.io/...`).
   - `sendCardUpdateReminder.ts`: Simulated card update notifications logged to audit database.
   - `sendReminder.ts`: Simulated customer reminder notifications logged to database.
   - `escalateToHuman.ts`: Permanent state transition to `ESCALATED`.
   - `closeCaseNoAction.ts`: Permanent state transition to `CLOSED_NO_RECOVERY`.
6. **Orchestrator (`src/agent/orchestrator.ts`)**: Pipeline manager with `try/finally` locking guarantees and endpoint `/api/cases/:id/process`.

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

---

## 🧪 Testing the AI Agent

1. Open the **RecoverXAI Dashboard** in your browser (`http://localhost:5173`).
2. Click any simulation button (e.g. **"Simulate: Insufficient Funds"**).
3. The dashboard will automatically send a webhook to the backend and trigger the **AI Agent**.
4. Observe the **Live Agent Execution Output** showing:
   - Classification step
   - Allowed actions list
   - Groq AI choice & reasoning
   - Safety checks verdict
   - **Clickable Real Razorpay Payment Link!**
