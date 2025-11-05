import type { Item } from "./store";

export type Derived = { acc: number; top: Item[] };

export const CONFIG = {
  DERIVATION_DUPLICATION: 5,
  SORT_LIMIT: 2000,
  TOP: 100,
};

export function expensiveDerive(items: Item[], predicateKey: number): Derived {
  performance.mark(`derive`);
  const pass = predicateKey % 10;
  let out: Item[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.group === pass && it.score & 1) out.push(it);
  }
  out.sort((a, b) => b.score - a.score);

  let acc = 0;
  const n = Math.min(CONFIG.SORT_LIMIT, out.length);
  for (let r = 0; r < CONFIG.DERIVATION_DUPLICATION; r++) {
    for (let i = 0; i < n; i++) {
      acc = (acc ^ ((out[i].score * 1103515245 + 12345) >>> 0)) >>> 0;
    }
  }
  return { acc, top: out.slice(0, CONFIG.TOP) };
}

// Shared cache keyed by (version, predicateKey)
type CacheKey = { version: number; predicateKey: number };
let cacheKey: CacheKey = { version: -1, predicateKey: -1 };
let cacheVal: Derived | null = null;

export function sharedSelector(
  items: Item[],
  version: number,
  predicateKey: number,
): Derived {
  if (
    cacheVal &&
    cacheKey.version === version &&
    cacheKey.predicateKey === predicateKey
  ) {
    return cacheVal;
  }
  cacheVal = expensiveDerive(items, predicateKey);
  cacheKey = { version, predicateKey };
  return cacheVal;
}

export function resetSelectorCache() {
  cacheKey = { version: -1, predicateKey: -1 };
  cacheVal = null;
}
