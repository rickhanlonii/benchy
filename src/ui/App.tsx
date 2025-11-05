import React, { startTransition, useEffect } from "react";
import { makeStore, StoreProvider } from "../store";
import {
  UseStore_RenderBaseline,
  UseStoreSelector_Raw,
  UseStore_RenderSharedCache,
  UseStore_Compiler_Raw,
  UseStore_Compiler_Shared,
  UseStoreSelector_Shared,
} from "./Views";
import { resetSelectorCache } from "../expensive";
import { resetSharedCache } from "../sharedCache";
import ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";

const MODES = [
  "useStore-raw",
  "useStore-shared",
  "useStoreSelector-raw",
  "useStoreSelector-shared",
  "useStore-compiler-raw",
  "useStore-compiler-shared",
] as const;
type Mode = (typeof MODES)[number];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, parseInt(n)));
}
function readNum(
  p: URLSearchParams,
  k: string,
  d: number,
  min = 1,
  max = 1_000_000,
) {
  const v = Number(p.get(k));
  return Number.isFinite(v) ? clamp(v, min, max) : d;
}
function readMode(p: URLSearchParams, d: Mode): Mode {
  const m = p.get("mode") as Mode | null;
  return m && (MODES as readonly string[]).includes(m) ? m : d;
}

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

let root: ReactDOMClient.Root | null;
export function App() {
  const p = new URLSearchParams(window.location.search);
  const initSubs = readNum(p, "subs", 200, 1);
  const initItemsPer = readNum(p, "itemsPerSlice", 12_500, 1);
  const initUpdates = readNum(p, "updates", 100, 1);
  const initUnmount = readNum(p, "unmount", 0, 0, 100);
  const initSlicesCount = readNum(p, "slices", 4, 1);
  const initMode = readMode(p, MODES[0]);
  // useState with URL defaults
  const [numSubs, setNumSubs] = React.useState(initSubs);
  const [itemsPerSlice, setItemsPerSlice] = React.useState(initItemsPer);
  const [numUpdates, setNumUpdates] = React.useState(initUpdates);
  const [unmountPct, setUnmountPct] = React.useState(initUnmount);
  const [slicesCount, setSlicesCount] = React.useState(initSlicesCount);
  const [mode, setMode] = React.useState<Mode>(initMode);

  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<string>("");

  const sliceIds = React.useMemo(
    () => makeSliceIds(Math.min(slicesCount, numSubs)),
    [slicesCount, numSubs],
  );

  // small debounce to avoid spamming history on rapid typing
  const urlWriteTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("subs", String(numSubs));
    params.set("itemsPerSlice", String(itemsPerSlice));
    params.set("updates", String(numUpdates));
    params.set("unmount", String(unmountPct));
    params.set("slices", String(slicesCount));
    params.set("mode", mode);

    if (urlWriteTimer.current) window.clearTimeout(urlWriteTimer.current);
    urlWriteTimer.current = window.setTimeout(() => {
      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", url);
    }, 150);

    return () => {
      if (urlWriteTimer.current) window.clearTimeout(urlWriteTimer.current);
    };
  }, [numSubs, itemsPerSlice, numUpdates, unmountPct, slicesCount, mode]);

  const run = async () => {
    setRunning(true);
    setResult("");
    resetSelectorCache();
    resetSharedCache();
    const store = makeStore(itemsPerSlice, sliceIds);

    if (root != null) {
      flushSync(() => {
        // @ts-ignore
        root.unmount();
      });

      document.getElementById("mount")?.remove();
      const newDiv = document.createElement("div");
      newDiv.id = "mount";
      newDiv.className = "card";
      document.body.appendChild(newDiv);
    }

    const mountAt = document.getElementById("mount")!;
    root = ReactDOMClient.createRoot(mountAt);

    const assignments = distribute(numSubs, sliceIds);
    function renderSubs(visibleCount: number) {
      const Subs = () => (
        <StoreProvider>
          {assignments.slice(0, visibleCount).map((id, i) => {
            if (mode === "useStore-raw")
              return (
                <UseStore_RenderBaseline
                  key={i}
                  store={store}
                  id={id}
                  idx={i}
                />
              );
            if (mode === "useStore-shared")
              return (
                <UseStore_RenderSharedCache
                  key={i}
                  store={store}
                  id={id}
                  idx={i}
                />
              );
            if (mode === "useStoreSelector-raw")
              return (
                <UseStoreSelector_Raw key={i} store={store} id={id} idx={i} />
              );
            if (mode === "useStoreSelector-shared")
              return (
                <UseStoreSelector_Shared
                  key={i}
                  store={store}
                  id={id}
                  idx={i}
                />
              );
            if (mode === "useStore-compiler-raw")
              return <UseStore_Compiler_Raw key={i} store={store} id={id} />;
            if (mode === "useStore-compiler-shared")
              return <UseStore_Compiler_Shared key={i} store={store} id={id} />;
            return <div>Error: invalid mode {mode}</div>;
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
      flushSync(() => {
        // Update targeted slice
        const randomSliceId = Math.floor(Math.random() * 17) % sliceIds.length;
        const sliceId = sliceIds[randomSliceId];
        store.dispatch({ type: "tick", sliceId });

        // Simulate "update causes unmount": on odd ticks, unmount fraction; even ticks remount all
        if (unmountPct > 0) {
          const keep = Math.max(
            0,
            Math.floor(numSubs * (1 - unmountPct / 100)),
          );
          renderSubs(keep);
        }
      });
    }

    const t1 = performance.now();
    performance.measure("Result", {
      start: t0,
      end: t1,
    });
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
            <option value="useStore-raw">useStore (baseline)</option>
            <option value="useStore-shared">useStore (baseline cached)</option>
            <option value="useStoreSelector-raw">
              useStoreSelector (no cache)
            </option>
            <option value="useStoreSelector-shared">
              useStoreSelector (cached)
            </option>
            <option value="useStore-compiler-raw">
              useStore + Compiler (no cache)
            </option>
            <option value="useStore-compiler-shared">
              useStore + Compiler (cached)
            </option>
          </select>
        </label>
        <label>
          Subscribers:{" "}
          <input
            type="number"
            value={numSubs}
            onChange={(e) => setNumSubs(parseInt(e.target.value))}
            disabled={running}
          />
        </label>
        <label>
          Items / slice:{" "}
          <input
            type="number"
            value={itemsPerSlice}
            onChange={(e) => setItemsPerSlice(parseInt(e.target.value))}
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
              setSlicesCount(
                Math.max(1, Math.min(numSubs, parseInt(e.target.value))),
              )
            }
            disabled={running}
          />
        </label>
        <label>
          Updates:{" "}
          <input
            type="number"
            value={numUpdates}
            onChange={(e) => setNumUpdates(parseInt(e.target.value))}
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
              setUnmountPct(
                Math.max(0, Math.min(100, parseInt(e.target.value))),
              )
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
