// /services/dbWorker.ts
import initSqlJsLoader from 'sql.js';

const ctx: any = self;

let db: any = null;
let SQL: any = null;

async function initSqlJs() {
  if (SQL) return;

  try {
    SQL = await initSqlJsLoader({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return '/sql-wasm.wasm';
        }
        return `https://cdn.jsdelivr.net/npm/sql.js@1.14.1/dist/${file}`;
      }
    });
  } catch (err1) {
    console.warn("Primary local WASM load failed, attempting CDN fallback...", err1);
    try {
      SQL = await initSqlJsLoader({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/sql.js@1.14.1/dist/${file}`
      });
    } catch (err2) {
      console.warn("jsdelivr CDN failed, attempting cdnjs fallback...", err2);
      SQL = await initSqlJsLoader({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.1/${file}`
      });
    }
  }
}

function getDbTableTarget(tableName: string) {
  const parts = tableName.split('.');
  if (parts.length > 1) {
    const dbAlias = parts[0];
    const realTableName = parts.slice(1).join('.');
    return {
      sqlTable: `"${dbAlias}"."${realTableName}"`,
      dbAlias,
      realTableName
    };
  }
  return {
    sqlTable: `"${tableName}"`,
    dbAlias: 'main',
    realTableName: tableName
  };
}

