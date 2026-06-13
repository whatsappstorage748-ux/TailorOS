import React, { useState, useEffect } from 'react';
import { 
  BarChart, TrendingUp, TrendingDown, Users, DollarSign, Calendar, 
  Lightbulb, Home, Edit2, Check, X, ArrowUpDown, ChevronDown, 
  Plus, Trash2, Settings, UserPlus, Save 
} from 'lucide-react';

export default function Analytics() {
  const API_BASE = `http://${window.location.hostname}:5000`;

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
    if (dailyStats.length === 0) return <div className="py-12 text-center text-slate-500 text-xs">No transactions recorded this month.</div>;

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
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e82eb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0e82eb" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = padding.top + chartHeight * ratio;
          const val = Math.round(yMax * (1 - ratio));
          return (
            <g key={index} className="opacity-25">
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4" />
              <text x={padding.left - 10} y={y + 3.5} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">₹{val}</text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map((p, index) => (
          <g key={index} className="opacity-40">
            <line x1={p.x} y1={padding.top + chartHeight} x2={p.x} y2={padding.top + chartHeight + 5} stroke="#334155" />
            <text x={p.x} y={padding.top + chartHeight + 16} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold">d{p.day}</text>
          </g>
        ))}

        {/* Gradient and stroke */}
        <path d={fillD} fill="url(#revGrad)" />
        <path d={pathD} fill="none" stroke="#0e82eb" strokeWidth="2.5" />

        {/* Interactive circles */}
        {points.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r="3.5"
            className="fill-slate-950 stroke-brand-500 stroke-2 hover:r-5 cursor-pointer transition-all duration-150"
          >
            <title>{`Day ${p.day}: ₹${p.revenue} collected`}</title>
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
        {/* Horizontal gridlines */}
        {[-1, -0.5, 0, 0.5, 1].map((ratio, index) => {
          const val = extremeMax * ratio;
          const y = getY(val);
          return (
            <g key={index} className="opacity-25">
              <line 
                x1={padding.left} 
                y1={y} 
                x2={width - padding.right} 
                y2={y} 
                stroke={ratio === 0 ? "#64748b" : "#334155"} 
                strokeWidth={ratio === 0 ? "1.5" : "1"} 
                strokeDasharray={ratio === 0 ? "0" : "4"} 
              />
              <text x={padding.left - 10} y={y + 3.5} textAnchor="end" className="fill-slate-400 text-[9px] font-mono">
                {val >= 0 ? `₹${Math.round(val)}` : `-₹${Math.round(Math.abs(val))}`}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {points.filter((_, i) => i % 5 === 0 || i === points.length - 1).map((p, index) => (
          <g key={index} className="opacity-40">
            <line x1={p.x} y1={padding.top + chartHeight} x2={p.x} y2={padding.top + chartHeight + 5} stroke="#334155" />
            <text x={p.x} y={padding.top + chartHeight + 16} textAnchor="middle" className="fill-slate-400 text-[8px] font-bold">d{p.day}</text>
          </g>
        ))}

        {/* Line stroke */}
        <path d={pathD} fill="none" stroke={summary.profit >= 0 ? '#10b981' : '#f43f5e'} strokeWidth="2.5" />

        {/* Interactive circles */}
        {points.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r="3.5"
            className={`fill-slate-950 stroke-2 hover:r-5 cursor-pointer transition-all duration-150 ${
              p.profit >= 0 ? 'stroke-emerald-500' : 'stroke-rose-500'
            }`}
          >
            <title>{`Day ${p.day}: Net Cash flow: ₹${p.profit}`}</title>
          </circle>
        ))}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-8">
      
      {/* 1. TOP BAR: Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center space-x-2 text-slate-300">
          <BarChart className="w-5 h-5 text-brand-500" />
          <span className="font-semibold text-sm tracking-wider uppercase">Shop Performance & CRM Analytics</span>
        </div>
        
        <div className="relative">
          <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm font-semibold focus:outline-none focus:border-brand-500 transition appearance-none cursor-pointer"
          >
            {monthsList.map((m) => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* 2. EARNINGS KPI CARDS GRID (Revenue and Profit are clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Revenue - Clickable */}
        <button
          type="button"
          onClick={() => setShowRevenueChartModal(true)}
          className="glass-panel p-5 rounded-2xl flex flex-col justify-between border border-slate-800/80 shadow-md hover:bg-slate-900/60 hover:border-brand-500/40 transition duration-300 group text-left w-full cursor-pointer focus:outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Revenue Made</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition duration-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-100">₹{summary.revenue}</span>
            <p className="text-[9px] text-emerald-400 mt-1 flex items-center font-bold group-hover:underline">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              <span>Show Revenue Chart</span>
            </p>
          </div>
        </button>

        {/* Salaries (Interactive) */}
        <div 
          onClick={() => setShowSalariesModal(true)}
          className="glass-panel p-5 rounded-2xl flex flex-col justify-between border border-slate-800/80 shadow-md hover:bg-slate-900/60 hover:border-slate-700/80 transition duration-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Salaries Paid</span>
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-lg group-hover:bg-brand-500 group-hover:text-white transition duration-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-100">₹{summary.salariesPaid}</span>
            <p className="text-[9px] text-brand-400 mt-1 font-semibold group-hover:underline flex items-center">
              <span>Manage Payroll</span>
              <ChevronDown className="w-3 h-3 ml-0.5 rotate-270" />
            </p>
          </div>
        </div>

        {/* Electricity Bill */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between border border-slate-800/80 shadow-md relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Electricity</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Lightbulb className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-100">₹{summary.electricity}</span>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center">
              <span>Shop Utility Bill</span>
            </p>
          </div>
        </div>

        {/* Rent */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between border border-slate-800/80 shadow-md relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rent Bill</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-100">₹{summary.rent}</span>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center">
              <span>Monthly Shop Rent</span>
            </p>
          </div>
        </div>

        {/* Profit Card - Clickable */}
        <button
          type="button"
          onClick={() => setShowProfitChartModal(true)}
          className={`glass-panel p-5 rounded-2xl flex flex-col justify-between border shadow-lg hover:border-brand-500/40 transition duration-300 group text-left w-full cursor-pointer focus:outline-none ${
            summary.profit >= 0 ? 'border-emerald-500/25 bg-emerald-950/5' : 'border-rose-500/25 bg-rose-950/5'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Net Profit</span>
            <div className={`p-2 rounded-lg group-hover:bg-slate-700/80 transition ${summary.profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {summary.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-2xl font-black ${summary.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{summary.profit}
            </span>
            <p className="text-[9px] text-slate-400 mt-1 group-hover:underline">
              <span>Show Profit Chart</span>
            </p>
          </div>
        </button>

      </div>

      {/* 3. MIDDLE AREA: Bills Editor & Custom Expenses Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Configure Monthly Overhead Bills (Left: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 glass-panel flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-1">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <Home className="w-4.5 h-4.5 text-brand-400" />
                <span>Configure Shop Bills</span>
              </h3>
              {!isEditingExpenses ? (
                <button
                  type="button"
                  onClick={() => setIsEditingExpenses(true)}
                  className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingExpenses(false);
                    setRentInput(summary.rent);
                    setElectricityInput(summary.electricity);
                  }}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveExpenses} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Shop Rent (₹)</label>
                <input
                  type="number"
                  value={rentInput}
                  disabled={!isEditingExpenses}
                  onChange={(e) => setRentInput(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950/80 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-sm transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Electricity Bill (₹)</label>
                <input
                  type="number"
                  value={electricityInput}
                  disabled={!isEditingExpenses}
                  onChange={(e) => setElectricityInput(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950/80 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-brand-500 text-sm transition"
                />
              </div>

              {isEditingExpenses && (
                <button
                  type="submit"
                  disabled={isSavingExpenses}
                  className="w-full py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-xl transition shadow-lg hover:shadow-brand-500/15"
                >
                  {isSavingExpenses ? 'Saving...' : 'Save Expenses'}
                </button>
              )}
            </form>
          </div>

          {/* Add Custom Expense Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 glass-panel flex flex-col gap-4">
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

        {/* Custom Expenses Ledger Table (Right: 7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 glass-panel flex flex-col gap-4 h-[470px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-1">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <DollarSign className="w-4.5 h-4.5 text-brand-400" />
              <span>Other Expenses Ledger</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total: ₹{summary.customExpensesPaid}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {isLoadingCustom ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading ledger entries...</div>
            ) : customExpenses.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No other expenses recorded for {getActiveMonthLabel()}.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Expense Item</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customExpenses.map((exp) => (
                    <tr key={exp._id} className="border-b border-slate-900/50 text-slate-300">
                      <td className="py-3 px-3 font-semibold text-slate-200">{exp.name}</td>
                      <td className="py-3 px-3 text-slate-400">{formatDate(exp.date)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">₹{exp.amount}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomExpense(exp._id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* 4. BASE CLOTH PRICING CONFIGURATIONS (ADMIN SETTINGS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        <div className="lg:col-span-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 glass-panel flex flex-col gap-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-brand-400" />
              <span>Admin Control: Default Cloth Base Pricing</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-medium leading-relaxed">
              * The prices saved here will automatically populate default rows during order creation.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Configure new/update base price form (4 cols) */}
            <form onSubmit={handleSaveClothConfig} className="lg:col-span-4 flex flex-col gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850/60">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Set Default Base Price</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cloth Type Name</label>
                <input
                  type="text"
                  value={newClothType}
                  onChange={(e) => setNewClothType(e.target.value)}
                  placeholder="e.g. Shirt, Pant, Sherwani"
                  className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Base Price (₹)</label>
                <input
                  type="number"
                  value={newClothPrice}
                  onChange={(e) => setNewClothPrice(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSavingClothConfig}
                className="w-full py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-xl transition"
              >
                {isSavingClothConfig ? 'Saving...' : 'Save Default Price'}
              </button>
            </form>

            {/* Right: Pricing Table configurations list (8 cols) */}
            <div className="lg:col-span-8 overflow-y-auto max-h-[260px] border border-slate-850 rounded-xl bg-slate-950/10">
              {isLoadingClothConfigs ? (
                <div className="py-12 text-center text-slate-500 text-xs">Loading pricing configs...</div>
              ) : clothConfigs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">No custom default prices configured yet.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase bg-slate-950/40">
                      <th className="py-2.5 px-4">Cloth Type</th>
                      <th className="py-2.5 px-4 text-right">Default Base Price</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clothConfigs.map((cfg) => (
                      <tr key={cfg._id} className="border-b border-slate-900/60 text-slate-300">
                        <td className="py-3 px-4 font-semibold text-slate-200">{cfg.cloth_type}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-brand-400">₹{cfg.default_price}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setNewClothType(cfg.cloth_type);
                              setNewClothPrice(cfg.default_price);
                            }}
                            className="text-[10px] font-semibold text-brand-400 hover:text-brand-300 transition"
                          >
                            Edit Pricing
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
      </div>

      {/* 5. STAFF PAYROLL MODAL (Add employee & edit base salaries) */}
      {showSalariesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-400" />
                  <span>Staff Payroll Manager</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Month: {getActiveMonthLabel()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeForm(!showAddEmployeeForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddEmployeeForm ? 'Hide Form' : 'Add Staff'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSalariesModal(false);
                    setShowAddEmployeeForm(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 flex flex-col gap-5 overflow-y-auto">
              
              {/* Add Employee Form */}
              {showAddEmployeeForm && (
                <form onSubmit={handleAddEmployee} className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row items-end gap-3 transition">
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employee Name</label>
                    <input
                      type="text"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      placeholder="e.g. Ramesh K. (Helper)"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-xs transition"
                      required
                    />
                  </div>
                  <div className="sm:w-36">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base Monthly Salary (₹)</label>
                    <input
                      type="number"
                      value={newEmployeeSalary}
                      onChange={(e) => setNewEmployeeSalary(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-xs transition"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingEmployee}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold rounded-lg transition shrink-0"
                  >
                    {isAddingEmployee ? 'Saving...' : 'Register'}
                  </button>
                </form>
              )}

              {/* Calculated Monthly Paid salaries on top */}
              <div className="flex items-center justify-between bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Salaries Paid This Month</span>
                  <span className="text-xl font-black text-slate-100 flex items-center mt-0.5">
                    ₹{summary.salariesPaid}
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500 max-w-[220px] leading-relaxed">
                  * Toggling employee salary status to <strong>PAID</strong> logs their current base salary as an expense in this month's financials.
                </div>
              </div>

              {/* Employee table */}
              <div className="flex-1">
                {isLoadingSalaries ? (
                  <div className="py-12 text-center text-slate-500 text-xs">Loading employee logs...</div>
                ) : employees.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">No employees found.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase">
                        <th className="py-2.5 pr-3">Employee Name</th>
                        <th className="py-2.5 px-3 text-right">Base Monthly Salary</th>
                        <th className="py-2.5 pl-3 text-center">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.employee_id} className="border-b border-slate-900/60 text-slate-300">
                          <td className="py-3 pr-3 font-semibold text-slate-200">{emp.name}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">
                            {editingEmployeeId === emp.employee_id ? (
                              <div className="flex items-center justify-end space-x-1">
                                <input
                                  type="number"
                                  value={editingEmployeeSalary}
                                  onChange={(e) => setEditingEmployeeSalary(e.target.value)}
                                  className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-right text-xs font-semibold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEmployeeSalary(emp.employee_id)}
                                  className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500 hover:text-white transition"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmployeeId(null);
                                    setEditingEmployeeSalary('');
                                  }}
                                  className="p-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded hover:bg-rose-500 hover:text-white transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2 group">
                                <span>₹{emp.base_salary}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmployeeId(emp.employee_id);
                                    setEditingEmployeeSalary(emp.base_salary);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-brand-400 hover:text-brand-300 transition"
                                  title="Edit Salary"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 pl-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSalary(emp.employee_id)}
                              className={`px-4 py-1.5 rounded-xl font-bold text-[10px] tracking-wide transition uppercase shadow-sm ${
                                emp.status === 'Paid'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-slate-950/80 text-slate-500 border border-slate-800 hover:bg-slate-900'
                              }`}
                            >
                              {emp.status === 'Paid' ? 'Paid' : 'Unpaid'}
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
        </div>
      )}

      {/* 6. REVENUE CHART DETAILS OVERLAY MODAL */}
      {showRevenueChartModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-3xl rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Header with Close and Month filter inside the modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Day-wise Cash Revenue Analysis</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Showing daily collected advances & completed balances</p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Month filter inside the modal */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-8 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
                  >
                    {monthsList.map((m) => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowRevenueChartModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Rendering the SVG Line Chart */}
            <div className="p-6 bg-slate-950/20 flex flex-col gap-6">
              {isLoadingDaily ? (
                <div className="py-24 text-center text-slate-500 text-xs">Generating chart metrics...</div>
              ) : (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850 shadow-inner">
                  {renderRevenueChart()}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. PROFIT CHART DETAILS OVERLAY MODAL */}
      {showProfitChartModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-3xl rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Header with Close and Month filter inside the modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-brand-400" />
                  <span>Daily Profit & Loss (P&L) Trends</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Calculated relative to daily amortized rent, bills, & salaries</p>
              </div>

              <div className="flex items-center space-x-3">
                {/* Month filter inside the modal */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-8 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
                  >
                    {monthsList.map((m) => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowProfitChartModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Rendering the SVG Profit Chart */}
            <div className="p-6 bg-slate-950/20 flex flex-col gap-6">
              {isLoadingDaily ? (
                <div className="py-24 text-center text-slate-500 text-xs">Generating chart metrics...</div>
              ) : (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-850 shadow-inner">
                  {renderProfitChart()}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
