# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build (standalone output)
npm start         # Start production server
npm run lint      # ESLint
npx tsc --noEmit  # Type-check without emitting
```

Docker build: `docker build -t merxbit-analytics .` (multi-stage Alpine)

## Architecture

Next.js 16 + React 19 inventory analytics dashboard. Parses Excel files with inventory/sales data, runs FIFO costing, and renders an interactive KPI dashboard.

### Data Flow

```
Excel upload → POST /api/upload → parseExcelFile() → convertirUnidadesVentas()
  → processInventoryFIFO() → calculateMetrics() → JSON response
  → Zustand store → Dashboard renders
```

All processing is server-side in the upload route. No persistent storage — data lives in the client session only.

### Key Directories

- `src/lib/` — Business logic (FIFO engine, Excel parser, metrics calculator, Zustand store)
- `src/app/api/upload/` — Main processing endpoint (POST, accepts .xlsx/.xls)
- `src/components/dashboard/` — Dashboard UI (tables, modals, alerts)
- `src/components/charts/` — Recharts visualizations
- `src/components/ui/` — Reusable UI primitives (Card, Button, FormattedNumber)
- `src/types/index.ts` — All Zod schemas and TypeScript types

### Core Modules

**`fifo-engine.ts`** — FIFOEngine class managing lots (batches) per product:
- `processRecepciones()`: Creates lots, links to purchases for cost (±7 day match). Negative receptions → `processSalida()` as AJUSTE.
- `processVentas()`: Consumes oldest lots first (FIFO). Negative quantities = devoluciones → creates new lot at weighted average cost via `processDevolucion()`.
- `processMermas()`: Shrinkage consumes lots same as sales.
- Key outputs: `getCOGS()`, `getInventoryValue()`, `getShrinkageCost()`, `getState()`.

**`excel-parser.ts`** — Multi-sheet parser with auto-detection:
- Detects sheets by partial name match (case-insensitive) in first 20 rows
- Parses: Productos, Ventas (header+items), Compras, Recepciones, Mermas, Gastos, Retiros
- Date formats: `M/D/YY`, `D Mon, YYYY` (EN/ES months), ISO datetime
- Sales items are grouped by Factura+Fecha+Entidad into Sale records

**`metrics-calculator.ts`** — Generates DashboardMetrics:
- Multi-currency: tracks USD, EUR, CUP Transfer, CUP Cash separately
- `importeCup` is primary metric; USD conversion uses configurable `tasaPromedio` (default 400)
- Breakdowns: porPeriodo (monthly), porEntidad, porProducto, porMedioPago

**`store.ts`** — Zustand store (`useAppStore`):
- Holds NormalizedData, DashboardMetrics, DashboardFilters, loading/error state
- Supports client-side metric recalculation when exchange rate changes

### Unit Conversion

Sales items with UM='Caja' are multiplied by `product.factorCaja`, UM='Pallet' by `product.factorPallet`. Sign is preserved for returns (negative quantities).

### FIFO Warnings

- `SIN_COSTO`: Reception without determinable unit cost
- `STOCK_NEGATIVO`: Sale/shrinkage exceeds available stock

## Conventions

- Path alias: `@/*` maps to `src/*`
- TypeScript strict mode enabled
- Dark theme UI (zinc/emerald color palette with Tailwind CSS 4)
- All monetary display uses `FormattedNumber`/`FormattedCurrency` components
- Spanish-language UI and variable names in business logic
