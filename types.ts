export interface QueryResult {
  columns: string[];
  values: any[][];
}

export interface TableInfo {
  name: string;
  schema: string;
}

export type ViewMode = 'BROWSE' | 'SQL' | 'AI';

export interface SqlJsStatement {
  run(values?: any[] | object): void;
  free(): boolean;
  step(): boolean;
  get(params?: any[] | object): any[];
  getAsObject(params?: any[] | object): any;
  bind(values?: any[] | object): boolean;
}

// SQL.js types (simplified)
export interface SqlJsDatabase {
  exec(sql: string): { columns: string[]; values: any[][] }[];
  run(sql: string): void;
  prepare(sql: string, params?: any[] | object): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
}

export interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}