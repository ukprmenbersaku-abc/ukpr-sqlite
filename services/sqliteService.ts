// @ts-ignore
import DbWorker from './dbWorker?worker';

import { QueryResult, TableInfo } from '../types.ts';

let worker: Worker | null = null;
let msgId = 0;
const pendingPromises = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

// Locally tracked database state copies (to support safe termination & state recovery on demand)
let currentDbBackup: ArrayBuffer | null = null;
const attachedDbsBackup: { name: string; buffer: ArrayBuffer }[] = [];

// Initialize or retrieve the active Worker
export const getWorker = (): Worker => {
  if (!worker) {
    const activeWorker = new DbWorker();
    
    activeWorker.onmessage = (e: MessageEvent) => {
      const { id, success, result, error } = e.data;
      const promise = pendingPromises.get(id);
      if (promise) {
        pendingPromises.delete(id);
        if (success) {
          promise.resolve(result);
        } else {
          promise.reject(new Error(error));
        }
      }
    };

    activeWorker.onerror = (err: any) => {
      console.error("SQLite Background Worker encountered an error:", err);
    };

    worker = activeWorker;
  }
  return worker as Worker;
};

// Internal message router helper with transferable support
const callWorker = <T>(action: string, payload?: any, transfer?: Transferable[]): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      const activeWorker = getWorker();
      const id = ++msgId;
      pendingPromises.set(id, { resolve, reject });
      if (transfer && transfer.length > 0) {
        activeWorker.postMessage({ id, action, payload }, transfer);
      } else {
        activeWorker.postMessage({ id, action, payload });
      }
    } catch (err) {
      reject(err);
    }
  });
};

// Non-blocking debounced backup synchronization (prevents expensive export on every single edit)
let backupTimeout: any = null;
const scheduleSyncBackup = () => {
  if (backupTimeout) clearTimeout(backupTimeout);
  backupTimeout = setTimeout(async () => {
    try {
      if (worker) {
        const buffer = await callWorker<ArrayBuffer>('export');
        currentDbBackup = buffer;
      }
    } catch (e) {
      // Graceful bypass if worker is closed or busy
    }
  }, 1000);
};

export const initSqlJs = async (): Promise<void> => {
  await callWorker<void>('init');
};

export const loadDatabase = async (fileBuffer: ArrayBuffer): Promise<void> => {
  // Keep one slice for local disaster recovery; transfer fileBuffer to worker with zero copy
  currentDbBackup = fileBuffer.slice(0);
  attachedDbsBackup.length = 0;
  await callWorker<void>('load', { buffer: fileBuffer }, [fileBuffer]);
};

export const createNewDatabase = async (): Promise<void> => {
  currentDbBackup = null;
  attachedDbsBackup.length = 0;
  await callWorker<void>('create_new');
  scheduleSyncBackup();
};

export const exportDatabase = async (alias?: string): Promise<Uint8Array | null> => {
  try {
    const buffer = await callWorker<ArrayBuffer>('export', { alias });
    if (!alias || alias === 'main') {
      currentDbBackup = buffer;
    }
    return new Uint8Array(buffer);
  } catch (e) {
    console.error("Export database error:", e);
    return null;
  }
};

export const createAttachedEmptyDatabase = async (name: string): Promise<string> => {
  const alias = await callWorker<string>('attach_empty', { name });
  scheduleSyncBackup();
  return alias;
};

export const copyTableAcrossDatabases = async (sourceTable: string, targetDb: string, newTableName?: string): Promise<void> => {
  await callWorker<void>('copy_table', { sourceTable, targetDb, newTableName });
  scheduleSyncBackup();
};

export const getDatabaseStats = async (): Promise<import('../types.ts').DatabaseStats[]> => {
  return callWorker<import('../types.ts').DatabaseStats[]>('get_database_stats');
};

export const loadSampleMultiDatabase = async (): Promise<void> => {
  // 1. Create primary store database
  await createNewDatabase();
  
  // Seed store database
  await executeQuery(`
    CREATE TABLE "products" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "stock" INTEGER NOT NULL
    );
    INSERT INTO "products" ("name", "category", "price", "stock") VALUES
      ('Mechanical Keyboard', 'Electronics', 129.99, 45),
      ('Ergonomic Mouse', 'Electronics', 69.50, 80),
      ('Noise-Canceling Headphones', 'Audio', 249.00, 25),
      ('USB-C 4K Monitor', 'Displays', 399.00, 15),
      ('Desk Mat Extended', 'Accessories', 24.99, 120);

    CREATE TABLE "customers" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "country" TEXT NOT NULL,
      "tier" TEXT NOT NULL
    );
    INSERT INTO "customers" ("name", "country", "tier") VALUES
      ('Alice Johnson', 'United States', 'Gold'),
      ('Kenji Sato', 'Japan', 'Platinum'),
      ('Sophie Martin', 'France', 'Silver'),
      ('Marco Rossi', 'Italy', 'Bronze'),
      ('Liam Smith', 'United Kingdom', 'Gold');

    CREATE TABLE "orders" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "customer_id" INTEGER,
      "product_id" INTEGER,
      "quantity" INTEGER NOT NULL,
      "order_date" TEXT NOT NULL
    );
    INSERT INTO "orders" ("customer_id", "product_id", "quantity", "order_date") VALUES
      (1, 1, 1, '2026-03-01'),
      (2, 3, 1, '2026-03-02'),
      (2, 4, 2, '2026-03-05'),
      (3, 2, 1, '2026-03-06'),
      (4, 5, 3, '2026-03-07'),
      (5, 1, 2, '2026-03-08');
  `);

  // 2. Attach secondary analytics database
  const analyticsAlias = await createAttachedEmptyDatabase('analytics');
  await executeQuery(`
    CREATE TABLE "${analyticsAlias}"."user_events" (
      "event_id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "customer_id" INTEGER,
      "action" TEXT NOT NULL,
      "timestamp" TEXT NOT NULL,
      "device" TEXT NOT NULL
    );
    INSERT INTO "${analyticsAlias}"."user_events" ("customer_id", "action", "timestamp", "device") VALUES
      (1, 'view_product', '2026-03-01 09:12:00', 'Desktop'),
      (1, 'add_to_cart', '2026-03-01 09:14:22', 'Desktop'),
      (2, 'view_product', '2026-03-02 14:05:11', 'Mobile'),
      (2, 'checkout', '2026-03-02 14:08:45', 'Mobile'),
      (3, 'view_product', '2026-03-06 18:22:10', 'Tablet'),
      (5, 'checkout', '2026-03-08 11:45:00', 'Desktop');

    CREATE TABLE "${analyticsAlias}"."campaigns" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "campaign_name" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "budget" REAL NOT NULL
    );
    INSERT INTO "${analyticsAlias}"."campaigns" ("campaign_name", "source", "budget") VALUES
      ('Spring Tech Sale', 'Google Search', 1500.00),
      ('Developer Workspace Kit', 'Direct', 800.00),
      ('Audio Gear Promo', 'Social', 1200.00);
  `);
};

