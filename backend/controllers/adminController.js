import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_tailor_saas_key';

// Helper to log administrative actions
const logAdminAction = async (admin_email, action_type, target_shop, prev_val, new_val) => {
  try {
    await prisma.adminAuditLog.create({
      data: {
        admin_email,
        action_type,
        target_shop,
        previous_value: prev_val ? String(prev_val) : null,
        new_value: new_val ? String(new_val) : null
      }
    });
  } catch (err) {
    console.error('Failed to log admin action:', err);
  }
};

// Check if first-time setup is needed
export const setupCheck = async (req, res) => {
  try {
    const adminCount = await prisma.admin.count();
    res.status(200).json({ needsSetup: adminCount === 0 });
  } catch (error) {
    console.error('Setup check error:', error);
    res.status(500).json({ message: 'Server error checking setup status' });
  }
};

// Create the first admin account
export const setupAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const adminCount = await prisma.admin.count();
    if (adminCount > 0) {
      return res.status(400).json({ message: 'Setup already completed. Please login instead.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const admin = await prisma.admin.create({
      data: { email, password_hash }
    });

    await logAdminAction(email, 'SETUP_ADMIN', 'Platform', null, 'First admin created');

    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'Admin account setup completed successfully',
      token,
      email: admin.email
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ message: 'Server error setting up admin' });
  }
};

// Login admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      token,
      email: admin.email
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login' });
  }
};

// Get Platform Revenue and Signup Analytics
export const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await prisma.shopOwner.count();
    const trialUsers = await prisma.shopOwner.count({ where: { subscription_status: 'TRIAL' } });
    const activeSubscribers = await prisma.shopOwner.count({ where: { subscription_status: 'ACTIVE' } });
    const expiredSubscribers = await prisma.shopOwner.count({ where: { subscription_status: 'EXPIRED' } });
    const cancelledSubscribers = await prisma.shopOwner.count({ where: { subscription_status: 'CANCELLED' } });

    // Platform totals
    const totalOrders = await prisma.order.count();
    const totalCustomers = await prisma.customer.count();

    // Signup stats
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const signupsToday = await prisma.shopOwner.count({
      where: { created_at: { gte: startOfToday } }
    });

    const signupsThisMonth = await prisma.shopOwner.count({
      where: { created_at: { gte: startOfMonth } }
    });

    // Compute MRR based on active subscribers
    const activeShops = await prisma.shopOwner.findMany({
      where: { subscription_status: 'ACTIVE' },
      select: { subscription_tier: true }
    });

    let estimatedMRR = 0;
    activeShops.forEach(shop => {
      if (shop.subscription_tier === 'STARTER') estimatedMRR += 99;
      else if (shop.subscription_tier === 'GROWTH') estimatedMRR += 499;
      else if (shop.subscription_tier === 'SCALE') estimatedMRR += 999;
    });

    const suspendedCount = await prisma.shopOwner.count({ where: { is_active: false } });

    res.status(200).json({
      estimatedMRR,
      activeCount: activeSubscribers,
      suspendedCount,
      statusCounts: {
        TRIAL: trialUsers,
        ACTIVE: activeSubscribers,
        EXPIRED: expiredSubscribers,
        CANCELLED: cancelledSubscribers
      },
      signupsToday,
      signupsThisMonth,
      totalCustomers,
      totalOrders,
      estimatedAnnualRevenue: estimatedMRR * 12
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ message: 'Server error retrieving stats' });
  }
};

// List all registered shop owners
export const getShopOwners = async (req, res) => {
  try {
    const owners = await prisma.shopOwner.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        shop_code: true,
        shop_name: true,
        contact_number: true,
        shop_logo: true,
        is_active: true,
        subscription_tier: true,
        subscription_status: true,
        subscription_expiry: true,
        last_login_date: true,
        created_at: true
      }
    });
    res.status(200).json({ users: owners });
  } catch (error) {
    console.error('Get shop owners error:', error);
    res.status(500).json({ message: 'Server error retrieving shop owners list' });
  }
};

// Get detailed shop stats (customers count, orders, employees, expenses)
export const getShopOwnerDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shopOwner.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        shop_code: true,
        shop_name: true,
        contact_number: true,
        shop_logo: true,
        is_active: true,
        subscription_tier: true,
        subscription_status: true,
        subscription_expiry: true,
        last_login_date: true,
        created_at: true
      }
    });

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const customersCount = await prisma.customer.count({ where: { owner_id: id } });
    const ordersCount = await prisma.order.count({ where: { owner_id: id } });
    const employeesCount = await prisma.employee.count({ where: { owner_id: id } });

    // Sum custom expenses
    const expensesAgg = await prisma.customExpense.aggregate({
      where: { owner_id: id },
      _sum: { amount: true }
    });
    const expensesTotal = expensesAgg._sum.amount || 0;

    res.status(200).json({
      shop,
      metrics: {
        totalCustomers: customersCount,
        totalOrders: ordersCount,
        totalEmployees: employeesCount,
        totalExpenses: expensesTotal
      }
    });
  } catch (error) {
    console.error('Get shop detail error:', error);
    res.status(500).json({ message: 'Server error retrieving shop details' });
  }
};

