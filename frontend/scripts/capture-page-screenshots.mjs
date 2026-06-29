import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');
const screenshotDir = path.join(repoRoot, 'screenshot');
const screenshotNames = [];

const viewport = { width: 1440, height: 1400 };
const frontendOrigin = 'http://127.0.0.1:5173';
const apiOrigin = 'http://127.0.0.1:5000';

const cmsData = {
  hero: {
    main_heading: 'Run Your Tailor Shop Without Paper Records',
    sub_heading: 'Manage measurements, orders, bills, customers, employees, expenses and WhatsApp invoices from one place.',
    primary_cta_text: 'Start 14-Day Free Trial',
    secondary_cta_text: 'Watch Demo',
    dashboard_preview_url: ''
  },
  branding: {
    logo_url: '',
    hero_banner_url: '',
    footer_text: 'Built for Modern Tailors',
    support_email: 'support@tailoros.com',
    contact_number: '+91 98765 43210'
  },
  features: [
    { id: 'feat-1', title: 'Customer Directory', description: 'Instant search by customer name or mobile number.', icon: 'group' },
    { id: 'feat-2', title: 'Measurement Records', description: 'Reusable digital measurement sheets for every repeat customer.', icon: 'straighten' },
    { id: 'feat-3', title: 'WhatsApp Billing', description: 'Send polished invoices directly to your customer after every order.', icon: 'send_to_mobile' }
  ],
  plans: [
    { id: 'plan-1', name: 'STARTER', display_name: 'Starter', price: 99, description: 'For solo tailors starting digitally.', features_list: JSON.stringify(['Digital measurements', 'Customer history', 'Invoice generation']), badge_text: 'Try for 1 rupee' },
    { id: 'plan-2', name: 'GROWTH', display_name: 'Growth', price: 499, description: 'For growing shops that want automation.', features_list: JSON.stringify(['Unlimited orders', 'Expense tracking', 'WhatsApp invoices']), badge_text: 'Recommended' },
    { id: 'plan-3', name: 'SCALE', display_name: 'Scale', price: 999, description: 'For high-volume teams and deeper insights.', features_list: JSON.stringify(['Advanced analytics', 'Payroll tools', 'Priority support']), badge_text: 'Best Value' }
  ],
  faqs: [
    { id: 'faq-1', question: 'Does TailorOS work offline?', answer: 'Yes. Orders and customer history can be created offline and synced later.' },
    { id: 'faq-2', question: 'Can I reuse measurements for repeat customers?', answer: 'Yes. TailorOS automatically loads the latest measurement sheet for returning customers.' },
    { id: 'faq-3', question: 'Can invoices be sent on WhatsApp?', answer: 'Yes. Connected shops can send PDF invoices through WhatsApp Web.' }
  ]
};

const owner = {
  id: 'owner-1',
  email: 'owner@tailoros.com',
  shop_code: 'RT-2048',
  shop_name: 'Royal Tailors',
  contact_number: '9876543210',
  shop_logo: 'mock-logo.png',
  is_active: true,
  subscription_tier: 'STARTER',
  subscription_status: 'TRIAL',
  subscription_expiry: '2026-07-10T00:00:00.000Z',
  created_at: '2026-05-15T10:30:00.000Z',
  updated_at: '2026-06-29T08:45:00.000Z'
};

