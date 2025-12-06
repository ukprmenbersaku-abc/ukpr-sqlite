export interface QueryResult {
  columns: string[];
  values: any[][];
}

export interface TableInfo {
  name: string;
  schema: string;
}

export type ViewMode = 'BROWSE' | 'SQL' | 'AI';

// SQL.js types (simplified)
export interface SqlJsDatabase {
  exec(sql: string): { columns: string[]; values: any[][] }[];
  run(sql: string): void;
  export(): Uint8Array;
  close(): void;
}

export interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}
