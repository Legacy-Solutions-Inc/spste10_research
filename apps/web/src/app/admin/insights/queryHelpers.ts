type QueryResult = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;

/** PostgREST caps responses (1,000 rows by default), so page through until a short page. */
const PAGE_SIZE = 1000;

/** Keeps `.in(...)` filters and storage batches well under request size limits. */
export const ID_CHUNK = 100;

/** `page` must apply a stable order and `.range(from, to)`. */
export async function fetchAllRows<T>(page: (from: number, to: number) => QueryResult): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

export function chunk<T>(items: T[], size: number = ID_CHUNK): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
