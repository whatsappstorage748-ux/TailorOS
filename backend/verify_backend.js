import assert from 'assert';
import { PrismaClient } from '@prisma/client';

async function runTests() {
  const host = 'http://127.0.0.1:5000';
  const month = "2026-06";
  const testEmail = 'test_owner@example.com';
  const testPassword = 'password123';

  console.log('Cleaning up database state for test user...');
  const prisma = new PrismaClient();
  await prisma.$connect();

  const existingOwner = await prisma.shopOwner.findUnique({
    where: { email: testEmail }
  });

  if (existingOwner) {
    const ownerId = existingOwner.id;
    await prisma.orderItem.deleteMany({ where: { order: { owner_id: ownerId } } });
    await prisma.order.deleteMany({ where: { owner_id: ownerId } });
    await prisma.customExpense.deleteMany({ where: { owner_id: ownerId } });
    await prisma.expense.deleteMany({ where: { owner_id: ownerId } });
    await prisma.employeeSalary.deleteMany({ where: { employee: { owner_id: ownerId } } });
    await prisma.employee.deleteMany({ where: { owner_id: ownerId } });
    await prisma.clothConfig.deleteMany({ where: { owner_id: ownerId } });
    await prisma.customer.deleteMany({ where: { owner_id: ownerId } });
    await prisma.shopOwner.delete({ where: { id: ownerId } });
  }

  await prisma.$disconnect();

  console.log('====================================================');
  console.log('Starting extended backend verification tests...');
  console.log('====================================================');

  // Register the test owner
  console.log('Registering test shop owner...');
  const signupRes = await fetch(`${host}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      shop_name: 'Verification Test Shop',
      contact_number: '9876543210'
    })
  });
  if (!signupRes.ok) {
    const errText = await signupRes.text();
    throw new Error(`Failed to sign up test owner: ${errText}`);
  }
  const signupData = await signupRes.json();
  const token = signupData.token;
  console.log('Successfully registered and logged in test shop owner');

  const headers = {
    'Authorization': `Bearer ${token}`
  };
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. Verify Seeding & Listing Employee Salaries
  console.log('1. Checking employee salaries and payroll seeding...');
  const salariesRes = await fetch(`${host}/api/analytics/salaries?month=${month}`, {
    headers
  });
  if (!salariesRes.ok) throw new Error('Failed to fetch salaries');
  const salariesData = await salariesRes.json();
  
  console.log(`   Fetched ${salariesData.employees.length} employees for month ${salariesData.month}`);
  assert.ok(salariesData.employees.length >= 3, 'Should have seeded at least 3 default employees');
  
  // Find Ramesh
  const ramesh = salariesData.employees.find(e => e.name.includes('Ramesh'));
  assert.ok(ramesh, 'Ramesh should exist in the seeded staff list');
  assert.strictEqual(ramesh.status, 'Unpaid', 'Default salary status should be Unpaid');
  console.log(`   Seeded employee check: ${ramesh.name} - Base: ₹${ramesh.base_salary} - Status: ${ramesh.status}`);

  // 2. Add New Employee (Staff Registry)
  console.log('\n2. Testing registering a new employee...');
  const employeePayload = {
    name: 'Test Worker (Stitcher)',
    base_salary: 10000
  };
  const addEmpRes = await fetch(`${host}/api/employees`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(employeePayload)
  });
  if (!addEmpRes.ok) throw new Error('Failed to register employee');
  const addEmpData = await addEmpRes.json();
  console.log(`   Added employee response: name: "${addEmpData.employee.name}" - Base: ₹${addEmpData.employee.base_salary}`);
  assert.strictEqual(addEmpData.employee.name, 'Test Worker (Stitcher)');
  assert.strictEqual(addEmpData.employee.base_salary, 10000);

  // Edit employee base salary
  console.log('   Testing updating employee base salary...');
  const updateEmpRes = await fetch(`${host}/api/employees/${ramesh.employee_id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ base_salary: 16000 })
  });
  if (!updateEmpRes.ok) throw new Error('Failed to update employee salary');
  const updateEmpData = await updateEmpRes.json();
  console.log(`   Updated employee: name: "${updateEmpData.employee.name}" - New Base: ₹${updateEmpData.employee.base_salary}`);
  assert.strictEqual(updateEmpData.employee.base_salary, 16000);

  // 3. Verify Analytics Summary (Default State)
  console.log('\n3. Checking monthly analytics summary (Default state)...');
  const summaryRes = await fetch(`${host}/api/analytics/summary?month=${month}`, {
    headers
  });
  if (!summaryRes.ok) throw new Error('Failed to fetch summary');
  const summaryData = await summaryRes.json();
  
  console.log('   Initial Summary:', summaryData);
  assert.strictEqual(summaryData.rent, 10000, 'Default rent should be 10000');
  assert.strictEqual(summaryData.electricity, 2000, 'Default electricity should be 2000');
  assert.strictEqual(summaryData.salariesPaid, 0, 'No salaries should be paid initially');
  assert.strictEqual(summaryData.customExpensesPaid, 0, 'No custom expenses initially');

  // 4. Save Custom Overhead Rent & Electricity
  console.log('\n4. Testing updating monthly overhead expenses (rent & electricity)...');
  const expensePayload = {
    month,
    rent: 12000,
    electricity: 1800
  };
  const saveExpenseRes = await fetch(`${host}/api/analytics/expenses`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(expensePayload)
  });
  if (!saveExpenseRes.ok) throw new Error('Failed to save expenses');
  const expenseSaveData = await saveExpenseRes.json();
  console.log('   Saved expenses response:', expenseSaveData.expense);
  assert.strictEqual(expenseSaveData.expense.rent, 12000);
  assert.strictEqual(expenseSaveData.expense.electricity, 1800);

  // 5. Toggle Employee Salary Status to Paid
  console.log('\n5. Testing toggling employee salary status (Paid/Unpaid)...');
  const togglePayload = {
    employee_id: ramesh.employee_id,
    month
  };
  const toggleRes = await fetch(`${host}/api/analytics/salaries/toggle`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(togglePayload)
  });
  if (!toggleRes.ok) throw new Error('Failed to toggle salary');
  const toggleData = await toggleRes.json();
  console.log(`   Toggled status response: Employee ID: ${toggleData.record.employee_id} - New Status: ${toggleData.record.status}`);
  assert.strictEqual(toggleData.record.status, 'Paid', 'Salary status should toggle to Paid');

  // 6. Record Other Expense
  console.log('\n6. Testing adding a custom/other expense entry...');
  const customExpensePayload = {
    name: 'Sewing Threads & Scissors',
    amount: 750,
    month
  };
  const addCustomRes = await fetch(`${host}/api/expenses/custom`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(customExpensePayload)
  });
  if (!addCustomRes.ok) throw new Error('Failed to save custom expense');
  const addCustomData = await addCustomRes.json();
  console.log(`   Added custom expense: name: "${addCustomData.expense.name}" - Amount: ₹${addCustomData.expense.amount}`);
  assert.strictEqual(addCustomData.expense.name, 'Sewing Threads & Scissors');
  assert.strictEqual(addCustomData.expense.amount, 750);

  // 7. Verify Profit Summary After Updates (Rent: 12000, Elec: 1800, Salaries: 16000 [Ramesh new salary], Custom: 750)
  console.log('\n7. Checking updated monthly profit summary with custom expenses...');
  const updatedSummaryRes = await fetch(`${host}/api/analytics/summary?month=${month}`, {
    headers
  });
  if (!updatedSummaryRes.ok) throw new Error('Failed to fetch updated summary');
  const updatedSummary = await updatedSummaryRes.json();
  console.log('   Updated Summary:', updatedSummary);
  assert.strictEqual(updatedSummary.rent, 12000);
  assert.strictEqual(updatedSummary.electricity, 1800);
  assert.strictEqual(updatedSummary.salariesPaid, 16000, 'Salaries paid should equal Ramesh\'s updated salary (16000)');
  assert.strictEqual(updatedSummary.customExpensesPaid, 750);
  
  // Profit = Revenue - (Rent + Electricity + Salaries + Custom)
  const expectedProfit = updatedSummary.revenue - (12000 + 1800 + 16000 + 750);
  assert.strictEqual(updatedSummary.profit, expectedProfit, 'Net profit should be correctly computed');
  console.log(`   Expected Profit: ${expectedProfit} - Computed Profit: ${updatedSummary.profit} (Match)`);

  // 8. Test Cloth base price configuration CRUD
  console.log('\n8. Testing configuring base cloth default prices...');
  const clothConfigPayload = {
    cloth_type: 'Sherwani',
    default_price: 2500
  };
  const saveConfigRes = await fetch(`${host}/api/cloth-configs`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(clothConfigPayload)
  });
  if (!saveConfigRes.ok) throw new Error('Failed to save cloth config');
  const saveConfigData = await saveConfigRes.json();
  console.log(`   Saved cloth configuration pricing: type: "${saveConfigData.config.cloth_type}" - Default Price: ₹${saveConfigData.config.default_price}`);
  assert.strictEqual(saveConfigData.config.cloth_type, 'Sherwani');
  assert.strictEqual(saveConfigData.config.default_price, 2500);

  // Fetch configs
  const getConfigsRes = await fetch(`${host}/api/cloth-configs`, {
    headers
  });
  if (!getConfigsRes.ok) throw new Error('Failed to fetch cloth configs list');
  const getConfigsData = await getConfigsRes.json();
  console.log(`   Fetched configurations count: ${getConfigsData.configs.length}`);
  const sherwaniCfg = getConfigsData.configs.find(c => c.cloth_type === 'Sherwani');
  assert.ok(sherwaniCfg, 'Sherwani should exist in active configs');

  // 9. Test Daily breakdown stats breakdown API
  console.log('\n9. Testing daily analytics stats breakdown query...');
  const dailyBreakdownRes = await fetch(`${host}/api/analytics/daily?month=${month}`, {
    headers
  });
  if (!dailyBreakdownRes.ok) throw new Error('Failed to fetch daily stats');
  const dailyBreakdownData = await dailyBreakdownRes.json();
  console.log(`   Fetched daily breakdown stats count: ${dailyBreakdownData.dailyStats.length} days`);
  assert.ok(dailyBreakdownData.dailyStats.length >= 28, 'Should have stats for each day of the month');
  const firstDay = dailyBreakdownData.dailyStats[0];
  assert.strictEqual(firstDay.day, 1);
  assert.ok(firstDay.expense !== undefined, 'Should compute daily amortized expenses');
  assert.ok(firstDay.profit !== undefined, 'Should compute daily profit metrics');

  console.log('\n====================================================');
  console.log('ALL EXTENDED BACKEND VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runTests().catch(error => {
  console.error('\nVerification failed:', error);
  process.exit(1);
});
