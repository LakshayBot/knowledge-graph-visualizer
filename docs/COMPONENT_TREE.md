# CasualExplorer — Component Tree

## Phase 1: Interactive Timeline Engine

### New Component Tree

```
ExplorePage (page.tsx)
├── AuthGuard
│   └── ExploreContent
│       ├── GraphBackground (dot pattern + ambient gradients)
│       ├── GraphCanvas (SVG)                       ← MODIFIED: visibility filtering
│       │   ├── <defs> (gradients, markers, filters)
│       │   ├── Edge group
│       │   │   └── <path> per edge                 ← MODIFIED: opacity + draw animation
│       │   └── Node group
│       │       ├── <circle> per node               ← MODIFIED: fade+scale animation
│       │       └── <text> / <foreignObject> labels
│       ├── TimelineBar (NEW)                       ← NEW COMPONENT
│       │   ├── Play/Pause button
│       │   ├── Speed selector (0.5×, 1×, 2×)
│       │   ├── Range slider (min → max year)
│       │   ├── Current year label
│       │   └── Event count indicator
│       ├── NodeDetailPanel (sidebar/bottom-sheet)
│       ├── ProviderModelSelector
│       ├── Command Bar (search input + run button)
│       └── Zoom Controls
```

### New Hooks

```
useTimeline.ts (NEW)
├── Input: GraphNode[], GraphEdge[]
├── State:
│   ├── currentYear: number
│   ├── isPlaying: boolean
│   ├── playbackSpeed: number (0.5 | 1 | 2)
│   ├── yearRange: { min: number; max: number }
│   ├── visibleNodeIds: Set<string>        ← derived
│   └── visibleEdgeIds: Set<string>        ← derived
├── Actions:
│   ├── setYear(year)
│   ├── play()
│   ├── pause()
│   ├── setSpeed(speed)
│   ├── jumpToStart()
│   └── jumpToEnd()
└── Side effects:
    └── Autoplay timer (requestAnimationFrame or setInterval)
```

### Modified Files

| File | Change | Risk |
|------|--------|------|
| `frontend/hooks/useTimeline.ts` | **NEW** — timeline state hook | Low (new file) |
| `frontend/components/explore/TimelineBar.tsx` | **NEW** — timeline UI | Low (new file) |
| `frontend/components/explore/GraphCanvas.tsx` | Accept visibility props, add fade animation | Medium (touches renderer) |
| `frontend/app/(explore)/explore/page.tsx` | Integrate timeline hook + component | Medium (state wiring) |
| `frontend/types/graph.ts` | Add TimelineState type | Low (type only) |

### Unchanged Files (Phase 1)
- `NodeDetailPanel.tsx` — no changes needed
- `SearchBar.tsx` — no changes needed
- `GraphBackground.tsx` — no changes needed
- `useForceLayout.ts` — layout engine unchanged (positions computed normally, visibility handled by canvas)
- All API controllers and backend code — no changes needed (eventDate already exists)
- All Python AI service code — no changes needed

### Design Token Usage
All new components must use the existing CSS variable system:
- `--text-1` (#251913) — primary text
- `--text-2` (#594238) — secondary text
- `--text-3` (#7a5c4f) — muted text
- `--surface` (#ffffff) — backgrounds
- `--border` (rgba(0,0,0,0.06)) — subtle borders
- `--bg-subtle` (#fff1ec) — hover/active states
- 8px spacing grid throughout

### Animation Specifications
- Node fade-in: `opacity 0→1` + `scale 0.8→1` over 300ms, eased
- Edge draw: `stroke-dashoffset` animation over 400ms
- Timeline slider: smooth `transition: left 100ms ease`
- All animations respect `prefers-reduced-motion` (instant transitions)
- Use CSS `@media (prefers-reduced-motion: reduce)` for accessibility
