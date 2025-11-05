
import type { Item } from './store'
import { expensiveDerive, type Derived } from './expensive'

let key = { version: -1, predicateKey: -1 }
let val: Derived | null = null

export function deriveShared(items: Item[], version: number, predicateKey: number): Derived {
  if (val && key.version === version && key.predicateKey === predicateKey) return val
  val = expensiveDerive(items, predicateKey)
  key = { version, predicateKey }
  return val
}

export function resetSharedCache() { key = { version: -1, predicateKey: -1 }; val = null }
