export function parsePowerShellJson<T>(stdout: string): T | null {
  const trimmed = stdout.trim();

  if (!trimmed) {
    return null;
  }

  return JSON.parse(trimmed) as T;
}

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
