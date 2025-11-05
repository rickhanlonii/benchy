import React, { useCallback, useMemo } from "react";
import {
  useStore,
  useStoreSelector,
  type State,
  StoreProvider,
} from "../store";
import { expensiveDerive, sharedSelector } from "../expensive";
import { deriveShared } from "../sharedCache";
// @ts-ignore
import { c as _c } from "react/compiler-runtime";

type SlicePick = { id: string; idx: number };

// A) Baseline: useStore + derive in render (per-subscriber compute)
export function UseStore_RenderBaseline({
  store,
  id,
  idx,
}: { store: any } & SlicePick) {
  const s = useStore<State>(store);
  const slice = s.slices[id];
  const value = expensiveDerive(slice.items, slice.predicateKey);
  return (
    <div data-acc={value.acc} className="muted">
      {id} {value.acc}
    </div>
  );
}

// B) Optimized: useStore + deriveShared in render (global cache shared across subs)
export function UseStore_RenderSharedCache({
  store,
  id,
  idx,
}: { store: any } & SlicePick) {
  const s = useStore<State>(store);
  const slice = s.slices[id];
  const value = deriveShared(
    id,
    slice.items,
    slice.version,
    slice.predicateKey,
  );
  return (
    <div data-acc={value.acc} className="muted">
      {id} {value.acc}
    </div>
  );
}

// C) Selector boundary: useStoreSelector + shared selector
export function UseStoreSelector_Derived({
  store,
  id,
  idx,
}: { store: any } & SlicePick) {
  const value = useStoreSelector<any, ReturnType<typeof sharedSelector>>(
    store,
    useCallback((s: State) => {
      const slice = s.slices[id];
      return expensiveDerive(slice.items, slice.predicateKey);
    }, []),
  );
  return (
    <div data-acc={value.acc} className="muted">
      {id} {value.acc}
    </div>
  );
}

// D) Precompute on write: store maintains derived view; read directly

export function UseStore_Compiler(t0: { store: any; id: any }) {
  const $ = _c(6);
  const { store, id } = t0;

  const s = useStore(store);
  // @ts-ignore
  const slice = s.slices[id];
  let t1;
  if ($[0] !== slice.items || $[1] !== slice.predicateKey) {
    t1 = expensiveDerive(slice.items, slice.predicateKey);
    $[0] = slice.items;
    $[1] = slice.predicateKey;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const value = t1;
  let t2;
  if ($[3] !== id || $[4] !== value.acc) {
    t2 = (
      <div data-acc={value.acc} className="muted">
        {id} {value.acc}
      </div>
    );
    $[3] = id;
    $[4] = value.acc;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}
