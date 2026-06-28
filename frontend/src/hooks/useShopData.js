import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db';
import { syncPendingData } from '../utils/syncManager';

/**
 * SKELETON LOADING STRATEGY
 * ─────────────────────────────────────────────────────────
 * Each hook uses `placeholderData` instead of `initialData`.
 *
 * KEY DIFFERENCE:
 *   - initialData    → TanStack treats it as "real" data. isFetching starts FALSE.
 *                      Skeleton NEVER fires. Zeros show until fetch completes. ← OLD BUG
 *   - placeholderData → TanStack treats it as "fake" data. isFetching starts TRUE.
 *                      Skeleton fires immediately. Real data replaces it on fetch. ← FIX
 *
 * Components use this pattern:
 *
 *   const showSkeleton = isFetching && items.length === 0;
 *   if (showSkeleton)       return <SkeletonComponent />;   ← first load only
 *   if (items.length === 0) return <EmptyState />;          ← genuinely empty
 *   return <RealContent items={items} />;                   ← cached, instant
 *
 * This means:
 *   - Tab first visit  : isFetching=true  + length=0  → skeleton (< 200ms)
 *   - Tab revisit      : isFetching=false + length>0  → instant (cache hit)
 *   - Background sync  : isFetching=true  + length>0  → real data + corner spinner
 *   - Shop has no data : isFetching=false + length=0  → empty state
 */

// --- QUERIES ---

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const orders = await db.orders.toArray();
      const todayStr = new Date().toLocaleDateString('en-IN');
      let undelivered = 0;
      let delivered = 0;
      let todayRev = 0;
      let todayOrd = 0;

      orders.forEach(o => {
        if (o.status !== 'Delivered') undelivered++;
        if (o.status === 'Delivered') delivered++;
        const oDate = new Date(o.order_date).toLocaleDateString('en-IN');
        if (oDate === todayStr) {
          todayOrd++;
          todayRev += (o.advance_amount || 0); 
        }
      });

      return {
        totalOrders: orders.length,
        undeliveredOrders: undelivered,
        deliveredOrders: delivered,
        todayRevenue: todayRev,
        todayOrders: todayOrd
      };
    },
    // placeholderData: isFetching=true on first render → skeleton fires correctly
    placeholderData: { totalOrders: 0, undeliveredOrders: 0, deliveredOrders: 0, todayRevenue: 0, todayOrders: 0 },
    staleTime: 1000 * 60 * 5,   // 5 min — reuse on tab switch
    gcTime: 1000 * 60 * 30,     // 30 min — keep in memory when unmounted
  });
};

export const useOrders = (searchQuery = '') => {
  return useQuery({
    queryKey: ['orders', searchQuery],
    queryFn: async () => {
      let orders = await db.orders.toArray();
      // Sort newest first
      orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        orders = orders.filter(o => 
          o.bill_number.toLowerCase().includes(q) || 
          o.mobile_number.includes(q) || 
          (o.customer_name && o.customer_name.toLowerCase().includes(q))
        );
      }
      return { orders };
    },
    placeholderData: { orders: [] },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useCustomers = (searchQuery = '') => {
  return useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      let customers = await db.customers.toArray();
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        customers = customers.filter(c => 
          c.mobile_number.includes(q) || 
          (c.customer_name && c.customer_name.toLowerCase().includes(q))
        );
      }
      // Enrich with order_count from local orders
      const orders = await db.orders.toArray();
      const countMap = {};
      orders.forEach(o => {
        countMap[o.mobile_number] = (countMap[o.mobile_number] || 0) + 1;
      });
      customers = customers.map(c => ({
        ...c,
        order_count: countMap[c.mobile_number] || 0,
      }));
      customers.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      return { customers };
    },
    placeholderData: { customers: [] },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useCustomerHistory = (mobile) => {
  return useQuery({
    queryKey: ['customers', 'history', mobile],
    queryFn: async () => {
      const customer = await db.customers.where('mobile_number').equals(mobile).first();
      let orders = await db.orders.where('mobile_number').equals(mobile).toArray();
      orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
      return { customer: customer || null, orders };
    },
    enabled: !!mobile,
    placeholderData: { customer: null, orders: [] },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

// Analytics — reads from local Dexie
export const useAnalyticsSummary = (month) => {
  return useQuery({
    queryKey: ['analytics', 'summary', month],
    queryFn: async () => {
      const orders = await db.orders.toArray();
      const expenses = await db.expenses.where('month').equals(month).first() || { rent: 0, electricity: 0 };
      
      const monthOrders = orders.filter(o => o.order_date && o.order_date.startsWith(month));
      const revenue = monthOrders.reduce((sum, o) => sum + (o.advance_amount || 0) + (o.balance_amount || 0), 0);
      
      return {
        revenue,
        rent: expenses.rent,
        electricity: expenses.electricity,
        salariesPaid: 0,
        customExpensesPaid: 0,
        profit: revenue - expenses.rent - expenses.electricity
      };
    },
    enabled: !!month,
    placeholderData: { revenue: 0, rent: 0, electricity: 0, salariesPaid: 0, customExpensesPaid: 0, profit: 0 },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useAnalyticsDaily = (month) => {
  return useQuery({
    queryKey: ['analytics', 'daily', month],
    queryFn: async () => {
      return { dailyStats: [] };
    },
    enabled: !!month,
    placeholderData: { dailyStats: [] },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useAnalyticsYearly = (year) => {
  return useQuery({
    queryKey: ['analytics', 'yearly', year],
    queryFn: async () => {
      return { yearlyStats: [] };
    },
    enabled: !!year,
    placeholderData: { yearlyStats: [] },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

// --- MUTATIONS ---

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ billNo, action }) => {
      const order = await db.orders.where('bill_number').equals(billNo).first();
      if (!order) throw new Error('Order not found locally');
      
      const newStatus = action === 'deliver' ? 'Delivered' : (action === 'ready' ? 'Ready' : 'Undelivered');
      
      // Update local db
      await db.orders.where('bill_number').equals(billNo).modify({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      // Queue for background sync
      await db.sync_queue.add({
        action: 'UPDATE_ORDER_STATUS',
        endpoint: `/api/orders/${billNo}/${action}`,
        method: 'PUT',
        timestamp: new Date().toISOString()
      });

      return { billNo, status: newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      syncPendingData(); // Try to sync immediately if online
    }
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderData) => {
      // 1. Generate an OFFLINE primary key
      const billNo = `OFFLINE-${new Date().toISOString().slice(2,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      const orderToSave = {
        ...orderData,
        bill_number: billNo,
        order_date: now,
        updated_at: now,
        status: 'Undelivered',
        advance_amount: parseFloat(orderData.advance_amount || 0),
        balance_amount: parseFloat(orderData.balance_amount || 0)
      };

      // 2. Add to Dexie orders
      await db.orders.add(orderToSave);
      
      // 3. Upsert customer
      const existingCust = await db.customers.where('mobile_number').equals(orderData.mobile_number).first();
      if (!existingCust) {
        await db.customers.add({
          mobile_number: orderData.mobile_number,
          customer_name: orderData.customer_name,
          updated_at: now
        });
      }

      // 4. Queue Sync — body payload for the server
      await db.sync_queue.add({
        action: 'CREATE_ORDER',
        endpoint: `/api/orders`,
        method: 'POST',
        body: orderData,
        temp_bill_number: billNo,
        timestamp: now
      });

      return orderToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      syncPendingData(); // Try to sync immediately if online
    }
  });
};
