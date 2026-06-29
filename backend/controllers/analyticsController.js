import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Helper to calculate paid amount based on payment status (supports weekly partial payments)
const calculatePaidSalary = (status, baseAmount) => {
  if (status === 'Paid') return baseAmount;
  if (status === 'Unpaid' || !status) return 0;
  if (status.startsWith('W:')) {
    const weeks = status.substring(2).split(',').filter(Boolean);
    return baseAmount * (weeks.length / 4);
  }
  return 0;
};

// Get monthly analytics summary (Revenue, Expenses, Salaries, Profit)
export const getAnalyticsSummary = async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    const owner_id = req.user.id;
    if (!month) {
      return res.status(400).json({ message: 'Month query parameter is required (format: YYYY-MM)' });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        owner_id,
        created_at: { gte: startOfMonth, lte: endOfMonth }
      }
    });
    const totalRevenue = orders.reduce((sum, order) => {
      const contribution = order.status === 'Delivered' ? order.total_amount : order.advance_amount;
      return sum + contribution;
    }, 0);

    let expense = await prisma.expense.findUnique({
      where: { owner_id_month: { owner_id, month } }
    });
    if (!expense) {
      expense = { rent: 10000, electricity: 2000 };
    }

    const salariesList = await prisma.employeeSalary.findMany({
      where: { employee: { owner_id }, month }
    });
    const salariesPaid = salariesList.reduce((sum, s) => {
      return sum + calculatePaidSalary(s.status, s.amount);
    }, 0);

    const customExpensesList = await prisma.customExpense.findMany({
      where: { owner_id, month }
    });
    const totalCustomExpenses = customExpensesList.reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = salariesPaid + expense.rent + expense.electricity + totalCustomExpenses;
    const profit = totalRevenue - totalExpenses;

    return res.status(200).json({
      month,
      revenue: totalRevenue,
      rent: expense.rent,
      electricity: expense.electricity,
      salariesPaid,
      customExpensesPaid: totalCustomExpenses,
      profit
    });
  } catch (error) {
    console.error('Error in getAnalyticsSummary:', error);
    return res.status(500).json({ message: 'Server error calculating analytics summary' });
  }
};

// Update monthly rent & electricity expenses
export const saveExpenses = async (req, res) => {
  try {
    const { month, rent, electricity } = req.body;
    const owner_id = req.user.id;
    if (!month || rent === undefined || electricity === undefined) {
      return res.status(400).json({ message: 'Month, rent, and electricity are required' });
    }

    const expense = await prisma.expense.upsert({
      where: { owner_id_month: { owner_id, month } },
      update: {
        rent: parseFloat(rent),
        electricity: parseFloat(electricity)
      },
      create: {
        owner_id,
        month,
        rent: parseFloat(rent),
        electricity: parseFloat(electricity)
      }
    });

    return res.status(200).json({ message: 'Expenses saved successfully', expense });
  } catch (error) {
    console.error('Error in saveExpenses:', error);
    return res.status(500).json({ message: 'Server error saving expenses' });
  }
};

// Get list of employees and their salary payment status for a specific month
export const getEmployeeSalaries = async (req, res) => {
  try {
    const { month } = req.query;
    const owner_id = req.user.id;
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }

    let employees = await prisma.employee.findMany({ where: { owner_id, base_salary: { gte: 0 } } });
    if (employees.length === 0) {
      const defaultStaff = [
        { owner_id, name: 'Ramesh (Master Tailor)', base_salary: 15000 },
        { owner_id, name: 'Suresh (Stitcher)', base_salary: 12000 },
        { owner_id, name: 'Mahesh (Helper)', base_salary: 8000 }
      ];
      await prisma.employee.createMany({ data: defaultStaff });
      employees = await prisma.employee.findMany({ where: { owner_id, base_salary: { gte: 0 } } });
    }

    const results = await Promise.all(employees.map(async (emp) => {
      const salaryRecord = await prisma.employeeSalary.findUnique({
        where: { employee_id_month: { employee_id: emp.id, month } }
      });
      if (!salaryRecord) {
        return {
          employee_id: emp.id,
          name: emp.name,
          base_salary: emp.base_salary,
          status: 'Unpaid',
          amount: emp.base_salary
        };
      }
      return {
        employee_id: emp.id,
        name: emp.name,
        base_salary: emp.base_salary,
        status: salaryRecord.status,
        amount: salaryRecord.amount
      };
    }));

    return res.status(200).json({ month, employees: results });
  } catch (error) {
    console.error('Error in getEmployeeSalaries:', error);
    return res.status(500).json({ message: 'Server error retrieving employee salaries' });
  }
};

