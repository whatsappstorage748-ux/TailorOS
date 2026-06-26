import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility to safely serialize BigInt to String for JSON payload
const serializeBigInt = (obj) => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

export const pullServerChanges = async (req, res) => {
  try {
    const ownerId = req.shopOwnerId;
    const sinceStr = req.query.since || '1970-01-01T00:00:00.000Z';
    const sinceDate = new Date(sinceStr);

    const orders = await prisma.order.findMany({
      where: { owner_id: ownerId, updated_at: { gt: sinceDate } },
      include: { items: true } 
    });

    const customers = await prisma.customer.findMany({
      where: { owner_id: ownerId, updated_at: { gt: sinceDate } }
    });

    const employees = await prisma.employee.findMany({
      where: { owner_id: ownerId, updated_at: { gt: sinceDate } }
    });

    const expenses = await prisma.expense.findMany({
      where: { owner_id: ownerId, updated_at: { gt: sinceDate } }
    });

    const custom_expenses = await prisma.customExpense.findMany({
      where: { owner_id: ownerId, updated_at: { gt: sinceDate } }
    });

    const cloth_configs = await prisma.clothConfig.findMany({
      where: { owner_id: ownerId, updated_at: { gt: sinceDate } }
    });

    res.json({
      server_time: new Date().toISOString(),
      orders: serializeBigInt(orders),
      customers,
      employees,
      expenses,
      custom_expenses,
      cloth_configs
    });

  } catch (err) {
    console.error('Error pulling sync data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