// Suspend a shop owner
export const suspendShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shopOwner.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: 'Shop owner not found' });

    const updated = await prisma.shopOwner.update({
      where: { id },
      data: { is_active: false }
    });

    await logAdminAction(req.user.email, 'SUSPEND_SHOP', shop.shop_code, 'active: true', 'active: false');

    res.status(200).json({ message: 'Shop suspended successfully', shop: updated });
  } catch (error) {
    console.error('Suspend shop error:', error);
    res.status(500).json({ message: 'Server error suspending shop' });
  }
};

// Reactivate a suspended shop
export const reactivateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shopOwner.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: 'Shop owner not found' });

    const updated = await prisma.shopOwner.update({
      where: { id },
      data: { is_active: true }
    });

    await logAdminAction(req.user.email, 'REACTIVATE_SHOP', shop.shop_code, 'active: false', 'active: true');

    res.status(200).json({ message: 'Shop reactivated successfully', shop: updated });
  } catch (error) {
    console.error('Reactivate shop error:', error);
    res.status(500).json({ message: 'Server error reactivating shop' });
  }
};

// Extend trial expiry
export const extendTrial = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    if (!days || isNaN(days)) {
      return res.status(400).json({ message: 'Please provide a valid number of days to extend' });
    }

    const shop = await prisma.shopOwner.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: 'Shop owner not found' });

    const currentExpiry = shop.subscription_expiry ? new Date(shop.subscription_expiry) : new Date();
    currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));

    const updated = await prisma.shopOwner.update({
      where: { id },
      data: {
        subscription_expiry: currentExpiry,
        subscription_status: 'TRIAL' // Ensure reset back to trial if they were expired
      }
    });

    await logAdminAction(req.user.email, 'EXTEND_TRIAL', shop.shop_code, shop.subscription_expiry, currentExpiry);

    res.status(200).json({ message: 'Trial extended successfully', shop: updated });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(500).json({ message: 'Server error extending trial' });
  }
};

// Change subscription tier/plan manually
export const changePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;

    if (!['STARTER', 'GROWTH', 'SCALE'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    const shop = await prisma.shopOwner.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: 'Shop owner not found' });

    const updated = await prisma.shopOwner.update({
      where: { id },
      data: {
        subscription_tier: plan,
        subscription_status: 'ACTIVE'
      }
    });

    await logAdminAction(req.user.email, 'CHANGE_PLAN', shop.shop_code, shop.subscription_tier, plan);

    res.status(200).json({ message: 'Plan updated successfully', shop: updated });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({ message: 'Server error changing plan' });
  }
};

// Reset subscription status
export const resetSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const shop = await prisma.shopOwner.findUnique({ where: { id } });
    if (!shop) return res.status(404).json({ message: 'Shop owner not found' });

    const updated = await prisma.shopOwner.update({
      where: { id },
      data: {
        subscription_tier: 'STARTER',
        subscription_status: 'TRIAL',
        subscription_expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });

    await logAdminAction(req.user.email, 'RESET_SUBSCRIPTION', shop.shop_code, 'ACTIVE', 'TRIAL');

    res.status(200).json({ message: 'Subscription reset to 14-day trial successfully', shop: updated });
  } catch (error) {
    console.error('Reset subscription error:', error);
    res.status(500).json({ message: 'Server error resetting subscription' });
  }
};

// Get all audit logs
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.status(200).json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error retrieving audit logs' });
  }
};

// Get Landing Page CMS Content
export const getCMSContent = async (req, res) => {
  try {
    const hero = await prisma.landingHero.findUnique({ where: { id: 'hero' } });
    const branding = await prisma.landingBranding.findUnique({ where: { id: 'branding' } });
    const features = await prisma.landingFeature.findMany();
    const plans = await prisma.landingPlan.findMany();
    const faqs = await prisma.landingFAQ.findMany();

    res.status(200).json({ hero, branding, features, plans, faqs });
  } catch (error) {
    console.error('Get CMS Content error:', error);
    res.status(500).json({ message: 'Server error retrieving landing content' });
  }
};

