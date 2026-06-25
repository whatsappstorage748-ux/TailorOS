import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { sendWhatsAppMessage, sendWhatsAppPDF } from '../services/whatsapp.js';
import { generateInvoicePdfBuffer } from '../services/pdfGenerator.js';

const prisma = new PrismaClient();

const formatBillMessage = (order, customerName) => {
  const itemsText = (order.items || []).map(item => `- ${item.cloth_type} x ${item.quantity} (₹${item.price_per_cloth})`).join('\n');
  const dateText = new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `*Tailor Shop Invoice*
----------------------------------
*Bill No:* ${order.bill_number}
*Date:* ${dateText}
*Customer:* ${customerName}
*Mobile:* ${order.mobile_number}

*Items:*
${itemsText}

*Financials:*
*Total Amount:* ₹${order.total_amount}
*Advance Paid:* ₹${order.advance_amount}
*Balance Due:* ₹${order.balance_amount}

Thank you for choosing us!`;
};

// Helper to generate a completely new sequential bill number for the current year
const generateNewBillNumber = async (owner_id) => {
  try {
    const currentYearYY = new Date().getFullYear().toString().slice(-2);
    const prefix = `${currentYearYY}-`;

    const orders = await prisma.order.findMany({
      where: {
        owner_id,
        bill_number: {
          startsWith: prefix
        }
      },
      select: {
        bill_number: true
      }
    });

    let maxSeq = 0;
    for (const o of orders) {
      const parts = o.bill_number.split('-');
      if (parts.length >= 2) {
        const seqVal = parseInt(parts[1], 10);
        if (!isNaN(seqVal)) {
          maxSeq = Math.max(maxSeq, seqVal);
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(4, '0');
    return `${currentYearYY}-${paddedSeq}`;
  } catch (error) {
    console.error('Error generating new bill number:', error);
    return `ERR-${Date.now()}`;
  }
};

// Helper to generate the next sub-order suffix for an existing bill series
const generateNextSubOrder = async (owner_id, baseSeries) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        owner_id,
        bill_number: {
          startsWith: baseSeries
        }
      },
      select: {
        bill_number: true
      }
    });

    let maxSuffix = 1;
    for (const o of orders) {
      const bill = o.bill_number;
      if (bill === baseSeries) {
        maxSuffix = Math.max(maxSuffix, 1);
      } else if (bill.startsWith(baseSeries + '-')) {
        const suffixStr = bill.slice(baseSeries.length + 1);
        const suffixVal = parseInt(suffixStr, 10);
        if (!isNaN(suffixVal)) {
          maxSuffix = Math.max(maxSuffix, suffixVal);
        }
      }
    }

    return `${baseSeries}-${maxSuffix + 1}`;
  } catch (error) {
    console.error('Error generating next sub-order suffix:', error);
    return `${baseSeries}-${Date.now()}`;
  }
};

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const owner_id = req.user.id;
    const {
      mobile_number,
      customer_name,
      order_items,
      total_amount,
      advance_amount,
      balance_amount,
      measurement_image,
      use_latest_bill_series
    } = req.value || req.body;

    if (!mobile_number || !customer_name || !measurement_image) {
      return res.status(400).json({ message: 'Mobile number, customer name, and measurement image are required' });
    }

    const mobile = String(mobile_number).trim();
    const customerName = String(customer_name).trim();

    if (!mobile || !customerName) {
      return res.status(400).json({ message: 'Mobile number and customer name cannot be empty' });
    }

    let bill_number;
    if (use_latest_bill_series) {
      // Find customer's latest order to get the base bill series
      const latestOrder = await prisma.order.findFirst({
        where: { owner_id, mobile_number: mobile },
        orderBy: { created_at: 'desc' }
      });
      if (latestOrder && latestOrder.bill_number) {
        const parts = latestOrder.bill_number.split('-');
        const baseSeries = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : latestOrder.bill_number;
        bill_number = await generateNextSubOrder(owner_id, baseSeries);
      } else {
        bill_number = await generateNewBillNumber(owner_id);
      }
    } else {
      bill_number = await generateNewBillNumber(owner_id);
    }

    const matches = measurement_image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    let measurement_image_path = '';

    if (matches && matches.length === 3) {
      const imageExtension = matches[1];
      const base64Data = matches[2];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      const uploadsDir = path.resolve('uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      const safeBillName = bill_number.replace(/[^a-zA-Z0-9-]/g, '_');
      const fileName = `${owner_id}_${safeBillName}.${imageExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      await fs.writeFile(filePath, imageBuffer);
      measurement_image_path = `uploads/${fileName}`;
    } else {
      // If it doesn't match base64 pattern (e.g. it's already an image path like 'uploads/xxx.webp' when choosing Keep Existing Measurements),
      // we can just use the existing path directly!
      if (measurement_image.startsWith('uploads/')) {
        measurement_image_path = measurement_image;
      } else {
        return res.status(400).json({ message: 'Invalid measurement image format' });
      }
    }

    // Upsert Customer
    let customer = await prisma.customer.upsert({
      where: {
        owner_id_mobile_number: { owner_id, mobile_number: mobile }
      },
      update: {
        customer_name: customerName
      },
      create: {
        owner_id,
        mobile_number: mobile,
        customer_name: customerName
      }
    });

    // Create Order and Items in a transaction
    const itemsData = (order_items || []).map(item => ({
      cloth_type: item.cloth_type,
      quantity: Number(item.quantity || 1),
      price_per_cloth: Number(item.price_per_cloth || 0),
      total_amount: Number(item.quantity || 1) * Number(item.price_per_cloth || 0)
    }));

    const order = await prisma.order.create({
      data: {
        owner_id,
        bill_number,
        mobile_number: mobile,
        measurement_image_path,
        total_amount: Number(total_amount),
        advance_amount: advance_amount ? Number(advance_amount) : 0,
        balance_amount: Number(balance_amount),
        status: 'Undelivered',
        items: {
          create: itemsData
        }
      },
      include: {
        items: true,
        owner: true
      }
    });

    // Non-Blocking: generate PDF & send WhatsApp in background
    setImmediate(async () => {
      try {
        const pdfBuffer = await generateInvoicePdfBuffer(order, customerName);
        const safeBillName = bill_number.replace(/[^a-zA-Z0-9-]/g, '_');
        const shopName = (order.owner && order.owner.shop_name) || 'TailorOS';
        const safeShopName = shopName.replace(/[^a-zA-Z0-9-]/g, '_');
        const pdfFilename = `${safeShopName}_Bill_${safeBillName}.pdf`;
        const billMsg = formatBillMessage(order, customerName);
        
        await sendWhatsAppPDF(mobile, pdfBuffer, pdfFilename, billMsg, { order, customerName, type: 'INVOICE' });
      } catch (pdfErr) {
        console.error('Error generating/sending WhatsApp PDF in background:', pdfErr);
        try {
          const billMsg = formatBillMessage(order, customerName);
          await sendWhatsAppMessage(mobile, billMsg, { order, customerName, type: 'INVOICE' });
        } catch (msgErr) {
          console.error('Error sending fallback WhatsApp message in background:', msgErr);
        }
      }
    });

    return res.status(201).json({
      message: 'Order created successfully',
      order,
      customer,
      items: order.items
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    return res.status(500).json({ message: 'Server error creating order' });
  }
};

// Complete/Deliver an order
export const completeOrder = async (req, res) => {
  try {
    const { bill_number } = req.params;
    const owner_id = req.user.id;
    
    const order = await prisma.order.findUnique({
      where: {
        owner_id_bill_number: { owner_id, bill_number }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: {
        owner_id_bill_number: { owner_id, bill_number }
      },
      data: {
        status: 'Delivered',
        delivery_date: new Date()
      }
    });

    // Send WhatsApp Delivered Notification
    const body = `Thank you for your business! Your order of Bill No. ${bill_number} has been completed and delivered. We hope to see you again soon!`;
    sendWhatsAppMessage(updatedOrder.mobile_number, body, { order: updatedOrder, type: 'STATUS_DELIVERED' });

    return res.status(200).json({
      message: 'Order completed successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error in completeOrder:', error);
    return res.status(500).json({ message: 'Server error completing order' });
  }
};

// Mark order as ready
export const readyOrder = async (req, res) => {
  try {
    const { bill_number } = req.params;
    const owner_id = req.user.id;
    
    const order = await prisma.order.findUnique({
      where: {
        owner_id_bill_number: { owner_id, bill_number }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updatedOrder = await prisma.order.update({
      where: {
        owner_id_bill_number: { owner_id, bill_number }
      },
      data: {
        status: 'Ready'
      }
    });

    // Send WhatsApp Ready Notification
    const body = `Your order of Bill No. ${bill_number} is ready and kindly come to shop and pickup.`;
    sendWhatsAppMessage(order.mobile_number, body, { order: updatedOrder, type: 'STATUS_READY' });

    return res.status(200).json({
      message: 'Order marked as ready',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error in readyOrder:', error);
    return res.status(500).json({ message: 'Server error marking order ready' });
  }
};

// Search orders by Bill Number, Mobile Number, Customer Name, or Order ID (ONxxxx)
export const searchOrders = async (req, res) => {
  try {
    const { q } = req.query;
    const owner_id = req.user.id;

    if (!q) {
      const recentOrders = await prisma.order.findMany({
        where: { owner_id, status: { in: ['Undelivered', 'Ready'] } },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { items: true }
      });
      const results = await Promise.all(recentOrders.map(async (order) => {
        const customer = await prisma.customer.findUnique({
          where: { owner_id_mobile_number: { owner_id, mobile_number: order.mobile_number } }
        });
        return {
          ...order,
          customer_name: customer ? customer.customer_name : 'Unknown Customer'
        };
      }));
      return res.status(200).json({ orders: results });
    }

    const queryStr = q.trim();

    // Check if query matches Order ID format (ONxxxx or onxxxx or just digits)
    let orderIdToSearch = null;
    if (/^on\d+$/i.test(queryStr)) {
      orderIdToSearch = parseInt(queryStr.substring(2), 10);
    } else if (/^\d+$/.test(queryStr)) {
      orderIdToSearch = parseInt(queryStr, 10);
    }

    // Search customers by name
    const customers = await prisma.customer.findMany({
      where: {
        owner_id,
        customer_name: { contains: queryStr, mode: 'insensitive' }
      },
      select: {
        mobile_number: true
      }
    });
    const customerMobiles = customers.map(c => c.mobile_number);

    // Build the query where clause
    const orConditions = [
      { bill_number: { contains: queryStr, mode: 'insensitive' } },
      { mobile_number: { contains: queryStr } }
    ];

    if (orderIdToSearch !== null && !isNaN(orderIdToSearch)) {
      orConditions.push({ id: BigInt(orderIdToSearch) });
    }

    if (customerMobiles.length > 0) {
      orConditions.push({ mobile_number: { in: customerMobiles } });
    }

    const orders = await prisma.order.findMany({
      where: {
        owner_id,
        OR: orConditions
      },
      orderBy: { created_at: 'desc' },
      include: { items: true }
    });

    const results = await Promise.all(orders.map(async (order) => {
      const customer = await prisma.customer.findUnique({
        where: { owner_id_mobile_number: { owner_id, mobile_number: order.mobile_number } }
      });
      return {
        ...order,
        customer_name: customer ? customer.customer_name : 'Unknown Customer'
      };
    }));

    return res.status(200).json({ orders: results });
  } catch (error) {
    console.error('Error in searchOrders:', error);
    return res.status(500).json({ message: 'Server error searching orders' });
  }
};

// Get single order details
export const getOrderDetails = async (req, res) => {
  try {
    const { bill_number } = req.params;
    const owner_id = req.user.id;

    const order = await prisma.order.findUnique({
      where: {
        owner_id_bill_number: { owner_id, bill_number }
      },
      include: { items: true, owner: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const customer = await prisma.customer.findUnique({
      where: { owner_id_mobile_number: { owner_id, mobile_number: order.mobile_number } }
    });

    return res.status(200).json({
      order,
      customer,
      items: order.items
    });
  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    return res.status(500).json({ message: 'Server error retrieving order details' });
  }
};