const orders = [
  {
    id: 1001,
    bill_number: 'RT-240601-1',
    mobile_number: '9876543210',
    customer_name: 'Aarav Mehta',
    order_date: '2026-06-28T10:00:00.000Z',
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:30:00.000Z',
    measurement_image_path: 'mock-measurement.png',
    total_amount: 2400,
    advance_amount: 1000,
    balance_amount: 1400,
    status: 'Undelivered',
    delivery_date: null,
    items: [
      { cloth_type: 'Shirt', quantity: 2, price_per_cloth: 500, total_amount: 1000 },
      { cloth_type: 'Pant', quantity: 2, price_per_cloth: 700, total_amount: 1400 }
    ],
    owner
  },
  {
    id: 1002,
    bill_number: 'RT-240603-1',
    mobile_number: '9123456780',
    customer_name: 'Zoya Khan',
    order_date: '2026-06-26T12:15:00.000Z',
    created_at: '2026-06-26T12:15:00.000Z',
    updated_at: '2026-06-27T18:10:00.000Z',
    measurement_image_path: 'mock-measurement.png',
    total_amount: 3200,
    advance_amount: 2000,
    balance_amount: 1200,
    status: 'Ready',
    delivery_date: null,
    items: [
      { cloth_type: 'Suit', quantity: 1, price_per_cloth: 2200, total_amount: 2200 },
      { cloth_type: 'Waistcoat', quantity: 1, price_per_cloth: 1000, total_amount: 1000 }
    ],
    owner
  },
  {
    id: 1003,
    bill_number: 'RT-240610-1',
    mobile_number: '9988776655',
    customer_name: 'Priya Sharma',
    order_date: '2026-06-20T15:45:00.000Z',
    created_at: '2026-06-20T15:45:00.000Z',
    updated_at: '2026-06-22T11:00:00.000Z',
    measurement_image_path: 'mock-measurement.png',
    total_amount: 1800,
    advance_amount: 1800,
    balance_amount: 0,
    status: 'Delivered',
    delivery_date: '2026-06-22T11:00:00.000Z',
    items: [
      { cloth_type: 'Kurta', quantity: 2, price_per_cloth: 900, total_amount: 1800 }
    ],
    owner
  },
  {
    id: 1004,
    bill_number: 'RT-240615-1',
    mobile_number: '9876543210',
    customer_name: 'Aarav Mehta',
    order_date: '2026-06-15T09:30:00.000Z',
    created_at: '2026-06-15T09:30:00.000Z',
    updated_at: '2026-06-16T17:15:00.000Z',
    measurement_image_path: 'mock-measurement.png',
    total_amount: 1500,
    advance_amount: 500,
    balance_amount: 1000,
    status: 'Delivered',
    delivery_date: '2026-06-16T17:15:00.000Z',
    items: [
      { cloth_type: 'Shirt', quantity: 3, price_per_cloth: 500, total_amount: 1500 }
    ],
    owner
  }
];

const customers = [
  {
    mobile_number: '9876543210',
    customer_name: 'Aarav Mehta',
    created_at: '2026-05-12T10:00:00.000Z',
    updated_at: '2026-06-28T10:30:00.000Z'
  },
  {
    mobile_number: '9123456780',
    customer_name: 'Zoya Khan',
    created_at: '2026-05-20T10:00:00.000Z',
    updated_at: '2026-06-27T18:10:00.000Z'
  },
  {
    mobile_number: '9988776655',
    customer_name: 'Priya Sharma',
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-22T11:00:00.000Z'
  }
];

const expenses = [
  {
    month: '2026-06',
    rent: 12000,
    electricity: 3200,
    updated_at: '2026-06-05T09:00:00.000Z'
  }
];

const customExpenses = [
  {
    id: 'ce-1',
    _id: 'ce-1',
    name: 'Sewing threads',
    amount: 450,
    month: '2026-06',
    date: '2026-06-07T10:00:00.000Z',
    created_at: '2026-06-07T10:00:00.000Z',
    updated_at: '2026-06-07T10:00:00.000Z'
  },
  {
    id: 'ce-2',
    _id: 'ce-2',
    name: 'Machine servicing',
    amount: 1800,
    month: '2026-06',
    date: '2026-06-18T14:00:00.000Z',
    created_at: '2026-06-18T14:00:00.000Z',
    updated_at: '2026-06-18T14:00:00.000Z'
  }
];

const clothConfigs = [
  { id: 'cfg-1', _id: 'cfg-1', cloth_type: 'Shirt', default_price: 500, updated_at: '2026-06-01T00:00:00.000Z' },
  { id: 'cfg-2', _id: 'cfg-2', cloth_type: 'Pant', default_price: 700, updated_at: '2026-06-01T00:00:00.000Z' },
  { id: 'cfg-3', _id: 'cfg-3', cloth_type: 'Kurta', default_price: 900, updated_at: '2026-06-01T00:00:00.000Z' },
  { id: 'cfg-4', _id: 'cfg-4', cloth_type: 'Suit', default_price: 2200, updated_at: '2026-06-01T00:00:00.000Z' }
];

const employees = [
  { employee_id: 'emp-1', name: 'Ramesh', base_salary: 12000, status: 'Paid' },
  { employee_id: 'emp-2', name: 'Fatima', base_salary: 15000, status: 'Unpaid' },
  { employee_id: 'emp-3', name: 'Deepak', base_salary: 11000, status: 'Paid' }
];