// Toggle paid / unpaid salary status for an employee in a specific month
export const toggleEmployeeSalary = async (req, res) => {
  try {
    const { employee_id, month, week } = req.body;
    const owner_id = req.user.id;
    if (!employee_id || !month) {
      return res.status(400).json({ message: 'Employee ID and month are required' });
    }

    // Verify employee belongs to owner
    const employee = await prisma.employee.findUnique({ where: { id: employee_id } });
    if (!employee || employee.owner_id !== owner_id) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let salaryRecord = await prisma.employeeSalary.findUnique({
      where: { employee_id_month: { employee_id, month } }
    });

    let newStatus = 'Paid';

    if (week) {
      const w = String(week);
      let currentWeeks = [];
      if (salaryRecord && salaryRecord.status === 'Paid') {
        currentWeeks = ['1', '2', '3', '4'];
      } else if (salaryRecord && salaryRecord.status.startsWith('W:')) {
        currentWeeks = salaryRecord.status.substring(2).split(',').filter(Boolean);
      }
      
      if (currentWeeks.includes(w)) {
        currentWeeks = currentWeeks.filter(val => val !== w);
      } else {
        currentWeeks.push(w);
      }
      
      // Sort to keep W:1,2,3 format consistent
      currentWeeks.sort();

      if (currentWeeks.length === 4) {
        newStatus = 'Paid';
      } else if (currentWeeks.length === 0) {
        newStatus = 'Unpaid';
      } else {
        newStatus = `W:${currentWeeks.join(',')}`;
      }
    } else {
      // Standard monthly toggle
      if (salaryRecord) {
        newStatus = salaryRecord.status === 'Paid' ? 'Unpaid' : 'Paid';
      }
    }

    if (salaryRecord) {
      salaryRecord = await prisma.employeeSalary.update({
        where: { employee_id_month: { employee_id, month } },
        data: { status: newStatus }
      });
    } else {
      salaryRecord = await prisma.employeeSalary.create({
        data: {
          employee_id,
          month,
          status: newStatus,
          amount: employee.base_salary
        }
      });
    }

    return res.status(200).json({ message: 'Salary status updated successfully', record: salaryRecord });
  } catch (error) {
    console.error('Error in toggleEmployeeSalary:', error);
    return res.status(500).json({ message: 'Server error updating salary status' });
  }
};

