import Employee from '../models/Employee.js';
import EmployeeSalary from '../models/EmployeeSalary.js';
import Expense from '../models/Expense.js';
import Order from '../models/Order.js';
import CustomExpense from '../models/CustomExpense.js';
import ClothConfig from '../models/ClothConfig.js';

// Get monthly analytics summary (Revenue, Expenses, Salaries, Profit)
export const getAnalyticsSummary = async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month query parameter is required (format: YYYY-MM)' });
    }

    // 1. Calculate Start and End of the selected month
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // 2. Fetch all orders for this month and sum the revenue
    // full total_amount if Delivered, only advance_amount if Undelivered
    const orders = await Order.find({
      created_at: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const totalRevenue = orders.reduce((sum, order) => {
      const contribution = order.status === 'Delivered' ? order.total_amount : order.advance_amount;
      return sum + contribution;
    }, 0);

    // 3. Fetch monthly expenses (Rent & Electricity)
    let expense = await Expense.findOne({ month });
    if (!expense) {
      // Return standard default values if not configured yet
      expense = { rent: 10000, electricity: 2000 };
    }

    // 4. Fetch sum of paid salaries for this month
    const salariesList = await EmployeeSalary.find({ month, status: 'Paid' });
    const salariesPaid = salariesList.reduce((sum, s) => sum + s.amount, 0);

    // 5. Fetch custom expenses sum
    const customExpensesList = await CustomExpense.find({ month });
    const totalCustomExpenses = customExpensesList.reduce((sum, e) => sum + e.amount, 0);

    // 6. Calculate net profit
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
    if (!month || rent === undefined || electricity === undefined) {
      return res.status(400).json({ message: 'Month, rent, and electricity are required' });
    }

    let expense = await Expense.findOne({ month });
    if (expense) {
      expense.rent = parseFloat(rent);
      expense.electricity = parseFloat(electricity);
    } else {
      expense = new Expense({
        month,
        rent: parseFloat(rent),
        electricity: parseFloat(electricity)
      });
    }

    await expense.save();
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
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }

    // Proactively seed default staff if database is empty
    let employees = await Employee.find();
    if (employees.length === 0) {
      const defaultStaff = [
        { name: 'Ramesh (Master Tailor)', base_salary: 15000 },
        { name: 'Suresh (Stitcher)', base_salary: 12000 },
        { name: 'Mahesh (Helper)', base_salary: 8000 }
      ];
      employees = await Employee.insertMany(defaultStaff);
    }

    // Build status mapping for each employee
    const results = await Promise.all(employees.map(async (emp) => {
      let salaryRecord = await EmployeeSalary.findOne({ employee_id: emp._id, month });
      if (!salaryRecord) {
        return {
          employee_id: emp._id,
          name: emp.name,
          base_salary: emp.base_salary,
          status: 'Unpaid',
          amount: emp.base_salary
        };
      }
      return {
        employee_id: emp._id,
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
    const { employee_id, month } = req.body;
    if (!employee_id || !month) {
      return res.status(400).json({ message: 'Employee ID and month are required' });
    }

    let salaryRecord = await EmployeeSalary.findOne({ employee_id, month });
    if (salaryRecord) {
      // Toggle status
      salaryRecord.status = salaryRecord.status === 'Paid' ? 'Unpaid' : 'Paid';
      await salaryRecord.save();
    } else {
      // Find employee to get their base salary
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Create a new paid record (since they were default unpaid)
      salaryRecord = new EmployeeSalary({
        employee_id,
        month,
        status: 'Paid',
        amount: employee.base_salary
      });
      await salaryRecord.save();
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
    if (!month) {
      return res.status(400).json({ message: 'Month query parameter is required (format: YYYY-MM)' });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    // Fetch all orders in the month
    const orders = await Order.find({
      created_at: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Fetch orders completed this month but created before this month (for balance collected)
    const ordersCompletedThisMonthButCreatedBefore = await Order.find({
      delivery_date: { $gte: startOfMonth, $lte: endOfMonth },
      created_at: { $lt: startOfMonth }
    });

    // Sum monthly expenses
    let expense = await Expense.findOne({ month });
    const rent = expense ? expense.rent : 10000;
    const electricity = expense ? expense.electricity : 2000;

    const salariesList = await EmployeeSalary.find({ month, status: 'Paid' });
    const salariesPaid = salariesList.reduce((sum, s) => sum + s.amount, 0);

    const customExpensesList = await CustomExpense.find({ month });
    const totalCustomExpenses = customExpensesList.reduce((sum, e) => sum + e.amount, 0);

    const totalMonthlyExpenses = rent + electricity + salariesPaid + totalCustomExpenses;
    const dailyAmortizedExpense = totalMonthlyExpenses / daysInMonth;

    // Build day-wise stats array
    const dailyStats = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStart = new Date(year, monthNum - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, monthNum - 1, day, 23, 59, 59, 999);

      // 1. Advance/Full revenue for orders created today
      const createdToday = orders.filter(o => o.created_at >= dayStart && o.created_at <= dayEnd);
      const revCreatedToday = createdToday.reduce((sum, o) => {
        return sum + (o.status === 'Delivered' ? o.total_amount : o.advance_amount);
      }, 0);

      // 2. Balance collected for orders completed today (created before today)
      const completedTodayCreatedBefore = orders.filter(o => 
        o.delivery_date >= dayStart && o.delivery_date <= dayEnd && o.created_at < dayStart
      );
      const completedBeforeThisMonthToday = ordersCompletedThisMonthButCreatedBefore.filter(o =>
        o.delivery_date >= dayStart && o.delivery_date <= dayEnd
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
    if (!month) {
      return res.status(400).json({ message: 'Month query param is required' });
    }
    const expenses = await CustomExpense.find({ month }).sort({ date: -1 });
    return res.status(200).json({ expenses });
  } catch (error) {
    console.error('Error in getCustomExpenses:', error);
    return res.status(500).json({ message: 'Server error fetching custom expenses' });
  }
};

export const createCustomExpense = async (req, res) => {
  try {
    const { name, amount, month } = req.body;
    if (!name || amount === undefined || !month) {
      return res.status(400).json({ message: 'Name, amount, and month are required' });
    }

    const expense = new CustomExpense({
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      month
    });
    await expense.save();
    return res.status(201).json({ message: 'Expense created successfully', expense });
  } catch (error) {
    console.error('Error in createCustomExpense:', error);
    return res.status(500).json({ message: 'Server error creating custom expense' });
  }
};

export const deleteCustomExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomExpense.findByIdAndDelete(id);
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
    if (!name || base_salary === undefined) {
      return res.status(400).json({ message: 'Name and base salary are required' });
    }

    const employee = new Employee({
      name: name.trim(),
      base_salary: parseFloat(base_salary) || 0
    });
    await employee.save();
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

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (name !== undefined) employee.name = name.trim();
    if (base_salary !== undefined) employee.base_salary = parseFloat(base_salary) || 0;

    await employee.save();

    // Also update any unpaid EmployeeSalary records for this employee (Paid ones are locked)
    await EmployeeSalary.updateMany(
      { employee_id: id, status: 'Unpaid' },
      { amount: employee.base_salary }
    );

    return res.status(200).json({ message: 'Employee updated successfully', employee });
  } catch (error) {
    console.error('Error in updateEmployee:', error);
    return res.status(500).json({ message: 'Server error updating employee' });
  }
};

// Cloth Configuration Pricing handlers
export const getClothConfigs = async (req, res) => {
  try {
    const configs = await ClothConfig.find().sort({ cloth_type: 1 });
    return res.status(200).json({ configs });
  } catch (error) {
    console.error('Error in getClothConfigs:', error);
    return res.status(500).json({ message: 'Server error fetching cloth configs' });
  }
};

export const saveClothConfig = async (req, res) => {
  try {
    const { cloth_type, default_price } = req.body;
    if (!cloth_type || default_price === undefined) {
      return res.status(400).json({ message: 'Cloth type and default price are required' });
    }

    let config = await ClothConfig.findOne({ cloth_type: cloth_type.trim() });
    if (config) {
      config.default_price = parseFloat(default_price) || 0;
    } else {
      config = new ClothConfig({
        cloth_type: cloth_type.trim(),
        default_price: parseFloat(default_price) || 0
      });
    }

    await config.save();
    return res.status(200).json({ message: 'Cloth configuration saved successfully', config });
  } catch (error) {
    console.error('Error in saveClothConfig:', error);
    return res.status(500).json({ message: 'Server error saving cloth config' });
  }
};
