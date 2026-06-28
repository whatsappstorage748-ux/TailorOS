import { fetchWithAuth, API_BASE } from '../App';
import { db } from '../db';

export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

/**
 * Pulls changes from server that happened since the last sync time.
 * This runs in the background — it does NOT block the UI render.
 */
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
      if (data.orders?.length)         await db.orders.bulkPut(data.orders);
      if (data.customers?.length)       await db.customers.bulkPut(data.customers);
      if (data.employees?.length)       await db.employees.bulkPut(data.employees);
      if (data.expenses?.length)        await db.expenses.bulkPut(data.expenses);
      if (data.custom_expenses?.length) await db.custom_expenses.bulkPut(data.custom_expenses);
      if (data.cloth_configs?.length)   await db.cloth_configs.bulkPut(data.cloth_configs);
      
      // Update sync time
      await db.sync_metadata.put({ id: 'sync_state', last_sync_time: data.server_time });
      
      // Notify React Query to re-read from Dexie
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('offline-sync-complete'));
      }

      const totalUpdates = (data.orders?.length || 0) + (data.customers?.length || 0);
      if (totalUpdates > 0) {
        console.log(`[Sync] Pulled ${totalUpdates} record(s) from server.`);
      }
    }
  } catch (error) {
    console.error('[Sync] Error pulling server changes:', error);
  }
};

/**
 * Pushes local mutations to server, then pulls latest changes.
 * Safe to call from anywhere — always checks online status first.
 */
export const syncPendingData = async () => {
  if (!isOnline()) return;

  const queue = await db.sync_queue.orderBy('id').toArray();
  
  if (queue.length === 0) {
    // Nothing to push — just pull any server-side updates
    await pullServerChanges();
    return;
  }

  console.log(`[Sync] Flushing ${queue.length} pending offline mutation(s)...`);
  
  let successCount = 0;

  for (const item of queue) {
    try {
      const response = await fetchWithAuth(`${API_BASE}${item.endpoint}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined
      });

      if (response.ok) {
        if (item.action === 'CREATE_ORDER') {
          // Delete temp offline order — pullServerChanges will fetch the real one
          await db.orders.where('bill_number').equals(item.temp_bill_number).delete();
        }
        await db.sync_queue.delete(item.id);
        successCount++;
      } else {
        console.warn(`[Sync] Failed: ${item.action} → HTTP ${response.status}`);
        // 4xx = bad request (validation error etc.) — discard so it doesn't block queue
        // 5xx = server error — stop and retry on next interval
        if (response.status < 500) {
           await db.sync_queue.delete(item.id);
        } else {
           break;
        }
      }
    } catch (err) {
      console.error('[Sync] Network error:', err);
      break;
    }
  }

  if (successCount > 0) {
    console.log(`[Sync] Pushed ${successCount} mutation(s) successfully.`);
  }

  // Always pull after pushing to get fresh server state
  await pullServerChanges();
};

/**
 * NON-BLOCKING initial sync on app startup.
 * Fires immediately but does NOT delay the first render.
 * Uses setTimeout(0) to yield the main thread first so the UI renders.
 */
export const initSync = () => {
  if (typeof window === 'undefined') return;

  // Yield to browser so React can render first, then sync in background
  setTimeout(() => {
    syncPendingData().catch(err => console.error('[Sync] Init sync error:', err));
  }, 0);
};

// Background sync interval — every 60 seconds (was 30s, halved server load)
if (typeof window !== 'undefined') {
  setInterval(syncPendingData, 60000);

  // Sync immediately when coming back online
  window.addEventListener('online', () => {
    console.log('[Sync] Back online — syncing now...');
    syncPendingData();
  });
}

// Backwards compatibility
export const queueOfflineOrder = (orderData) => {
  console.warn("queueOfflineOrder is deprecated. Use useCreateOrder from useShopData instead.");
};
export const fetchWithCache = async (url, key, fallback) => {
  console.warn("fetchWithCache is deprecated.");
  return fallback; 
};
