import React, { useState, useEffect } from 'react';
import { Search, Package, CheckCircle, Clock, DollarSign, Calendar, Eye, MapPin, X } from 'lucide-react';

export default function Dashboard({ refreshTrigger }) {
  const API_BASE = `http://${window.location.hostname}:5000`;
  const [stats, setStats] = useState({
    totalOrders: 0,
    undeliveredOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    todayOrders: 0,
    pendingDeliveryCount: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selected order for the details modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch stats and default undelivered list
  const fetchData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/dashboard/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch search results (empty query returns recent undelivered)
      setIsLoading(true);
      const ordersRes = await fetch(`${API_BASE}/api/orders/search?q=${searchQuery}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData.orders || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, refreshTrigger]);

  // Handle Complete Order status change
  const handleCompleteOrder = async (billNumber) => {
    setIsCompleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${billNumber}/complete`, {
        method: 'PUT'
      });
      if (res.ok) {
        // Refresh local details in modal
        const detailsRes = await fetch(`${API_BASE}/api/orders/${billNumber}`);
        if (detailsRes.ok) {
          const updatedDetails = await detailsRes.json();
          setSelectedOrder(updatedDetails);
        }
        
        // Refresh dashboard background
        fetchData();
      }
    } catch (error) {
      console.error('Error completing order:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Helper to format date
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

  // Helper to format date & time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. KPI STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Orders */}
        <div className="glass-panel p-4 rounded-xl flex items-center space-x-3.5">
          <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Orders</span>
            <span className="text-xl font-bold text-slate-100">{stats.totalOrders}</span>
          </div>
        </div>

        {/* Undelivered */}
        <div className="glass-panel p-4 rounded-xl flex items-center space-x-3.5">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Undelivered</span>
            <span className="text-xl font-bold text-slate-100">{stats.undeliveredOrders}</span>
          </div>
        </div>

        {/* Delivered */}
        <div className="glass-panel p-4 rounded-xl flex items-center space-x-3.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Delivered</span>
            <span className="text-xl font-bold text-slate-100">{stats.deliveredOrders}</span>
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="glass-panel p-4 rounded-xl flex items-center space-x-3.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Today's Revenue</span>
            <span className="text-lg font-bold text-slate-100">₹{stats.todayRevenue || 0}</span>
          </div>
        </div>

        {/* Today's Orders */}
        <div className="glass-panel p-4 rounded-xl flex items-center space-x-3.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Today's Orders</span>
            <span className="text-xl font-bold text-slate-100">{stats.todayOrders}</span>
          </div>
        </div>

      </div>

      {/* 2. SEARCH BAR & ORDER LIST */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
        
        {/* Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-2 gap-4">
          <h3 className="font-semibold text-slate-200 text-lg">
            {searchQuery ? 'Search Results' : 'Active Orders (Undelivered)'}
          </h3>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Bill No or Mobile"
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
            />
          </div>
        </div>

        {/* Order list Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No orders found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Bill No</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr 
                    key={order.bill_number} 
                    className="border-b border-slate-900/60 hover:bg-slate-950/20 transition cursor-pointer"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/api/orders/${order.bill_number}`);
                        if (res.ok) {
                          const data = await res.json();
                          setSelectedOrder(data);
                        }
                      } catch (error) {
                        console.error('Error fetching order details:', error);
                      }
                    }}
                  >
                    <td className="py-3.5 px-4 font-mono font-semibold text-brand-400 text-sm">{order.bill_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{order.customer_name}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm font-mono">{order.mobile_number}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-sm">{formatDate(order.order_date)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-200">₹{order.total_amount}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        order.status === 'Delivered' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="p-1 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded transition"
                        title="View Details & Measurement Sheet"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE}/api/orders/${order.bill_number}`);
                            if (res.ok) {
                              const data = await res.json();
                              setSelectedOrder(data);
                            }
                          } catch (error) {
                            console.error('Error fetching order details:', error);
                          }
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* 3. ORDER INSPECTOR MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Order Details</span>
                  <span className="text-brand-400 font-mono text-base">[{selectedOrder.order.bill_number}]</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Created: {formatDateTime(selectedOrder.order.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Client, Bill items and Stats */}
              <div className="flex flex-col gap-5">
                
                {/* Customer Info Card */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900 pb-2 mb-3">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="block text-xs text-slate-500">Name</span>
                      <span className="font-semibold text-slate-200">{selectedOrder.customer?.customer_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Mobile</span>
                      <span className="font-semibold text-slate-200 font-mono">{selectedOrder.customer?.mobile_number || selectedOrder.order.mobile_number}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table Card */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 flex-1 flex flex-col">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-900 pb-2 mb-3">Items Ordered</h4>
                  <div className="overflow-y-auto max-h-[160px] flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase">
                          <th className="py-1.5 pr-2">Cloth Type</th>
                          <th className="py-1.5 px-2 text-center">Qty</th>
                          <th className="py-1.5 px-2 text-right">Rate</th>
                          <th className="py-1.5 pl-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-900/40 text-slate-300">
                            <td className="py-2 pr-2 font-medium">{item.cloth_type}</td>
                            <td className="py-2 px-2 text-center font-mono">{item.quantity}</td>
                            <td className="py-2 px-2 text-right font-mono">₹{item.price_per_cloth}</td>
                            <td className="py-2 pl-2 text-right font-mono font-semibold text-slate-100">₹{item.total_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financials in Modal */}
                  <div className="border-t border-slate-900 pt-3 mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Total</span>
                      <span className="text-sm font-bold text-slate-200">₹{selectedOrder.order.total_amount}</span>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Paid</span>
                      <span className="text-sm font-bold text-emerald-400">₹{selectedOrder.order.advance_amount}</span>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Balance</span>
                      <span className="text-sm font-bold text-rose-400">₹{selectedOrder.order.balance_amount}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery details & complete status */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Delivery Status</span>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${selectedOrder.order.status === 'Delivered' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
                        <span className={`text-sm font-bold ${selectedOrder.order.status === 'Delivered' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {selectedOrder.order.status}
                        </span>
                      </div>
                      {selectedOrder.order.status === 'Delivered' && (
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Delivered on: {formatDateTime(selectedOrder.order.delivery_date)}
                        </span>
                      )}
                    </div>

                    {selectedOrder.order.status === 'Undelivered' && (
                      <button
                        type="button"
                        disabled={isCompleting}
                        onClick={() => handleCompleteOrder(selectedOrder.order.bill_number)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg hover:shadow-emerald-500/10"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isCompleting ? 'Completing...' : 'Complete Order'}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Measurement Image Sheet */}
              <div className="flex flex-col bg-slate-950/50 rounded-xl border border-slate-800/80 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-900 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Associated Measurement Sheet
                </div>
                <div className="flex-1 bg-white flex items-center justify-center p-4 min-h-[300px]">
                  <img
                    src={`${API_BASE}/${selectedOrder.order.measurement_image_path}`}
                    alt={`Measurement Sheet for ${selectedOrder.order.bill_number}`}
                    className="max-w-full max-h-[380px] object-contain border border-slate-200 rounded-lg shadow-sm"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/400x300/white/blue?text=Measurement+Image+Unavailable';
                    }}
                  />
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
