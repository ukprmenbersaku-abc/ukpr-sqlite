// /services/dbWorker.ts

// Since we are running inside a Web Worker, we load SQL.js via importScripts from cdnjs.
// @ts-ignore
importScripts("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js");

let db: any = null;
let SQL: any = null;

async function initSqlJs() {
  if (SQL) return;
  // @ts-ignore
  if (typeof self.initSqlJs !== 'function') {
    throw new Error('SQL.js is not loaded in Web Worker.');
  }

  // @ts-ignore
  SQL = await self.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
}

self.onmessage = async (e: MessageEvent) => {
  const { id, action, payload } = e.data;

  try {
    switch (action) {
      case 'init': {
        await initSqlJs();
        self.postMessage({ id, success: true });
        break;
      }
      case 'load': {
        await initSqlJs();
        if (db) {
          try { db.close(); } catch (e) {}
        }
        db = new SQL.Database(new Uint8Array(payload.buffer));
        self.postMessage({ id, success: true });
        break;
      }
      case 'create_new': {
        await initSqlJs();
        if (db) {
          try { db.close(); } catch (e) {}
        }
        db = new SQL.Database();
        self.postMessage({ id, success: true });
        break;
      }
      case 'export': {
        if (!db) throw new Error("Database not initialized");
        const data = db.export();
        (self as any).postMessage({ id, success: true, result: data.buffer }, [data.buffer]);
        break;
      }
      case 'attach': {
        await initSqlJs();
        if (!db) {
          db = new SQL.Database();
        }
        const { name, buffer } = payload;
        
        // Clean alias name to fit SQLite identifier guidelines
        const aliasName = name.replace(/\.(sqlite3|sqlite|db)$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
        const fileName = `/db_${aliasName}.db`;

        try {
          if (SQL.FS) {
            try {
              SQL.FS.unlink(fileName);
            } catch (e) {}
            SQL.FS.writeFile(fileName, new Uint8Array(buffer));
          } else {
            throw new Error("Virtual File System is inaccessible in SQL.js.");
          }

          db.run(`ATTACH DATABASE '${fileName}' AS ${aliasName}`);
          self.postMessage({ id, success: true, result: aliasName });
        } catch (err: any) {
          throw new Error(`Failed to attach ${name}: ${err.message}`);
        }
        break;
      }
      case 'execute': {
        if (!db) throw new Error("Database not initialized");
        const results = db.exec(payload.sql);
        if (results.length === 0) {
          self.postMessage({ id, success: true, result: null });
        } else {
          self.postMessage({ id, success: true, result: {
            columns: results[0].columns,
            values: results[0].values
          }});
        }
        break;
      }
      case 'get_tables': {
        if (!db) {
          self.postMessage({ id, success: true, result: [] });
          break;
        }
        const tables: any[] = [];
        try {
          const dbsResult = db.exec("PRAGMA database_list");
          if (dbsResult && dbsResult.length > 0) {
            const dbRows = dbsResult[0].values;
            for (const row of dbRows) {
              const dbName = row[1] as string;
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
                console.error(e);
              }
            }
          }
        } catch (err) {
          // Fallback to main master
          const result = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
          if (result && result.length > 0) {
            result[0].values.forEach((row: any[]) => {
              tables.push({
                name: row[0] as string,
                schema: row[1] as string
              });
            });
          }
        }
        self.postMessage({ id, success: true, result: tables });
        break;
      }
      case 'get_columns': {
        if (!db) {
          self.postMessage({ id, success: true, result: [] });
          break;
        }
        const { tableName } = payload;
        const parts = tableName.split('.');
        let query = `PRAGMA table_info("${tableName}")`;
        if (parts.length > 1) {
          const dbAlias = parts[0];
          const realTableName = parts.slice(1).join('.');
          query = `PRAGMA "${dbAlias}".table_info("${realTableName}")`;
        }
        const results = db.exec(query);
        if (results.length === 0) {
          self.postMessage({ id, success: true, result: [] });
        } else {
          const columns = results[0].values.map((row: any[]) => row[1] as string);
          self.postMessage({ id, success: true, result: columns });
        }
        break;
      }
      case 'get_table_data': {
        if (!db) {
          self.postMessage({ id, success: true, result: null });
          break;
        }
        const { tableName, limit } = payload;
        const parts = tableName.split('.');
        let targetTable = `"${tableName}"`;
        if (parts.length > 1) {
          const dbAlias = parts[0];
          const realTableName = parts.slice(1).join('.');
          targetTable = `"${dbAlias}"."${realTableName}"`;
        }

        let results;
        try {
          results = db.exec(`SELECT rowid, * FROM ${targetTable} LIMIT ${limit}`);
        } catch (err) {
          results = db.exec(`SELECT * FROM ${targetTable} LIMIT ${limit}`);
        }

        if (results.length === 0) {
          self.postMessage({ id, success: true, result: null });
        } else {
          self.postMessage({ id, success: true, result: {
            columns: results[0].columns,
            values: results[0].values
          }});
        }
        break;
      }
      case 'update_cell': {
        if (!db) throw new Error("Database not initialized");
        const { tableName, rowId, column, value } = payload;
        const stmt = db.prepare(`UPDATE "${tableName}" SET "${column}" = ? WHERE rowid = ?`);
        stmt.run([value, rowId]);
        stmt.free();
        self.postMessage({ id, success: true });
        break;
      }
      case 'delete_row': {
        if (!db) throw new Error("Database not initialized");
        const { tableName, rowId } = payload;
        const stmt = db.prepare(`DELETE FROM "${tableName}" WHERE rowid = ?`);
        stmt.run([rowId]);
        stmt.free();
        self.postMessage({ id, success: true });
        break;
      }
      case 'insert_row': {
        if (!db) throw new Error("Database not initialized");
        const { tableName, rowData } = payload;
        const columns = Object.keys(rowData);
        const values = Object.values(rowData);
        const placeholders = values.map(() => '?').join(',');
        const quotedColumns = columns.map(c => `"${c}"`).join(',');

        const sql = `INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`;
        const stmt = db.prepare(sql);
        stmt.run(values);
        stmt.free();
        self.postMessage({ id, success: true });
        break;
      }
      case 'drop_table': {
        if (!db) throw new Error("Database not initialized");
        const { tableName } = payload;
        db.run(`DROP TABLE "${tableName}"`);
        self.postMessage({ id, success: true });
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err.message });
  }
};
