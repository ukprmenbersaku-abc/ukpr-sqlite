import { QueryResult, TableInfo, SqlJsDatabase } from '../types.ts';

let db: SqlJsDatabase | null = null;
let SQL: any = null;

export const initSqlJs = async () => {
  if (SQL) return;
  
  // @ts-ignore - window.initSqlJs is loaded from CDN in index.html
  if (typeof window.initSqlJs !== 'function') {
    throw new Error('SQL.js is not loaded correctly.');
  }

  // @ts-ignore
  SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
};

export const loadDatabase = async (fileBuffer: ArrayBuffer): Promise<void> => {
  await initSqlJs();
  if (db) {
    db.close();
  }
  db = new SQL.Database(new Uint8Array(fileBuffer));
};

export const createNewDatabase = async (): Promise<void> => {
  await initSqlJs();
  if (db) {
    db.close();
  }
  db = new SQL.Database();
};

export const exportDatabase = (): Uint8Array | null => {
  if (!db) return null;
  return db.export();
};

export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

export const executeQuery = (sql: string): QueryResult | null => {
  if (!db) throw new Error("Database not initialized");
  try {
    const results = db.exec(sql);
    if (results.length === 0) return null;
    return {
      columns: results[0].columns,
      values: results[0].values
    };
  } catch (err: any) {
    throw new Error(err.message);
  }
};

export const getTables = (): TableInfo[] => {
  if (!db) return [];
  const result = executeQuery("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (!result) return [];
  
  return result.values.map((row: any[]) => ({
    name: row[0] as string,
    schema: row[1] as string
  }));
};

// Modified to include rowid for editing purposes
export const getTableData = (tableName: string, limit: number = 100): QueryResult | null => {
  // We fetch rowid to identify rows for updates/deletes, but we might hide it in UI if needed
  return executeQuery(`SELECT rowid, * FROM "${tableName}" LIMIT ${limit}`);
};

export const getDatabaseSchema = (): string => {
  const tables = getTables();
  return tables.map(t => t.schema).join(";\n");
};

// --- CRUD Operations ---

export const updateCellValue = (tableName: string, rowId: number, column: string, value: any): void => {
  if (!db) throw new Error("Database not initialized");
  // Simple parameter binding isn't directly exposed in the simplified db.exec helper, 
  // so we use db.prepare or careful string manipulation. 
  // For SQL.js simplified usage, binding via prepare is safer.
  
  const stmt = db.prepare(`UPDATE "${tableName}" SET "${column}" = ? WHERE rowid = ?`);
  stmt.run([value, rowId]);
  stmt.free();
};

export const deleteRow = (tableName: string, rowId: number): void => {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare(`DELETE FROM "${tableName}" WHERE rowid = ?`);
  stmt.run([rowId]);
  stmt.free();
};

export const insertRow = (tableName: string, rowData: Record<string, any>): void => {
  if (!db) throw new Error("Database not initialized");
  const columns = Object.keys(rowData);
  const values = Object.values(rowData);
  const placeholders = values.map(() => '?').join(',');
  const quotedColumns = columns.map(c => `"${c}"`).join(',');

  const sql = `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`;
  const stmt = db.prepare(sql);
  stmt.run(values);
  stmt.free();
};

export const dropTable = (tableName: string): void => {
  if (!db) throw new Error("Database not initialized");
  db.run(`DROP TABLE "${tableName}"`);
};