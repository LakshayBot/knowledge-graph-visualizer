# Graph Evolution — Implementation Plan

## Phase 1: Interactive Timeline Engine

### Goal
Turn static knowledge graphs into animated stories. As users navigate through time, nodes appear, edges form, and the graph evolves to show the causal chain unfolding chronologically.

### Success Criteria
- User can see a timeline scrubber below or beside the graph
- Dragging the timeline updates which nodes/edges are visible
- Autoplay mode animates the graph from earliest to latest event
- Playback speed is adjustable (0.5×, 1×, 2×)
- Existing graph generation and expansion still works
- Timeline state is serializable and saved with the chain

### Implementation Steps

#### Step 1.1: Timeline State Management
**Files to create:**
- `frontend/hooks/useTimeline.ts` — timeline state hook

**Approach:**
- Extract all unique years from graph nodes' `eventDate` field
- Maintain state: `currentYear`, `isPlaying`, `playbackSpeed`, `yearRange {min, max}`
- Derive `visibleNodeIds` and `visibleEdgeIds` from `currentYear`
- A node is visible if `eventDate.year <= currentYear`
- An edge is visible only if BOTH its endpoints are visible

#### Step 1.2: Timeline UI Component
**Files to create:**
- `frontend/components/explore/TimelineBar.tsx` — the timeline slider component

**Design:**
- Horizontal bar positioned below the graph canvas
- Range slider (min year → max year)
- Current year indicator with label
- Play/Pause button with speed selector
- Jump to start/end buttons
- Show count of visible nodes: "8 of 14 events"

**Styling:**
- Match existing dashboard design tokens (warm tones)
- Semi-transparent background, rounded corners
- 8px spacing system throughout
- Smooth transitions on slider movement

#### Step 1.3: Graph Canvas Animation
**Files to modify:**
- `frontend/components/explore/GraphCanvas.tsx`

**Changes:**
- Accept new props: `visibleNodeIds: Set<string>`, `visibleEdgeIds: Set<string>`, `animating: boolean`
- Nodes outside visible set: render with `opacity: 0` (skip rendering entirely for performance)
- Nodes entering visible set: fade-in + scale-in animation (CSS transition, ~300ms)
- Edges entering visible set: stroke-dasharray draw animation (CSS)
- Add `will-change: opacity, transform` to animated elements

#### Step 1.4: Integration into Explore Page
**Files to modify:**
- `frontend/app/(explore)/explore/page.tsx`

**Changes:**
- Import and use `useTimeline` hook
- Pass `visibleNodeIds` and `visibleEdgeIds` to `GraphCanvas`
- Render `TimelineBar` component below the graph
- Wire up autoplay timer with `setInterval` / `useEffect`
- Ensure existing expand/search flows coexist with timeline

#### Step 1.5: Persistence
**Files to modify:**
- `frontend/types/graph.ts` — add `TimelineState` interface
- `frontend/app/(explore)/explore/page.tsx` — save/restore timeline state

**Approach:**
- Add `timelineState` to the saved chain data (stored in `localStorage` or returned from API)
- When loading a saved chain, restore timeline position

### Validation Checklist
- [ ] `npx next build` compiles with 0 errors
- [ ] TypeScript passes with 0 errors
- [ ] Existing graph generation works (no regression)
- [ ] Node expansion works with timeline filtering
- [ ] Chain save/load works with timeline state
- [ ] Timeline slider is keyboard accessible
- [ ] Autoplay respects `prefers-reduced-motion`
- [ ] Performance: 100+ nodes timeline filtering is < 16ms

---

## Phase 2: Causal Strength System
*(Detailed plan to be written after Phase 1 completion)*

Key deliverables:
- Edge thickness/color by confidence score
- Edge labels with relationship type
- Edge tooltips showing explanation
- Visual legend for strength levels
- Database: add confidence/impact columns if needed

---

## Phase 3: Counterfactual Simulation Engine
*(Detailed plan to be written after Phase 2 completion)*

Key deliverables:
- Node removal/disablement UI
- Graph recomputation after node removal
- Before/after comparison view
- Undo/redo stack
- Simulation history persistence

---

## Phases 4-11
*(Detailed plans deferred per implementation rule #2) *

See `GRAPH_EVOLUTION_PLAN.md` for the full roadmap.

---

## Implementation Rules (from GRAPH_EVOLUTION_PLAN.md)

1. Create a detailed architecture plan before coding ✅ (this document)
2. Do not implement everything at once
3. Implement phase-by-phase
4. Every phase must:
   - Build successfully
   - Pass lint
   - Pass type checks
   - Not break existing functionality
5. Create migrations when needed
6. Add tests
7. Add documentation
8. Commit after every completed phase
