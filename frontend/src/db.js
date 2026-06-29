import Dexie from 'dexie';

const getUser = () => {
  try {
    const userStr = localStorage.getItem('tailor_user');
    if (userStr) return JSON.parse(userStr);
  } catch (e) {}
  return null;
};

const user = getUser();
const dbName = user && user.id ? `TailorShopDB_${user.id}` : 'TailorShopDB';

export const db = new Dexie(dbName);

// Define database schema
// The first item is the primary key. Subsequent items are indexed fields.
db.version(1).stores({
  orders: 'bill_number, mobile_number, status, updated_at', // bill_number is the unique identifier for orders
  customers: 'mobile_number, customer_name, updated_at',    // mobile_number is the unique identifier for customers
  employees: 'id, updated_at',
  expenses: 'month, updated_at',
  custom_expenses: 'id, month, updated_at',
  cloth_configs: 'cloth_type, updated_at',
  sync_queue: '++id, action, endpoint, method, timestamp', // ++id specifies an auto-incrementing primary key
  sync_metadata: 'id' // 'id' will just be 'sync_state' to hold our last_sync_time
});

// Helper to clear the entire database (e.g., when the user logs out)
export const clearDatabase = async () => {
  try {
    await Promise.all([
      db.orders.clear(),
      db.customers.clear(),
      db.employees.clear(),
      db.expenses.clear(),
      db.custom_expenses.clear(),
      db.cloth_configs.clear(),
      db.sync_queue.clear(),
      db.sync_metadata.clear()
    ]);
    console.log("Local database cleared successfully.");
  } catch (error) {
    console.error("Failed to clear local database:", error);
  }
};
