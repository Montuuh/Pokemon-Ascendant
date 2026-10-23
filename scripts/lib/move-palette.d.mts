export const MOVE_PALETTE_LIMIT: 20;
export function normaliseMovePalette(input: string | Buffer): Promise<Buffer>;
export function measureMovePaletteChange(input: string | Buffer, output: string | Buffer): Promise<{ mean: number; p95: number; max: number }>;
