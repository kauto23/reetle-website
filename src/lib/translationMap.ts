/**
 * Resolves UI copy from API translation maps only — no fallbacks to raw
 * article/topic field values or static English.
 */
export function labelFromMap(
  map: Record<string, string> | undefined,
  key: string | null | undefined
): string | null {
  if (!map || key == null || key === '') return null;
  const v = map[key] ?? map[key.toLowerCase()];
  if (typeof v !== 'string' || !v.trim()) return null;
  return v;
}
