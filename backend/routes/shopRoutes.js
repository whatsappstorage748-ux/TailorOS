import express from 'express';
import {
  getCustomerByMobile,
  getCustomerHistory,
  getAllCustomers
} from '../controllers/customerController.js';
import {
  createOrder,
  completeOrder,
  searchOrders,
  getOrderDetails
} from '../controllers/orderController.js';
import {
  getDashboardStats
} from '../controllers/dashboardController.js';
import {
  getAnalyticsSummary,
  saveExpenses,
  getEmployeeSalaries,
  toggleEmployeeSalary,
  getDailyBreakdown,
  getCustomExpenses,
  createCustomExpense,
  deleteCustomExpense,
  addEmployee,
  updateEmployee,
  getClothConfigs,
  saveClothConfig
} from '../controllers/analyticsController.js';

const router = express.Router();

// Customer CRM routes
router.get('/customers', getAllCustomers); // Load all customers list
router.get('/customers/:mobile', getCustomerByMobile);
router.get('/customers/:mobile/history', getCustomerHistory);

// Order routes
router.post('/orders', createOrder);
router.get('/orders/search', searchOrders);
router.get('/orders/:bill_number', getOrderDetails);
router.put('/orders/:bill_number/complete', completeOrder);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);

// Analytics & Expenses routes
router.get('/analytics/summary', getAnalyticsSummary);
router.get('/analytics/daily', getDailyBreakdown);
router.post('/analytics/expenses', saveExpenses);
router.get('/analytics/salaries', getEmployeeSalaries);
router.post('/analytics/salaries/toggle', toggleEmployeeSalary);

// Custom Expenses routes
router.get('/expenses/custom', getCustomExpenses);
router.post('/expenses/custom', createCustomExpense);
router.delete('/expenses/custom/:id', deleteCustomExpense);

// Employee Registry routes
router.post('/employees', addEmployee);
router.put('/employees/:id', updateEmployee);

// Cloth pricing configurations routes
router.get('/cloth-configs', getClothConfigs);
router.post('/cloth-configs', saveClothConfig);

export default router;
