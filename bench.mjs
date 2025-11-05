
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { makeStore } from './src/store.ts'
import { expensiveDerive } from './src/expensive.ts'

const argv = yargs(hideBin(process.argv))
  .option('subs', { type: 'number', default: 200 })
  .option('items', { type: 'number', default: 50000 })
  .option('updates', { type: 'number', default: 100 })
  .parseSync()

const { subs, items, updates } = argv

function deriveSharedFactory() {
  let key = { version: -1, predicateKey: -1 }
  let val = null
  return (items, version, predicateKey) => {
    if (val && key.version === version && key.predicateKey === predicateKey) return val
    val = expensiveDerive(items, predicateKey)
    key = { version, predicateKey }
    return val
  }
}

function bench(mode) {
  const store = makeStore(items)
  const deriveShared = deriveSharedFactory()

  const t0 = performance.now()
  for (let u = 0; u < updates; u++) {
    if (mode === 'precompute') {
      store.update({ type: 'tick_precompute' })
    } else {
      store.update({ type: 'tick' })
    }
    const s = store.getState()
    if (mode === 'render-baseline') {
      // each subscriber recomputes
      for (let i = 0; i < subs; i++) {
        expensiveDerive(s.items, s.predicateKey)
      }
    } else if (mode === 'render-shared') {
      for (let i = 0; i < subs; i++) {
        deriveShared(s.items, s.version, s.predicateKey)
      }
    } else if (mode === 'selector') {
      // one compute reused (models useStoreSelector boundary)
      deriveShared(s.items, s.version, s.predicateKey)
      for (let i = 1; i < subs; i++) {
        // cache hit
        deriveShared(s.items, s.version, s.predicateKey)
      }
    } else if (mode === 'precompute') {
      // already computed in reducer; simulate reads
      for (let i = 0; i < subs; i++) {
        if (!store.getState().derived) throw new Error('derived missing')
      }
    }
  }
  const t1 = performance.now()
  return t1 - t0
}

const modes = ['render-baseline', 'render-shared', 'selector', 'precompute']
const results = {}
for (const m of modes) {
  results[m] = bench(m)
}
const pretty = ms => ms.toFixed(1) + ' ms'
console.table({
  'useStore + render (baseline)': pretty(results['render-baseline']),
  'useStore + render (shared)': pretty(results['render-shared']),
  'useStoreSelector (shared)': pretty(results['selector']),
  'Precompute on write': pretty(results['precompute']),
})
