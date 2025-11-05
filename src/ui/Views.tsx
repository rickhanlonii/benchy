import React, { useCallback, useMemo } from "react";
import {
  useStore,
  useStoreSelector,
  type State,
  StoreProvider,
} from "../store";
import { expensiveDerive, sharedSelector } from "../expensive";
import { deriveShared } from "../sharedCache";
import { c as _c } from "react/compiler-runtime";

// A) Baseline: useStore + derive in render (per-subscriber compute)
export function UseStore_RenderBaseline({ store }: { store: any }) {
  const s = useStore<State>(store);
  const value = expensiveDerive(s.items, s.predicateKey);
  return (
    <div data-acc={value.acc} className="muted">
      {value.acc}
    </div>
  );
}

// B) Optimized: useStore + deriveShared in render (global cache shared across subs)
export function UseStore_RenderSharedCache({ store }: { store: any }) {
  const s = useStore<State>(store);
  const value = deriveShared(s.items, s.version, s.predicateKey);
  return (
    <div data-acc={value.acc} className="muted">
      {value.acc}
    </div>
  );
}

// C) Selector boundary: useStoreSelector + shared selector
export function UseStoreSelector_Derived({ store }: { store: any }) {
  const value = useStoreSelector<any, ReturnType<typeof sharedSelector>>(
    store,
    useCallback((s: State) => expensiveDerive(s.items, s.predicateKey), []),
  );
  return (
    <div data-acc={value.acc} className="muted">
      {value.acc}
    </div>
  );
}

// D) Precompute on write: store maintains derived view; read directly

export function UseStore_Compiler(t0) {
  const $ = _c(5);
  const { store } = t0;
  const s = useStore(store);
  let t1;
  if ($[0] !== s.items || $[1] !== s.predicateKey) {
    t1 = expensiveDerive(s.items, s.predicateKey);
    $[0] = s.items;
    $[1] = s.predicateKey;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  const value = t1;
  let t2;
  if ($[3] !== value.acc) {
    t2 = (
      <div data-acc={value.acc} className="muted">
        {value.acc}
      </div>
    );
    $[3] = value.acc;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}
