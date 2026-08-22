import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

dotenv.config();

// Prisma 7+ Requires a Driver Adapter
const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Revenue Recovery Backend is running' });
});

// Phase 4: Event Processor Webhook Endpoint
app.post('/webhooks/simulator', async (req, res) => {
  const event = req.body;
  const paymentEntity = event.payload?.payment?.entity;
  
  console.log('\n================================');
  console.log('🚨 SIMULATOR EVENT RECEIVED 🚨');
  console.log(`Event Type: ${event.type}`);
  
  if (!paymentEntity?.email) {
    res.status(400).json({ error: "Missing email" });
    return;
  }

  try {
    // 1. Find or create Customer
    let customer = await prisma.customer.findUnique({
      where: { email: paymentEntity.email }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: paymentEntity.email,
          name: paymentEntity.email.split('@')[0], 
        }
      });
      console.log(`👤 Created new Customer: ${customer.email}`);
    } else {
      console.log(`👤 Found existing Customer: ${customer.email}`);
    }

    // 2. Create Recovery Case
    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        customerId: customer.id,
        type: event.type,
        amount: paymentEntity.amount / 100, 
        status: "OPEN",
        riskReason: paymentEntity.error_description || "Unknown"
      }
    });

    console.log(`Created Recovery Case: ${recoveryCase.id}`);
    console.log(`Failure Reason: ${recoveryCase.riskReason}`);
    console.log('================================\n');
    
    res.json({ 
      status: 'received', 
      caseId: recoveryCase.id 
    });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Database operation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
