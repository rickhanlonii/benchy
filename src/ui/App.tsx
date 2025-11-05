import React from "react";
import {
  useStore,
  useStoreSelector,
  type State,
  StoreProvider,
} from "../store";
import { makeStore } from "../store";
import {
  UseStore_RenderBaseline,
  UseStoreSelector_Derived,
  UseStore_RenderSharedCache,
  UseStore_Compiler,
  PrecomputeOnWrite,
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

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

let root: ReactDOMClient.Root;
export function App() {
  const [numItems, setNumItems] = React.useState(50_000);
  const [numSubs, setNumSubs] = React.useState(200);
  const [numUpdates, setNumUpdates] = React.useState(100);
  const [mode, setMode] = React.useState<Mode>("render-baseline");
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<string>("");

  const storeRef = React.useRef(makeStore(numItems));
  React.useEffect(() => {
    storeRef.current = makeStore(numItems);
  }, [numItems]);

  const run = async () => {
    setRunning(true);
    setResult("");
    resetSelectorCache();
    resetSharedCache();

    const store = storeRef.current;
    const mountAt = document.getElementById("mount")!;
    mountAt.innerHTML = "";
    if (root == null) {
      root = ReactDOMClient.createRoot(mountAt);
    }

    flushSync(() => {
      root.render(<div></div>);
    });

    const Subs = () => (
      <StoreProvider>
        {range(numSubs).map((i) => {
          if (mode === "render-baseline")
            return <UseStore_RenderBaseline key={i} store={store} />;
          if (mode === "render-shared")
            return <UseStore_RenderSharedCache key={i} store={store} />;
          if (mode === "useStoreSelector")
            return <UseStoreSelector_Derived key={i} store={store} />;
          if (mode === "useStore-Compiler")
            return <UseStore_Compiler key={i} store={store} />;
          return null;
        })}
      </StoreProvider>
    );

    flushSync(() => {
      root.render(<Subs />);
    });

    const t0 = performance.now();
    for (let u = 0; u < numUpdates; u++) {
      flushSync(() => {
        store.dispatch({ type: "tick" });
      });
    }
    const t1 = performance.now();
    const ms = (t1 - t0).toFixed(1);
    setResult(
      `${mode} — ${ms} ms (subs=${numSubs}, items=${numItems}, updates=${numUpdates})`,
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
          Items:{" "}
          <input
            type="number"
            value={numItems}
            onChange={(e) => setNumItems(+e.target.value)}
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
          Open DevTools Performance to inspect where time goes.
        </div>
      </div>
      <div id="mount" className="card"></div>
      <p className="muted">
        Modes: baseline duplicates compute per subscriber; shared variants
        compute once per update; precompute-on-write moves the work into the
        store reducer.
      </p>
    </div>
  );
}