// Edit Hero section CMS
export const editHero = async (req, res) => {
  try {
    const { main_heading, sub_heading, primary_cta_text, secondary_cta_text, dashboard_preview_url } = req.body;
    const updated = await prisma.landingHero.upsert({
      where: { id: 'hero' },
      update: { main_heading, sub_heading, primary_cta_text, secondary_cta_text, dashboard_preview_url },
      create: { id: 'hero', main_heading, sub_heading, primary_cta_text, secondary_cta_text, dashboard_preview_url }
    });

    await logAdminAction(req.user.email, 'EDIT_CMS_HERO', 'LandingPage', null, 'Hero updated');
    res.status(200).json({ message: 'Hero section updated successfully', hero: updated });
  } catch (error) {
    console.error('Edit hero error:', error);
    res.status(500).json({ message: 'Server error updating hero section' });
  }
};

// Edit Branding configurations CMS
export const editBranding = async (req, res) => {
  try {
    const { logo_url, hero_banner_url, footer_text, support_email, contact_number } = req.body;
    const updated = await prisma.landingBranding.upsert({
      where: { id: 'branding' },
      update: { logo_url, hero_banner_url, footer_text, support_email, contact_number },
      create: { id: 'branding', logo_url, hero_banner_url, footer_text, support_email, contact_number }
    });

    await logAdminAction(req.user.email, 'EDIT_CMS_BRANDING', 'LandingPage', null, 'Branding updated');
    res.status(200).json({ message: 'Branding controls updated successfully', branding: updated });
  } catch (error) {
    console.error('Edit branding error:', error);
    res.status(500).json({ message: 'Server error updating branding controls' });
  }
};

// Features CRUD
export const addFeature = async (req, res) => {
  try {
    const { title, description, icon } = req.body;
    const feature = await prisma.landingFeature.create({
      data: { title, description, icon }
    });
    await logAdminAction(req.user.email, 'ADD_CMS_FEATURE', 'LandingPage', null, title);
    res.status(201).json({ message: 'Feature added', feature });
  } catch (error) {
    console.error('Add feature error:', error);
    res.status(500).json({ message: 'Server error adding feature' });
  }
};

export const editFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, icon } = req.body;
    const feature = await prisma.landingFeature.update({
      where: { id },
      data: { title, description, icon }
    });
    await logAdminAction(req.user.email, 'EDIT_CMS_FEATURE', 'LandingPage', id, title);
    res.status(200).json({ message: 'Feature updated', feature });
  } catch (error) {
    console.error('Edit feature error:', error);
    res.status(500).json({ message: 'Server error updating feature' });
  }
};

export const deleteFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await prisma.landingFeature.delete({ where: { id } });
    await logAdminAction(req.user.email, 'DELETE_CMS_FEATURE', 'LandingPage', id, deleted.title);
    res.status(200).json({ message: 'Feature deleted', feature: deleted });
  } catch (error) {
    console.error('Delete feature error:', error);
    res.status(500).json({ message: 'Server error deleting feature' });
  }
};

// Plan Pricing Editor
export const editPlan = async (req, res) => {
  try {
    const { name, price, display_name, description, features_list, badge_text } = req.body;
    const updated = await prisma.landingPlan.upsert({
      where: { name },
      update: { price, display_name, description, features_list, badge_text },
      create: { name, price, display_name, description, features_list, badge_text }
    });

    await logAdminAction(req.user.email, 'EDIT_CMS_PLAN', 'LandingPage', name, `${display_name}: ₹${price}`);
    res.status(200).json({ message: 'Pricing plan updated successfully', plan: updated });
  } catch (error) {
    console.error('Edit plan error:', error);
    res.status(500).json({ message: 'Server error updating pricing plan' });
  }
};

// FAQ CRUD
export const addFAQ = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const faq = await prisma.landingFAQ.create({
      data: { question, answer }
    });
    await logAdminAction(req.user.email, 'ADD_CMS_FAQ', 'LandingPage', null, question);
    res.status(201).json({ message: 'FAQ added', faq });
  } catch (error) {
    console.error('Add FAQ error:', error);
    res.status(500).json({ message: 'Server error adding FAQ' });
  }
};

export const editFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;
    const faq = await prisma.landingFAQ.update({
      where: { id },
      data: { question, answer }
    });
    await logAdminAction(req.user.email, 'EDIT_CMS_FAQ', 'LandingPage', id, question);
    res.status(200).json({ message: 'FAQ updated', faq });
  } catch (error) {
    console.error('Edit FAQ error:', error);
    res.status(500).json({ message: 'Server error updating FAQ' });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await prisma.landingFAQ.delete({ where: { id } });
    await logAdminAction(req.user.email, 'DELETE_CMS_FAQ', 'LandingPage', id, deleted.question);
    res.status(200).json({ message: 'FAQ deleted', faq: deleted });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ message: 'Server error deleting FAQ' });
  }
};
