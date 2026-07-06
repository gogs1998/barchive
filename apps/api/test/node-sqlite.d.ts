// Minimal ambient types for Node builtins used only in tests (no @types/node dep).
declare module "node:module" {
  export function createRequire(path: string): (id: string) => unknown;
}
interface ImportMeta {
  url: string;
}
declare module "node:sqlite" {
  interface StatementSync {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
