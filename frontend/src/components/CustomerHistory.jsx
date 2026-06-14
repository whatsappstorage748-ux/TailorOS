import React, { useState, useEffect } from 'react';
import { Search, Phone, Calendar, Eye, X, ChevronRight, Users, ArrowUpDown } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : 'https://captain-tailors.loca.lt';

const fmt  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN',  { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function CustomerHistory() {
  const [searchQuery, setSearchQuery]       = useState('');
  const [sortBy, setSortBy]                 = useState('newest');
  const [customers, setCustomers]           = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orders, setOrders]                 = useState([]);
  const [isLoadingList, setIsLoadingList]   = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedOrder, setSelectedOrder]   = useState(null);

  const fetchCustomers = async () => {
    setIsLoadingList(true);
    try {
      const res  = await fetch(`${API_BASE}/api/customers?q=${searchQuery}`);
      const data = await res.json();
      if (res.ok) {
        let list = [...(data.customers || [])];
        if (sortBy === 'newest')         list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (sortBy === 'oldest')    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sortBy === 'highest')   list.sort((a, b) => b.order_count - a.order_count);
        else if (sortBy === 'lowest')    list.sort((a, b) => a.order_count - b.order_count);
        setCustomers(list);
        if (list.length > 0 && !selectedCustomer) setSelectedCustomer(list[0]);
      }
    } catch (e) { console.error(e); } finally { setIsLoadingList(false); }
  };

  const fetchHistory = async (mobile) => {
    setIsLoadingHistory(true);
    try {
      const res  = await fetch(`${API_BASE}/api/customers/${mobile}/history`);
      const data = await res.json();
      setOrders(res.ok ? (data.orders || []) : []);
    } catch (e) { setOrders([]); } finally { setIsLoadingHistory(false); }
  };

  const openOrder = async (billNo) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${billNo}`);
      if (res.ok) setSelectedOrder(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    selectedCustomer ? fetchHistory(selectedCustomer.mobile_number) : setOrders([]);
  }, [selectedCustomer]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-100px)]">

      {/* ── LEFT: Customer List ──────────────────────── */}
      <div className="lg:col-span-4 card flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-800">Customers</h2>
          <span className="ml-auto bg-gray-100 text-gray-500 text-2xs font-semibold px-1.5 py-0.5 rounded">{customers.length}</span>
        </div>

        {/* Search + Sort */}
        <div className="p-3 border-b border-gray-100 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text" value={searchQuery} placeholder="Search name or mobile…"
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field-input pl-8 py-2 text-xs"
            />
          </div>
          <div className="relative w-32 shrink-0">
            <ArrowUpDown className="absolute left-2.5 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
            <select
              value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="field-input pl-7 py-2 text-xs appearance-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Most Orders</option>
              <option value="lowest">Fewest Orders</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {isLoadingList ? (
            <div className="py-10 text-center text-xs text-gray-400">Loading…</div>
          ) : customers.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">No customers found.</div>
          ) : customers.map((c) => (
            <button
              key={c.mobile_number}
              onClick={() => setSelectedCustomer(c)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                selectedCustomer?.mobile_number === c.mobile_number
                  ? 'bg-brand-50 border-l-2 border-brand-600'
                  : 'hover:bg-gray-50 border-l-2 border-transparent'
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${selectedCustomer?.mobile_number === c.mobile_number ? 'text-brand-700' : 'text-gray-900'}`}>
                  {c.customer_name}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{c.mobile_number} · {c.order_count} {c.order_count === 1 ? 'order' : 'orders'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Order History ─────────────────────── */}
      <div className="lg:col-span-8 card flex flex-col overflow-hidden">
        {selectedCustomer ? (
          <>
            {/* Customer header */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
              <div>
                <p className="section-label mb-0.5">Selected Customer</p>
                <h3 className="text-base font-bold text-gray-900">{selectedCustomer.customer_name}</h3>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono text-gray-700">{selectedCustomer.mobile_number}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Since {fmt(selectedCustomer.created_at)}
                </span>
              </div>
            </div>

            {/* Orders table */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading order history…</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No orders recorded for this customer.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bill No.</th>
                      <th>Order Date</th>
                      <th className="text-right">Amount</th>
                      <th>Advance</th>
                      <th>Balance</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.bill_number} onClick={() => openOrder(order.bill_number)}>
                        <td><span className="font-mono text-xs font-semibold text-brand-600">{order.bill_number}</span></td>
                        <td><span className="text-xs text-gray-500">{fmt(order.order_date)}</span></td>
                        <td className="text-right"><span className="font-semibold">₹{order.total_amount}</span></td>
                        <td><span className="text-emerald-600 font-mono text-xs">₹{order.advance_amount}</span></td>
                        <td><span className="text-red-500 font-mono text-xs">₹{order.balance_amount}</span></td>
                        <td className="text-center">
                          <span className={order.status === 'Delivered' ? 'badge-green' : 'badge-red'}>
                            {order.status}
                          </span>
                        </td>
                        <td className="text-center" onClick={(e) => { e.stopPropagation(); openOrder(order.bill_number); }}>
                          <button className="btn-ghost p-1.5"><Eye className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a customer from the list on the left.
          </div>
        )}
      </div>

      {/* ── ORDER DETAIL MODAL ────────────────────────── */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-panel max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Order Details</h3>
                  <span className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {selectedOrder.order.bill_number}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Created {fmtDt(selectedOrder.order.created_at)}</p>
              </div>
              <button className="btn-ghost p-1.5" onClick={() => setSelectedOrder(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-4">
                {/* Customer */}
                <div className="card p-4">
                  <p className="section-label mb-3">Customer</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Name</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.customer?.customer_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Mobile</p>
                      <p className="font-mono font-semibold text-gray-900">{selectedOrder.customer?.mobile_number || selectedOrder.order.mobile_number}</p>
                    </div>
                  </div>
                </div>
                {/* Items */}
                <div className="card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100"><p className="section-label">Items</p></div>
                  <table className="data-table text-xs">
                    <thead><tr><th>Cloth</th><th className="text-center">Qty</th><th className="text-right">Rate</th><th className="text-right">Total</th></tr></thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it, i) => (
                        <tr key={i}>
                          <td className="font-medium">{it.cloth_type}</td>
                          <td className="text-center font-mono">{it.quantity}</td>
                          <td className="text-right font-mono">₹{it.price_per_cloth}</td>
                          <td className="text-right font-mono font-semibold">₹{it.total_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 grid grid-cols-3 gap-2 text-center">
                    {[['Total', `₹${selectedOrder.order.total_amount}`, 'text-gray-900'], ['Advance', `₹${selectedOrder.order.advance_amount}`, 'text-emerald-600'], ['Balance', `₹${selectedOrder.order.balance_amount}`, 'text-red-500']].map(([l, v, c]) => (
                      <div key={l}><p className="section-label mb-1">{l}</p><p className={`text-sm font-bold ${c}`}>{v}</p></div>
                    ))}
                  </div>
                </div>
                {/* Status */}
                <div className="card p-4">
                  <p className="section-label mb-2">Delivery Status</p>
                  <span className={selectedOrder.order.status === 'Delivered' ? 'badge-green' : 'badge-red'}>{selectedOrder.order.status}</span>
                  {selectedOrder.order.status === 'Delivered' && (
                    <p className="text-xs text-gray-400 mt-1.5">{fmtDt(selectedOrder.order.delivery_date)}</p>
                  )}
                </div>
              </div>
              {/* Measurement */}
              <div className="card overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 border-b border-gray-100"><p className="section-label">Measurement Sheet</p></div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 min-h-[280px]">
                  <img
                    src={`${API_BASE}/${selectedOrder.order.measurement_image_path}`}
                    alt="Measurement"
                    className="max-w-full max-h-[360px] object-contain rounded border border-gray-200 shadow-sm"
                    onError={(e) => { e.target.src = 'https://placehold.co/400x300/f3f4f6/9ca3af?text=No+Image'; }}
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
