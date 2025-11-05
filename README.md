
# RCS Selector Benchmark (extended)

Compare four patterns using **react-concurrent-store**:
- **useStore + derive in render (baseline)** — Raw useStore, no selector, no compiler
- **useStore + derive in render (global shared selector)** — useStore with global memoized selector
- **useStoreSelector (shared selector)** — Raw useStoreSelector 
- **Precompute on write** — reducer computes derived view; reads are O(1)

## Run the UI
```bash
npm i
npm run dev
```
