import React, { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { Plus, Trash2, CheckCircle2, User, Phone, Scissors, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : 'https://captain-tailors.loca.lt';

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
  const [initialImage, setInitialImage]         = useState(null);
  const [errorMsg, setErrorMsg]                 = useState('');
  const [successMsg, setSuccessMsg]             = useState('');
  const [isSubmitting, setIsSubmitting]         = useState(false);

  const defaultClothTypes = ['Shirt', 'Pant', 'Suit', 'Safari', 'Kurta', 'Pyjama', 'Sherwani', 'Waistcoat', 'Coat'];

  /* Load configured base prices */
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/cloth-configs`);
        const data = await res.json();
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
    if (mobileNumber.length < 10) {
      setIsExistingCustomer(false);
      setInitialImage(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingCustomer(true);
      try {
        const res  = await fetch(`${API_BASE}/api/customers/${mobileNumber}`);
        const data = await res.json();
        if (data.exists && data.customer) {
          setCustomerName(data.customer.customer_name);
          setIsExistingCustomer(true);
          setInitialImage(data.measurement_image_path ? `${API_BASE}/${data.measurement_image_path}` : null);
        } else {
          setIsExistingCustomer(false);
          setInitialImage(null);
        }
      } catch (e) { console.error(e); } finally { setIsCheckingCustomer(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [mobileNumber]);

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

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    if (!mobileNumber || mobileNumber.trim().length < 10)  return setErrorMsg('Enter a valid 10-digit mobile number.');
    if (!customerName.trim())                               return setErrorMsg('Customer name is required.');
    if (items.some(it => !it.cloth_type || it.quantity <= 0 || it.price_per_cloth <= 0)) return setErrorMsg('All item rows must have a valid cloth type, quantity, and price.');
    if (!canvasData)                                        return setErrorMsg('Please draw the measurements on the canvas before saving.');
    setIsSubmitting(true);
    try {
      const res  = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile_number: mobileNumber.trim(),
          customer_name: customerName.trim(),
          order_items: items,
          total_amount: totalAmt,
          advance_amount: parseFloat(advancePaid) || 0,
          balance_amount: balanceAmt,
          measurement_image: canvasData,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Order saved — Bill No. ${data.order.bill_number}`);
        setMobileNumber(''); setCustomerName(''); setIsExistingCustomer(false); setInitialImage(null); setAdvancePaid(0);
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
          <span className="section-label ml-auto">Draw or write measurements below</span>
        </div>
        <div className="h-[360px]">
          <Canvas onChange={setCanvasData} initialImage={initialImage} />
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
                    <td className="pr-2">
                      <input
                        type="text" list="cloth-types" value={item.cloth_type} required
                        onChange={(e) => handleItemChange(idx, 'cloth_type', e.target.value)}
                        className="field-input py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-1">
                      <input
                        type="number" min={1} value={item.quantity} required
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="field-input py-1.5 text-xs text-center"
                      />
                    </td>
                    <td className="px-1">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">₹</span>
                        <input
                          type="number" min={0} value={item.price_per_cloth} required
                          onChange={(e) => handleItemChange(idx, 'price_per_cloth', e.target.value)}
                          className="field-input pl-6 py-1.5 text-xs"
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
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
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
