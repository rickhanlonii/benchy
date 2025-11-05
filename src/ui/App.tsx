import React, { startTransition, useEffect } from "react";
import { makeStore, StoreProvider } from "../store";
import {
  UseStore_RenderBaseline,
  UseStoreSelector_Derived,
  UseStore_RenderSharedCache,
  UseStore_Compiler,
} from "./Views";
import { resetSelectorCache } from "../expensive";
import { resetSharedCache } from "../sharedCache";
import ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";

type Mode =
  | "render-baseline"
  | "render-shared"
  | "useStoreSelector"
  | "precompute-on-write"
  | "useStore-Compiler";

// ADD at top (under imports)
function makeSliceIds(count: number): string[] {
  // a, b, ..., z, aa, ab, ...
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let n = i;
    let id = "";
    do {
      id = letters[n % 26] + id;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    out.push(id);
  }
  return out;
}

function distribute(subs: number, ids: string[]) {
  return Array.from({ length: subs }, (_, i) => ids[i % ids.length]);
}

let root: ReactDOMClient.Root;
export function App() {
  const [itemsPerSlice, setItemsPerSlice] = React.useState(12_500); // total ~50k
  const [numSubs, setNumSubs] = React.useState(200);
  const [slicesCount, setSlicesCount] = React.useState(4);
  const [numUpdates, setNumUpdates] = React.useState(100);
  const [unmountPct, setUnmountPct] = React.useState(0); // 0..100
  const [mode, setMode] = React.useState<Mode>("render-baseline");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<string>("");

  const sliceIds = React.useMemo(
    () => makeSliceIds(Math.min(slicesCount, numSubs)),
    [slicesCount, numSubs],
  );

  const storeRef = React.useRef(makeStore(itemsPerSlice, sliceIds));
  React.useEffect(() => {
    storeRef.current = makeStore(itemsPerSlice, sliceIds);
  }, [itemsPerSlice, sliceIds]);

  const run = async () => {
    setRunning(true);
    setResult("");
    resetSelectorCache();
    resetSharedCache();
    const store = storeRef.current;
    const mountAt = document.getElementById("mount")!;
    mountAt.innerHTML = "";
    const root = await import("react-dom/client").then((m) =>
      m.createRoot(mountAt),
    );

    flushSync(() => {
      root.render(<div></div>);
    });

    const assignments = distribute(numSubs, sliceIds);
    let resolve = { current: null };
    function renderSubs(visibleCount: number) {
      const Subs = () => (
        <StoreProvider>
          {assignments.slice(0, visibleCount).map((id, i) => {
            if (mode === "render-baseline")
              return (
                <UseStore_RenderBaseline
                  key={i}
                  store={store}
                  id={id}
                  idx={i}
                />
              );
            if (mode === "render-shared")
              return (
                <UseStore_RenderSharedCache
                  key={i}
                  store={store}
                  id={id}
                  idx={i}
                />
              );
            if (mode === "useStoreSelector")
              return (
                <UseStoreSelector_Derived
                  key={i}
                  store={store}
                  id={id}
                  idx={i}
                />
              );
            if (mode === "useStore-Compiler")
              return <UseStore_Compiler key={i} store={store} id={id} />;
            return null;
          })}
        </StoreProvider>
      );
      root.render(<Subs />);
    }

    flushSync(() => {
      renderSubs(numSubs);
    });

    const t0 = performance.now();
    for (let u = 0; u < numUpdates; u++) {
      // Update targeted slice
      const sliceId = sliceIds[u % sliceIds.length];
      const type = mode === "precompute-on-write" ? "tick_precompute" : "tick";
      store.dispatch({ type, sliceId });

      // Simulate "update causes unmount": on odd ticks, unmount fraction; even ticks remount all
      if (unmountPct > 0) {
        if (u % 2 === 1) {
          const keep = Math.max(
            0,
            Math.floor(numSubs * (1 - unmountPct / 100)),
          );
          renderSubs(keep);
        } else {
          renderSubs(numSubs);
        }
      }
    }
    const t1 = performance.now();
    const ms = (t1 - t0).toFixed(1);
    // In the result string:
    setResult(
      `${mode} — ${ms} ms (subs=${numSubs}, slices=${sliceIds.length}, items/slice=${itemsPerSlice}, updates=${numUpdates}, unmount=${unmountPct}%)`,
    );

    setRunning(false);
  };

  return (
    <div>
      <h1>RCS: Selector vs Render Benchmark</h1>
      <div className="row">
        <label>
          Mode:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            disabled={running}
          >
            <option value="render-baseline">useStore (baseline)</option>
            <option value="render-shared">
              useStore + derive in render (global shared cache)
            </option>
            <option value="useStore-Compiler">useStore + compiler</option>
            <option value="useStoreSelector">
              useStoreSelector (shared selector)
            </option>
          </select>
        </label>
        <label>
          Subscribers:{" "}
          <input
            type="number"
            value={numSubs}
            onChange={(e) => setNumSubs(+e.target.value)}
            disabled={running}
          />
        </label>
        <label>
          Items / slice:{" "}
          <input
            type="number"
            value={itemsPerSlice}
            onChange={(e) => setItemsPerSlice(+e.target.value)}
            disabled={running}
          />
        </label>
        <label>
          Slices:
          <input
            type="number"
            min={1}
            max={numSubs}
            value={slicesCount}
            onChange={(e) =>
              setSlicesCount(Math.max(1, Math.min(numSubs, +e.target.value)))
            }
            disabled={running}
          />
        </label>
        <label>
          Updates:{" "}
          <input
            type="number"
            value={numUpdates}
            onChange={(e) => setNumUpdates(+e.target.value)}
            disabled={running}
          />
        </label>
        <label>
          Unmount %:
          <input
            type="number"
            min="0"
            max="100"
            value={unmountPct}
            onChange={(e) =>
              setUnmountPct(Math.max(0, Math.min(100, +e.target.value)))
            }
            disabled={running}
          />
        </label>
        <button onClick={run} disabled={running}>
          {running ? "Running…" : "Run"}
        </button>
      </div>
      <div className="card">
        <div>
          <strong>Result:</strong>{" "}
          {result || <span className="muted">no run yet</span>}
        </div>
        <div className="muted">
          Unmount % alternates: odd ticks unmount that fraction, even ticks
          remount all.
        </div>
      </div>
      <div id="mount" className="card"></div>
    </div>
  );
}
