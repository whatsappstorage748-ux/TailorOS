import assert from 'assert';
import { PrismaClient } from '@prisma/client';

async function runSaaSTests() {
  const host = 'http://127.0.0.1:5000';
  const adminEmail = 'test_admin@tailoros.com';
  const adminPassword = 'adminpassword123';
  const testShopEmail = 'saas_owner@example.com';
  const testShopPassword = 'password123';

  console.log('Cleaning up database state for SaaS test...');
  const prisma = new PrismaClient();
  await prisma.$connect();

  // Clean up test admin
  await prisma.adminAuditLog.deleteMany({});
  await prisma.admin.deleteMany({ where: { email: adminEmail } });

  // Clean up test shop owner
  const shop = await prisma.shopOwner.findUnique({ where: { email: testShopEmail } });
  if (shop) {
    await prisma.clothConfig.deleteMany({ where: { owner_id: shop.id } });
    await prisma.customer.deleteMany({ where: { owner_id: shop.id } });
    await prisma.orderItem.deleteMany({ where: { order: { owner_id: shop.id } } });
    await prisma.order.deleteMany({ where: { owner_id: shop.id } });
    await prisma.shopOwner.delete({ where: { id: shop.id } });
  }

  await prisma.$disconnect();

  console.log('====================================================');
  console.log('Starting SaaS & Admin Verification Tests...');
  console.log('====================================================');

  // 1. Check setup
  console.log('1. Verifying setup-check status...');
  const setupCheckRes = await fetch(`${host}/api/admin/setup-check`);
  const setupCheckData = await setupCheckRes.json();
  console.log(`   Needs setup: ${setupCheckData.needsSetup}`);
  assert.ok(setupCheckData.hasOwnProperty('needsSetup'), 'Response must contain needsSetup flag');

  // 2. Perform Setup
  console.log('\n2. Testing admin setup registration...');
  const setupRes = await fetch(`${host}/api/admin/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  if (!setupRes.ok) {
    throw new Error(`Admin setup failed: ${await setupRes.text()}`);
  }
  const setupData = await setupRes.json();
  const adminToken = setupData.token;
  console.log(`   Successfully created admin account and received JWT token`);
  assert.ok(adminToken, 'Admin setup must return a token');

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 3. Admin Login
  console.log('\n3. Testing admin login...');
  const loginRes = await fetch(`${host}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  assert.strictEqual(loginRes.status, 200, 'Login should return 200 OK');
  const loginData = await loginRes.json();
  console.log(`   Logged in successfully. Token: ${loginData.token.substring(0, 15)}...`);
  assert.ok(loginData.token, 'Login must return a token');

  // 4. Create a Shop Owner to Moderate
  console.log('\n4. Creating a shop owner for moderation tests...');
  const signupRes = await fetch(`${host}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testShopEmail,
      password: testShopPassword,
      shop_name: 'SaaS Test Shop',
      contact_number: '1234567890'
    })
  });
  const signupData = await signupRes.json();
  const shopId = signupData.owner.id;
  const shopCode = signupData.owner.shop_code;
  console.log(`   Created shop owner: ${signupData.owner.shop_name} - Code: ${shopCode}`);
  assert.strictEqual(signupData.owner.subscription_status, 'TRIAL', 'Default status must be TRIAL');
  assert.strictEqual(signupData.owner.subscription_tier, 'STARTER', 'Default tier must be STARTER');

  // 5. Fetch stats
  console.log('\n5. Testing admin dashboard statistics fetch...');
  const statsRes = await fetch(`${host}/api/admin/stats`, { headers: adminHeaders });
  assert.strictEqual(statsRes.status, 200);
  const statsData = await statsRes.json();
  console.log(`   Fetched platform stats: MRR: ₹${statsData.estimatedMRR} - Active: ${statsData.activeCount}`);
  assert.ok(statsData.hasOwnProperty('estimatedMRR'));
  assert.ok(statsData.hasOwnProperty('statusCounts'));

  // 6. Fetch shop registry list
  console.log('\n6. Fetching shop owner registry list...');
  const registryRes = await fetch(`${host}/api/admin/users`, { headers: adminHeaders });
  const registryData = await registryRes.json();
  const foundShop = registryData.users.find(u => u.id === shopId);
  console.log(`   Registry list fetched successfully. Found test shop: ${!!foundShop}`);
  assert.ok(foundShop, 'Test shop owner must exist in list');

  // 7. Fetch single shop owner details with metrics
  console.log('\n7. Fetching details and metrics of specific shop...');
  const detailRes = await fetch(`${host}/api/admin/users/${shopId}`, { headers: adminHeaders });
  const detailData = await detailRes.json();
  console.log(`   Shop metrics check: Customers: ${detailData.metrics.totalCustomers} - Orders: ${detailData.metrics.totalOrders}`);
  assert.ok(detailData.metrics.hasOwnProperty('totalCustomers'));
  assert.ok(detailData.metrics.hasOwnProperty('totalOrders'));

  // 8. Moderate: Suspend Access
  console.log('\n8. Testing account suspension moderation...');
  const suspendRes = await fetch(`${host}/api/admin/users/${shopId}/suspend`, {
    method: 'POST',
    headers: adminHeaders
  });
  assert.strictEqual(suspendRes.status, 200);
  const suspendData = await suspendRes.json();
  console.log(`   Suspend status returned: is_active = ${suspendData.shop.is_active}`);
  assert.strictEqual(suspendData.shop.is_active, false, 'Shop owner is_active must be false after suspension');

  // Test that suspended owner cannot log in
  console.log('   Verifying suspended owner is blocked from logging in...');
  const shopLoginRes = await fetch(`${host}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testShopEmail, password: testShopPassword })
  });
  console.log(`   Login response status: ${shopLoginRes.status}`);
  assert.strictEqual(shopLoginRes.status, 403, 'Should block login with 403 Forbidden');

  // Moderate: Reactivate
  console.log('   Reactivating shop owner...');
  const reactivateRes = await fetch(`${host}/api/admin/users/${shopId}/reactivate`, {
    method: 'POST',
    headers: adminHeaders
  });
  const reactivateData = await reactivateRes.json();
  assert.strictEqual(reactivateData.shop.is_active, true, 'is_active must return to true');

  // 9. Moderate: Change Subscription Tier manually
  console.log('\n9. Manually updating subscription tier plan level...');
  const changePlanRes = await fetch(`${host}/api/admin/users/${shopId}/change-plan`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ plan: 'GROWTH' })
  });
  assert.strictEqual(changePlanRes.status, 200);
  const changePlanData = await changePlanRes.json();
  console.log(`   Updated tier check: ${changePlanData.shop.subscription_tier} - Status: ${changePlanData.shop.subscription_status}`);
  assert.strictEqual(changePlanData.shop.subscription_tier, 'GROWTH');
  assert.strictEqual(changePlanData.shop.subscription_status, 'ACTIVE');

  // 10. Moderate: Extend Trial manually
  console.log('\n10. Testing extending trial period...');
  const extendRes = await fetch(`${host}/api/admin/users/${shopId}/extend-trial`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ days: 30 })
  });
  assert.strictEqual(extendRes.status, 200);
  const extendData = await extendRes.json();
  console.log(`    Updated trial status: ${extendData.shop.subscription_status} - Expiry: ${extendData.shop.subscription_expiry}`);
  assert.strictEqual(extendData.shop.subscription_status, 'TRIAL', 'Should revert to TRIAL after trial extension');

  // 11. Verify Audit Logs
  console.log('\n11. Fetching administrative audit logs...');
  const auditRes = await fetch(`${host}/api/admin/audit-logs`, { headers: adminHeaders });
  const auditData = await auditRes.json();
  console.log(`    Audit log items count: ${auditData.logs.length}`);
  assert.ok(auditData.logs.length >= 4, 'Should record audit entries for suspend, reactivate, change-plan, and extend-trial');
  const planLog = auditData.logs.find(l => l.action_type === 'CHANGE_PLAN');
  assert.ok(planLog, 'Change plan log entry must be present');
  console.log(`    Audit Log Entry: ${planLog.admin_email} - Action: ${planLog.action_type} - Target: ${planLog.target_shop} - Old/New: ${planLog.previous_value} ➔ ${planLog.new_value}`);

  // 12. Verify CMS Retrieval and Update Hero
  console.log('\n12. Testing CMS retrieval and editing landing page sections...');
  const cmsRes = await fetch(`${host}/api/admin/cms`);
  const cmsData = await cmsRes.json();
  console.log(`    Public CMS Hero Heading: "${cmsData.hero.main_heading}"`);

  const newHeading = 'TailorOS - The Ultimate Tailoring SaaS Suite';
  const editHeroRes = await fetch(`${host}/api/admin/cms/hero`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      main_heading: newHeading,
      sub_heading: cmsData.hero.sub_heading,
      primary_cta_text: cmsData.hero.primary_cta_text,
      secondary_cta_text: cmsData.hero.secondary_cta_text
    })
  });
  assert.strictEqual(editHeroRes.status, 200);
  console.log('    Successfully edited Hero CMS heading');

  // Verify updated CMS Content is public
  const cmsVerifyRes = await fetch(`${host}/api/admin/cms`);
  const cmsVerifyData = await cmsVerifyRes.json();
  assert.strictEqual(cmsVerifyData.hero.main_heading, newHeading, 'Hero Heading should be updated');

  console.log('\n====================================================');
  console.log('ALL SaaS & Admin Verification Tests PASSED!');
  console.log('====================================================');
}

runSaaSTests().catch(err => {
  console.error('\nVerification Test FAILED with error:', err);
  process.exit(1);
});
