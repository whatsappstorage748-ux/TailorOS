import { fetchWithAuth } from '../App';
import React, { useState, useEffect } from 'react';
import { Search, Phone, Calendar, Eye, X, ChevronRight, Users, ArrowUpDown, Printer } from 'lucide-react';
import { renderBillNumber } from './OrderForm';
import { useCustomers, useCustomerHistory } from '../hooks/useShopData';

const API_BASE = ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '' && !window.Capacitor)
  ? `http://${window.location.hostname}:5000`
  : (window.Capacitor ? 'https://tailoros-production.up.railway.app' : window.location.origin);

const fmt  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN',  { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const handlePrintInvoice = (selectedOrder) => {
  const { order, customer, items } = selectedOrder;
  const owner = order.owner || {};
  const shopName = owner.shop_name || 'Captain Tailors';
  const shopEmail = owner.email || 'info@captaintailors.com';
  const shopContact = owner.contact_number || '+91 98765 43210';
  const shopLogo = owner.shop_logo ? `${API_BASE}/${owner.shop_logo}` : '';
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  
  const itemsHtml = (items || []).map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; color: #334155;">${item.cloth_type}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #334155; font-family: monospace;">${item.quantity}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #334155; font-family: monospace;">₹${item.price_per_cloth.toFixed(2)}</td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 13px; color: #0f172a; font-weight: 600; font-family: monospace;">₹${item.total_amount.toFixed(2)}</td>
    </tr>
  `).join('');

  const dateStr = new Date(order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date(order.created_at || order.order_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  printWindow.document.write(`
    <html>
      <head>
        <title>${shopName} Invoice - ${order.bill_number}</title>
        <!-- Load Google Font -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        
        <!-- html2pdf.js CDN -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

        <style>
          * {
            box-sizing: border-box;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }
          body {
            background-color: #f1f5f9;
            color: #0f172a;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
          }
          
          /* Top Action/Control Bar */
          .control-bar {
            position: sticky;
            top: 0;
            width: 100%;
            background-color: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 100;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          }
          .bar-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a8a;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .bar-actions {
            display: flex;
            gap: 12px;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }
          .btn-primary {
            background-color: #3b82f6;
            color: #ffffff;
          }
          .btn-primary:hover {
            background-color: #2563eb;
          }
          .btn-success {
            background-color: #10b981;
            color: #ffffff;
          }
          .btn-success:hover {
            background-color: #059669;
          }
          .btn-secondary {
            background-color: #64748b;
            color: #ffffff;
          }
          .btn-secondary:hover {
            background-color: #475569;
          }

          /* Invoice Page Layout */
          .invoice-container {
            padding: 40px 20px;
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .invoice-card {
            background-color: #ffffff;
            width: 100%;
            max-width: 800px;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            border: 1px solid #e2e8f0;
          }

          /* Invoice Design Elements */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .shop-info {
            display: flex;
            flex-direction: column;
          }
          .shop-name {
            font-size: 28px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: -0.025em;
            margin: 0;
            line-height: 1.1;
          }
          .shop-subtitle {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 4px;
            margin-bottom: 8px;
          }
          .shop-details {
            font-size: 12px;
            color: #475569;
            line-height: 1.5;
          }
          .invoice-meta {
            text-align: right;
          }
          .invoice-label {
            font-size: 24px;
            font-weight: 800;
            color: #3b82f6;
            letter-spacing: 0.05em;
            margin: 0;
            line-height: 1.1;
          }
          .invoice-number {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 6px;
            font-family: monospace;
          }

          .details-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 24px;
            margin-bottom: 30px;
          }
          .details-block {
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 8px;
            padding: 16px;
          }
          .details-block-title {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .details-row {
            font-size: 13px;
            line-height: 1.6;
            color: #334155;
          }
          .details-row strong {
            color: #0f172a;
          }

          .table-container {
            margin-bottom: 30px;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
          }
          .invoice-table th {
            background-color: #f1f5f9;
            color: #475569;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 10px 8px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .financials-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 20px;
          }
          .notes-block {
            width: 50%;
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            padding: 12px;
            border-radius: 8px;
          }
          .notes-title {
            font-weight: 700;
            color: #b45309;
            margin-bottom: 4px;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
          }
          
          .totals-block {
            width: 40%;
            border-collapse: collapse;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
            color: #475569;
          }
          .totals-row.bold {
            font-weight: 700;
            color: #0f172a;
            border-top: 1px solid #e2e8f0;
            margin-top: 4px;
            padding-top: 8px;
          }
          .totals-row.advance {
            color: #10b981;
            font-weight: 600;
          }
          .totals-row.balance {
            color: #ef4444;
            font-weight: 700;
            font-size: 16px;
            border-top: 2px double #e2e8f0;
            margin-top: 4px;
            padding-top: 8px;
          }

          .signature-area {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .thank-you {
            font-size: 14px;
            font-weight: 600;
            color: #1e3a8a;
            font-style: italic;
          }
          .sign-box {
            text-align: center;
            width: 200px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 12px;
            color: #475569;
            font-weight: 600;
          }

          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 16px;
            line-height: 1.4;
          }

          /* Status Badges */
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-red { background-color: #fee2e2; color: #ef4444; }
          .badge-amber { background-color: #fef3c7; color: #d97706; }
          .badge-green { background-color: #d1fae5; color: #10b981; }

          /* Print Overrides */
          @media print {
            body {
              background-color: #ffffff;
              color: #000000;
            }
            .control-bar {
              display: none;
            }
            .invoice-container {
              padding: 0;
            }
            .invoice-card {
              border: none;
              box-shadow: none;
              padding: 0;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="control-bar">
          <div class="bar-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>
            Invoice Preview - ${shopName}
          </div>
          <div class="bar-actions">
            <button class="btn btn-primary" onclick="window.print()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
              Print Invoice
            </button>
            <button class="btn btn-success" onclick="downloadPDF()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download PDF
            </button>
            <button class="btn btn-secondary" onclick="window.close()">
              Close
            </button>
          </div>
        </div>

        <div class="invoice-container">
          <div class="invoice-card" id="invoice-card">
            <div class="header">
              <div class="shop-info">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                  ${shopLogo ? `<img src="${shopLogo}" style="height: 48px; object-fit: contain;" />` : ''}
                  <div>
                    <h1 class="shop-name">${shopName}</h1>
                    <div class="shop-subtitle">Bespoke Tailoring & Stitching</div>
                  </div>
                </div>
                <div class="shop-details">
                  Premium Custom Fitting & Designing<br>
                  Email: ${shopEmail} | Tel: ${shopContact}
                </div>
              </div>
              <div class="invoice-meta">
                <h2 class="invoice-label">INVOICE</h2>
                <div class="invoice-number">Bill No: ${order.bill_number}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                  Date: ${dateStr} at ${timeStr}
                </div>
                <div style="margin-top: 10px;">
                  <span class="badge ${
                    order.status === 'Delivered' ? 'badge-green' :
                    order.status === 'Ready' ? 'badge-amber' :
                    'badge-red'
                  }">${order.status}</span>
                </div>
              </div>
            </div>

            <div class="details-grid">
              <div class="details-block">
                <div class="details-block-title">Customer Details</div>
                <div class="details-row">
                  <strong>Name:</strong> ${customer ? customer.customer_name : 'Valued Customer'}<br>
                  <strong>Mobile:</strong> <span style="font-family: monospace;">${order.mobile_number}</span>
                </div>
              </div>
              <div class="details-block">
                <div class="details-block-title">Invoice Details</div>
                <div class="details-row">
                  <strong>Order ID:</strong> <span style="font-family: monospace;">ON${String(order.id).padStart(6, '0')}</span><br>
                  <strong>Bill Reference:</strong> <span style="font-family: monospace;">${order.bill_number}</span><br>
                  <strong>Payment Status:</strong> ${order.balance_amount === 0 ? 'Fully Paid' : 'Balance Pending'}
                </div>
              </div>
            </div>

            <div class="table-container">
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th style="text-align: left; width: 45%;">Cloth Type</th>
                    <th style="text-align: center; width: 15%;">Qty</th>
                    <th style="text-align: right; width: 20%;">Rate</th>
                    <th style="text-align: right; width: 20%;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="financials-section">
              <div class="notes-block">
                <div class="notes-title">Tailoring Notes & Terms</div>
                1. Please bring this invoice / bill copy at the time of delivery.<br>
                2. Alterations are free of charge within 15 days of delivery.<br>
                3. Goods not collected within 60 days will be disposed of.
              </div>
              
              <div class="totals-block">
                <div class="totals-row">
                  <span>Subtotal Amount:</span>
                  <span style="font-family: monospace; font-weight: 500;">₹${order.total_amount.toFixed(2)}</span>
                </div>
                <div class="totals-row bold">
                  <span>Grand Total:</span>
                  <span style="font-family: monospace;">₹${order.total_amount.toFixed(2)}</span>
                </div>
                <div class="totals-row advance">
                  <span>Advance Paid:</span>
                  <span style="font-family: monospace;">- ₹${order.advance_amount.toFixed(2)}</span>
                </div>
                <div class="totals-row balance">
                  <span>Balance Due:</span>
                  <span style="font-family: monospace;">₹${order.balance_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="signature-area">
              <div class="thank-you">
                Thank you for stitching with us!
              </div>
              <div class="sign-box">
                Authorized Signatory
              </div>
            </div>

            <div class="footer">
              ${shopName} • Bespoke Fine Stitching for Men & Women<br>
              This is a computer generated invoice and does not require a physical signature.
            </div>
          </div>
        </div>

        <script>
          function downloadPDF() {
            const element = document.getElementById('invoice-card');
            const opt = {
              margin:       [10, 10, 10, 10],
              filename:     '${shopName.replace(/[^a-zA-Z0-9-]/g, "_")}_Bill_${order.bill_number}.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            // Show downloading state
            const downloadBtn = document.querySelector('.btn-success');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = 'Generating PDF...';
            downloadBtn.disabled = true;

            html2pdf().set(opt).from(element).save().then(() => {
              downloadBtn.innerHTML = originalText;
              downloadBtn.disabled = false;
            }).catch(err => {
              console.error(err);
              alert('Failed to generate PDF. Please try printing to PDF instead.');
              downloadBtn.innerHTML = originalText;
              downloadBtn.disabled = false;
            });
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export default function CustomerHistory() {
  const [searchQuery, setSearchQuery]       = useState('');
  const [sortBy, setSortBy]                 = useState('newest');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedOrder, setSelectedOrder]   = useState(null);

  const { data: customersData, isLoading: isLoadingList, isFetching: isFetchingList } = useCustomers(searchQuery);
  const { data: historyData, isLoading: isLoadingHistory, isFetching: isFetchingHistory } = useCustomerHistory(selectedCustomer?.mobile_number);

  let customers = [...(customersData?.customers || [])];
  if (sortBy === 'newest')         customers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (sortBy === 'oldest')    customers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else if (sortBy === 'highest')   customers.sort((a, b) => b.order_count - a.order_count);
  else if (sortBy === 'lowest')    customers.sort((a, b) => a.order_count - b.order_count);

  const orders = historyData?.orders || [];

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer && !searchQuery) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer, searchQuery]);

  const openOrder = async (billNo) => {
    // Find locally first
    const localOrder = orders.find(o => o.bill_number === billNo);
    if (localOrder && selectedCustomer) {
      setSelectedOrder({
        order: localOrder,
        customer: { customer_name: selectedCustomer.customer_name, mobile_number: selectedCustomer.mobile_number },
        items: localOrder.items || []
      });
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/orders/${billNo}`);
      if (res.ok) setSelectedOrder(await res.json());
    } catch (e) { console.error(e); }
  };

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
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 relative">
          {isFetchingList && !isLoadingList && (
            <div className="absolute top-2 right-2 p-1 z-10">
              <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
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
            <div className="flex-1 overflow-y-auto relative">
              {isFetchingHistory && !isLoadingHistory && (
                <div className="absolute top-2 right-2 p-1 z-10">
                  <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {isLoadingHistory ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading order history…</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No orders recorded for this customer.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
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
                          <td><span className="font-mono text-xs font-bold text-gray-500">ON{String(order.id).padStart(6, '0')}</span></td>
                          <td>{renderBillNumber(order.bill_number)}</td>
                          <td><span className="text-xs text-gray-500">{fmt(order.order_date)}</span></td>
                          <td className="text-right"><span className="font-semibold">₹{order.total_amount}</span></td>
                          <td><span className="text-emerald-600 font-mono text-xs">₹{order.advance_amount}</span></td>
                          <td><span className="text-red-500 font-mono text-xs">₹{order.balance_amount}</span></td>
                          <td className="text-center">
                            <span className={
                              order.status === 'Delivered' ? 'badge-green' :
                              order.status === 'Ready' ? 'badge-amber' :
                              'badge-red'
                            }>
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
                </div>
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
                  <span className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 font-bold">
                    ON{String(selectedOrder.order.id).padStart(6, '0')}
                  </span>
                  <span>{renderBillNumber(selectedOrder.order.bill_number)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Created {fmtDt(selectedOrder.order.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="btn-ghost p-1.5 text-gray-500 hover:text-brand-600 flex items-center gap-1.5 text-xs font-medium"
                  title="View Invoice / Download PDF / Print"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF Bill</span>
                </button>
                <button className="btn-ghost p-1.5" onClick={() => setSelectedOrder(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-4">
                {/* Customer */}
                <div className="card p-4">
                  <p className="section-label mb-3">Customer & Order Info</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Name</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.customer?.customer_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Mobile</p>
                      <p className="font-mono font-semibold text-gray-900">{selectedOrder.customer?.mobile_number || selectedOrder.order.mobile_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Order ID</p>
                      <p className="font-mono font-bold text-gray-700">ON{String(selectedOrder.order.id).padStart(6, '0')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Bill Number</p>
                      <div>{renderBillNumber(selectedOrder.order.bill_number)}</div>
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
                  <span className={
                    selectedOrder.order.status === 'Delivered' ? 'badge-green' :
                    selectedOrder.order.status === 'Ready' ? 'badge-amber' :
                    'badge-red'
                  }>{selectedOrder.order.status}</span>
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
