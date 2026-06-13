import Order from '../models/Order.js';

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total Orders
    const totalOrders = await Order.countDocuments();

    // 2. Undelivered Orders
    const undeliveredOrders = await Order.countDocuments({ status: 'Undelivered' });

    // 3. Delivered Orders
    const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });

    // 4. Today's Revenue:
    // Any advance/full amount collected for orders created today, plus balance collected for orders completed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const ordersCreatedTodayList = await Order.find({
      created_at: { $gte: startOfToday, $lte: endOfToday }
    });
    const revenueFromCreatedToday = ordersCreatedTodayList.reduce((sum, order) => {
      const contribution = order.status === 'Delivered' ? order.total_amount : order.advance_amount;
      return sum + contribution;
    }, 0);

    const ordersCompletedTodayButCreatedBefore = await Order.find({
      delivery_date: { $gte: startOfToday, $lte: endOfToday },
      created_at: { $lt: startOfToday }
    });
    const revenueFromBalancesToday = ordersCompletedTodayButCreatedBefore.reduce((sum, order) => sum + order.balance_amount, 0);

    const todayRevenue = revenueFromCreatedToday + revenueFromBalancesToday;

    // 5. Today's Orders
    const todayOrders = await Order.countDocuments({
      created_at: { $gte: startOfToday, $lte: endOfToday }
    });

    return res.status(200).json({
      totalOrders,
      undeliveredOrders,
      deliveredOrders,
      todayRevenue,
      todayOrders
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return res.status(500).json({ message: 'Server error retrieving dashboard stats' });
  }
};