const adminStats = {
  estimatedMRR: 3293,
  activeCount: 19,
  suspendedCount: 1,
  signupsToday: 3,
  signupsThisMonth: 14,
  totalCustomers: 312,
  totalOrders: 1187,
  statusCounts: {
    TRIAL: 8,
    ACTIVE: 17,
    EXPIRED: 1,
    CANCELLED: 1
  }
};

const adminUsers = [
  {
    id: 'shop-1',
    shop_name: 'Royal Tailors',
    email: 'owner@tailoros.com',
    shop_code: 'RT-2048',
    contact_number: '9876543210',
    subscription_tier: 'STARTER',
    subscription_status: 'TRIAL',
    subscription_expiry: '2026-07-10T00:00:00.000Z',
    created_at: '2026-05-15T10:30:00.000Z',
    is_active: true
  },
  {
    id: 'shop-2',
    shop_name: 'Elegant Stitch',
    email: 'hello@elegantstitch.com',
    shop_code: 'ES-1188',
    contact_number: '9000000011',
    subscription_tier: 'GROWTH',
    subscription_status: 'ACTIVE',
    subscription_expiry: '2026-12-31T00:00:00.000Z',
    created_at: '2026-04-12T12:00:00.000Z',
    is_active: true
  },
  {
    id: 'shop-3',
    shop_name: 'City Bespoke',
    email: 'ops@citybespoke.com',
    shop_code: 'CB-9912',
    contact_number: '9000000042',
    subscription_tier: 'SCALE',
    subscription_status: 'ACTIVE',
    subscription_expiry: '2027-01-31T00:00:00.000Z',
    created_at: '2026-03-08T09:45:00.000Z',
    is_active: false
  }
];

const adminAuditLogs = [
  {
    id: 'log-1',
    action_type: 'CHANGE_PLAN',
    target_shop: 'ES-1188',
    previous_value: 'STARTER',
    new_value: 'GROWTH',
    admin_email: 'admin@tailoros.com',
    timestamp: '2026-06-26T09:30:00.000Z'
  },
  {
    id: 'log-2',
    action_type: 'EXTEND_TRIAL',
    target_shop: 'RT-2048',
    previous_value: '7 days',
    new_value: '14 days',
    admin_email: 'admin@tailoros.com',
    timestamp: '2026-06-25T14:10:00.000Z'
  },
  {
    id: 'log-3',
    action_type: 'EDIT_CMS',
    target_shop: null,
    previous_value: 'Footer text old',
    new_value: 'Built for Modern Tailors',
    admin_email: 'admin@tailoros.com',
    timestamp: '2026-06-20T11:20:00.000Z'
  }
];

const shopMetrics = {
  totalCustomers: customers.length,
  totalOrders: orders.length,
  totalEmployees: 3,
  totalExpenses: 17450
};

const dailyStats = [
  { day: 1, revenue: 1200, profit: 400 },
  { day: 5, revenue: 2400, profit: 1300 },
  { day: 10, revenue: 900, profit: -250 },
  { day: 15, revenue: 3200, profit: 1900 },
  { day: 20, revenue: 1800, profit: 500 },
  { day: 25, revenue: 2800, profit: 1400 },
  { day: 28, revenue: 1400, profit: 300 }
];

const yearlyStats = [
  { label: 'Jan', revenue: 14000, expense: 8000, profit: 6000 },
  { label: 'Feb', revenue: 16500, expense: 9100, profit: 7400 },
  { label: 'Mar', revenue: 15200, expense: 8700, profit: 6500 },
  { label: 'Apr', revenue: 17600, expense: 9200, profit: 8400 },
  { label: 'May', revenue: 18300, expense: 9900, profit: 8400 },
  { label: 'Jun', revenue: 16250, expense: 9050, profit: 7200 }
];

const summaryByMonth = {
  revenue: 16250,
  rent: 12000,
  electricity: 3200,
  salariesPaid: 23000,
  customExpensesPaid: 2250,
  profit: -24200
};

const pixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlAb8sAAAAASUVORK5CYII=',
  'base64'
);

function jsonResponse(route, data, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data)
  });
}

function isApi(url, pathname) {
  return url.origin === apiOrigin && pathname.startsWith('/api/');
}

