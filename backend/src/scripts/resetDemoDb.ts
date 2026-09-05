/**
 * Phase 13 — Development Database Reset Script
 * Safely removes historical demo and test customer/case records in dependency-safe order.
 */

import { prisma } from '../lib/prisma';

async function resetDemoDb() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Reset disabled in production environment');
    process.exit(1);
  }

  console.log('🧹 Clearing historical development/demo data from dev.db...');

  try {
    await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');

    const deletedActions = await prisma.agentAction.deleteMany({});
    console.log(`  - Deleted ${deletedActions.count} AgentAction records`);

    const deletedLogs = await prisma.messageLog.deleteMany({});
    console.log(`  - Deleted ${deletedLogs.count} MessageLog records`);

    const deletedCases = await prisma.recoveryCase.deleteMany({});
    console.log(`  - Deleted ${deletedCases.count} RecoveryCase records`);

    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`  - Deleted ${deletedCustomers.count} Customer records`);

    console.log('✅ Development database reset complete! Starting with 0 customers.');
  } catch (error) {
    console.error('❌ Failed to reset development database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDemoDb();
