import express from 'express';
import {
  setupCheck,
  setupAdmin,
  loginAdmin,
  getPlatformStats,
  getShopOwners,
  getShopOwnerDetail,
  suspendShop,
  reactivateShop,
  extendTrial,
  changePlan,
  resetSubscription,
  getAuditLogs,
  getCMSContent,
  editHero,
  editBranding,
  addFeature,
  editFeature,
  deleteFeature,
  editPlan,
  addFAQ,
  editFAQ,
  deleteFAQ
} from '../controllers/adminController.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public routes for setup/login
router.get('/setup-check', setupCheck);
router.post('/setup', setupAdmin);
router.post('/login', loginAdmin);

// Public CMS endpoint for the landing page
router.get('/cms', getCMSContent);

// Protected admin routes
router.get('/stats', adminMiddleware, getPlatformStats);
router.get('/users', adminMiddleware, getShopOwners);
router.get('/users/:id', adminMiddleware, getShopOwnerDetail);
router.post('/users/:id/suspend', adminMiddleware, suspendShop);
router.post('/users/:id/reactivate', adminMiddleware, reactivateShop);
router.post('/users/:id/extend-trial', adminMiddleware, extendTrial);
router.post('/users/:id/change-plan', adminMiddleware, changePlan);
router.post('/users/:id/reset', adminMiddleware, resetSubscription);
router.get('/audit-logs', adminMiddleware, getAuditLogs);

// CMS Edit routes (protected)
router.put('/cms/hero', adminMiddleware, editHero);
router.put('/cms/branding', adminMiddleware, editBranding);
router.post('/cms/plans', adminMiddleware, editPlan);

// Features CRUD
router.post('/cms/features', adminMiddleware, addFeature);
router.put('/cms/features/:id', adminMiddleware, editFeature);
router.delete('/cms/features/:id', adminMiddleware, deleteFeature);

// FAQ CRUD
router.post('/cms/faqs', adminMiddleware, addFAQ);
router.put('/cms/faqs/:id', adminMiddleware, editFAQ);
router.delete('/cms/faqs/:id', adminMiddleware, deleteFAQ);

export default router;
