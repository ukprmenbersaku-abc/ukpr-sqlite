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

export const attachDatabase = async (name: string, buffer: ArrayBuffer): Promise<string> => {
  await initSqlJs();
  if (!db) {
    db = new SQL.Database();
  }
  
  // Clean alias name to fit SQLite identifier guidelines (no dots, alphanumeric + underscores only)
  const aliasName = name.replace(/\.(sqlite3|sqlite|db)$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
  const fileName = `/db_${aliasName}.db`;

  try {
    // Delete if existing inside SQLite Emscripten FS
    try {
      if (SQL.FS) {
        SQL.FS.unlink(fileName);
      }
    } catch(e) {}

    if (SQL.FS && typeof SQL.FS.writeFile === 'function') {
      SQL.FS.writeFile(fileName, new Uint8Array(buffer));
    } else if (SQL.FS && typeof SQL.FS.createDataFile === 'function') {
      SQL.FS.createDataFile('/', `db_${aliasName}.db`, new Uint8Array(buffer), true, true);
    } else {
      throw new Error("Virtual File System is inaccessible in SQL.js.");
    }

    if (!db) {
      throw new Error("Database not initialized");
    }
    db.run(`ATTACH DATABASE '${fileName}' AS ${aliasName}`);
    return aliasName;
  } catch (err: any) {
    console.error("Failed to attach database:", err);
    throw new Error(`Failed to attach ${name}: ${err.message}`);
  }
};

export const getTables = (): TableInfo[] => {
  if (!db) return [];
  const tables: TableInfo[] = [];

  try {
    const dbsResult = db.exec("PRAGMA database_list");
    if (dbsResult && dbsResult.length > 0) {
      const dbRows = dbsResult[0].values;
      for (const row of dbRows) {
        const dbName = row[1] as string; // 'main', 'temp', or attached alias
        if (dbName === 'temp') continue;

        try {
          const masterTable = dbName === 'main' ? 'sqlite_master' : `"${dbName}".sqlite_master`;
          const query = `SELECT name, sql FROM ${masterTable} WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
          const results = db.exec(query);
          if (results && results.length > 0) {
            results[0].values.forEach((valRow: any[]) => {
              const tableName = valRow[0] as string;
              const schema = valRow[1] as string;
              const displayName = dbName === 'main' ? tableName : `${dbName}.${tableName}`;
              tables.push({
                name: displayName,
                schema: schema || `-- No schema available for ${displayName}`
              });
            });
          }
        } catch (e) {
          console.error(`Error querying master table for database '${dbName}':`, e);
        }
      }
    }
  } catch (err) {
    console.error("Error retrieving comprehensive tables list, falling back to main:", err);
    const result = executeQuery("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    if (result) {
      result.values.forEach((row: any[]) => {
        tables.push({
          name: row[0] as string,
          schema: row[1] as string
        });
      });
    }
  }

  return tables;
};

export const getTableColumns = (tableName: string): string[] => {
  if (!db) return [];
  try {
    const parts = tableName.split('.');
    let query = `PRAGMA table_info("${tableName}")`;
    if (parts.length > 1) {
      const dbAlias = parts[0];
      const realTableName = parts.slice(1).join('.');
      query = `PRAGMA "${dbAlias}".table_info("${realTableName}")`;
    }
    const results = db.exec(query);
    if (results.length === 0) return [];
    return results[0].values.map((row: any[]) => row[1] as string);
  } catch (err) {
    console.error("PRAGMA error", err);
    return [];
  }
};

// Modified to include rowid for editing purposes, safely accounting for attached databases
export const getTableData = (tableName: string, limit: number = 1000000): QueryResult | null => {
  const parts = tableName.split('.');
  let targetTable = `"${tableName}"`;
  if (parts.length > 1) {
    const dbAlias = parts[0];
    const realTableName = parts.slice(1).join('.');
    targetTable = `"${dbAlias}"."${realTableName}"`;
  }

  try {
    return executeQuery(`SELECT rowid, * FROM ${targetTable} LIMIT ${limit}`);
  } catch (err) {
    // Fallback if rowid is not supported/accessible or attached table without rowid
    return executeQuery(`SELECT * FROM ${targetTable} LIMIT ${limit}`);
  }
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