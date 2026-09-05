# RecoverX — Autonomous AI Revenue Recovery Platform

> **Razorpay AI Buildathon Submission — Track 03: AI Revenue Recovery**  
> *An event-driven autonomous AI agent system designed to detect payment failures, intelligently intervene, execute bounded recovery workflows, and authoritatively verify recovered revenue via Razorpay.*

---

## 📌 Problem Statement

Every year, digital businesses and SaaS merchants lose **15% to 45% of potential ARR** to uncaptured payment failures:
- **Payment Failures**: Bank gateway timeouts, insufficient funds, card daily limit caps.
- **Subscription Halted**: Card expirations, failed recurring e-mandates.
- **Checkout Abandonments**: Abandoned payment sessions, 3DS authentication drops.
- **Invoice Overdue**: Delayed enterprise B2B invoice payments.

### Why Existing Solutions Fail:
1. **Static Dunning Emails**: Generic, spammy retries sent at arbitrary times regardless of customer history.
2. **Lack of Bounded Safety**: Naïve automated agents risk spamming customers or executing unauthorized actions.
3. **Fake/Unverified Recoveries**: Systems report revenue as "recovered" simply because a link was emailed, leading to inflated, false metrics.

---

## 🎯 Solution: RecoverX Autonomous AI Agent

**RecoverX** replaces rigid dunning logic with an **autonomous 5-stage AI agent framework**:

```
 💳 PAYMENT FAILURE EVENT
           │
           ▼
 🔍 1. EVENT CLASSIFIER (Maps raw error to sub-reason)
           │
           ▼
 🧠 2. GROQ AI DECISION ENGINE (Llama-3.3-70B evaluates strategy)
           │
           ▼
 🛡️ 3. DETERMINISTIC SAFETY ENGINE (Validates cooldowns & policy boundaries)
           │
           ▼
 🛠️ 4. TOOL DISPATCHER & MULTI-AGENT WORKERS (Generates Razorpay Links, Resend Emails)
           │
           ▼
 👁️ 5. RECONCILIATION & OBSERVATION ENGINE (Strict Razorpay API / Webhook Verification)
```

---

## 🏗️ System Architecture

RecoverX is built as a production-ready, multi-tenant B2B platform:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND DASHBOARD                            │
│           React 19 + TypeScript + Vite + TailwindCSS + Recharts         │
│  [Overview]  │  [Recovery Management]  │  [AI Operations]  │ [Analytics]│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST API / Webhooks
┌────────────────────────────────────▼────────────────────────────────────┐
│                            BACKEND CORE ENGINE                          │
│                      Express.js + TypeScript Server                     │
│                                                                         │
│  ┌───────────────────────┐   ┌───────────────────────────────────────┐  │
│  │ Multi-Agent Pool      │   │ Groq AI Engine (Llama-3.3-70B)       │  │
│  │ AgentManager (1-10)   │   │ - Context Assembly                    │  │
│  │ - Queue Management    │   │ - Strategy Selection                  │  │
│  │ - Atomic Case Claim   │   │ - Structured JSON Schema              │  │
│  └───────────┬───────────┘   └───────────────────┬───────────────────┘  │
│              │                                   │                      │
│  ┌───────────▼───────────┐   ┌───────────────────▼───────────────────┐  │
│  │ Safety Rules Engine   │   │ Tool Dispatcher Engine                │  │
│  │ - 120s Cooldown       │   │ - Razorpay Payment Link API (Test)    │  │
│  │ - Policy Boundaries   │   │ - Resend Email Provider               │  │
│  │ - Terminal Locks      │   │ - Human Escalation Handler            │  │
│  └───────────┬───────────┘   └───────────────────┬───────────────────┘  │
│              │                                   │                      │
│  ┌───────────▼───────────────────────────────────▼───────────────────┐  │
│  │ Auto-Reconciliation Poller & HMAC Webhook Handler                 │  │
│  │ - Strictly verifies Razorpay API payment link status == 'paid'    │  │
│  │ - Match amount in paise before marking RECOVERED                   │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │ Prisma ORM
┌──────────────────────────────────▼──────────────────────────────────────┐
│                            SQLITE DATABASE                              │
│         Entities: RecoveryCase, Customer, AgentAction, MessageLog       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Key Technical Challenges & Engineering Solutions