// Get daily breakdown stats for line/bar charts
export const getDailyBreakdown = async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    const owner_id = req.user.id;
    if (!month) {
      return res.status(400).json({ message: 'Month query parameter is required (format: YYYY-MM)' });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    const orders = await prisma.order.findMany({
      where: { owner_id, created_at: { gte: startOfMonth, lte: endOfMonth } }
    });

    const ordersCompletedThisMonthButCreatedBefore = await prisma.order.findMany({
      where: {
        owner_id,
        delivery_date: { gte: startOfMonth, lte: endOfMonth },
        created_at: { lt: startOfMonth }
      }
    });

    let expense = await prisma.expense.findUnique({ where: { owner_id_month: { owner_id, month } } });
    const rent = expense ? expense.rent : 10000;
    const electricity = expense ? expense.electricity : 2000;

    const salariesList = await prisma.employeeSalary.findMany({
      where: { employee: { owner_id }, month }
    });
    const salariesPaid = salariesList.reduce((sum, s) => {
      return sum + calculatePaidSalary(s.status, s.amount);
    }, 0);

    const customExpensesList = await prisma.customExpense.findMany({ where: { owner_id, month } });
    const totalCustomExpenses = customExpensesList.reduce((sum, e) => sum + e.amount, 0);

    const totalMonthlyExpenses = rent + electricity + salariesPaid + totalCustomExpenses;
    const dailyAmortizedExpense = totalMonthlyExpenses / daysInMonth;

    const dailyStats = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, monthNum - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, monthNum - 1, day, 23, 59, 59, 999);

      const createdToday = orders.filter(o => o.created_at >= dayStart && o.created_at <= dayEnd);
      const revCreatedToday = createdToday.reduce((sum, o) => {
        return sum + (o.status === 'Delivered' ? o.total_amount : o.advance_amount);
      }, 0);

      const completedTodayCreatedBefore = orders.filter(o => 
        o.delivery_date && o.delivery_date >= dayStart && o.delivery_date <= dayEnd && o.created_at < dayStart
      );
      const completedBeforeThisMonthToday = ordersCompletedThisMonthButCreatedBefore.filter(o =>
        o.delivery_date && o.delivery_date >= dayStart && o.delivery_date <= dayEnd
      );

      const revBalancesToday = 
        completedTodayCreatedBefore.reduce((sum, o) => sum + o.balance_amount, 0) +
        completedBeforeThisMonthToday.reduce((sum, o) => sum + o.balance_amount, 0);

      const dailyRevenue = revCreatedToday + revBalancesToday;
      const dailyProfit = dailyRevenue - dailyAmortizedExpense;

      dailyStats.push({
        day,
        dateString: `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        revenue: dailyRevenue,
        expense: Math.round(dailyAmortizedExpense),
        profit: Math.round(dailyProfit)
      });
    }

    return res.status(200).json({ month, dailyStats });
  } catch (error) {
    console.error('Error in getDailyBreakdown:', error);
    return res.status(500).json({ message: 'Server error retrieving daily breakdown' });
  }
};

// Custom Expenses CRUD handlers
export const getCustomExpenses = async (req, res) => {
  try {
    const { month } = req.query;
    const owner_id = req.user.id;
    if (!month) return res.status(400).json({ message: 'Month query param is required' });
    
    const expenses = await prisma.customExpense.findMany({
      where: { owner_id, month },
      orderBy: { date: 'desc' }
    });
    return res.status(200).json({ expenses });
  } catch (error) {
    console.error('Error in getCustomExpenses:', error);
    return res.status(500).json({ message: 'Server error fetching custom expenses' });
  }
};

export const createCustomExpense = async (req, res) => {
  try {
    const { name, amount, month } = req.body;
    const owner_id = req.user.id;
    if (!name || amount === undefined || !month) {
      return res.status(400).json({ message: 'Name, amount, and month are required' });
    }

    const expense = await prisma.customExpense.create({
      data: {
        owner_id,
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        month
      }
    });
    return res.status(201).json({ message: 'Expense created successfully', expense });
  } catch (error) {
    console.error('Error in createCustomExpense:', error);
    return res.status(500).json({ message: 'Server error creating custom expense' });
  }
};

export const deleteCustomExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.id;

    // Verify ownership
    const expense = await prisma.customExpense.findUnique({ where: { id } });
    if (!expense || expense.owner_id !== owner_id) {
       return res.status(404).json({ message: 'Expense not found' });
    }

    await prisma.customExpense.delete({ where: { id } });
    return res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error in deleteCustomExpense:', error);
    return res.status(500).json({ message: 'Server error deleting custom expense' });
  }
};

// Employee Registry handlers
export const addEmployee = async (req, res) => {
  try {
    const { name, base_salary } = req.body;
    const owner_id = req.user.id;
    if (!name || base_salary === undefined) {
      return res.status(400).json({ message: 'Name and base salary are required' });
    }

    const employee = await prisma.employee.create({
      data: {
        owner_id,
        name: name.trim(),
        base_salary: parseFloat(base_salary) || 0
      }
    });
    return res.status(201).json({ message: 'Employee added successfully', employee });
  } catch (error) {
    console.error('Error in addEmployee:', error);
    return res.status(500).json({ message: 'Server error adding employee' });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_salary } = req.body;
    const owner_id = req.user.id;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.owner_id !== owner_id) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : employee.name,
        base_salary: base_salary !== undefined ? parseFloat(base_salary) : employee.base_salary
      }
    });

    await prisma.employeeSalary.updateMany({
      where: { employee_id: id, status: 'Unpaid' },
      data: { amount: updatedEmployee.base_salary }
    });

    return res.status(200).json({ message: 'Employee updated successfully', employee: updatedEmployee });
  } catch (error) {
    console.error('Error in updateEmployee:', error);
    return res.status(500).json({ message: 'Server error updating employee' });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.id;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.owner_id !== owner_id) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Soft delete employee to preserve historical financial records
    await prisma.employee.update({
      where: { id },
      data: { base_salary: -1 }
    });

    return res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error in deleteEmployee:', error);
    return res.status(500).json({ message: 'Server error deleting employee' });
  }
};

// Cloth Configuration Pricing handlers
export const getClothConfigs = async (req, res) => {
  try {
    const owner_id = req.user.id;
    const configs = await prisma.clothConfig.findMany({
      where: { owner_id },
      orderBy: { cloth_type: 'asc' }
    });
    return res.status(200).json({ configs });
  } catch (error) {
    console.error('Error in getClothConfigs:', error);
    return res.status(500).json({ message: 'Server error fetching cloth configs' });
  }
};

export const saveClothConfig = async (req, res) => {
  try {
    const { cloth_type, default_price } = req.body;
    const owner_id = req.user.id;
    if (!cloth_type || default_price === undefined) {
      return res.status(400).json({ message: 'Cloth type and default price are required' });
    }

    const config = await prisma.clothConfig.upsert({
      where: { owner_id_cloth_type: { owner_id, cloth_type: cloth_type.trim() } },
      update: { default_price: parseFloat(default_price) || 0 },
      create: { owner_id, cloth_type: cloth_type.trim(), default_price: parseFloat(default_price) || 0 }
    });

    return res.status(200).json({ message: 'Cloth configuration saved successfully', config });
  } catch (error) {
    console.error('Error in saveClothConfig:', error);
    return res.status(500).json({ message: 'Server error saving cloth config' });
  }
};

// Get yearly breakdown stats for year overview charts
export const getYearlyBreakdown = async (req, res) => {
  try {
    const { year } = req.query;
    const owner_id = req.user.id;
    if (!year) {
      return res.status(400).json({ message: 'Year query parameter is required (format: YYYY)' });
    }

    const yearNum = parseInt(year, 10);
    const yearlyStats = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${yearNum}-${String(m).padStart(2, '0')}`;
      const startOfMonth = new Date(yearNum, m - 1, 1);
      const endOfMonth = new Date(yearNum, m, 0, 23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: { owner_id, created_at: { gte: startOfMonth, lte: endOfMonth } }
      });
      const revCreated = orders.reduce((sum, o) => {
        return sum + (o.status === 'Delivered' ? o.total_amount : o.advance_amount);
      }, 0);

      const ordersCompletedThisMonthButCreatedBefore = await prisma.order.findMany({
        where: {
          owner_id,
          delivery_date: { gte: startOfMonth, lte: endOfMonth },
          created_at: { lt: startOfMonth }
        }
      });
      const revBalances = ordersCompletedThisMonthButCreatedBefore.reduce((sum, o) => sum + o.balance_amount, 0);

      const totalRevenue = revCreated + revBalances;

      let expense = await prisma.expense.findUnique({ where: { owner_id_month: { owner_id, month: monthStr } } });
      const rent = expense ? expense.rent : 10000;
      const electricity = expense ? expense.electricity : 2000;

      const salariesList = await prisma.employeeSalary.findMany({
        where: { employee: { owner_id }, month: monthStr, status: 'Paid' }
      });
      const salariesPaid = salariesList.reduce((sum, s) => sum + s.amount, 0);

      const customExpensesList = await prisma.customExpense.findMany({ where: { owner_id, month: monthStr } });
      const totalCustomExpenses = customExpensesList.reduce((sum, e) => sum + e.amount, 0);

      const totalExpenses = rent + electricity + salariesPaid + totalCustomExpenses;
      const profit = totalRevenue - totalExpenses;

      yearlyStats.push({
        month: m,
        label: monthNames[m - 1],
        monthString: monthStr,
        revenue: totalRevenue,
        expense: totalExpenses,
        profit: profit
      });
    }

    return res.status(200).json({ year, yearlyStats });
  } catch (error) {
    console.error('Error in getYearlyBreakdown:', error);
    return res.status(500).json({ message: 'Server error retrieving yearly breakdown' });
  }
};
