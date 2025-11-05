import { experimental } from "react-concurrent-store";
const {
  useStoreSelector,
  StoreProvider,
  createStore,
  useStore,
  createStoreFromSource,
} = experimental;
import { expensiveDerive, type Derived } from "./expensive";

export type Item = { id: number; score: number; group: number };
export type Slice = {
  items: Item[];
  version: number;
  predicateKey: number;
};
export type State = { slices: Record<string, Slice> };

function makeItems(n: number): Item[] {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = { id: i, score: ((i + 1) * 2654435761) >>> 0, group: i % 10 };
  }
  return arr;
}

function makeSlice(n: number): Slice {
  return {
    items: makeItems(n),
    version: 0,
    predicateKey: 0,
  };
}

export function makeState(nPerSlice: number, ids: string[]): State {
  const slices: Record<string, Slice> = {};
  for (const id of ids) slices[id] = makeSlice(nPerSlice);
  return { slices };
}

export function makeStore(nPerSlice: number, ids: string[]) {
  const reducer = (
    s: State,
    action:
      | { type: "tick"; sliceId: string }
      | { type: "tick_precompute"; sliceId: string }
      | { type: "reset"; nPerSlice: number; ids: string[] },
  ): State => {
    switch (action.type) {
      case "reset":
        return makeState(action.nPerSlice, action.ids);
      case "tick":
      case "tick_precompute": {
        const prev = s.slices[action.sliceId];
        if (!prev) return s;
        const nextItems = prev.items.slice();
        const mut = Math.max(1, (nextItems.length / 1000) | 0);
        for (let k = 0; k < mut; k++) {
          const idx = (prev.version * 9301 + 49297 * k) % nextItems.length;
          const it = nextItems[idx];
          nextItems[idx] = { ...it, score: (it.score ^ prev.version) >>> 0 };
        }
        const version = prev.version + 1;
        const predicateKey = Math.floor(Math.random() * 10) + 1;
        return {
          slices: {
            ...s.slices,
            [action.sliceId]: {
              items: nextItems,
              version,
              predicateKey,
            },
          },
        };
      }
    }
  };
  return createStore(reducer, makeState(nPerSlice, ids));
}

export { useStore, useStoreSelector, StoreProvider };
