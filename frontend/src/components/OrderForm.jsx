import React, { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { Plus, Trash2, CheckCircle2, User, Phone, Scissors, AlertCircle, CheckCircle, Printer, Edit3, ClipboardList as ClipboardListIcon, Lock, Unlock } from 'lucide-react';
import { isOnline } from '../utils/syncManager';
import { useCreateOrder } from '../hooks/useShopData';
import { db } from '../db';
import { API_BASE } from '../App';

export const renderBillNumber = (billNumber) => {
  if (!billNumber) return '—';
  if (billNumber.startsWith('OFFLINE-')) {
    return <span className="font-mono font-semibold text-amber-600" title="Pending Sync">⌛ {billNumber.split('-')[1]}</span>;
  }
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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
          body { background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
          .control-bar { position: sticky; top: 0; width: 100%; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 100; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
          .bar-title { font-size: 16px; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: 8px; }
          .bar-actions { display: flex; gap: 12px; }
          .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
          .btn-primary { background-color: #3b82f6; color: #ffffff; }
          .btn-success { background-color: #10b981; color: #ffffff; }
          .btn-secondary { background-color: #64748b; color: #ffffff; }
          .invoice-container { padding: 40px 20px; width: 100%; display: flex; justify-content: center; }
          .invoice-card { background-color: #ffffff; width: 100%; max-width: 800px; padding: 40px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
          .shop-info { display: flex; flex-direction: column; }
          .shop-name { font-size: 28px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.025em; margin: 0; line-height: 1.1; }
          .shop-subtitle { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; margin-bottom: 8px; }
          .shop-details { font-size: 12px; color: #475569; line-height: 1.5; }
          .invoice-meta { text-align: right; }
          .invoice-label { font-size: 24px; font-weight: 800; color: #3b82f6; letter-spacing: 0.05em; margin: 0; line-height: 1.1; }
          .invoice-number { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 6px; font-family: monospace; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
          .details-block { background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 16px; }
          .details-block-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .details-row { font-size: 13px; line-height: 1.6; color: #334155; }
          .details-row strong { color: #0f172a; }
          .table-container { margin-bottom: 30px; }
          .invoice-table { width: 100%; border-collapse: collapse; }
          .invoice-table th { background-color: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 8px; border-bottom: 2px solid #e2e8f0; }
          .financials-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }
          .notes-block { width: 50%; font-size: 12px; color: #64748b; line-height: 1.5; background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; }
          .notes-title { font-weight: 700; color: #b45309; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          .totals-block { width: 40%; border-collapse: collapse; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
          .totals-row.bold { font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 8px; }
          .totals-row.advance { color: #10b981; font-weight: 600; }
          .totals-row.balance { color: #ef4444; font-weight: 700; font-size: 16px; border-top: 2px double #e2e8f0; margin-top: 4px; padding-top: 8px; }
          .signature-area { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; }
          .thank-you { font-size: 14px; font-weight: 600; color: #1e3a8a; font-style: italic; }
          .sign-box { text-align: center; width: 200px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 12px; color: #475569; font-weight: 600; }
          .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; line-height: 1.4; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-red { background-color: #fee2e2; color: #ef4444; }
          .badge-amber { background-color: #fef3c7; color: #d97706; }
          .badge-green { background-color: #d1fae5; color: #10b981; }
          @media print {
            body { background-color: #ffffff; color: #000000; }
            .control-bar { display: none; }
            .invoice-container { padding: 0; }
            .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="control-bar">
          <div class="bar-title">Invoice Preview - ${shopName}</div>
          <div class="bar-actions">
            <button class="btn btn-primary" onclick="window.print()">Print Invoice</button>
            <button class="btn btn-success" onclick="downloadPDF()">Download PDF</button>
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
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
                  <span class="badge ${order.status === 'Delivered' ? 'badge-green' : order.status === 'Ready' ? 'badge-amber' : 'badge-red'}">${order.status}</span>
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
              <div class="thank-you">Thank you for stitching with us!</div>
              <div class="sign-box">Authorized Signatory</div>
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
  const [createdOrder, setCreatedOrder]         = useState(null);

  // Popups & continuation states
  const [showBillSeriesPopup, setShowBillSeriesPopup] = useState(false);
  const [detectedLatestBillSeries, setDetectedLatestBillSeries] = useState('');
  const [useLatestBillSeries, setUseLatestBillSeries] = useState(false);
  const [showMeasurementPopup, setShowMeasurementPopup] = useState(false);
  // Slider confirmation for edit unlock
  const [editSliderValue, setEditSliderValue] = useState(0);
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);

  const { mutateAsync: createOrder, isPending: isSubmitting } = useCreateOrder();
  const defaultClothTypes = ['Shirt', 'Pant', 'Suit', 'Safari', 'Kurta', 'Pyjama', 'Sherwani', 'Waistcoat', 'Coat'];

  /* Load configured base prices via Dexie */
  useEffect(() => {
    (async () => {
      try {
        const cfgs = await db.cloth_configs.toArray();
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

  /* Auto-detect returning customer via Dexie */
  useEffect(() => {
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
        const cust = await db.customers.where('mobile_number').equals(mobileNumber).first();
        if (cust) {
          setCustomerName(cust.customer_name);
          setIsExistingCustomer(true);
          
          // Load latest order measurement image and bill series
          const allOrders = await db.orders.where('mobile_number').equals(mobileNumber).toArray();
          allOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
          const latestOrder = allOrders[0];
          if (latestOrder) {
             setInitialImage(latestOrder.measurement_image_path ? `${API_BASE}/${latestOrder.measurement_image_path}` : null);
             setCanvasReadOnly(true);
             setEditSliderValue(0);
             setIsEditUnlocked(false);
             if (latestOrder.bill_number) {
                setDetectedLatestBillSeries(latestOrder.bill_number);
                setShowBillSeriesPopup(true);
             }
          }
        } else {
          setIsExistingCustomer(false);
          setInitialImage(null);
          setOriginalCanvasData(null);
          setCanvasReadOnly(false);
          setUseLatestBillSeries(false);
          setEditSliderValue(0);
          setIsEditUnlocked(false);
        }
      } catch (e) { console.error(e); } finally { setIsCheckingCustomer(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileNumber]);

  const handleCanvasChange = (data) => {
    setCanvasData(data);
    if (canvasReadOnly && !originalCanvasData) {
      setOriginalCanvasData(data);
    }
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!mobileNumber || mobileNumber.trim().length < 10)  return setErrorMsg('Enter a valid 10-digit mobile number.');
    if (!customerName.trim())                               return setErrorMsg('Customer name is required.');
    if (items.some(it => !it.cloth_type || it.quantity <= 0 || it.price_per_cloth <= 0)) return setErrorMsg('All item rows must have a valid cloth type, quantity, and price.');
    if (!canvasData)                                        return setErrorMsg('Please draw the measurements on the canvas before saving.');

    const isMeasurementModified = isExistingCustomer && originalCanvasData && canvasData !== originalCanvasData;
    if (isMeasurementModified) {
      setShowMeasurementPopup(true);
    } else {
      submitOrder(canvasData);
    }
  };

  const submitOrder = async (imageToSave) => {
    setErrorMsg('');
    try {
      const orderPayload = {
        mobile_number: mobileNumber.trim(),
        customer_name: customerName.trim(),
        order_items: items,
        total_amount: totalAmt,
        advance_amount: parseFloat(advancePaid) || 0,
        balance_amount: balanceAmt,
        measurement_image: imageToSave,
        use_latest_bill_series: useLatestBillSeries
      };
      
      const newOrder = await createOrder(orderPayload);
      
      setSuccessMsg('Order saved successfully! It will automatically sync in the background.');
      setCreatedOrder({ order: newOrder, customer: { customer_name: customerName, mobile_number: mobileNumber }, items });

      setMobileNumber('');
      setCustomerName('');
      setIsExistingCustomer(false);
      setInitialImage(null);
      setOriginalCanvasData(null);
      setCanvasReadOnly(false);
      setUseLatestBillSeries(false);
      setAdvancePaid(0);
      setEditSliderValue(0);
      setIsEditUnlocked(false);

      const shirt = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'shirt');
      const pant  = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'pant');
      setItems([
        { cloth_type: shirt?.cloth_type ?? 'Shirt', quantity: 1, price_per_cloth: shirt?.default_price ?? 500 },
        { cloth_type: pant?.cloth_type  ?? 'Pant',  quantity: 1, price_per_cloth: pant?.default_price  ?? 600 },
      ]);
      
      if (onOrderCreated) onOrderCreated(newOrder);

    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to save order.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
      <datalist id="cloth-types">
        {Array.from(new Set([...clothConfigs.map(c => c.cloth_type), ...defaultClothTypes])).map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="flex items-center gap-2">
        <ClipboardListIcon className="w-4 h-4 text-gray-400" />
        <h1 className="text-sm font-semibold text-gray-700">New Order</h1>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">Measurement Sheet</p>
          <span className="section-label ml-auto hidden sm:block">Draw or write measurements below</span>
        </div>
        
        {/* Mobile fallback */}
        <div className="sm:hidden p-8 text-center bg-gray-50 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-500 font-medium">Measurement sheet is available only in tablet/laptop.</p>
          <p className="text-xs text-gray-400 mt-2">You can view saved measurements in Customer History.</p>
        </div>

        {/* Desktop canvas */}
        <div className="hidden sm:block bg-gray-50 border-b border-gray-100 py-4">
          <div className="w-full max-w-[500px] mx-auto" style={{ height: '420px' }}>
            <Canvas onChange={handleCanvasChange} initialImage={initialImage} readOnly={canvasReadOnly} />
          </div>
        </div>

        {/* Edit confirmation banner — shown when a returning customer's sheet is loaded */}
        {canvasReadOnly && (
          <div className="hidden sm:flex items-center justify-between gap-4 px-5 py-3 bg-amber-50 border-t border-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-full bg-amber-100">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-800">Previous measurement sheet loaded</p>
                <p className="text-xs text-amber-600 mt-0.5">Slide to unlock editing — this will overwrite the saved sheet</p>
              </div>
            </div>

            {/* Slider confirm */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative w-48 h-9 bg-amber-100 border border-amber-300 rounded-full overflow-hidden flex items-center">
                {/* Track label */}
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none transition-opacity duration-200 ${
                  isEditUnlocked ? 'opacity-0' : 'text-amber-700 opacity-100'
                }`}>
                  {isEditUnlocked ? '' : '← Slide to edit'}
                </span>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none transition-opacity duration-200 ${
                  isEditUnlocked ? 'text-emerald-700 opacity-100' : 'opacity-0'
                }`}>
                  ✓ Editing unlocked
                </span>
                <input
                  type="range"
                  min="0" max="100"
                  value={editSliderValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setEditSliderValue(val);
                    if (val >= 90) {
                      setIsEditUnlocked(true);
                      setCanvasReadOnly(false);
                    }
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  style={{ zIndex: 10 }}
                />
                {/* Thumb visual */}
                <div
                  className={`absolute left-1 top-1 bottom-1 rounded-full transition-all duration-150 flex items-center justify-center shadow-md ${
                    isEditUnlocked
                      ? 'bg-emerald-500 w-7'
                      : 'bg-white border border-amber-300 w-7'
                  }`}
                  style={{ left: `calc(${Math.min(editSliderValue, 90)}% * 0.85 + 4px)` }}
                >
                  {isEditUnlocked
                    ? <Unlock className="w-3 h-3 text-white" />
                    : <Lock className="w-3 h-3 text-amber-400" />
                  }
                </div>
              </div>

              {/* Cancel button if unlocked */}
              {isEditUnlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setCanvasReadOnly(true);
                    setEditSliderValue(0);
                    setIsEditUnlocked(false);
                    // Restore original image
                    if (originalCanvasData) setCanvasData(originalCanvasData);
                  }}
                  className="text-xs text-gray-500 hover:text-red-500 underline whitespace-nowrap transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
            {isCheckingCustomer && <p className="text-xs text-gray-400 mt-1">Checking local DB...</p>}
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

        <div className="card p-5 lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Scissors className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-800">Order Items</p>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Cloth Type</th>
                  <th style={{ width: '20%' }} className="text-center">Quantity</th>
                  <th style={{ width: '25%' }} className="text-right">Price per piece</th>
                  <th style={{ width: '15%' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        list="cloth-types"
                        type="text" value={it.cloth_type} required
                        onChange={(e) => handleItemChange(i, 'cloth_type', e.target.value)}
                        placeholder="e.g. Shirt"
                        className="field-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="1" value={it.quantity} required
                        onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
                        className="field-input text-center font-mono"
                      />
                    </td>
                    <td>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 text-sm">₹</span>
                        <input
                          type="number" min="0" value={it.price_per_cloth} required
                          onChange={(e) => handleItemChange(i, 'price_per_cloth', e.target.value)}
                          className="field-input pl-7 text-right font-mono"
                        />
                      </div>
                    </td>
                    <td className="text-center">
                      <button type="button" onClick={() => removeRow(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Remove item">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addRow} className="btn-ghost self-start mt-2 border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="w-full md:w-1/3">
            <label className="section-label mb-2 block text-gray-700">Advance Amount Paid</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500 font-medium">₹</span>
              <input
                type="number" min="0" max={totalAmt} value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg pl-8 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-mono font-medium text-lg"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Advance cannot exceed total amount
            </p>
          </div>

          <div className="w-full md:w-2/3 grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-mono text-gray-900 font-bold">₹{totalAmt}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Advance</p>
              <p className="text-xl font-mono text-emerald-600 font-bold">₹{advancePaid || 0}</p>
            </div>
            <div className="border-l border-gray-200 pl-3">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Balance Due</p>
              <p className="text-2xl font-mono text-red-600 font-black">₹{balanceAmt}</p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {successMsg && createdOrder && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-emerald-800 font-bold">{successMsg}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-emerald-600">Bill No:</span>
                <span className="font-mono text-sm font-bold bg-white px-2 py-0.5 rounded shadow-sm text-emerald-700">
                  {createdOrder.order.bill_number}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => handlePrintInvoice(createdOrder)}
            className="whitespace-nowrap btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </button>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-100 mt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full md:w-auto px-10 py-3.5 text-base shadow-xl shadow-brand-200 transition-all flex justify-center items-center gap-2 group"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              Save Order & Generate Bill
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </>
          )}
        </button>
      </div>

      {showBillSeriesPopup && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-sm text-center p-6 sm:p-8">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <ClipboardListIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Previous Bill Found</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              This customer's latest order is <strong className="text-gray-900 font-mono">{detectedLatestBillSeries}</strong>.<br/><br/>
              Would you like to link this new order to the same bill (e.g. adding a suffix like -1, -2)?
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => { setUseLatestBillSeries(false); setShowBillSeriesPopup(false); }}
                className="flex-1 btn-secondary py-2.5"
              >
                No, New Bill
              </button>
              <button 
                type="button"
                onClick={() => { setUseLatestBillSeries(true); setShowBillSeriesPopup(false); }}
                className="flex-1 btn-primary bg-indigo-600 hover:bg-indigo-700 py-2.5"
              >
                Yes, Link Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {showMeasurementPopup && (
        <div className="modal-overlay z-[200]">
          <div className="modal-panel max-w-sm text-center p-6 sm:p-8">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Update Measurement Sheet?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              You have modified the measurements for this returning customer.<br/>
              Saving this order will permanently update their master measurement sheet.
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => { setShowMeasurementPopup(false); setCanvasData(originalCanvasData); }}
                className="flex-1 btn-secondary py-2.5 text-xs"
              >
                Discard Changes
              </button>
              <button 
                type="button"
                onClick={() => { setShowMeasurementPopup(false); submitOrder(canvasData); }}
                className="flex-1 btn-primary bg-amber-600 hover:bg-amber-700 py-2.5 text-xs"
              >
                Yes, Save Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
