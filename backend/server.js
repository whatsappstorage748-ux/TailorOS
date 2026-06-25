import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import shopRoutes from './routes/shopRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { authMiddleware } from './middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

// Global error handlers to prevent async library errors from crashing the server
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception caught:', error);
});

// Patch BigInt to serialize to JSON as a Number
BigInt.prototype.toJSON = function() {
  return Number(this);
};

const app = express();
const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.resolve('uploads')));

// Public Auth routes
app.use('/api/auth', authRoutes);

// Public/Admin routes
app.use('/api/admin', adminRoutes);

// Protected routes
app.use('/api', authMiddleware, shopRoutes);

// Seed CMS database if empty
const seedCMSIfEmpty = async () => {
  try {
    // 1. Hero
    const heroCount = await prisma.landingHero.count();
    if (heroCount === 0) {
      await prisma.landingHero.create({
        data: {
          id: 'hero',
          main_heading: 'Run Your Tailor Shop Without Paper Records',
          sub_heading: 'Manage measurements, orders, bills, customers, employees, expenses and WhatsApp invoices from one place.',
          primary_cta_text: 'Start 14-Day Free Trial',
          secondary_cta_text: 'Watch Demo',
          dashboard_preview_url: ''
        }
      });
      console.log('Seeded Hero CMS defaults');
    }

    // 2. Branding
    const brandingCount = await prisma.landingBranding.count();
    if (brandingCount === 0) {
      await prisma.landingBranding.create({
        data: {
          id: 'branding',
          logo_url: '',
          hero_banner_url: '',
          footer_text: 'Built for Modern Tailors',
          support_email: 'support@tailoros.com',
          contact_number: '+91 98765 43210'
        }
      });
      console.log('Seeded Branding CMS defaults');
    }

    // 3. Features
    const featuresCount = await prisma.landingFeature.count();
    if (featuresCount === 0) {
      await prisma.landingFeature.createMany({
        data: [
          { title: 'Customer Management', icon: 'group', description: 'Save customers permanently and find them instantly using mobile numbers.' },
          { title: 'Digital Measurements', icon: 'straighten', description: 'Store handwritten measurements digitally and reuse them anytime.' },
          { title: 'Smart Billing', icon: 'receipt_long', description: 'Automatic bill numbering and support for returning customer bill series.' },
          { title: 'WhatsApp Invoices', icon: 'send_to_mobile', description: 'Generate PDF invoices and send them directly to customers.' },
          { title: 'Employee Management', icon: 'badge', description: 'Track salaries, advances and payroll.' },
          { title: 'Expense Tracking', icon: 'monitoring', description: 'Monitor business expenses and profitability.' }
        ]
      });
      console.log('Seeded Feature CMS defaults');
    }

    // 4. Plans
    const plansCount = await prisma.landingPlan.count();
    if (plansCount === 0) {
      await prisma.landingPlan.createMany({
        data: [
          {
            name: 'STARTER',
            display_name: 'Starter',
            price: 99,
            description: 'Best for small tailor shops starting to digitize.',
            features_list: JSON.stringify(['Digital measurements', 'Customer directory', 'Standard invoice generation']),
            badge_text: 'Try for 1 rupee'
          },
          {
            name: 'GROWTH',
            display_name: 'Growth',
            price: 499,
            description: 'Recommended for busy shops needing full features.',
            features_list: JSON.stringify(['Unlimited orders', 'WhatsApp PDF invoices', 'Employee payroll tracker', 'Full expense manager']),
            badge_text: 'Recommended'
          },
          {
            name: 'SCALE',
            display_name: 'Scale',
            price: 999,
            description: 'Best for large tailoring chains and fashion design houses.',
            features_list: JSON.stringify(['Multiple staff members', 'Advanced analytics dashboard', 'Dedicated account support']),
            badge_text: 'Best Value'
          }
        ]
      });
      console.log('Seeded Plan CMS defaults');
    }

    // 5. FAQs
    const faqsCount = await prisma.landingFAQ.count();
    if (faqsCount === 0) {
      await prisma.landingFAQ.createMany({
        data: [
          { question: 'Is my data safe?', answer: 'Yes, TailorOS runs on secure cloud databases with daily backups.' },
          { question: 'Can I use TailorOS on mobile?', answer: 'Yes, the interface is fully responsive and supports both Android and iOS devices.' },
          { question: 'What happens after the trial ends?', answer: 'You will be prompted to upgrade to one of our premium plans to continue using the dashboard. Your data will remain safe.' },
          { question: 'Can I export my data?', answer: 'Yes, you can export your customers, orders, and expenses at any time.' },
          { question: 'Can multiple staff members use TailorOS?', answer: 'Yes, multiple staff members can log in using your store credentials to work simultaneously.' }
        ]
      });
      console.log('Seeded FAQ CMS defaults');
    }
  } catch (err) {
    console.error('Failed to seed CMS defaults:', err);
  }
};

// Serve static frontend files from 'public' folder in production
const publicPath = path.resolve('public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Static index.html not found. Backend server is active.');
    }
  });
});

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL via Prisma');
    await seedCMSIfEmpty();
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.error('Database connection error:', error);
  }
});

