import React, { useState, useEffect } from 'react';
import Canvas from './Canvas';
import { Plus, Trash2, CheckCircle2, User, Phone, Scissors } from 'lucide-react';

export default function OrderForm({ onOrderCreated }) {
  const API_BASE = `http://${window.location.hostname}:5000`;
  // Customer info
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

  // Clothes Entry Table
  const [clothConfigs, setClothConfigs] = useState([]);
  const [items, setItems] = useState([
    { cloth_type: 'Shirt', quantity: 1, price_per_cloth: 500 },
    { cloth_type: 'Pant', quantity: 1, price_per_cloth: 600 }
  ]);

  // Load configured base prices from database
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cloth-configs`);
        if (res.ok) {
          const data = await res.json();
          setClothConfigs(data.configs || []);
          
          if (data.configs && data.configs.length > 0) {
            const shirtConfig = data.configs.find(c => c.cloth_type.toLowerCase() === 'shirt');
            const pantConfig = data.configs.find(c => c.cloth_type.toLowerCase() === 'pant');
            
            setItems([
              { 
                cloth_type: shirtConfig ? shirtConfig.cloth_type : 'Shirt', 
                quantity: 1, 
                price_per_cloth: shirtConfig ? shirtConfig.default_price : 500 
              },
              { 
                cloth_type: pantConfig ? pantConfig.cloth_type : 'Pant', 
                quantity: 1, 
                price_per_cloth: pantConfig ? pantConfig.default_price : 600 
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Error loading pricing configurations:', err);
      }
    };
    fetchConfigs();
  }, []);

  // Financial summary
  const [advancePaid, setAdvancePaid] = useState(0);

  // Canvas Image Data
  const [canvasData, setCanvasData] = useState(null);
  const [initialImage, setInitialImage] = useState(null);

  // Status/Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List of common clothing types for datalist suggestions
  const defaultClothTypes = ['Shirt', 'Pant', 'Suit', 'Safari', 'Kurta', 'Pyjama', 'Sherwani', 'Waistcoat', 'Coat'];

  // Check if customer exists when mobile number changes (length >= 10)
  useEffect(() => {
    const checkCustomer = async () => {
      if (mobileNumber.length < 10) {
        setIsExistingCustomer(false);
        setInitialImage(null);
        return;
      }

      setIsCheckingCustomer(true);
      try {
        const res = await fetch(`${API_BASE}/api/customers/${mobileNumber}`);
        const data = await res.json();
        
        if (data.exists && data.customer) {
          setCustomerName(data.customer.customer_name);
          setIsExistingCustomer(true);
          if (data.measurement_image_path) {
            setInitialImage(`${API_BASE}/${data.measurement_image_path}`);
          } else {
            setInitialImage(null);
          }
        } else {
          setIsExistingCustomer(false);
          setInitialImage(null);
        }
      } catch (error) {
        console.error('Error checking customer:', error);
      } finally {
        setIsCheckingCustomer(false);
      }
    };

    const timer = setTimeout(() => {
      checkCustomer();
    }, 500);

    return () => clearTimeout(timer);
  }, [mobileNumber]);

  // Handle item table changes
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    if (field === 'quantity') {
      updatedItems[index][field] = parseInt(value, 10) || 0;
    } else if (field === 'price_per_cloth') {
      updatedItems[index][field] = parseFloat(value) || 0;
    } else {
      updatedItems[index][field] = value;
      // Auto-fill price if the entered cloth type matches a configured pricing
      if (field === 'cloth_type') {
        const config = clothConfigs.find(c => c.cloth_type.toLowerCase() === value.trim().toLowerCase());
        if (config) {
          updatedItems[index].price_per_cloth = config.default_price;
        }
      }
    }
    setItems(updatedItems);
  };

  const addItemRow = () => {
    const firstConfig = clothConfigs[0];
    setItems([...items, { 
      cloth_type: firstConfig ? firstConfig.cloth_type : 'Shirt', 
      quantity: 1, 
      price_per_cloth: firstConfig ? firstConfig.default_price : 500 
    }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return; // Keep at least one row
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  // Calculations
  const calculateRowTotal = (item) => {
    return item.quantity * item.price_per_cloth;
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateRowTotal(item), 0);
  const balanceAmount = totalAmount - advancePaid;

  // Handle Canvas Drawing Save
  const handleCanvasChange = (dataUrl) => {
    setCanvasData(dataUrl);
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    if (!mobileNumber || mobileNumber.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!customerName || customerName.trim() === '') {
      setErrorMsg('Please enter the customer name.');
      return;
    }
    if (items.some(item => !item.cloth_type || item.quantity <= 0 || item.price_per_cloth <= 0)) {
      setErrorMsg('Please fill out all fields in the clothes entry table with positive values.');
      return;
    }
    if (!canvasData) {
      setErrorMsg('Please write measurements on the canvas above before creating the order.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        mobile_number: mobileNumber.trim(),
        customer_name: customerName.trim(),
        order_items: items,
        total_amount: totalAmount,
        advance_amount: parseFloat(advancePaid) || 0,
        balance_amount: balanceAmount,
        measurement_image: canvasData // base64 string
      };

      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(`Order created successfully! Bill Number: ${data.order.bill_number}`);
        // Reset form
        setMobileNumber('');
        setCustomerName('');
        setIsExistingCustomer(false);
        setInitialImage(null);
        
        // Reset items to base defaults
        if (clothConfigs && clothConfigs.length > 0) {
          const shirtConfig = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'shirt');
          const pantConfig = clothConfigs.find(c => c.cloth_type.toLowerCase() === 'pant');
          setItems([
            { 
              cloth_type: shirtConfig ? shirtConfig.cloth_type : 'Shirt', 
              quantity: 1, 
              price_per_cloth: shirtConfig ? shirtConfig.default_price : 500 
            },
            { 
              cloth_type: pantConfig ? pantConfig.cloth_type : 'Pant', 
              quantity: 1, 
              price_per_cloth: pantConfig ? pantConfig.default_price : 600 
            }
          ]);
        } else {
          setItems([
            { cloth_type: 'Shirt', quantity: 1, price_per_cloth: 500 },
            { cloth_type: 'Pant', quantity: 1, price_per_cloth: 600 }
          ]);
        }
        setAdvancePaid(0);
        
        // Notify parent to refresh list/dashboard
        if (onOrderCreated) {
          onOrderCreated(data.order);
        }
      } else {
        setErrorMsg(data.message || 'Failed to create order.');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMsg('Network error. Make sure the backend server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 h-full pb-8">
      <datalist id="cloth-types">
        {Array.from(new Set([
          ...clothConfigs.map(c => c.cloth_type),
          ...defaultClothTypes
        ])).map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>

      {/* UPPER SECTION - 50% Height Canvas */}
      <div className="h-[380px] w-full min-h-[350px]">
        <Canvas onChange={handleCanvasChange} initialImage={initialImage} />
      </div>

      {/* LOWER SECTION - Order Details & Client Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Customer Information (Left Column) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-1">
            <User className="w-5 h-5 text-brand-400" />
            <h3 className="font-semibold text-slate-200">Customer Details</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 10-digit number"
                maxLength={10}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition"
              />
            </div>
            {isCheckingCustomer && (
              <span className="text-xs text-brand-400 mt-1 block">Checking customer records...</span>
            )}
            {isExistingCustomer && (
              <span className="text-xs text-emerald-400 mt-1 block font-medium">✓ Auto-detected existing customer</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Full Name"
              required
              className={`w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm transition ${
                isExistingCustomer ? 'border-emerald-900 focus:border-emerald-500' : ''
              }`}
            />
          </div>

          <div className="mt-auto bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
            <p className="text-xs text-slate-500 leading-relaxed">
              If the mobile number matches a customer in the database, their name will automatically load, saving time and preventing duplicate entries.
            </p>
          </div>
        </div>

        {/* Clothes Entry Table (Middle/Right Column) */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-1">
            <Scissors className="w-5 h-5 text-brand-400" />
            <h3 className="font-semibold text-slate-200">Clothes Entry</h3>
          </div>

          {/* Table Container */}
          <div className="overflow-y-auto max-h-[190px] pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-2.5 pr-2 w-[40%]">Cloth Type</th>
                  <th className="py-2.5 px-2 w-[15%]">Qty</th>
                  <th className="py-2.5 px-2 w-[25%]">Price Per Cloth</th>
                  <th className="py-2.5 pl-2 text-right w-[20%]">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-900 group">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        list="cloth-types"
                        value={item.cloth_type}
                        onChange={(e) => handleItemChange(index, 'cloth_type', e.target.value)}
                        placeholder="e.g. Shirt"
                        required
                        className="w-full px-3 py-1.5 bg-slate-950/50 border border-slate-800/80 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-slate-950/50 border border-slate-800/80 rounded-lg text-slate-200 text-center focus:outline-none focus:border-brand-500 text-sm"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-500 text-xs font-medium">₹</span>
                        <input
                          type="number"
                          min={0}
                          value={item.price_per_cloth}
                          onChange={(e) => handleItemChange(index, 'price_per_cloth', e.target.value)}
                          required
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-950/50 border border-slate-800/80 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500 text-sm"
                        />
                      </div>
                    </td>
                    <td className="py-2 pl-2 text-right flex items-center justify-end space-x-2 mt-1.5">
                      <span className="text-slate-200 font-semibold text-sm">₹{calculateRowTotal(item)}</span>
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        disabled={items.length === 1}
                        className={`p-1.5 rounded transition ${
                          items.length === 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button - Moved below table rows */}
          <div className="flex justify-start border-t border-slate-900 pt-3">
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-950/50 border border-slate-800/80 hover:border-brand-500 text-brand-400 hover:text-brand-300 rounded-xl text-xs font-bold tracking-wide transition shadow-md hover:shadow-brand-500/5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Clothes Row</span>
            </button>
          </div>

          {/* Financial Summary & Action Button */}
          <div className="mt-auto border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex flex-col bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Amount</span>
              <span className="text-lg font-bold text-slate-200 flex items-center">₹{totalAmount}</span>
            </div>

            <div className="flex flex-col bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-900 relative">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Advance Paid</span>
              <div className="flex items-center mt-0.5">
                <span className="text-slate-500 text-xs font-semibold mr-1">₹</span>
                <input
                  type="number"
                  min={0}
                  max={totalAmount}
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-lg font-bold text-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Balance Due</span>
              <span className="text-lg font-bold text-rose-400 flex items-center">₹{balanceAmount}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-full py-3 bg-brand-500 hover:bg-brand-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg hover:shadow-brand-500/10"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Order'}</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}
    </form>
  );
}