function buildOrderDetail(billNumber) {
  const order = orders.find((item) => item.bill_number === billNumber) || orders[0];
  const customer = customers.find((item) => item.mobile_number === order.mobile_number) || null;
  return {
    order,
    customer,
    items: order.items
  };
}

async function configureRouting(page) {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const { pathname, searchParams } = requestUrl;

    if (requestUrl.origin === apiOrigin && (pathname === '/mock-logo.png' || pathname === '/mock-measurement.png')) {
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: pixelPng
      });
    }

    if (!isApi(requestUrl, pathname)) {
      return route.continue();
    }

    if (pathname === '/api/admin/cms') {
      return jsonResponse(route, cmsData);
    }

    if (pathname === '/api/auth/profile') {
      return jsonResponse(route, { owner });
    }

    if (pathname === '/api/auth/subscribe') {
      return jsonResponse(route, {
        owner: {
          ...owner,
          subscription_tier: 'GROWTH',
          subscription_status: 'ACTIVE',
          subscription_expiry: '2026-12-31T00:00:00.000Z'
        }
      });
    }

    if (pathname === '/api/whatsapp/verify') {
      return jsonResponse(route, {
        status: 'VERIFIED',
        qr: null,
        error: null
      });
    }

    if (pathname === '/api/whatsapp/test') {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/whatsapp/logout') {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/sync/pull') {
      return jsonResponse(route, {
        orders,
        customers,
        employees: [],
        expenses,
        custom_expenses: customExpenses,
        cloth_configs: clothConfigs,
        server_time: '2026-06-29T09:00:00.000Z'
      });
    }

    if (pathname.startsWith('/api/orders/')) {
      const billNumber = decodeURIComponent(pathname.split('/').at(-1));
      return jsonResponse(route, buildOrderDetail(billNumber));
    }

    if (pathname === '/api/expenses/custom') {
      const month = searchParams.get('month');
      return jsonResponse(route, {
        expenses: customExpenses.filter((item) => !month || item.month === month)
      });
    }

    if (pathname.startsWith('/api/expenses/custom/')) {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/cloth-configs') {
      return jsonResponse(route, { configs: clothConfigs });
    }

    if (pathname === '/api/analytics/salaries') {
      return jsonResponse(route, { employees });
    }

    if (pathname === '/api/analytics/expenses') {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/analytics/salaries/toggle') {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/employees') {
      return jsonResponse(route, { success: true });
    }

    if (pathname.startsWith('/api/employees/')) {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/admin/setup-check') {
      return jsonResponse(route, { needsSetup: false });
    }

    if (pathname === '/api/admin/stats') {
      return jsonResponse(route, adminStats);
    }

    if (pathname === '/api/admin/users') {
      return jsonResponse(route, { users: adminUsers });
    }

    if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/extend-trial')) {
      return jsonResponse(route, { success: true });
    }

    if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/change-plan')) {
      return jsonResponse(route, { success: true });
    }

    if (pathname.startsWith('/api/admin/users/') && pathname.endsWith('/reset')) {
      return jsonResponse(route, { success: true });
    }

    if (pathname.startsWith('/api/admin/users/') && (pathname.endsWith('/suspend') || pathname.endsWith('/reactivate'))) {
      return jsonResponse(route, { success: true });
    }

    if (pathname.startsWith('/api/admin/users/')) {
      return jsonResponse(route, { metrics: shopMetrics });
    }

    if (pathname === '/api/admin/audit-logs') {
      return jsonResponse(route, { logs: adminAuditLogs });
    }

    if (pathname.startsWith('/api/admin/cms/')) {
      return jsonResponse(route, { success: true });
    }

    if (pathname === '/api/analytics/daily') {
      return jsonResponse(route, { dailyStats });
    }

    if (pathname === '/api/analytics/yearly') {
      return jsonResponse(route, { yearlyStats });
    }

    if (pathname === '/api/analytics/summary') {
      return jsonResponse(route, summaryByMonth);
    }

    return jsonResponse(route, { ok: true });
  });
}

async function prepareOutputDirectory() {
  await fs.rm(screenshotDir, { recursive: true, force: true });
  await fs.mkdir(screenshotDir, { recursive: true });
}

async function saveScreenshot(page, fileName, options = {}) {
  const outputPath = path.join(screenshotDir, fileName);
  await page.screenshot({
    path: outputPath,
    fullPage: true,
    animations: 'disabled',
    ...options
  });
  screenshotNames.push(fileName);
}

