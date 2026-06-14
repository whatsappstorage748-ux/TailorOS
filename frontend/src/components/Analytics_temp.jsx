import React, { useState, useEffect } from 'react';
import { 
  BarChart, TrendingUp, TrendingDown, Users, DollarSign, Calendar, 
  Lightbulb, Home, Edit2, Check, X, ArrowUpDown, ChevronDown, 
  Plus, Trash2, Settings, UserPlus, Save 
} from 'lucide-react';

export default function Analytics() {
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:5000`
    : 'https://captain-tailors.loca.lt';

  // Month tracking (generate the last 12 months)
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthsList, setMonthsList] = useState([]);

  // Monthly summary stats
  const [summary, setSummary] = useState({
    revenue: 0,
    rent: 10000,
    electricity: 2000,
    salariesPaid: 0,
    customExpensesPaid: 0,
    profit: -12000
  });

  // Edit overhead bills state
  const [isEditingExpenses, setIsEditingExpenses] = useState(false);
  const [rentInput, setRentInput] = useState(10000);
  const [electricityInput, setElectricityInput] = useState(2000);
  const [isSavingExpenses, setIsSavingExpenses] = useState(false);

  // Custom/Other Expenses state
  const [customExpenses, setCustomExpenses] = useState([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Admin Cloth Config state
  const [clothConfigs, setClothConfigs] = useState([]);
  const [isLoadingClothConfigs, setIsLoadingClothConfigs] = useState(false);
  const [newClothType, setNewClothType] = useState('');
  const [newClothPrice, setNewClothPrice] = useState('');
  const [isSavingClothConfig, setIsSavingClothConfig] = useState(false);

  // Salaries Management Modal state
  const [showSalariesModal, setShowSalariesModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [isLoadingSalaries, setIsLoadingSalaries] = useState(false);

  // Add Employee form state
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeSalary, setNewEmployeeSalary] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  // Edit Employee Base Salary state
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingEmployeeSalary, setEditingEmployeeSalary] = useState('');

  // Clickable Charts Modal state
  const [showRevenueChartModal, setShowRevenueChartModal] = useState(false);
  const [showProfitChartModal, setShowProfitChartModal] = useState(false);
  const [dailyStats, setDailyStats] = useState([]);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  // Generate list of months for selection
  useEffect(() => {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${monthStr}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      months.push({ val, label });
    }
    setMonthsList(months);
    setSelectedMonth(months[0].val); // Default to current month
  }, []);

  // Fetch summary when month changes
  const fetchSummary = async () => {
    if (!selectedMonth) return;
    try {
      const res = await fetch(`${API_BASE}/api/analytics/summary?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        setRentInput(data.rent);
        setElectricityInput(data.electricity);
      }
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
    }
  };

  // Fetch custom expenses
  const fetchCustomExpenses = async () => {
    if (!selectedMonth) return;
    setIsLoadingCustom(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses/custom?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setCustomExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error loading custom expenses:', error);
    } finally {
      setIsLoadingCustom(false);
    }
  };

  // Fetch daily break-down for charts
  const fetchDailyBreakdown = async () => {
    if (!selectedMonth) return;
    setIsLoadingDaily(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/daily?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setDailyStats(data.dailyStats || []);
      }
    } catch (error) {
      console.error('Error loading daily stats breakdown:', error);
    } finally {
      setIsLoadingDaily(false);
    }
  };

  // Fetch cloth default pricing configurations
  const fetchClothConfigs = async () => {
    setIsLoadingClothConfigs(true);
    try {
      const res = await fetch(`${API_BASE}/api/cloth-configs`);
      if (res.ok) {
        const data = await res.json();
        setClothConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Error loading cloth configurations:', error);
    } finally {
      setIsLoadingClothConfigs(false);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      fetchSummary();
      fetchCustomExpenses();
      fetchDailyBreakdown();
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchClothConfigs();
  }, []);

  // Fetch employee salaries for payroll modal
  const fetchSalaries = async () => {
    if (!selectedMonth) return;
    setIsLoadingSalaries(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/salaries?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
    } finally {
      setIsLoadingSalaries(false);
    }
  };

  useEffect(() => {
    if (showSalariesModal) {
      fetchSalaries();
    }
  }, [showSalariesModal, selectedMonth]);

  // Save Rent & Electricity overheads
  const handleSaveExpenses = async (e) => {
    e.preventDefault();
    setIsSavingExpenses(true);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          rent: parseFloat(rentInput) || 0,
          electricity: parseFloat(electricityInput) || 0
        })
      });
      if (res.ok) {
        setIsEditingExpenses(false);
        fetchSummary();
        fetchDailyBreakdown(); // Recalculate daily profit values
      }
    } catch (error) {
      console.error('Error saving expenses:', error);
    } finally {
      setIsSavingExpenses(false);
    }
  };

  // Add Custom Expense
  const handleAddCustomExpense = async (e) => {
    e.preventDefault();
    if (!newExpenseName || !newExpenseAmount) return;
    setIsAddingExpense(true);
    try {
      const res = await fetch(`${API_BASE}/api/expenses/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExpenseName.trim(),
          amount: parseFloat(newExpenseAmount) || 0,
          month: selectedMonth
        })
      });
      if (res.ok) {
        setNewExpenseName('');
        setNewExpenseAmount('');
        fetchCustomExpenses();
        fetchSummary();
        fetchDailyBreakdown();
      }
    } catch (error) {
      console.error('Error adding custom expense:', error);
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Delete Custom Expense
  const handleDeleteCustomExpense = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/expenses/custom/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCustomExpenses();
        fetchSummary();
        fetchDailyBreakdown();
      }
    } catch (error) {
      console.error('Error deleting custom expense:', error);
    }
  };

  // Add Employee to database
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName || !newEmployeeSalary) return;
    setIsAddingEmployee(true);
    try {
      const res = await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmployeeName.trim(),
          base_salary: parseFloat(newEmployeeSalary) || 0
        })
      });
      if (res.ok) {
        setNewEmployeeName('');
        setNewEmployeeSalary('');
        setShowAddEmployeeForm(false);
        fetchSalaries();
        fetchSummary();
      }
    } catch (error) {
      console.error('Error adding employee:', error);
    } finally {
      setIsAddingEmployee(false);
    }
  };

  // Edit employee base salary
  const handleUpdateEmployeeSalary = async (employeeId) => {
    if (!editingEmployeeSalary) return;
    try {
      const res = await fetch(`${API_BASE}/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_salary: parseFloat(editingEmployeeSalary) || 0
        })
      });
      if (res.ok) {
        setEditingEmployeeId(null);
        setEditingEmployeeSalary('');
        fetchSalaries();
        fetchSummary();
        fetchDailyBreakdown();
      }
    } catch (error) {
      console.error('Error updating base salary:', error);
    }
  };

  // Add/Update Base Pricing configuration
  const handleSaveClothConfig = async (e) => {
    e.preventDefault();
    if (!newClothType || !newClothPrice) return;
    setIsSavingClothConfig(true);
    try {
      const res = await fetch(`${API_BASE}/api/cloth-configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloth_type: newClothType.trim(),
          default_price: parseFloat(newClothPrice) || 0
        })
      });
      if (res.ok) {
        setNewClothType('');
        setNewClothPrice('');
        fetchClothConfigs();
      }
    } catch (error) {
      console.error('Error saving cloth config:', error);
    } finally {
      setIsSavingClothConfig(false);
    }
  };

  // Toggle paid status for employee salary
  const handleToggleSalary = async (employeeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/salaries/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          month: selectedMonth
        })
      });
      if (res.ok) {
        fetchSalaries();
        fetchSummary();
        fetchDailyBreakdown();
      }
    } catch (error) {
      console.error('Error toggling salary:', error);
    }
  };

  // Date format utility
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getActiveMonthLabel = () => {
    const active = monthsList.find(m => m.val === selectedMonth);
    return active ? active.label : selectedMonth;
  };

  // Helper to draw SVG line chart for daily revenue
  const renderRevenueChart = () => {
    if (dailyStats.length === 0) return <div className="py-12 text-center text-gray-400 text-xs">No transactions recorded this month.</div>;

    const width = 600;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 35, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xMax = dailyStats.length - 1;
    const yMax = Math.max(...dailyStats.map(s => s.revenue), 1000); // minimum scale peak

    const points = dailyStats.map((d, i) => {
      const x = padding.left + (i * chartWidth) / xMax;
      const y = padding.top + chartHeight - (d.revenue * chartHeight) / yMax;
      return { x, y, ...d };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {/* Horizontal gridlines — neutral, no neon */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding.top + chartHeight * ratio;
          const val = Math.round(yMax * (1 - ratio));
          return (
            <g key={index}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
              <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="monospace">₹{val}</text>
            </g>
          );
        })}
        {/* X axis ticks */}
        {points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map((p, index) => (
          <g key={index}>
            <line x1={p.x} y1={padding.top + chartHeight} x2={p.x} y2={padding.top + chartHeight + 4} stroke="#d1d5db" />
            <text x={p.x} y={padding.top + chartHeight + 15} textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="600">d{p.day}</text>
          </g>
        ))}
        {/* Single clean stroke line — no gradient fill */}
        <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" />
        {/* Data point circles */}
        {points.map((p, index) => (
          <circle key={index} cx={p.x} cy={p.y} r="3" fill="white" stroke="#4f46e5" strokeWidth="1.5" style={{cursor:'pointer'}}>
            <title>{`Day ${p.day}: ₹${p.revenue}`}</title>
          </circle>
        ))}
      </svg>
    );
  };

  // Helper to draw SVG line/bar profit chart (centered zero)
  const renderProfitChart = () => {
    if (dailyStats.length === 0) return <div className="py-12 text-center text-slate-500 text-xs">No data recorded this month.</div>;

    const width = 600;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 35, left: 55 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const xMax = dailyStats.length - 1;
    const profits = dailyStats.map(s => s.profit);
    const extremeMax = Math.max(...profits.map(Math.abs), 500);

    const yRangeMax = extremeMax;
    const yRangeMin = -extremeMax;

    const getX = (i) => padding.left + (i * chartWidth) / xMax;
    const getY = (val) => {
      const ratio = (val - yRangeMin) / (yRangeMax - yRangeMin);
      return padding.top + chartHeight - ratio * chartHeight;
    };

    const points = dailyStats.map((d, i) => ({
      x: getX(i),
      y: getY(d.profit),
      ...d
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const zeroY = getY(0);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        {[-1, -0.5, 0, 0.5, 1].map((ratio, index) => {
          const val = extremeMax * ratio;
          const y = getY(val);
          return (
            <g key={index}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                stroke={ratio === 0 ? '#9ca3af' : '#e5e7eb'} strokeWidth={ratio === 0 ? '1.5' : '1'}
                strokeDasharray={ratio === 0 ? '0' : '4'} />
              <text x={padding.left - 8} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="monospace">
                {val >= 0 ? `₹${Math.round(val)}` : `-₹${Math.round(Math.abs(val))}`}
              </text>
            </g>
          );
        })}
        {points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map((p, index) => (
          <g key={index}>
            <line x1={p.x} y1={padding.top + chartHeight} x2={p.x} y2={padding.top + chartHeight + 4} stroke="#d1d5db" />
            <text x={p.x} y={padding.top + chartHeight + 15} textAnchor="middle" fontSize="8" fill="#9ca3af" fontWeight="600">d{p.day}</text>
          </g>
        ))}
        <path d={pathD} fill="none" stroke={summary.profit >= 0 ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, index) => (
          <circle key={index} cx={p.x} cy={p.y} r="3"
            fill="white" stroke={p.profit >= 0 ? '#10b981' : '#ef4444'} strokeWidth="1.5" style={{cursor:'pointer'}}>
            <title>{`Day ${p.day}: ₹${p.profit}`}</title>
          </circle>
        ))}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* 1. TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Sales &amp; Expenses</h1>
          <p className="text-xs text-gray-400 mt-0.5">{getMonthLabel()}</p>
        </div>
        <div className="relative w-52">
          <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
            className="field-input pl-9 appearance-none cursor-pointer text-sm"
          >
            {monthsList.map((m) => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <button type="button" onClick={() => setShowRevenueChartModal(true)}
          className="stat-card hover:border-brand-300 hover:bg-brand-50 transition-colors text-left cursor-pointer group">
          <div className="stat-icon bg-emerald-50 group-hover:bg-emerald-100">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="section-label mb-0.5">Revenue</p>
            <p className="text-lg font-bold text-gray-900">₹{summary.revenue}</p>
            <p className="text-2xs text-brand-600 font-medium flex items-center gap-0.5 mt-0.5"><TrendingUp className="w-3 h-3" /> View chart</p>
          </div>
        </button>

        <div onClick={() => setShowSalariesModal(true)}
          className="stat-card hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="stat-icon bg-brand-50"><Users className="w-4 h-4 text-brand-600" /></div>
          <div>
            <p className="section-label mb-0.5">Salaries</p>
            <p className="text-lg font-bold text-gray-900">₹{summary.salariesPaid}</p>
            <p className="text-2xs text-brand-600 font-medium mt-0.5">Manage payroll →</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50"><Lightbulb className="w-4 h-4 text-amber-600" /></div>
          <div>
            <p className="section-label mb-0.5">Electricity</p>
            <p className="text-lg font-bold text-gray-900">₹{summary.electricity}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-gray-100"><Home className="w-4 h-4 text-gray-600" /></div>
          <div>
            <p className="section-label mb-0.5">Rent</p>
            <p className="text-lg font-bold text-gray-900">₹{summary.rent}</p>
          </div>
        </div>

        <button type="button" onClick={() => setShowProfitChartModal(true)}
          className={`stat-card hover:bg-gray-50 cursor-pointer transition-colors text-left ${
            summary.profit >= 0 ? 'border-emerald-200' : 'border-red-200'
          }`}>
          <div className={`stat-icon ${ summary.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50' }`}>
            {summary.profit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
          <div>
            <p className="section-label mb-0.5">Net Profit</p>
            <p className={`text-lg font-bold ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₹{summary.profit}</p>
            <p className="text-2xs text-gray-400 font-medium mt-0.5">View chart →</p>
          </div>
        </button>
      </div>

      {/* 3. BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800">Monthly Overhead</h3>
              </div>
              {!isEditingExpenses ? (
                <button type="button" onClick={() => setIsEditingExpenses(true)} className="btn-ghost text-xs">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <button type="button" onClick={() => { setIsEditingExpenses(false); setRentInput(summary.rent); setElectricityInput(summary.electricity); }}
                  className="text-xs font-medium text-red-500 hover:text-red-600">
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleSaveExpenses} className="flex flex-col gap-3">
              <div>
                <label className="section-label mb-1.5 block">Shop Rent (₹)</label>
                <input type="number" value={rentInput} disabled={!isEditingExpenses}
                  onChange={(e) => setRentInput(e.target.value)}
                  className="field-input disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              </div>
              <div>
                <label className="section-label mb-1.5 block">Electricity Bill (₹)</label>
                <input type="number" value={electricityInput} disabled={!isEditingExpenses}
                  onChange={(e) => setElectricityInput(e.target.value)}
                  className="field-input disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
              </div>
              {isEditingExpenses && (
                <button type="submit" disabled={isSavingExpenses} className="btn-primary w-full justify-center">
                  {isSavingExpenses ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </form>
          </div>

          {/* Add Custom Expense Card */}
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Plus className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-800">Record Other Expense</h3>
            </div>
            <form onSubmit={handleAddCustomExpense} className="flex flex-col gap-3">
              <div>
                <label className="section-label mb-1.5 block">Expense Name / Note</label>
                <input type="text" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder="e.g. Sewing threads, tools" className="field-input" required />
              </div>
              <div>
                <label className="section-label mb-1.5 block">Amount (₹)</label>
                <input type="number" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)}
                  placeholder="e.g. 450" className="field-input" required />
              </div>
              <button type="submit" disabled={isAddingExpense} className="btn-primary justify-center bg-emerald-600 hover:bg-emerald-700">
                {isAddingExpense ? 'Adding…' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-3 mb-1">
              <Plus className="w-4.5 h-4.5 text-emerald-400" />
              <span>Record Other Expense</span>
            </h3>

            <form onSubmit={handleAddCustomExpense} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Expense Name / Note</label>
                <input
                  type="text"
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  placeholder="e.g. Sewing threads, S-Pen replacement"
                  className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isAddingExpense}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg"
              >
                {isAddingExpense ? 'Adding...' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* Custom Expenses Ledger (Right) */}
        <div className="lg:col-span-7 card p-5 flex flex-col gap-4 h-[470px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-800">Other Expenses</h3>
            </div>
            <span className="text-xs font-semibold text-gray-500">Total: ₹{summary.customExpensesPaid}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingCustom ? (
              <div className="py-12 text-center text-gray-400 text-xs">Loading…</div>
            ) : customExpenses.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">No expenses recorded for {getActiveMonthLabel()}.</div>
            ) : (
              <table className="data-table text-xs">
                <thead><tr><th>Item</th><th>Date</th><th className="text-right">Amount</th><th className="text-center">Remove</th></tr></thead>
                <tbody>
                  {customExpenses.map((exp) => (
                    <tr key={exp._id}>
                      <td className="font-semibold">{exp.name}</td>
                      <td className="text-gray-500">{formatDate(exp.date)}</td>
                      <td className="text-right font-mono font-semibold">₹{exp.amount}</td>
                      <td className="text-center">
                        <button type="button" onClick={() => handleDeleteCustomExpense(exp._id)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

