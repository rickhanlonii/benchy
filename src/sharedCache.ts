import type { Item } from "./store";
import { expensiveDerive, type Derived } from "./expensive";

let cache = new WeakMap<Item[], Map<number, Derived>>();

export function deriveShared(items: Item[], predicateKey: number): Derived {
  let inner = cache.get(items);
  if (!inner) {
    inner = new Map();
    cache.set(items, inner);
  }

  if (inner.has(predicateKey)) {
    return inner.get(predicateKey)!;
  }

  const result = expensiveDerive(items, predicateKey);
  inner.set(predicateKey, result);
  return result;
}
export function resetSharedCache() {
  cache = new WeakMap<Item[], Map<number, Derived>>();
}
