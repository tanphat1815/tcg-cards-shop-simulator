# DOCUMENT 09: LOCAL DATABASE INTEGRATION (SQLITE & WEB WORKER)

**Role**: Principal Software Architect & Database Expert
**Status**: Implementation Blueprint
**Goal**: Transition from Online API to Local SQLite for Offline-First Capability and Ultra-High Performance.

---

## 1. Technical Philosophy
To achieve absolute performance and 0ms latency in card data retrieval, we move the entire TCGdex dataset into the browser's local memory using a high-performance SQLite engine via WebAssembly. By delegating all data processing to a dedicated Web Worker, we ensure the UI remains smooth (60 FPS) even during complex randomized queries.

---

## 2. Infrastructure Overview

### A. Data Preparation (Cold Path)
- **Tool**: Node.js Build Script (`scripts/build-db.js`)
- **Source**: `F:\Phatnt-sources\Pokemon\cards-database` (TS/JSON source files)
- **Output**: `public/data/cards.sqlite`
- **Schema**: 
    - `sets`: Info about expansions (id, name, logo, symbol).
    - `cards`: Detailed card data (id, name, rarity, hp, attacks, etc.).
    - `series`: High-level groups (id, name, logo).
- **Indexes**: Mandatory index on `cards.setId`, `cards.rarity`, and `cards.category`.

### B. Database Runtime (Hot Path)
- **Engine**: `sql.js` (SQLite for WebAssembly)
- **Lifecycle**:
    1. At app startup, `DBService` spawns `dbWorker.ts`.
    2. Worker fetches `cards.sqlite` as a static asset.
    3. Worker initializes the DB in memory.
    4. Main Thread sends queries => Worker executes => Result sent back via Promise.

---

## 3. Storage & Image Strategy (Hybrid)
- **Data**: 100% Offline (SQLite file bundled in the build).
- **Images**: Remote Lazy Loading (Online-only assets to keep the executable small).
- **Caching**: Potential future upgrade to use Cache API for images.

---

## 4. Implementation phases

### Phase 1: Data Aggregation & SQLite Generation
- Construction of the `build-db.js` script.
- Consolidation of language datasets.
- Schema verification.

### Phase 2: Web Worker & Bridge Implementation
- Setup of `sql.js` in Vite.
- Development of the Worker communication protocol.
- Promise-based wrapper for the UI thread.

### Phase 3: Pinia Transition
- Refactoring `apiStore.ts` to consume the local DB.
- Updating gacha logic to use randomized SQL operations.
- UI Polish (Skeleton states during DB initialization).

---

## 5. Hard Rules for Performance
1. **Never** run SQL queries on the Main Thread.
2. **Always** use parameterized queries to prevent injection (not that security is a huge concern for local data, but it's best practice).
3. **Lazy Load** the SQLite file only when needed (optional, or at startup).
4. **Index** every column used in `WHERE`, `ORDER BY`, or `JOIN` clauses.
