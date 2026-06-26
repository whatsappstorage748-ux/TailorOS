import { fetchWithAuth, API_BASE } from '../App';
import { db } from '../db';

export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// Pulls changes from server that happened since the last sync time
export const pullServerChanges = async () => {
  if (!isOnline()) return;

  try {
    const meta = await db.sync_metadata.get('sync_state');
    const lastSync = meta ? meta.last_sync_time : '1970-01-01T00:00:00.000Z';
    
    // Request server for all records updated after lastSync
    const response = await fetchWithAuth(`${API_BASE}/api/sync/pull?since=${lastSync}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Upsert data to Dexie
      if (data.orders?.length) await db.orders.bulkPut(data.orders);
      if (data.customers?.length) await db.customers.bulkPut(data.customers);
      if (data.employees?.length) await db.employees.bulkPut(data.employees);
      if (data.expenses?.length) await db.expenses.bulkPut(data.expenses);
      if (data.custom_expenses?.length) await db.custom_expenses.bulkPut(data.custom_expenses);
      if (data.cloth_configs?.length) await db.cloth_configs.bulkPut(data.cloth_configs);
      
      // Update sync time
      await db.sync_metadata.put({ id: 'sync_state', last_sync_time: data.server_time });
      console.log('Successfully pulled updates from server.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('offline-sync-complete'));
      }
    }
  } catch (error) {
    console.error('Error pulling server changes:', error);
  }
};

// Pushes local mutations to server
export const syncPendingData = async () => {
  if (!isOnline()) return;

  const queue = await db.sync_queue.orderBy('id').toArray();
  
  if (queue.length === 0) {
    // If nothing to push, try pulling
    await pullServerChanges();
    return;
  }

  console.log(`Starting background sync for ${queue.length} pending offline mutations...`);
  
  let successCount = 0;

  for (const item of queue) {
    try {
      const response = await fetchWithAuth(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined
      });

      if (response.ok) {
        // Handled successfully on backend
        if (item.action === 'CREATE_ORDER') {
          // Delete our temporary local order, because pullServerChanges will fetch the real one.
          await db.orders.where('bill_number').equals(item.temp_bill_number).delete();
        }
        
        await db.sync_queue.delete(item.id);
        successCount++;
      } else {
        console.warn(`Sync failed for ${item.action} with status: ${response.status}`);
        // For 4xx errors (like validation), we delete the queue item so it doesn't block forever.
        // For 5xx errors, we break and retry later.
        if (response.status < 500) {
           await db.sync_queue.delete(item.id);
        } else {
           break;
        }
      }
    } catch (err) {
      console.error('Network error syncing item:', err);
      break;
    }
  }

  if (successCount > 0) {
    console.log(`Successfully synced ${successCount} offline items.`);
  }

  // Always pull after pushing to ensure we have the latest server state
  await pullServerChanges();
};

// Start background sync interval
if (typeof window !== 'undefined') {
  // Sync every 30 seconds
  setInterval(syncPendingData, 30000);
  // Sync when coming back online
  window.addEventListener('online', syncPendingData);
}

// Backwards compatibility for components that might still use this directly
export const queueOfflineOrder = (orderData) => {
  console.warn("queueOfflineOrder is deprecated. Use useCreateOrder from useShopData instead.");
};
export const fetchWithCache = async (url, key, fallback) => {
  console.warn("fetchWithCache is deprecated.");
  return fallback; 
};
