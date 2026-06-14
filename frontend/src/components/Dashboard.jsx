import React, { useState, useEffect } from 'react';
import { Search, Package, CheckCircle, Clock, IndianRupee, Calendar, Eye, X, CheckCircle2 } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : 'https://captain-tailors.loca.lt';

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDt = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <p className="section-label mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ refreshTrigger }) {
  const [stats, setStats] = useState({ totalOrders: 0, undeliveredOrders: 0, deliveredOrders: 0, todayRevenue: 0, todayOrders: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const fetchData = async () => {
    try {
      const statsRes = await fetch(`${API_BASE}/api/dashboard/stats`);
      setStats(await statsRes.json());
      setIsLoading(true);
      const ordersRes = await fetch(`${API_BASE}/api/orders/search?q=${searchQuery}`);
      const d = await ordersRes.json();
      setOrders(d.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [searchQuery, refreshTrigger]);

  const openOrder = async (billNo) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${billNo}`);
      if (res.ok) setSelectedOrder(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleComplete = async (billNo) => {
    setIsCompleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${billNo}/complete`, { method: 'PUT' });
      if (res.ok) {
        const detail = await fetch(`${API_BASE}/api/orders/${billNo}`);
        if (detail.ok) setSelectedOrder(await detail.json());
        fetchData();
      }
    } catch (err) { console.error(err); } finally { setIsCompleting(false); }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── KPI STATS ROW ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Package}      label="Total Orders"    value={stats.totalOrders}      iconBg="bg-gray-100"     iconColor="text-gray-600" />
        <StatCard icon={Clock}        label="Undelivered"     value={stats.undeliveredOrders} iconBg="bg-red-50"       iconColor="text-red-500"  />
        <StatCard icon={CheckCircle}  label="Delivered"       value={stats.deliveredOrders}   iconBg="bg-emerald-50"   iconColor="text-emerald-600" />
        <StatCard icon={IndianRupee}  label="Today's Revenue" value={`₹${stats.todayRevenue || 0}`} iconBg="bg-brand-50" iconColor="text-brand-600" />
        <StatCard icon={Calendar}     label="Today's Orders"  value={stats.todayOrders}       iconBg="bg-amber-50"    iconColor="text-amber-600" />
      </div>

      {/* ── ORDERS TABLE ──────────────────────────────── */}
      <div className="card overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-gray-100 gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {searchQuery ? 'Search Results' : 'Active Orders'}
            </h2>
            {!searchQuery && <p className="text-xs text-gray-400 mt-0.5">Showing undelivered orders</p>}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bill no. or mobile"
              className="field-input pl-9 py-2 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No orders found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">View</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.bill_number} onClick={() => openOrder(order.bill_number)}>
                    <td><span className="font-mono text-xs font-semibold text-brand-600">{order.bill_number}</span></td>
                    <td><span className="font-medium text-gray-900">{order.customer_name}</span></td>
                    <td><span className="font-mono text-xs text-gray-500">{order.mobile_number}</span></td>
                    <td><span className="text-gray-500 text-xs">{fmt(order.order_date)}</span></td>
                    <td className="text-right"><span className="font-semibold text-gray-900">₹{order.total_amount}</span></td>
                    <td className="text-center">
                      <span className={order.status === 'Delivered' ? 'badge-green' : 'badge-red'}>
                        {order.status}
                      </span>
                    </td>
                    <td className="text-center" onClick={(e) => { e.stopPropagation(); openOrder(order.bill_number); }}>
                      <button className="btn-ghost p-1.5">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── ORDER DETAIL MODAL ────────────────────────── */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-panel max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
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

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Left: Details */}
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
                <div className="card overflow-hidden flex-1">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="section-label">Items</p>
                  </div>
                  <table className="data-table text-xs">
                    <thead>
                      <tr>
                        <th>Cloth Type</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Rate</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((item, i) => (
                        <tr key={i}>
                          <td className="font-medium">{item.cloth_type}</td>
                          <td className="text-center font-mono">{item.quantity}</td>
                          <td className="text-right font-mono">₹{item.price_per_cloth}</td>
                          <td className="text-right font-mono font-semibold">₹{item.total_amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Financials */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Total',   value: `₹${selectedOrder.order.total_amount}`,   cls: 'text-gray-900' },
                      { label: 'Advance', value: `₹${selectedOrder.order.advance_amount}`,  cls: 'text-emerald-600' },
                      { label: 'Balance', value: `₹${selectedOrder.order.balance_amount}`,  cls: 'text-red-500' },
                    ].map(({ label, value, cls }) => (
                      <div key={label}>
                        <p className="section-label mb-1">{label}</p>
                        <p className={`text-sm font-bold ${cls}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery status */}
                <div className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="section-label mb-1.5">Delivery Status</p>
                    <span className={selectedOrder.order.status === 'Delivered' ? 'badge-green' : 'badge-red'}>
                      {selectedOrder.order.status}
                    </span>
                    {selectedOrder.order.status === 'Delivered' && (
                      <p className="text-xs text-gray-400 mt-1.5">{fmtDt(selectedOrder.order.delivery_date)}</p>
                    )}
                  </div>
                  {selectedOrder.order.status === 'Undelivered' && (
                    <button
                      disabled={isCompleting}
                      onClick={() => handleComplete(selectedOrder.order.bill_number)}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isCompleting ? 'Saving…' : 'Mark Delivered'}
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Measurement sheet */}
              <div className="card overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="section-label">Measurement Sheet</p>
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 min-h-[280px]">
                  <img
                    src={`${API_BASE}/${selectedOrder.order.measurement_image_path}`}
                    alt="Measurement Sheet"
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
