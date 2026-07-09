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
    // Instantiate background Worker with Vite ESM syntax
    worker = new Worker(new URL('./dbWorker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e: MessageEvent) => {
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

    worker.onerror = (err) => {
      console.error("SQLite Background Worker encountered an error:", err);
    };
  }
  return worker;
};

// Internal message router helper
const callWorker = <T>(action: string, payload?: any): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      const activeWorker = getWorker();
      const id = ++msgId;
      pendingPromises.set(id, { resolve, reject });
      activeWorker.postMessage({ id, action, payload });
    } catch (err) {
      reject(err);
    }
  });
};

// Quietly export and cache DB state for recovery/export scenarios
const syncBackup = async () => {
  try {
    const buffer = await callWorker<ArrayBuffer>('export');
    currentDbBackup = buffer;
  } catch (e) {
    // Graceful bypass if database is empty/not ready
  }
};

export const initSqlJs = async (): Promise<void> => {
  await callWorker<void>('init');
};

export const loadDatabase = async (fileBuffer: ArrayBuffer): Promise<void> => {
  // Save detached arraybuffer copy for background hot backups
  currentDbBackup = fileBuffer.slice(0);
  attachedDbsBackup.length = 0;
  await callWorker<void>('load', { buffer: fileBuffer });
};

export const createNewDatabase = async (): Promise<void> => {
  currentDbBackup = null;
  attachedDbsBackup.length = 0;
  await callWorker<void>('create_new');
  await syncBackup();
};

export const exportDatabase = async (): Promise<Uint8Array | null> => {
  try {
    const buffer = await callWorker<ArrayBuffer>('export');
    currentDbBackup = buffer;
    return new Uint8Array(buffer);
  } catch (e) {
    return null;
  }
};

export const closeDatabase = (): void => {
  currentDbBackup = null;
  attachedDbsBackup.length = 0;
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingPromises.clear();
};

export const executeQuery = async (sql: string): Promise<QueryResult | null> => {
  const result = await callWorker<QueryResult | null>('execute', { sql });
  const lowerSql = sql.trim().toLowerCase();
  // If editing schemas or executing transactional queries, sync backup
  if (
    lowerSql.startsWith('insert') || 
    lowerSql.startsWith('update') || 
    lowerSql.startsWith('delete') || 
    lowerSql.startsWith('drop') || 
    lowerSql.startsWith('create') || 
    lowerSql.startsWith('alter')
  ) {
    await syncBackup();
  }
  return result;
};

export const attachDatabase = async (name: string, buffer: ArrayBuffer): Promise<string> => {
  const alias = await callWorker<string>('attach', { name, buffer });
  attachedDbsBackup.push({ name, buffer: buffer.slice(0) });
  await syncBackup();
  return alias;
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
  await syncBackup();
};

export const deleteRow = async (tableName: string, rowId: number): Promise<void> => {
  await callWorker<void>('delete_row', { tableName, rowId });
  await syncBackup();
};

export const insertRow = async (tableName: string, rowData: Record<string, any>): Promise<void> => {
  await callWorker<void>('insert_row', { tableName, rowData });
  await syncBackup();
};

export const dropTable = async (tableName: string): Promise<void> => {
  await callWorker<void>('drop_table', { tableName });
  await syncBackup();
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
