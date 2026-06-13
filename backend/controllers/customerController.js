import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

// Get customer by mobile number (for auto-detecting existing customers)
export const getCustomerByMobile = async (req, res) => {
  try {
    const { mobile } = req.params;
    const customer = await Customer.findOne({ mobile_number: mobile });
    if (!customer) {
      return res.status(200).json({ exists: false, customer: null });
    }
    const latestOrder = await Order.findOne({ mobile_number: mobile }).sort({ created_at: -1 });
    return res.status(200).json({
      exists: true,
      customer,
      measurement_image_path: latestOrder ? latestOrder.measurement_image_path : null
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
    const customer = await Customer.findOne({ mobile_number: mobile });
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const orders = await Order.find({ mobile_number: mobile }).sort({ order_date: -1 });

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
    let query = {};
    if (q) {
      const searchStr = q.trim();
      query = {
        $or: [
          { customer_name: { $regex: searchStr, $options: 'i' } },
          { mobile_number: { $regex: searchStr, $options: 'i' } }
        ]
      };
    }

    const customers = await Customer.find(query).sort({ created_at: -1 });

    const results = await Promise.all(customers.map(async (cust) => {
      const orderCount = await Order.countDocuments({ mobile_number: cust.mobile_number });
      return {
        ...cust.toObject(),
        order_count: orderCount
      };
    }));

    return res.status(200).json({ customers: results });
  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    return res.status(500).json({ message: 'Server error retrieving customers list' });
  }
};

