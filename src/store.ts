
import { experimental } from 'react-concurrent-store';
const {useStoreSelector, StoreProvider, createStore, useStore, createStoreFromSource} = experimental;
import { expensiveDerive, type Derived } from './expensive'

export type Item = { id: number; score: number; group: number }
export type State = {
  items: Item[]
  version: number
  predicateKey: number
  // optional slot for precomputed view
  derived?: Derived
}

function makeItems(n: number): Item[] {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = { id: i, score: (i * 2654435761) >>> 0, group: i % 10 };
  }
  return arr;
}

export function makeState(n: number): State {
  return { items: makeItems(n), version: 0, predicateKey: 0, derived: undefined };
}

export function makeStore(n: number) {
  const reducer = (s: State, action: { type: 'tick' } | { type: 'reset', n: number } | { type: 'tick_precompute' }): State => {
    switch (action.type) {
      case 'tick': {
        const next = s.items.slice();
        const mutCount = Math.max(1, (next.length / 1000) | 0);
        for (let k = 0; k < mutCount; k++) {
          const idx = (s.version * 9301 + 49297 * k) % next.length;
          const it = next[idx];
          next[idx] = { ...it, score: (it.score ^ s.version) >>> 0 };
        }
        const version = s.version + 1;
        return { items: next, version, predicateKey: version, derived: undefined };
      }
      case 'tick_precompute': {
        const next = s.items.slice();
        const mutCount = Math.max(1, (next.length / 1000) | 0);
        for (let k = 0; k < mutCount; k++) {
          const idx = (s.version * 9301 + 49297 * k) % next.length;
          const it = next[idx];
          next[idx] = { ...it, score: (it.score ^ s.version) >>> 0 };
        }
        const version = s.version + 1;
        const derived = expensiveDerive(next, version);
        return { items: next, version, predicateKey: version, derived };
      }
      case 'reset': {
        return makeState(action.n);
      }
      default:
        return s;
    }
  };
  const store = createStore(reducer, makeState(n));
  return store;
}

export { useStore, useStoreSelector, StoreProvider }
