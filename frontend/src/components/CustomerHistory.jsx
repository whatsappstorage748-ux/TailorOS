import React, { useState, useEffect } from 'react';
import { Search, Phone, User, Calendar, FileText, CheckCircle2, Clock, Eye, X, ChevronRight, UserCheck, ArrowUpDown, ChevronDown } from 'lucide-react';

export default function CustomerHistory() {
  const API_BASE = `http://${window.location.hostname}:5000`;
  
  // Search, sorting, and lists
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest_orders, lowest_orders
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Loading states
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Details modal state
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch all customers based on search query
  const fetchCustomersList = async () => {
    setIsLoadingList(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/customers?q=${searchQuery}`);
      const data = await response.json();
      if (response.ok) {
        let sortedCustomers = [...(data.customers || [])];
        
        // Apply client-side sorting
        if (sortBy === 'newest') {
          sortedCustomers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === 'oldest') {
          sortedCustomers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (sortBy === 'highest_orders') {
          sortedCustomers.sort((a, b) => b.order_count - a.order_count);
        } else if (sortBy === 'lowest_orders') {
          sortedCustomers.sort((a, b) => a.order_count - b.order_count);
        }

        setCustomers(sortedCustomers);
        
        // Auto-select first customer if none selected and customers exist
        if (sortedCustomers.length > 0 && !selectedCustomer) {
          setSelectedCustomer(sortedCustomers[0]);
        }
      } else {
        setErrorMsg('Failed to load customers list.');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setErrorMsg('Network error. Make sure backend is running.');
    } finally {
      setIsLoadingList(false);
    }
  };

  // Fetch selected customer's history
  const fetchCustomerHistory = async (mobile) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE}/api/customers/${mobile}/history`);
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching customer history:', error);
      setOrders([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Reload customer list on query change or sort change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomersList();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sortBy]);

  // Load history whenever selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerHistory(selectedCustomer.mobile_number);
    } else {
      setOrders([]);
    }
  }, [selectedCustomer]);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] select-none">
      
      {/* LEFT COLUMN: Search & Customer List (5 cols) */}
      <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col overflow-hidden glass-panel h-full">
        {/* Search Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-brand-400" />
            <span>Customers CRM Registry</span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or mobile..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
              />
            </div>
            
            <div className="relative sm:w-44 shrink-0">
              <ArrowUpDown className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-xs font-bold focus:outline-none focus:border-brand-500 transition appearance-none cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest_orders">Highest Orders</option>
                <option value="lowest_orders">Lowest Orders</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>
          </div>
          {errorMsg && (
            <p className="text-xs text-rose-400 mt-2 font-medium">{errorMsg}</p>
          )}
        </div>

        {/* Customer List Container */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
          {isLoadingList ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading customer records...</div>
          ) : customers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No customers found.</div>
          ) : (
            customers.map((cust) => (
              <div
                key={cust.mobile_number}
                onClick={() => setSelectedCustomer(cust)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                  selectedCustomer?.mobile_number === cust.mobile_number
                    ? 'bg-brand-600/15 border-brand-500/40 shadow-md'
                    : 'bg-slate-950/30 border-slate-800/50 hover:bg-slate-950/50 hover:border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <span className="block font-bold text-slate-200 text-sm group-hover:text-brand-300 transition">
                    {cust.customer_name}
                  </span>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-slate-600" />
                      <span>{cust.mobile_number}</span>
                    </span>
                    <span>•</span>
                    <span>{cust.order_count} {cust.order_count === 1 ? 'order' : 'orders'}</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-600 group-hover:text-slate-400 transition ${
                  selectedCustomer?.mobile_number === cust.mobile_number ? 'text-brand-400 translate-x-0.5' : ''
                }`} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Selected Customer History Details (7 cols) */}
      <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
        {selectedCustomer ? (
          <div className="flex flex-col h-full bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden glass-panel">
            
            {/* Header Details */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Currently Selected Customer</span>
                  <h4 className="text-lg font-black text-slate-200">{selectedCustomer.customer_name}</h4>
                </div>
                <div className="flex items-center space-x-4 text-sm bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="font-mono text-slate-300 font-semibold">{selectedCustomer.mobile_number}</span>
                  </div>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Since {formatDate(selectedCustomer.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table Container */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading order history ledger...</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No orders recorded for this customer.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Bill No</th>
                      <th className="py-2.5 px-3">Order Date</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
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
                        <td className="py-3 px-3 font-mono font-semibold text-brand-400 text-sm">{order.bill_number}</td>
                        <td className="py-3 px-3 text-slate-400 text-xs">{formatDate(order.order_date)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-200 text-sm">₹{order.total_amount}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                            order.status === 'Delivered' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="p-1 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded transition"
                            title="Inspect Measurement Drawing"
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
        ) : (
          <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex items-center justify-center text-slate-500 text-sm glass-panel h-full">
            Select a customer from the CRM Registry on the left.
          </div>
        )}
      </div>

      {/* ORDER INSPECTOR MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Order Inspection</span>
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

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-5">
                
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

                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-semibold">Delivery Status</span>
                    <div className="flex items-center space-x-1.5 mt-1">
                      <span className={`w-2 h-2 rounded-full ${selectedOrder.order.status === 'Delivered' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
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
                </div>

              </div>

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
