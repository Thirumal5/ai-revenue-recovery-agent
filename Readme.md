# RecoverXAI - AI Revenue Recovery Agent

An event-driven platform designed for the Razorpay Buildathon to automatically recover failed payments and handle checkout abandonments using an AI Agent.

## Progress Summary (Up to Phase 4)

We have successfully laid the foundation for the application, establishing a full-stack architecture with a React frontend and an Express/Prisma backend. 

### What We've Built So Far:

#### ✅ Phase 1: Project Setup & Architecture
- **Frontend**: Initialized a Vite + React + TypeScript + TailwindCSS dashboard application.
- **Backend**: Set up an Express + Node.js + TypeScript server.
- **API Health**: Configured a `/api/health` endpoint to ensure the frontend and backend communicate successfully.

#### ✅ Phase 2: Database Architecture (Prisma + LibSQL)
- Designed the database schema using **Prisma** ORM.
- **Models Created**:
  - `Customer`: Stores user details (email, name).
  - `RecoveryCase`: Tracks the payment failure event (status, amount, risk reason).
  - `AgentAction`: Logs the actions taken by the AI (e.g., sending emails, retrying payments).
- Configured **SQLite (libSQL)** as the local development database.
- Implemented `@prisma/adapter-libsql` to seamlessly connect the Prisma Client with the database.

#### ✅ Phase 3: Frontend Dashboard & Simulator
- Built the **RecoverXAI Dashboard** using React and TailwindCSS.
- Created a real-time **System Status** indicator that polls the backend health endpoint.
- Developed a **Payment Simulator (Phase 3A)** to mock incoming payment failure webhooks from external providers (like Razorpay).

#### ✅ Phase 4: Event Processor Webhook Endpoint
- Created the `/webhooks/simulator` POST endpoint on the Express server.
- When the frontend simulator triggers a `payment.failed` event, the backend successfully:
  1. Parses the webhook payload.
  2. Finds an existing `Customer` in the SQLite database or creates a new one.
  3. Generates a new `RecoveryCase` linked to that customer, marking it as "OPEN".
  4. Returns the newly generated `Case ID` back to the frontend.
- The frontend was updated to capture this response and display the generated `Case ID` in a success alert.

---

## Next Steps

### 🚀 Phase 5: AI Agent Core Integration
- Integrate **LangChain** and **OpenAI**.
- Build the core intelligence that reviews "OPEN" recovery cases and decides the best course of action (e.g., draft an email, delay action, or retry the charge).
