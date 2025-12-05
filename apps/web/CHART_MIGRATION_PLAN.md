# PnL Chart Migration Plan: TradingView Lightweight Charts

## Overview

Migrate from custom SVG charts to TradingView Lightweight Charts for better performance, accuracy, and user experience similar to Polymarket.

## Why TradingView Lightweight Charts?

### Performance Benefits

- **Sub-10ms updates** for real-time data
- **Efficient rendering** with Canvas (not SVG)
- **Handles 100K+ data points** smoothly
- **Built-in data sampling** for large datasets
- **GPU-accelerated** rendering

### Features

- ✅ Professional crosshair with time/value display
- ✅ Built-in tooltips and hover interactions
- ✅ Time-based axis (handles dates/times automatically)
- ✅ Multiple series support (realized vs unrealized PnL)
- ✅ Customizable styling (matches your dark theme)
- ✅ Zero baseline support (critical for PnL charts)

## Implementation Strategy

### Phase 1: Install & Setup (1-2 hours)

```bash
cd apps/web
pnpm add lightweight-charts
```

### Phase 2: Create New Component (2-3 hours)

- Create `pnl-chart-lightweight.tsx`
- Migrate data transformation logic
- Implement time-based axis
- Style to match current design (dark theme, neon accents)

### Phase 3: WebSocket Integration (3-4 hours)

- Add WebSocket hook for real-time PnL updates
- Subscribe to position changes
- Update chart in real-time
- Fallback to REST API if WebSocket fails

### Phase 4: Performance Optimizations (1-2 hours)

- Data sampling for large time ranges
- Debounce WebSocket updates
- Implement virtual scrolling if needed

## WebSocket Architecture

### When to Use WebSockets

1. **Real-time Position Updates**

   - When user opens/closes positions
   - When positions are filled
   - When market prices change (affects unrealized PnL)

2. **Live PnL Recalculation**
   - Subscribe to market price updates
   - Recalculate unrealized PnL in real-time
   - Update chart smoothly

### When to Use REST API

1. **Historical Data**

   - Initial chart load
   - Time range changes (24H, 7D, 30D, etc.)
   - Already cached, fast enough

2. **Fallback**
   - If WebSocket connection fails
   - For users with WebSocket blocked

## Data Flow

```
┌─────────────────┐
│   User Action   │
└────────┬────────┘
         │
         ├─► Initial Load: REST API (cached)
         │
         ├─► Time Range Change: REST API (cached)
         │
         └─► Real-time Updates: WebSocket
             │
             ├─► Position Changes
             ├─► Price Updates
             └─► PnL Recalculation
```

## Code Structure

```
apps/web/src/
├── components/
│   ├── pnl-chart-lightweight.tsx    # New component
│   └── pnl-chart.tsx                # Keep old for fallback
├── hooks/
│   ├── use-pnl-websocket.ts        # WebSocket hook
│   └── use-pnl-history.ts          # REST API hook
└── lib/
    └── chart-helpers.ts             # Data transformation utilities
```

## Performance Targets

- **Initial Load**: < 200ms (with cached data)
- **Chart Render**: < 100ms (for 1000 data points)
- **Real-time Update**: < 50ms (WebSocket → chart update)
- **Time Range Switch**: < 300ms (fetch + render)

## Migration Checklist

- [ ] Install `lightweight-charts` package
- [ ] Create new `PnLChartLightweight` component
- [ ] Implement time-based axis
- [ ] Style to match current design
- [ ] Add crosshair and tooltips
- [ ] Implement WebSocket hook
- [ ] Add real-time position updates
- [ ] Add real-time price updates
- [ ] Implement data sampling
- [ ] Add error handling and fallbacks
- [ ] Performance testing
- [ ] Replace old component
- [ ] Remove old component

## Example Implementation

### Basic Setup

```typescript
import { createChart, ColorType } from "lightweight-charts";

const chart = createChart(containerRef.current, {
  layout: {
    background: { type: ColorType.Solid, color: "#0C1224" },
    textColor: "#FFFFFF",
  },
  grid: {
    vertLines: { color: "rgba(255, 255, 255, 0.04)" },
    horzLines: { color: "rgba(255, 255, 255, 0.04)" },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
  },
});

const lineSeries = chart.addLineSeries({
  color: "#10B981",
  lineWidth: 2,
  priceFormat: {
    type: "price",
    precision: 2,
    minMove: 0.01,
  },
});

// Set data
lineSeries.setData(dataPoints);
```

### WebSocket Integration

```typescript
const ws = new WebSocket("wss://api.rekon.gg/ws/pnl");

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Update chart in real-time
  lineSeries.update({
    time: update.timestamp,
    value: update.pnl,
  });
};
```

## Benefits Summary

1. **Performance**: 10-100x faster than custom SVG
2. **Accuracy**: Professional-grade financial charting
3. **UX**: Polymarket-like experience out of the box
4. **Maintainability**: Well-documented, widely used library
5. **Features**: Crosshair, tooltips, time axis built-in
6. **Scalability**: Handles millions of data points

## Next Steps

1. Review and approve this plan
2. Install `lightweight-charts` package
3. Create proof-of-concept component
4. Test performance with real data
5. Implement WebSocket integration
6. Migrate production component
