
# RCS Selector Benchmark (extended)

Compare four patterns using **react-concurrent-store**:
- **useStore + derive in render (baseline)** — per-subscriber compute
- **useStore + derive in render (global shared cache)** — compute once per update, reused
- **useStoreSelector (shared selector)** — compute once at subscription boundary
- **Precompute on write** — reducer computes derived view; reads are O(1)

## Run the UI
```bash
npm i
npm run dev
```

## Run headless (CLI)
```bash
npm run bench -- --subs 200 --items 50000 --updates 100
```

The CLI prints a table of timings for each mode.
