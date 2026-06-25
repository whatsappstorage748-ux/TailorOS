import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get customer by mobile number (for auto-detecting existing customers)
export const getCustomerByMobile = async (req, res) => {
  try {
    const { mobile } = req.params;
    const owner_id = req.user.id;

    const customer = await prisma.customer.findUnique({
      where: {
        owner_id_mobile_number: {
          owner_id,
          mobile_number: mobile
        }
      }
    });

    if (!customer) {
      return res.status(200).json({ exists: false, customer: null });
    }

    const latestOrder = await prisma.order.findFirst({
      where: { owner_id, mobile_number: mobile },
      orderBy: { created_at: 'desc' }
    });

    let latest_bill_series = null;
    if (latestOrder && latestOrder.bill_number) {
      const parts = latestOrder.bill_number.split('-');
      if (parts.length >= 2) {
        latest_bill_series = `${parts[0]}-${parts[1]}`;
      } else {
        latest_bill_series = latestOrder.bill_number;
      }
    }

    return res.status(200).json({
      exists: true,
      customer,
      measurement_image_path: latestOrder ? latestOrder.measurement_image_path : null,
      latest_bill_series
    });
  } catch (error) {
    console.error('Error in getCustomerByMobile:', error);
    return res.status(500).json({ message: 'Server error looking up customer' });
  }
};

// Get customer order history
export const getCustomerHistory = async (req, res) => {
  try {
    const { mobile } = req.params;
    const owner_id = req.user.id;

    const customer = await prisma.customer.findUnique({
      where: {
        owner_id_mobile_number: { owner_id, mobile_number: mobile }
      }
    });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const orders = await prisma.order.findMany({
      where: { owner_id, mobile_number: mobile },
      orderBy: { order_date: 'desc' }
    });

    return res.status(200).json({
      customer,
      orders
    });
  } catch (error) {
    console.error('Error in getCustomerHistory:', error);
    return res.status(500).json({ message: 'Server error retrieving customer history' });
  }
};

// Get all customers (with order count and search support)
export const getAllCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const owner_id = req.user.id;
    let whereClause = { owner_id };

    if (q) {
      const searchStr = q.trim();
      whereClause.OR = [
        { customer_name: { contains: searchStr, mode: 'insensitive' } },
        { mobile_number: { contains: searchStr } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' }
    });

    const results = await Promise.all(customers.map(async (cust) => {
      const orderCount = await prisma.order.count({
        where: { owner_id, mobile_number: cust.mobile_number }
      });
      return {
        ...cust,
        order_count: orderCount
      };
    }));

    return res.status(200).json({ customers: results });
  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    return res.status(500).json({ message: 'Server error retrieving customers list' });
  }
};
