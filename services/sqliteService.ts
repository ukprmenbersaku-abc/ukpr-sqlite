import { QueryResult, TableInfo, SqlJsDatabase } from '../types';

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

export const getTableData = (tableName: string, limit: number = 100): QueryResult | null => {
  return executeQuery(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
};

export const getDatabaseSchema = (): string => {
  const tables = getTables();
  return tables.map(t => t.schema).join(";\n");
};
