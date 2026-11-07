// Types for scripts/export-to-csv.mjs (used by src/test/exportToCsv.test.ts).
export declare const COLUMNS: string[]
export declare function toRows(file: unknown): Record<string, string | number>[]
export declare function cell(value: unknown): string
export declare function toCsv(file: unknown, options?: { bom?: boolean }): string
export declare function azTime(ms: unknown): string
