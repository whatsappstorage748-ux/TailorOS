import { fetchWithAuth } from '../App';
import React, { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { Plus, Trash2, CheckCircle2, User, Phone, Scissors, AlertCircle, CheckCircle, Printer, Edit3 } from 'lucide-react';
import { fetchWithCache, queueOfflineOrder, isOnline } from '../utils/syncManager';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : 'https://tailoros-production.up.railway.app';

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

// Helper to render Bill Numbers with visually prominent badges for continuation/sub-order suffixes
export const renderBillNumber = (billNumber) => {
  if (!billNumber) return '—';
  const parts = billNumber.split('-');
  if (parts.length >= 3) {
    const base = `${parts[0]}-${parts[1]}`;
    const suffix = parts[2];
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
        <span className="font-mono">{base}</span>
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-2xs font-extrabold text-white bg-indigo-600 rounded-full shadow-sm">
          {suffix}
        </span>
      </span>
    );
  }
  return <span className="font-mono font-semibold text-gray-900">{billNumber}</span>;
};

export default function OrderForm({ onOrderCreated }) {
  const [mobileNumber, setMobileNumber]         = useState('');
  const [customerName, setCustomerName]         = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const [clothConfigs, setClothConfigs]         = useState([]);
  const [items, setItems]                       = useState([
    { cloth_type: 'Shirt', quantity: 1, price_per_cloth: 500 },
    { cloth_type: 'Pant',  quantity: 1, price_per_cloth: 600 },
  ]);
  const [advancePaid, setAdvancePaid]           = useState(0);
  const [canvasData, setCanvasData]             = useState(null);
  const [originalCanvasData, setOriginalCanvasData] = useState(null);
  const [canvasReadOnly, setCanvasReadOnly]     = useState(false);
  const [initialImage, setInitialImage]         = useState(null);
  const [errorMsg, setErrorMsg]                 = useState('');
  const [successMsg, setSuccessMsg]             = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [createdOrder, setCreatedOrder]         = useState(null);

  // Popups & continuation states
  const [showBillSeriesPopup, setShowBillSeriesPopup] = useState(false);
  const [detectedLatestBillSeries, setDetectedLatestBillSeries] = useState('');
  const [useLatestBillSeries, setUseLatestBillSeries] = useState(false);
  const [showMeasurementPopup, setShowMeasurementPopup] = useState(false);

  const defaultClothTypes = ['Shirt', 'Pant', 'Suit', 'Safari', 'Kurta', 'Pyjama', 'Sherwani', 'Waistcoat', 'Coat'];

  /* Load configured base prices */
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWithCache(`${API_BASE}/api/cloth-configs`, 'cloth_configs', { configs: [] });
        const cfgs = data.configs || [];
        setClothConfigs(cfgs);
        if (cfgs.length > 0) {
          const shirt = cfgs.find(c => c.cloth_type.toLowerCase() === 'shirt');
          const pant  = cfgs.find(c => c.cloth_type.toLowerCase() === 'pant');
          setItems([
            { cloth_type: shirt?.cloth_type ?? 'Shirt', quantity: 1, price_per_cloth: shirt?.default_price ?? 500 },
            { cloth_type: pant?.cloth_type  ?? 'Pant',  quantity: 1, price_per_cloth: pant?.default_price  ?? 600 },
          ]);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  /* Auto-detect returning customer */
  useEffect(() => {
    // Clear notifications and saved order on new input
    setSuccessMsg('');
    setErrorMsg('');
    setCreatedOrder(null);

    if (mobileNumber.length < 10) {
      setIsExistingCustomer(false);
      setInitialImage(null);
      setOriginalCanvasData(null);
      setCanvasReadOnly(false);
      setUseLatestBillSeries(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingCustomer(true);
      try {
        const data = await fetchWithCache(`${API_BASE}/api/customers/${mobileNumber}`, `customer_${mobileNumber}`, { exists: false });
        if (data.exists && data.customer) {
          setCustomerName(data.customer.customer_name);
          setIsExistingCustomer(true);
          setInitialImage(data.measurement_image_path ? `${API_BASE}/${data.measurement_image_path}` : null);
          setCanvasReadOnly(true); // Lock editing by default for existing measurements

          if (data.latest_bill_series) {
            setDetectedLatestBillSeries(data.latest_bill_series);
            setShowBillSeriesPopup(true); // Offer sub-order selection
          }
        } else {
          setIsExistingCustomer(false);
          setInitialImage(null);
          setOriginalCanvasData(null);
          setCanvasReadOnly(false);
          setUseLatestBillSeries(false);
        }
      } catch (e) { console.error(e); } finally { setIsCheckingCustomer(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileNumber]);

  /* Track canvas modifications */
  const handleCanvasChange = (data) => {
    setCanvasData(data);
    // On the very first canvas rendering for an existing customer, store the original measurement state
    if (canvasReadOnly && !originalCanvasData) {
      setOriginalCanvasData(data);
    }
  };

  /* Item table helpers */
  const handleItemChange = (i, field, val) => {
    const next = [...items];
    if (field === 'quantity')       next[i][field] = parseInt(val, 10)  || 0;
    else if (field === 'price_per_cloth') next[i][field] = parseFloat(val) || 0;
    else {
      next[i][field] = val;
      if (field === 'cloth_type') {
        const cfg = clothConfigs.find(c => c.cloth_type.toLowerCase() === val.trim().toLowerCase());
        if (cfg) next[i].price_per_cloth = cfg.default_price;
      }
    }
    setItems(next);
  };
  const addRow    = () => setItems([...items, { cloth_type: clothConfigs[0]?.cloth_type ?? 'Shirt', quantity: 1, price_per_cloth: clothConfigs[0]?.default_price ?? 500 }]);
  const removeRow = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const rowTotal   = (item) => item.quantity * item.price_per_cloth;
  const totalAmt   = items.reduce((s, it) => s + rowTotal(it), 0);
  const balanceAmt = totalAmt - advancePaid;

  /* Submit flow with measurement protection */
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!mobileNumber || mobileNumber.trim().length < 10)  return setErrorMsg('Enter a valid 10-digit mobile number.');
    if (!customerName.trim())                               return setErrorMsg('Customer name is required.');
    if (items.some(it => !it.cloth_type || it.quantity <= 0 || it.price_per_cloth <= 0)) return setErrorMsg('All item rows must have a valid cloth type, quantity, and price.');
    if (!canvasData)                                        return setErrorMsg('Please draw the measurements on the canvas before saving.');

    // If returning customer and canvas measurements were modified, prompt protection dialog
    const isMeasurementModified = isExistingCustomer && originalCanvasData && canvasData !== originalCanvasData;
    if (isMeasurementModified) {
      setShowMeasurementPopup(true);
    } else {
      submitOrder(canvasData);
    }
  };

  const submitOrder = async (imageToSave) => {
    setIsSubmitting(true);
    setErrorMsg('');

    if (!isOnline()) {
      // Save offline
      const offlinePayload = {
        mobile_number: mobileNumber.trim(),
        customer_name: customerName.trim(),
        order_items: items,
        total_amount: totalAmt,
        advance_amount: parseFloat(advancePaid) || 0,
        balance_amount: balanceAmt,
        measurement_image: imageToSave,
        use_latest_bill_series: useLatestBillSeries
      };
      
      const offlineOrder = queueOfflineOrder(offlinePayload);
      setSuccessMsg('Order saved locally! It will automatically backup to the cloud once you connect.');
      setCreatedOrder({ order: offlineOrder });
      
      // Reset form states
      setMobileNumber('');
      setCustomerName('');
      setIsExistingCustomer(false);
      setInitialImage(null);
      setOriginalCanvasData(null);
      setCanvasReadOnly(false);
      setUseLatestBillSeries(false);
      setAdvancePaid(0);

      const shirt = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'shirt');
      const pant  = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'pant');
      setItems([
        { cloth_type: shirt?.cloth_type ?? 'Shirt', quantity: 1, price_per_cloth: shirt?.default_price ?? 500 },
        { cloth_type: pant?.cloth_type  ?? 'Pant',  quantity: 1, price_per_cloth: pant?.default_price  ?? 600 },
      ]);
      setIsSubmitting(false);
      if (onOrderCreated) onOrderCreated(offlineOrder);
      return;
    }

    try {
      const res  = await fetchWithAuth(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: mobileNumber.trim(),
          customer_name: customerName.trim(),
          order_items: items,
          total_amount: totalAmt,
          advance_amount: parseFloat(advancePaid) || 0,
          balance_amount: balanceAmt,
          measurement_image: imageToSave,
          use_latest_bill_series: useLatestBillSeries
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Order saved successfully!');
        setCreatedOrder(data); // Save full response for printing/rendering

        // Reset form states
        setMobileNumber('');
        setCustomerName('');
        setIsExistingCustomer(false);
        setInitialImage(null);
        setOriginalCanvasData(null);
        setCanvasReadOnly(false);
        setUseLatestBillSeries(false);
        setAdvancePaid(0);

        const shirt = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'shirt');
        const pant  = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'pant');
        setItems([
          { cloth_type: shirt?.cloth_type ?? 'Shirt', quantity: 1, price_per_cloth: shirt?.default_price ?? 500 },
          { cloth_type: pant?.cloth_type  ?? 'Pant',  quantity: 1, price_per_cloth: pant?.default_price  ?? 600 },
        ]);
        if (onOrderCreated) onOrderCreated(data.order);
      } else {
        setErrorMsg(data.message || 'Failed to save order.');
      }
    } catch (e) {
      setErrorMsg('Network error. Check that the backend server is running.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
      <datalist id="cloth-types">
        {Array.from(new Set([...clothConfigs.map(c => c.cloth_type), ...defaultClothTypes])).map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {/* Page heading */}
      <div className="flex items-center gap-2">
        <ClipboardListIcon className="w-4 h-4 text-gray-400" />
        <h1 className="text-sm font-semibold text-gray-700">New Order</h1>
      </div>

      {/* ── MEASUREMENT CANVAS ──────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">Measurement Sheet</p>
          <span className="section-label ml-auto hidden sm:block">Draw or write measurements below</span>
        </div>
        
        <div className="sm:hidden p-8 text-center bg-gray-50 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500 font-medium">Measurement sheet is available only in tablet/laptop.</p>
          <p className="text-xs text-gray-400 mt-2">You can view saved measurements in Customer History.</p>
        </div>

        <div className="hidden sm:block bg-gray-100 p-4 sm:p-6">
          <div className="w-full max-w-3xl mx-auto bg-white shadow-sm border border-gray-300 aspect-[4/3] relative">
            <Canvas onChange={handleCanvasChange} initialImage={initialImage} readOnly={canvasReadOnly} />
            {canvasReadOnly && (
              <div className="absolute inset-0 bg-gray-900/10 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setCanvasReadOnly(false)}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-5 flex items-center gap-2 shadow-lg"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Measurements
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CUSTOMER + ITEMS GRID ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Customer Details */}
        <div className="card p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <User className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-800">Customer</p>
          </div>

          <div>
            <label className="section-label mb-1.5 block">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="tel" value={mobileNumber} maxLength={10} required
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="10-digit number"
                className="field-input pl-9"
              />
            </div>
            {isCheckingCustomer && <p className="text-xs text-gray-400 mt-1">Checking records…</p>}
            {isExistingCustomer && !isCheckingCustomer && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Returning customer detected
              </p>
            )}
          </div>

          <div>
            <label className="section-label mb-1.5 block">Customer Name</label>
            <input
              type="text" value={customerName} required
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full name"
              className={`field-input ${isExistingCustomer ? 'border-emerald-300 bg-emerald-50' : ''}`}
            />
          </div>

          <div className="mt-auto bg-gray-50 border border-gray-200 rounded-md p-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              If the mobile number matches an existing customer, their name and last measurement sheet will load automatically.
            </p>
          </div>
        </div>

        {/* Clothes Entry Table */}
        <div className="card p-5 lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Scissors className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-800">Order Items</p>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:'40%'}}>Cloth Type</th>
                  <th style={{width:'15%'}}>Qty</th>
                  <th style={{width:'25%'}}>Rate (₹)</th>
                  <th style={{width:'20%'}} className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="pr-1 sm:pr-2">
                      <input
                        type="text" list="cloth-types" value={item.cloth_type} required
                        onChange={(e) => handleItemChange(idx, 'cloth_type', e.target.value)}
                        className="field-input px-1.5 sm:px-3 py-1.5 text-xs min-w-[70px] sm:min-w-[auto]"
                      />
                    </td>
                    <td className="px-0.5 sm:px-1">
                      <input
                        type="number" min={1} value={item.quantity} required
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="field-input px-1 sm:px-3 py-1.5 text-xs text-center min-w-[40px] sm:min-w-[auto]"
                      />
                    </td>
                    <td className="px-0.5 sm:px-1">
                      <div className="relative">
                        <span className="absolute left-1.5 sm:left-2.5 top-1.5 text-gray-400 text-xs">₹</span>
                        <input
                          type="number" min={0} value={item.price_per_cloth} required
                          onChange={(e) => handleItemChange(idx, 'price_per_cloth', e.target.value)}
                          className="field-input pl-4 sm:pl-6 pr-1 sm:pr-3 py-1.5 text-xs min-w-[60px] sm:min-w-[auto]"
                        />
                      </div>
                    </td>
                    <td className="text-right pl-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-gray-900 text-sm">₹{rowTotal(item)}</span>
                        <button
                          type="button" onClick={() => removeRow(idx)} disabled={items.length === 1}
                          className={`p-1 rounded transition ${items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <button type="button" onClick={addRow} className="btn-secondary text-xs py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          {/* Financials */}
          <div className="mt-auto border-t border-gray-100 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5">
              <p className="section-label mb-1">Total Amount</p>
              <p className="text-lg font-bold text-gray-900">₹{totalAmt}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-md px-4 py-2.5">
              <p className="section-label mb-1">Advance Paid</p>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">₹</span>
                <input
                  type="number" min={0} max={totalAmt} value={advancePaid}
                  onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-lg font-bold text-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5">
              <p className="section-label mb-1">Balance Due</p>
              <p className="text-lg font-bold text-red-500">₹{balanceAmt}</p>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="btn-primary justify-center py-3 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Saving…' : 'Save Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{successMsg}</p>
              {createdOrder?.order && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1">
                    <strong>Order ID:</strong>
                    <span className="font-mono text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100 font-bold">
                      ON{String(createdOrder.order.id).padStart(6, '0')}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <strong>Bill No:</strong>
                    {renderBillNumber(createdOrder.order.bill_number)}
                  </span>
                </div>
              )}
            </div>
          </div>
          {createdOrder && (
            <button
              type="button"
              onClick={() => handlePrintInvoice(createdOrder)}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF Bill</span>
            </button>
          )}
        </div>
      )}

      {/* Bill Series Continuation Popup */}
      {showBillSeriesPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 pointer-events-auto">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Customer Found</h3>
              <p className="text-sm text-gray-500 mt-2">
                This customer has a previous order series.
              </p>
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Latest Bill Series</span>
                <span className="font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                  {detectedLatestBillSeries}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Would you like to continue the same bill series (e.g. create a sub-order)?
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setUseLatestBillSeries(true);
                  setShowBillSeriesPopup(false);
                }}
                className="btn-primary px-5 py-2 text-xs font-bold"
              >
                Yes, Use Same Series
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseLatestBillSeries(false);
                  setShowBillSeriesPopup(false);
                }}
                className="btn-secondary px-5 py-2 text-xs font-bold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                No, Start New Series
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement Protection Popup */}
      {showMeasurementPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 pointer-events-auto">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Measurement Changes Detected</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed font-medium">
                Measurement changes detected. Do you want to update the customer's saved measurements?
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setShowMeasurementPopup(false);
                  submitOrder(canvasData);
                }}
                className="btn-primary justify-center px-4 py-2.5 text-xs font-bold"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMeasurementPopup(false);
                  submitOrder(originalCanvasData);
                }}
                className="btn-secondary justify-center px-4 py-2.5 text-xs font-bold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                Keep Existing Measurements
              </button>
              <button
                type="button"
                onClick={() => setShowMeasurementPopup(false)}
                className="btn-ghost justify-center px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

/* Inline icon to avoid extra import */
function ClipboardListIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
