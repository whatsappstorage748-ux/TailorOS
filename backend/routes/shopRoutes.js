import express from 'express';
import {
  getCustomerByMobile,
  getCustomerHistory,
  getAllCustomers
} from '../controllers/customerController.js';
import {
  createOrder,
  completeOrder,
  readyOrder,
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
  getYearlyBreakdown,
  getCustomExpenses,
  createCustomExpense,
  deleteCustomExpense,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getClothConfigs,
  saveClothConfig
} from '../controllers/analyticsController.js';
import { pullServerChanges } from '../controllers/syncController.js';
import { getWhatsAppStatus, logoutWhatsAppDevice, verifyWhatsAppStatus, sendWhatsAppTest } from '../controllers/whatsappController.js';

const router = express.Router();

// Customer CRM routes
router.get('/customers', getAllCustomers); // Load all customers list
router.get('/customers/:mobile', getCustomerByMobile);
router.get('/customers/:mobile/history', getCustomerHistory);

// Order routes
router.post('/orders', createOrder);
router.get('/orders/search', searchOrders);
router.get('/orders/:bill_number', getOrderDetails);
router.put('/orders/:bill_number/ready', readyOrder);
router.put('/orders/:bill_number/complete', completeOrder);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);

// Analytics & Expenses routes
router.get('/analytics/summary', getAnalyticsSummary);
router.get('/analytics/daily', getDailyBreakdown);
router.get('/analytics/yearly', getYearlyBreakdown);
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
router.delete('/employees/:id', deleteEmployee);

// Cloth pricing configurations routes
router.get('/cloth-configs', getClothConfigs);
router.post('/cloth-configs', saveClothConfig);

// WhatsApp Web Integration routes
router.get('/whatsapp/status', getWhatsAppStatus);
router.post('/whatsapp/logout', logoutWhatsAppDevice);
router.get('/whatsapp/verify', verifyWhatsAppStatus);
router.post('/whatsapp/test', sendWhatsAppTest);

// Offline Sync Routes
router.get('/sync/pull', pullServerChanges);

export default router;
