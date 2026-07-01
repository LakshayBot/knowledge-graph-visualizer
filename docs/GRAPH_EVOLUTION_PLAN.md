# CasualExplorer Graph Evolution Plan

## Vision

CasualExplorer should not feel like a chatbot that happens to draw a graph.

It should feel like an interactive knowledge exploration engine where users discover answers through:

- causality
- timelines
- simulations
- competing theories
- exploration
- hidden insights

Think:

Wikipedia
+
Perplexity
+
Excalidraw
+
Civilization Tech Tree
+
Observable notebooks.

The goal is:

"Users should intentionally choose Graph Mode instead of Chat Mode."

---

# Existing System

Current behavior:

Question
↓

AI generates graph

↓

User explores nodes

↓

Sidebar displays explanation.

Current issue:

The graph feels like a static mind map.

Need:

Transform it into an explorable, living knowledge system.

---

# Technical Principles

1. Features must be additive.
2. Existing graph functionality should not break.
3. All new functionality should support lazy loading.
4. All animations should be optional.
5. State should remain serializable.
6. Every feature should support persistence.

---

# Feature Roadmap

# Phase 1
# Interactive Timeline Engine

## Goal

Turn graphs into stories.

Example:

2000 → Social Media
2008 → Financial Crisis
2016 → Brexit
2020 → Pandemic
2024 → AI-generated misinformation

As users move through time:

- nodes appear
- edges appear
- graph changes

---

## Requirements

### Timeline Slider

Capabilities:

- play
- pause
- seek
- change speed
- jump to year

---

### Graph Animation

Nodes should:

- fade in
- scale in

Edges should:

- draw progressively

---

### Data Model

Node:

```ts
{
    id: string;
    title: string;
    year?: number;
}
```

Edge:

```ts
{
    source: string;
    target: string;
    year?: number;
}
```

---

### Todos

- Build timeline component
- Build playback controls
- Build timeline state
- Build node animation system
- Build edge animation system
- Build year filtering
- Build autoplay mode
- Build playback speed controls

---

# Phase 2
# Causal Strength System

## Goal

Not all relationships are equal.

Some events matter more.

---

## Edge Model

```ts
{
    source: string;
    target: string;
    confidence: number;
    impact: number;
    relationType: string;
}
```

---

## Visual Rules

0-25
Thin gray line.

25-50
Thin orange line.

50-75
Medium orange line.

75-100
Thick dark orange line.

---

## Requirements

- Edge labels
- Edge tooltips
- Confidence badges
- Animated edge highlighting

---

## Todos

- Update database schema
- Update graph model
- Update graph renderer
- Add confidence calculation
- Add edge tooltips
- Add legends

---

# Phase 3
# Counterfactual Simulation Engine

## Goal

Answer:

"What if this never happened?"

---

## Example

Remove:

2008 Financial Crisis

Recalculate:

Political Polarization:
76%
↓

43%

---

## Requirements

User should:

- remove node
- disable node
- compare before/after

---

## Todos

- Build simulation engine
- Build graph recomputation engine
- Add undo
- Add redo
- Add simulation history
- Add comparison view

---

# Phase 4
# Multiple Theory System

## Goal

One question may have many explanations.

---

## Example

Why are democracies polarized?

Theory A
Economics.

Theory B
Social Media.

Theory C
Immigration.

---

## Requirements

Each theory has:

```ts
{
    id: string;
    title: string;
    confidence: number;
    nodes: string[];
}
```

---

## Todos

- Build theory model
- Build theory APIs
- Build theory selector
- Build theory comparison UI
- Build confidence scoring

---

# Phase 5
# Infinite Node Expansion

## Goal

Every node is explorable.

---

## Example

Financial Crisis

↓

Lehman Brothers

↓

Subprime Mortgages

↓

Housing Bubble

---

## Requirements

Nodes may:

- expand
- collapse
- lazy load

---

## Todos

- Build node expansion API
- Build child graph renderer
- Build lazy loading
- Build breadcrumbs
- Build collapse animation

---

# Phase 6
# Documentary Mode

## Goal

Graphs become movies.

---

## Flow

Play

↓

Camera pans

↓

Narration starts

↓

Nodes appear

↓

Next event

---

## Requirements

- play
- pause
- skip
- narration

---

## Todos

- Build cinematic mode
- Build camera animation
- Build auto zoom
- Build speech synthesis
- Build narration engine

---

# Phase 7
# Heatmap Mode

## Goal

See important drivers instantly.

---

## Color Rules

0-25
Green

25-50
Yellow

50-75
Orange

75-100
Red

---

## Requirements

- node coloring
- edge coloring
- legend

---

## Todos

- Build heatmap mode
- Build legends
- Build accessibility support

---

# Phase 8
# Discovery Engine

## Goal

Never let exploration end.

---

## Example

You may also ask:

- Why did Brexit happen?
- Why did the financial crisis happen?
- Could AI worsen polarization?

---

## Todos

- Build recommendation engine
- Build follow-up question generation
- Build recommendation cards

---

# Phase 9
# Knowledge Galaxy

## Goal

Every graph connects.

---

## Example

Polarization

↓

Social Media

↓

Algorithms

↓

AI

---

## Requirements

User should have:

- saved graphs
- connected graphs
- personal knowledge universe

---

## Todos

- Build graph persistence
- Build global graph search
- Build graph relationships
- Build graph explorer

---

# Phase 10
# Hidden Insight Engine

## Goal

Find surprising relationships.

---

## Example

Financial Crisis

↓

Distrust

↓

Conspiracy Theories

↓

Polarization

---

## Requirements

AI should detect:

- hidden chains
- non-obvious connections
- emergent relationships

---

## Todos

- Build insight engine
- Build confidence scoring
- Build insight cards
- Build highlight mode

---

# Phase 11
# Exploration Modes

## Modes

### Explain
Simple graph.

### Research
Deep graph.

### Debate
Competing theories.

### Predict
Future simulation.

---

## Todos

- Build mode selector
- Build graph depth system
- Build prediction engine
- Build mode prompts

---

# Suggested Database Tables

graphs
nodes
edges
timelines
theories
simulations
insights
saved_graphs
graph_relationships
user_graphs

---

# Suggested APIs

GET /graphs/:id

POST /graphs/generate

POST /graphs/expand

POST /graphs/simulate

POST /graphs/theories

POST /graphs/insights

POST /graphs/predict

GET /graphs/timeline

---

# Implementation Rules

1. Create a detailed architecture plan before coding.
2. Do not implement everything at once.
3. Implement phase-by-phase.
4. Every phase must:
   - build successfully
   - pass lint
   - pass type checks
   - not break existing functionality.
5. Create migrations when needed.
6. Add tests.
7. Add documentation.
8. Commit after every completed phase.

---

# Execution Instructions For Claude Code

Step 1:
Read this entire file.

Step 2:
Create:

- ARCHITECTURE.md
- IMPLEMENTATION_PLAN.md
- COMPONENT_TREE.md
- DATABASE_PLAN.md

Step 3:
Present the plan.

Step 4:
After approval, implement features phase-by-phase.

Do not skip planning.

Do not redesign architecture midway.

Do not introduce breaking changes.

sk-proj-REPLACE_WITH_YOUR_OPENAI_KEY