async function waitForLanding(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=TailorOS');
  await page.waitForSelector('text=Choose the Perfect Fit for Your Shop');
}

async function waitForAppShell(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('text=TailorOS');
  await page.waitForSelector('text=Cloud Sync Active');
}

async function capturePublicPages(browser) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await configureRouting(page);

  await page.goto(frontendOrigin, { waitUntil: 'domcontentloaded' });
  await waitForLanding(page);
  await saveScreenshot(page, 'landing-page.png');

  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForSelector('text=Sign in to manage your shop');
  await saveScreenshot(page, 'auth-login-page.png');

  await page.getByRole('button', { name: 'Sign up for free' }).click();
  await page.waitForSelector('text=Create an account to digitize your shop');
  await saveScreenshot(page, 'auth-signup-page.png');

  await context.close();
}

async function captureOwnerPages(browser) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((payload) => {
    window.localStorage.setItem('tailor_token', payload.token);
    window.localStorage.setItem('tailor_user', JSON.stringify(payload.user));
  }, {
    token: 'mock-owner-token',
    user: owner
  });

  const page = await context.newPage();
  await configureRouting(page);

  await page.goto(frontendOrigin, { waitUntil: 'domcontentloaded' });
  await waitForAppShell(page);
  await page.waitForSelector('text=New Order');
  await page.waitForTimeout(1500);
  await saveScreenshot(page, 'new-order-page.png');

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await page.waitForSelector('text=Active Orders');
  await page.waitForSelector('text=Aarav Mehta');
  await saveScreenshot(page, 'dashboard-page.png');

  await page.getByRole('button', { name: 'Customers' }).click();
  await page.waitForSelector('text=Selected Customer');
  await page.waitForSelector('text=No orders recorded for this customer.', { state: 'detached', timeout: 10000 }).catch(() => {});
  await saveScreenshot(page, 'customers-page.png');

  await page.getByRole('button', { name: 'Sales & Expenses' }).click();
  await page.waitForSelector('text=Sales & Expenses');
  await page.waitForSelector('text=Default Cloth Pricing');
  await saveScreenshot(page, 'analytics-page.png');

  await page.getByRole('button', { name: 'Upgrade Plan' }).click();
  await page.waitForSelector('text=TailorOS Shop Settings');
  await page.waitForSelector('text=WhatsApp Web Integration (Beta)');
  await saveScreenshot(page, 'profile-page.png');

  await context.close();
}

async function captureAdminPages(browser) {
  const loginContext = await browser.newContext({ viewport });
  const loginPage = await loginContext.newPage();
  await configureRouting(loginPage);
  await loginPage.goto(`${frontendOrigin}/admin`, { waitUntil: 'domcontentloaded' });
  await loginPage.waitForSelector('text=TailorOS Central Admin');
  await saveScreenshot(loginPage, 'admin-login-page.png');
  await loginContext.close();

  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
    window.localStorage.setItem('tailor_admin_token', 'mock-admin-token');
  });
  const page = await context.newPage();
  await configureRouting(page);

  await page.goto(`${frontendOrigin}/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Platform Overview');
  await saveScreenshot(page, 'admin-overview-page.png');

  await page.getByRole('button', { name: 'Shop Owners Registry' }).click();
  await page.waitForSelector('text=Royal Tailors');
  await saveScreenshot(page, 'admin-users-page.png');

  await page.getByRole('button', { name: 'Landing Page CMS' }).click();
  await page.waitForSelector('text=FAQ List');
  await saveScreenshot(page, 'admin-cms-page.png');

  await page.getByRole('button', { name: 'Moderator Audit Logs' }).click();
  await page.waitForSelector('text=Security history of administrative modifications');
  await saveScreenshot(page, 'admin-audit-page.png');

  await context.close();
}

async function writeManifest() {
  const manifestPath = path.join(screenshotDir, 'screenshot-names.txt');
  await fs.writeFile(manifestPath, `${screenshotNames.join('\n')}\n`, 'utf8');
}

async function main() {
  await prepareOutputDirectory();

  const browser = await chromium.launch({ headless: true });
  try {
    await capturePublicPages(browser);
    await captureOwnerPages(browser);
    await captureAdminPages(browser);
  } finally {
    await browser.close();
  }

  await writeManifest();
  console.log(`Saved ${screenshotNames.length} screenshots to ${screenshotDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
