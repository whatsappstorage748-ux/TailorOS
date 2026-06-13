import fs from 'fs/promises';
import path from 'path';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';

// Helper to generate the next bill number
const generateBillNumber = async () => {
  try {
    const configPath = path.resolve('config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);

    const startingNum = config.starting_bill_number || 1000;
    const format = config.bill_format || '{number}-{year}';

    // Find the latest order to get the last bill number
    const lastOrder = await Order.findOne().sort({ created_at: -1 });

    let nextNum = startingNum;
    if (lastOrder && lastOrder.bill_number) {
      // Dynamic parsing of number part based on bill_format
      // e.g. "{number}-{year}" -> replace {number} with (\d+) and {year} with \d{4}
      const regexStr = format
        .replace('{number}', '(\\d+)')
        .replace('{year}', '\\d{4}');
      const regex = new RegExp(`^${regexStr}$`);
      const match = lastOrder.bill_number.match(regex);
      
      if (match && match[1]) {
        nextNum = parseInt(match[1], 10) + 1;
      } else {
        // Fallback: search for any sequence of digits in the last bill number
        const digits = lastOrder.bill_number.match(/(\d+)/);
        if (digits) {
          nextNum = parseInt(digits[1], 10) + 1;
        } else {
          nextNum = startingNum + 1;
        }
      }
    }

    const currentYear = new Date().getFullYear();
    // Generate bill number string using format
    const billNumber = format
      .replace('{number}', nextNum)
      .replace('{year}', currentYear);

    return billNumber;
  } catch (error) {
    console.error('Error generating bill number:', error);
    // Fallback in case config reading fails
    const timestamp = Date.now();
    return `ERR-${timestamp}`;
  }
};

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const {
      mobile_number,
      customer_name,
      order_items,
      total_amount,
      advance_amount,
      balance_amount,
      measurement_image // Base64 representation of drawing
    } = req.value || req.body;

    if (!mobile_number || !customer_name || !measurement_image) {
      return res.status(400).json({ message: 'Mobile number, customer name, and measurement image are required' });
    }

    // 1. Generate bill number
    const bill_number = await generateBillNumber();

    // 2. Save measurement image to disk
    // Measurement image is base64 e.g. "data:image/webp;base64,..."
    const matches = measurement_image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid measurement image format (must be base64 WebP/PNG)' });
    }

    const imageExtension = matches[1]; // e.g. webp, png
    const base64Data = matches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Save directory
    const uploadsDir = path.resolve('uploads');
    // Ensure uploads folder exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // File name: bill_number with safe characters
    const safeBillName = bill_number.replace(/[^a-zA-Z0-9-]/g, '_');
    const fileName = `${safeBillName}.${imageExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.writeFile(filePath, imageBuffer);
    const measurement_image_path = `uploads/${fileName}`;

    // 3. Find or Create Customer
    let customer = await Customer.findOne({ mobile_number });
    if (!customer) {
      customer = new Customer({
        mobile_number,
        customer_name
      });
      await customer.save();
    } else {
      // Keep customer name updated if changed
      if (customer.customer_name !== customer_name) {
        customer.customer_name = customer_name;
        await customer.save();
      }
    }

    // 4. Create Order
    const order = new Order({
      bill_number,
      mobile_number,
      measurement_image_path,
      total_amount,
      advance_amount: advance_amount || 0,
      balance_amount,
      status: 'Undelivered'
    });
    await order.save();

    // 5. Create Order Items
    const itemsToSave = [];
    if (order_items && Array.isArray(order_items)) {
      for (const item of order_items) {
        const orderItem = new OrderItem({
          bill_number,
          cloth_type: item.cloth_type,
          quantity: item.quantity,
          price_per_cloth: item.price_per_cloth,
          total_amount: item.quantity * item.price_per_cloth
        });
        await orderItem.save();
        itemsToSave.push(orderItem);
      }
    }

    return res.status(201).json({
      message: 'Order created successfully',
      order,
      customer,
      items: itemsToSave
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
    const order = await Order.findOne({ bill_number });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = 'Delivered';
    order.delivery_date = new Date();
    await order.save();

    return res.status(200).json({
      message: 'Order completed successfully',
      order
    });
  } catch (error) {
    console.error('Error in completeOrder:', error);
    return res.status(500).json({ message: 'Server error completing order' });
  }
};

// Search orders by Bill Number or Mobile Number
export const searchOrders = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      // If no query, return recent undelivered orders
      const recentOrders = await Order.find({ status: 'Undelivered' }).sort({ created_at: -1 }).limit(10);
      const results = await Promise.all(recentOrders.map(async (order) => {
        const customer = await Customer.findOne({ mobile_number: order.mobile_number });
        const items = await OrderItem.find({ bill_number: order.bill_number });
        return {
          ...order.toObject(),
          customer_name: customer ? customer.customer_name : 'Unknown Customer',
          items
        };
      }));
      return res.status(200).json({ orders: results });
    }

    const queryStr = q.trim();
    
    // Search query: check if bill number or mobile number matches
    // Allow case-insensitive partial match for bill number
    const searchConditions = [
      { bill_number: { $regex: queryStr, $options: 'i' } },
      { mobile_number: { $regex: queryStr, $options: 'i' } }
    ];

    const orders = await Order.find({ $or: searchConditions }).sort({ created_at: -1 });

    const results = await Promise.all(orders.map(async (order) => {
      const customer = await Customer.findOne({ mobile_number: order.mobile_number });
      const items = await OrderItem.find({ bill_number: order.bill_number });
      return {
        ...order.toObject(),
        customer_name: customer ? customer.customer_name : 'Unknown Customer',
        items
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
    const order = await Order.findOne({ bill_number });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const customer = await Customer.findOne({ mobile_number: order.mobile_number });
    const items = await OrderItem.find({ bill_number });

    return res.status(200).json({
      order,
      customer,
      items
    });
  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    return res.status(500).json({ message: 'Server error retrieving order details' });
  }
};