### 1. Eliminating Fake Recoveries (Strict Razorpay Verification)
- **Challenge**: Many hackathon demos mark cases as "Recovered" as soon as a payment link is created or a fake frontend button is clicked.
- **Solution**: RecoverX enforces strict backend verification (`POST /api/recovery-cases/:id/verify-payment`). Status transitions to `RECOVERED` **only when**:
  1. The official Razorpay API returns `status === 'paid'`.
  2. The captured amount matches expected paise.
  3. Verified HMAC-SHA256 webhooks (`payment.captured`, `payment_link.paid`) match `eventId` idempotently.

### 2. High-Concurrency Database Deadlocks in Parallel Batch Recovery
- **Challenge**: Running parallel worker pools (5-10 workers) concurrently updating SQLite caused transient `Operation timed out` file lock errors.
- **Solution**: Implemented an exponential backoff retry wrapper (`withDbRetry`) around Prisma atomic DB claims (`updateMany`), ensuring 100% execution stability during batch recoveries.

### 3. Preventing AI Hallucinations & Customer Spam
- **Challenge**: LLMs can recommend aggressive or repetitive customer outreach.
- **Solution**: Deterministic `SafetyEngine` sits between Groq AI and Tool Execution:
  - **Policy Boundaries**: Only allowed actions defined in `allowedActions.ts` can run.
  - **Contact Cooldown**: Enforces a strict 120-second cooldown between customer contacts.
  - **Attempt Limit**: Auto-escalates to human after 3 retries.
  - **Opt-Out Checks**: Respects `emailOptOut`, `smsOptOut`, `whatsappOptOut`.

### 4. Multi-Agent Worker Pool Scaling
- **Challenge**: Managing concurrent recovery cases without double-assigning cases to multiple workers.
- **Solution**: `AgentManager` maintains atomic DB claims (`agentId`, `agentStatus`) and a FIFO queue, dynamically supporting 1 to 10 parallel worker slots.

---

## 💡 Frontend Features & Navigation Scope

The RecoverX dashboard consists of **5 main sections**:

1. **Overview**: Real-time KPI summary (Revenue Recovered, Revenue At Risk, Recovery Rate, Active Recoveries), 5-stage horizontal pipeline visualizer, and live autonomous audit feed.
2. **Recovery Management**:
   - **Cases**: Searchable, filterable list of active and recovered cases with Customer Profile Drawer.
   - **Test / Playground**: Trigger simulated payment failure scenarios with editable amounts.
   - **Batch Recovery**: Launch multi-worker parallel recoveries (5, 10, or 20 cases) with live summary analytics.
3. **AI Operations**: Multi-Agent Worker Pool status table, engine latency metrics, and Bounded Autonomy Guardrails summary.
4. **Analytics**: Recharts visualizations for Revenue Recovery Trends, Failure Reason Distributions, Recovery Funnel, and Groq AI Insights.
5. **Settings**: Autonomous engine parameters, Razorpay Test Mode status, Resend provider configuration, and policy guardrail bounds.

---

## 🛠️ Getting Started & Quickstart

### Prerequisites
- Node.js (v18+)
- npm

### 1. Environment Configuration
Create `.env` inside `backend/`:
```env
PORT=3001
NODE_ENV=development
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret
GROQ_API_KEY=your_groq_api_key
COMMUNICATION_MODE=SIMULATED
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:3001
```

### 3. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### 4. Run Automated Test Suite
```bash
cd backend
npx ts-node src/agent/testPhase17.ts
# Result: 9 PASSED, 0 FAILED
```

---

## 📜 License & Acknowledgments

Built for **Razorpay AI Buildathon 2026** (Track 03: AI Revenue Recovery).  
Powered by **Groq Llama-3.3-70B**, **Razorpay Test Mode**, **Prisma ORM**, and **React**.