export const closeDatabase = async (): Promise<void> => {
  if (backupTimeout) clearTimeout(backupTimeout);
  currentDbBackup = null;
  attachedDbsBackup.length = 0;
  if (worker) {
    try {
      await callWorker<void>('close');
    } catch (e) {
      console.warn("Error closing database in worker, terminating worker thread:", e);
      worker.terminate();
      worker = null;
    }
  }
  pendingPromises.clear();
};

export const executeQuery = async (sql: string): Promise<QueryResult | null> => {
  const result = await callWorker<QueryResult | null>('execute', { sql });
  const lowerSql = sql.trim().toLowerCase();
  // If editing schemas or executing transactional queries, schedule non-blocking backup
  if (
    lowerSql.startsWith('insert') || 
    lowerSql.startsWith('update') || 
    lowerSql.startsWith('delete') || 
    lowerSql.startsWith('drop') || 
    lowerSql.startsWith('create') || 
    lowerSql.startsWith('alter')
  ) {
    scheduleSyncBackup();
  }
  return result;
};

export const attachDatabase = async (name: string, buffer: ArrayBuffer): Promise<string> => {
  const clone = buffer.slice(0);
  const alias = await callWorker<string>('attach', { name, buffer }, [buffer]);
  attachedDbsBackup.push({ name, buffer: clone });
  scheduleSyncBackup();
  return alias;
};

export const detachDatabase = async (alias: string): Promise<void> => {
  await callWorker<void>('detach', { alias });
  const idx = attachedDbsBackup.findIndex(d => d.name === alias);
  if (idx !== -1) {
    attachedDbsBackup.splice(idx, 1);
  }
  scheduleSyncBackup();
};

export const getTables = async (): Promise<TableInfo[]> => {
  return callWorker<TableInfo[]>('get_tables');
};

export const getTableColumns = async (tableName: string): Promise<string[]> => {
  return callWorker<string[]>('get_columns', { tableName });
};

export const getTableData = async (tableName: string, limit: number = 1000000): Promise<QueryResult | null> => {
  return callWorker<QueryResult | null>('get_table_data', { tableName, limit });
};

export const getDatabaseSchema = async (): Promise<string> => {
  const tables = await getTables();
  return tables.map(t => t.schema).join(";\n");
};

// --- CRUD Operations ---

export const updateCellValue = async (tableName: string, rowId: number, column: string, value: any): Promise<void> => {
  await callWorker<void>('update_cell', { tableName, rowId, column, value });
  scheduleSyncBackup();
};

export const deleteRow = async (tableName: string, rowId: number): Promise<void> => {
  await callWorker<void>('delete_row', { tableName, rowId });
  scheduleSyncBackup();
};

export const insertRow = async (tableName: string, rowData: Record<string, any>): Promise<void> => {
  await callWorker<void>('insert_row', { tableName, rowData });
  scheduleSyncBackup();
};

export const dropTable = async (tableName: string): Promise<void> => {
  await callWorker<void>('drop_table', { tableName });
  scheduleSyncBackup();
};

// --- KILL AND INSTANT DISASTER RECOVERY ---
export const cancelCurrentQuery = async (): Promise<void> => {
  if (!worker) return;

  // 1. Force kill the heavy worker process
  worker.terminate();
  worker = null;

  // 2. Clear out waiting promises with failure to let UI catch
  for (const [id, promise] of pendingPromises.entries()) {
    promise.reject(new Error("Query was stopped by user."));
  }
  pendingPromises.clear();

  // 3. Spin up a brand new background thread worker
  const newWorker = getWorker();
  await callWorker<void>('init');

  // 4. Hot restore database contents
  if (currentDbBackup) {
    await callWorker<void>('load', { buffer: currentDbBackup });
  } else {
    await callWorker<void>('create_new');
  }

  // 5. Hot restore attachment databases
  for (const attached of attachedDbsBackup) {
    await callWorker<string>('attach', { name: attached.name, buffer: attached.buffer });
  }
};