ctx.onmessage = async (e: MessageEvent) => {
  const { id, action, payload } = e.data;

  try {
    switch (action) {
      case 'init': {
        await initSqlJs();
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'close': {
        if (db) {
          try { db.close(); } catch (e) {}
          db = null;
        }
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'load': {
        await initSqlJs();
        if (db) {
          try { db.close(); } catch (e) {}
        }
        db = new SQL.Database(new Uint8Array(payload.buffer));
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'create_new': {
        await initSqlJs();
        if (db) {
          try { db.close(); } catch (e) {}
        }
        db = new SQL.Database();
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'export': {
        if (!db) throw new Error("Database not initialized");
        const targetAlias = payload?.alias;
        if (!targetAlias || targetAlias === 'main') {
          const data = db.export();
          ctx.postMessage({ id, success: true, result: data.buffer }, [data.buffer]);
        } else {
          // Export an attached database
          const tempExportPath = `/export_${targetAlias}_${Date.now()}.db`;
          let exportedBuffer: ArrayBuffer | null = null;
          try {
            // SQLite 3.27+ supports VACUUM [schema] INTO 'filename'
            db.run(`VACUUM "${targetAlias}" INTO '${tempExportPath}'`);
            if (SQL.FS && SQL.FS.analyzePath(tempExportPath).exists) {
              const fileBytes = SQL.FS.readFile(tempExportPath);
              exportedBuffer = fileBytes.buffer;
              try { SQL.FS.unlink(tempExportPath); } catch (e) {}
            }
          } catch (vacuumErr) {
            console.warn(`VACUUM INTO failed for ${targetAlias}, fallback to virtual FS file:`, vacuumErr);
          }

          if (!exportedBuffer) {
            const defaultFileName = `/db_${targetAlias}.db`;
            if (SQL.FS && SQL.FS.analyzePath(defaultFileName).exists) {
              const fileBytes = SQL.FS.readFile(defaultFileName);
              exportedBuffer = fileBytes.buffer;
            }
          }

          if (!exportedBuffer) {
            throw new Error(`Failed to export attached database '${targetAlias}'`);
          }

          ctx.postMessage({ id, success: true, result: exportedBuffer }, [exportedBuffer]);
        }
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

          db.run(`ATTACH DATABASE '${fileName}' AS "${aliasName}"`);
          ctx.postMessage({ id, success: true, result: aliasName });
        } catch (err: any) {
          throw new Error(`Failed to attach ${name}: ${err.message}`);
        }
        break;
      }
      case 'attach_empty': {
        await initSqlJs();
        if (!db) {
          db = new SQL.Database();
        }
        const rawName = payload.name || 'scratch';
        const aliasName = rawName.replace(/\.(sqlite3|sqlite|db)$/i, '').replace(/[^a-zA-Z0-9_]/g, '_');
        const fileName = `/db_${aliasName}.db`;

        try {
          // Create empty database bytes via a temporary SQL.Database
          const tempDb = new SQL.Database();
          const emptyBytes = tempDb.export();
          tempDb.close();

          if (SQL.FS) {
            try { SQL.FS.unlink(fileName); } catch (e) {}
            SQL.FS.writeFile(fileName, emptyBytes);
          }
          db.run(`ATTACH DATABASE '${fileName}' AS "${aliasName}"`);
          ctx.postMessage({ id, success: true, result: aliasName });
        } catch (err: any) {
          throw new Error(`Failed to create and attach empty database ${aliasName}: ${err.message}`);
        }
        break;
      }
      case 'detach': {
        if (!db) throw new Error("Database not initialized");
        const { alias } = payload;
        try {
          db.run(`DETACH DATABASE "${alias}"`);
          if (SQL.FS) {
            try {
              SQL.FS.unlink(`/db_${alias}.db`);
            } catch (e) {}
          }
          ctx.postMessage({ id, success: true });
        } catch (err: any) {
          throw new Error(`Failed to detach ${alias}: ${err.message}`);
        }
        break;
      }
      case 'copy_table': {
        if (!db) throw new Error("Database not initialized");
        const { sourceTable, targetDb, newTableName } = payload;
        const sourceTarget = getDbTableTarget(sourceTable);
        const safeTargetDb = targetDb === 'main' ? 'main' : `"${targetDb}"`;
        const safeNewTable = `"${newTableName || sourceTarget.realTableName}"`;
        
        // Execute CREATE TABLE target.table AS SELECT * FROM source.table
        const sql = `CREATE TABLE ${safeTargetDb}.${safeNewTable} AS SELECT * FROM ${sourceTarget.sqlTable};`;
        db.run(sql);
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'get_database_stats': {
        if (!db) {
          ctx.postMessage({ id, success: true, result: [] });
          break;
        }
        const stats: any[] = [];
        try {
          const dbsResult = db.exec("PRAGMA database_list;");
          if (dbsResult && dbsResult.length > 0) {
            for (const row of dbsResult[0].values) {
              const dbName = row[1] as string;
              if (dbName === 'temp') continue;
              
              // Count tables
              let tableCount = 0;
              try {
                const master = dbName === 'main' ? 'sqlite_master' : `"${dbName}".sqlite_master`;
                const tRes = db.exec(`SELECT count(*) FROM ${master} WHERE type='table' AND name NOT LIKE 'sqlite_%';`);
                if (tRes && tRes[0]?.values[0]) {
                  tableCount = Number(tRes[0].values[0][0]);
                }
              } catch (e) {}

              // Estimate size
              let sizeBytes = 0;
              try {
                const pageCountRes = db.exec(`PRAGMA "${dbName}".page_count;`);
                const pageSizeRes = db.exec(`PRAGMA "${dbName}".page_size;`);
                const pageCount = Number(pageCountRes[0]?.values[0][0] || 0);
                const pageSize = Number(pageSizeRes[0]?.values[0][0] || 4096);
                sizeBytes = pageCount * pageSize;
              } catch (e) {}

              stats.push({
                alias: dbName,
                name: dbName === 'main' ? 'main' : `${dbName}.sqlite`,
                isMain: dbName === 'main',
                tableCount,
                sizeBytes
              });
            }
          }
        } catch (e) {
          console.warn("Failed to get database stats:", e);
        }
        ctx.postMessage({ id, success: true, result: stats });
        break;
      }
      case 'execute': {
        if (!db) throw new Error("Database not initialized");
        const results = db.exec(payload.sql);
        if (results.length === 0) {
          ctx.postMessage({ id, success: true, result: null });
        } else {
          ctx.postMessage({ id, success: true, result: {
            columns: results[0].columns,
            values: results[0].values
          }});
        }
        break;
      }
      case 'get_tables': {
        if (!db) {
          ctx.postMessage({ id, success: true, result: [] });
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
        ctx.postMessage({ id, success: true, result: tables });
        break;
      }
      case 'get_columns': {
        if (!db) {
          ctx.postMessage({ id, success: true, result: [] });
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
          ctx.postMessage({ id, success: true, result: [] });
        } else {
          const columns = results[0].values.map((row: any[]) => row[1] as string);
          ctx.postMessage({ id, success: true, result: columns });
        }
        break;
      }
      case 'get_table_data': {
        if (!db) {
          ctx.postMessage({ id, success: true, result: null });
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
          ctx.postMessage({ id, success: true, result: null });
        } else {
          ctx.postMessage({ id, success: true, result: {
            columns: results[0].columns,
            values: results[0].values
          }});
        }
        break;
      }
      case 'update_cell': {
        if (!db) throw new Error("Database not initialized");
        const { tableName, rowId, column, value } = payload;
        const target = getDbTableTarget(tableName);
        const stmt = db.prepare(`UPDATE ${target.sqlTable} SET "${column}" = ? WHERE rowid = ?`);
        stmt.run([value, rowId]);
        stmt.free();
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'delete_row': {
        if (!db) throw new Error("Database not initialized");
        const { tableName, rowId } = payload;
        const target = getDbTableTarget(tableName);
        const stmt = db.prepare(`DELETE FROM ${target.sqlTable} WHERE rowid = ?`);
        stmt.run([rowId]);
        stmt.free();
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'insert_row': {
        if (!db) throw new Error("Database not initialized");
        const { tableName, rowData } = payload;
        const target = getDbTableTarget(tableName);
        const columns = Object.keys(rowData);
        const values = Object.values(rowData);
        const placeholders = values.map(() => '?').join(',');
        const quotedColumns = columns.map(c => `"${c}"`).join(',');

        const sql = `INSERT INTO ${target.sqlTable} (${quotedColumns}) VALUES (${placeholders})`;
        const stmt = db.prepare(sql);
        stmt.run(values);
        stmt.free();
        ctx.postMessage({ id, success: true });
        break;
      }
      case 'drop_table': {
        if (!db) throw new Error("Database not initialized");
        const { tableName } = payload;
        const target = getDbTableTarget(tableName);
        db.run(`DROP TABLE ${target.sqlTable}`);
        ctx.postMessage({ id, success: true });
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    ctx.postMessage({ id, success: false, error: err.message });
  }
};
