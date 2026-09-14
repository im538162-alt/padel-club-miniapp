export function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededRatio(seed: string): number {
  return (hashString(seed) % 1000) / 1000
}

export function pickSeeded<T>(seed: string, items: T[]): T {
  return items[hashString(seed) % items.length]
}
