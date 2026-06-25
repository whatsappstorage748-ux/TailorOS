import { fetchWithAuth, API_BASE } from '../App';

// Check if browser is online
export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// Generic fetch with caching for GET endpoints
export const fetchWithCache = async (url, cacheKey, fallbackValue = null) => {
  const cacheName = `tailor_cache_${cacheKey}`;

  if (isOnline()) {
    try {
      const response = await fetchWithAuth(url);
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(cacheName, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn(`Fetch to ${url} failed, falling back to local cache:`, err);
    }
  }

  // Offline fallback
  const cachedData = localStorage.getItem(cacheName);
  if (cachedData !== null) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error('Error parsing cached data:', e);
    }
  }

  return fallbackValue;
};

// Generic request queuing for offline operations
export const queueOfflineRequest = (endpoint, method, body, extra = {}) => {
  const queue = JSON.parse(localStorage.getItem('tailor_sync_queue') || '[]');
  queue.push({
    endpoint,
    method,
    body,
    ...extra
  });
  localStorage.setItem('tailor_sync_queue', JSON.stringify(queue));
};

// Store order creation payload offline in a sync queue
export const queueOfflineOrder = (orderData) => {
  // Generate a temporary offline bill number and ID
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tempBillNo = `OFFLINE-${new Date().toISOString().slice(2,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const offlineOrder = {
    ...orderData,
    id: tempId,
    bill_number: tempBillNo,
    order_date: new Date().toISOString(),
    status: 'Undelivered',
    isOfflinePending: true
  };

  // Add to the sync queue
  queueOfflineRequest('/api/orders', 'POST', orderData, { tempId });

  // Save the temporary order to local cache so it appears immediately on Dashboard
  const cachedOrdersName = 'tailor_cache_dashboard_orders';
  const cachedOrders = JSON.parse(localStorage.getItem(cachedOrdersName) || '{"orders":[]}');
  
  // Append temporary order to cached orders
  cachedOrders.orders = [offlineOrder, ...(cachedOrders.orders || [])];
  localStorage.setItem(cachedOrdersName, JSON.stringify(cachedOrders));

  return offlineOrder;
};

// Synchronize all pending offline requests to the Railway cloud
export const syncPendingData = async (onSyncSuccess) => {
  if (!isOnline()) return;

  const queue = JSON.parse(localStorage.getItem('tailor_sync_queue') || '[]');
  if (queue.length === 0) return;

  console.log(`Starting background sync for ${queue.length} pending offline mutations...`);
  const failedItems = [];

  for (const item of queue) {
    try {
      const response = await fetchWithAuth(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined
      });

      if (response.ok) {
        const serverData = await response.json();
        console.log(`Successfully synced offline request: ${item.method} ${item.endpoint}`);
        
        // Custom post-sync updates for specific endpoints
        if (item.method === 'POST' && item.endpoint === '/api/orders') {
          // Remove from the dashboard cache list of temporary orders
          const cachedOrdersName = 'tailor_cache_dashboard_orders';
          const cachedOrders = JSON.parse(localStorage.getItem(cachedOrdersName) || '{"orders":[]}');
          if (cachedOrders.orders) {
            cachedOrders.orders = cachedOrders.orders.filter(o => o.id !== item.tempId);
            // Add the newly created real server order if not already in list
            if (serverData.order) {
              cachedOrders.orders = [serverData.order, ...cachedOrders.orders];
            }
            localStorage.setItem(cachedOrdersName, JSON.stringify(cachedOrders));
          }

          if (onSyncSuccess) {
            onSyncSuccess(item.tempId, serverData);
          }
        }
      } else {
        // Keep in queue for next retry if server error is temporary
        failedItems.push(item);
      }
    } catch (err) {
      console.error('Error syncing item:', err);
      failedItems.push(item);
    }
  }

  // Update queue with only items that failed to sync
  localStorage.setItem('tailor_sync_queue', JSON.stringify(failedItems));
};
