// ============================================================
// CausalExplorer – Neo4j Initialisation Script
// Run after the database is first started to create constraints,
// indexes, and seed data (US-China trade war causal chain).
//
// Execute from the Neo4j container:
//   docker exec causal-neo4j cypher-shell -u neo4j -p <password> --file /var/lib/neo4j/import/init.cypher
// ============================================================

// ── Idempotency guard ─────────────────────────────────────────────────────────
// All CREATE CONSTRAINT and CREATE INDEX statements are no-ops if the
// constraint/index already exists.

// ── Constraints ───────────────────────────────────────────────────────────────

CREATE CONSTRAINT event_node_id_unique IF NOT EXISTS
  FOR (n:EventNode) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT causal_edge_id_unique IF NOT EXISTS
  FOR (e:CausalEdge) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT causal_chain_id_unique IF NOT EXISTS
  FOR (c:CausalChain) REQUIRE c.id IS UNIQUE;

// ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX event_node_domain IF NOT EXISTS
  FOR (n:EventNode) ON (n.domain);

CREATE INDEX event_node_event_date IF NOT EXISTS
  FOR (n:EventNode) ON (n.eventDate);

CREATE INDEX event_node_is_verified IF NOT EXISTS
  FOR (n:EventNode) ON (n.isVerified);

CREATE INDEX causal_edge_perspective IF NOT EXISTS
  FOR ()-[r:CAUSES]-() ON (r.perspective);

CREATE INDEX causal_edge_relationship_type IF NOT EXISTS
  FOR ()-[r:CAUSES]-() ON (r.relationshipType);

// ── Seed Data: US-China Trade War Causal Chain ───────────────────────────────
// This demonstrates the graph structure and provides working data for
// development and demos. Safe to re-run (MERGE is idempotent).

// Seed EventNodes

MERGE (wto:EventNode {id: '00000000-0000-0000-0000-000000000001'})
ON CREATE SET
  wto.title            = 'China Joins the WTO',
  wto.summary          = 'The People Republic of China formally acceded to the World Trade Organization on 11 December 2001, granting it most-favoured-nation status and permanently normalized trade relations with the United States and other members.',
  wto.eventDate        = date('2001-12-11'),
  wto.domain           = 'Economics',
  wto.perspective      = 'Economic',
  wto.confidenceScore  = 0.98,
  wto.freshnessScore   = 0.75,
  wto.isVerified       = true,
  wto.createdAt        = datetime('2024-01-01T00:00:00Z'),
  wto.updatedAt        = datetime('2024-01-01T00:00:00Z');

MERGE (mfg:EventNode {id: '00000000-0000-0000-0000-000000000002'})
ON CREATE SET
  mfg.title            = 'China Becomes the World Manufacturing Hub',
  mfg.summary          = 'Between 2001 and 2010, China share of global manufacturing output grew from ~7% to ~19%, fuelled by WTO access, low labour costs, and heavy state investment in infrastructure and special economic zones.',
  mfg.eventDate        = date('2010-01-01'),
  mfg.domain           = 'Economics',
  mfg.perspective      = 'Economic',
  mfg.confidenceScore  = 0.95,
  mfg.freshnessScore   = 0.70,
  mfg.isVerified       = true,
  mfg.createdAt        = datetime('2024-01-01T00:00:00Z'),
  mfg.updatedAt        = datetime('2024-01-01T00:00:00Z');

MERGE (deficit:EventNode {id: '00000000-0000-0000-0000-000000000003'})
ON CREATE SET
  deficit.title            = 'US Trade Deficit with China Widens to Record Levels',
  deficit.summary          = 'The US goods trade deficit with China reached $375 billion in 2017, the largest bilateral trade deficit in history, driven by cheap Chinese manufactured exports and US consumer demand.',
  deficit.eventDate        = date('2017-12-31'),
  deficit.domain           = 'Economics',
  deficit.perspective      = 'Economic',
  deficit.confidenceScore  = 0.97,
  deficit.freshnessScore   = 0.65,
  deficit.isVerified       = true,
  deficit.createdAt        = datetime('2024-01-01T00:00:00Z'),
  deficit.updatedAt        = datetime('2024-01-01T00:00:00Z');

MERGE (tariffs:EventNode {id: '00000000-0000-0000-0000-000000000004'})
ON CREATE SET
  tariffs.title            = 'Trump Administration Imposes Section 301 Tariffs on Chinese Goods',
  tariffs.summary          = 'Beginning in July 2018, the US imposed tariffs of 25% on $34 billion of Chinese goods under Section 301 of the Trade Act of 1974, citing unfair trade practices and intellectual property theft.',
  tariffs.eventDate        = date('2018-07-06'),
  tariffs.domain           = 'Economics',
  tariffs.perspective      = 'Political',
  tariffs.confidenceScore  = 0.99,
  tariffs.freshnessScore   = 0.80,
  tariffs.isVerified       = true,
  tariffs.createdAt        = datetime('2024-01-01T00:00:00Z'),
  tariffs.updatedAt        = datetime('2024-01-01T00:00:00Z');

MERGE (retaliation:EventNode {id: '00000000-0000-0000-0000-000000000005'})
ON CREATE SET
  retaliation.title            = 'China Retaliates with Equivalent Tariffs on US Agricultural Exports',
  retaliation.summary          = 'China matched the US Section 301 tariffs by imposing 25% duties on $34 billion of US goods, heavily targeting agricultural products such as soybeans, pork, and fruit, to maximise political pressure on US farm-state senators.',
  retaliation.eventDate        = date('2018-07-06'),
  retaliation.domain           = 'Economics',
  retaliation.perspective      = 'Political',
  retaliation.confidenceScore  = 0.99,
  retaliation.freshnessScore   = 0.80,
  retaliation.isVerified       = true,
  retaliation.createdAt        = datetime('2024-01-01T00:00:00Z'),
  retaliation.updatedAt        = datetime('2024-01-01T00:00:00Z');

MERGE (decoupling:EventNode {id: '00000000-0000-0000-0000-000000000006'})
ON CREATE SET
  decoupling.title            = 'US-China Technology Decoupling Push',
  decoupling.summary          = 'From 2019 onwards, the US escalated trade tensions into a broader technology war: blacklisting Huawei and ZTE, restricting semiconductor exports via the Entity List, and passing the CHIPS Act (2022) to onshore advanced chip manufacturing.',
  decoupling.eventDate        = date('2019-05-16'),
  decoupling.domain           = 'Technology',
  decoupling.perspective      = 'Political',
  decoupling.confidenceScore  = 0.96,
  decoupling.freshnessScore   = 0.85,
  decoupling.isVerified       = true,
  decoupling.createdAt        = datetime('2024-01-01T00:00:00Z'),
  decoupling.updatedAt        = datetime('2024-01-01T00:00:00Z');

// Seed CausalEdges (CAUSES relationships)

MERGE (wto)-[r1:CAUSES {id: '10000000-0000-0000-0000-000000000001'}]->(mfg)
ON CREATE SET
  r1.explanation      = 'WTO accession gave China permanent MFN tariff rates and dispute-settlement rights, triggering a massive influx of foreign direct investment and export-oriented manufacturing.',
  r1.strength         = 0.95,
  r1.relationshipType = 'CAUSES',
  r1.perspective      = 'Economic',
  r1.isContested      = false,
  r1.createdAt        = datetime('2024-01-01T00:00:00Z');

MERGE (mfg)-[r2:CAUSES {id: '10000000-0000-0000-0000-000000000002'}]->(deficit)
ON CREATE SET
  r2.explanation      = 'China manufacturing competitiveness produced a surge of low-cost goods exported to the US, directly expanding the bilateral trade deficit.',
  r2.strength         = 0.88,
  r2.relationshipType = 'CAUSES',
  r2.perspective      = 'Economic',
  r2.isContested      = false,
  r2.createdAt        = datetime('2024-01-01T00:00:00Z');

MERGE (deficit)-[r3:CAUSES {id: '10000000-0000-0000-0000-000000000003'}]->(tariffs)
ON CREATE SET
  r3.explanation      = 'The record trade deficit provided the primary justification for the Section 301 investigation and subsequent tariffs, framed as correcting an imbalance caused by unfair Chinese trade practices.',
  r3.strength         = 0.80,
  r3.relationshipType = 'CAUSES',
  r3.perspective      = 'Political',
  r3.isContested      = true,
  r3.createdAt        = datetime('2024-01-01T00:00:00Z');

MERGE (tariffs)-[r4:CAUSES {id: '10000000-0000-0000-0000-000000000004'}]->(retaliation)
ON CREATE SET
  r4.explanation      = 'China stated policy was to respond symmetrically, dollar-for-dollar, to any US tariff escalation, making retaliation a near-certain consequence.',
  r4.strength         = 0.97,
  r4.relationshipType = 'CAUSES',
  r4.perspective      = 'Political',
  r4.isContested      = false,
  r4.createdAt        = datetime('2024-01-01T00:00:00Z');

MERGE (tariffs)-[r5:CAUSES {id: '10000000-0000-0000-0000-000000000005'}]->(decoupling)
ON CREATE SET
  r5.explanation      = 'The Section 301 action expanded beyond goods tariffs into a broader national security and technology competition framing, leading to entity-list designations and export controls.',
  r5.strength         = 0.75,
  r5.relationshipType = 'ENABLES',
  r5.perspective      = 'Political',
  r5.isContested      = true,
  r5.createdAt        = datetime('2024-01-01T00:00:00Z');

// Seed CausalChain metadata node

MERGE (chain:CausalChain {id: 'c0000000-0000-0000-0000-000000000001'})
ON CREATE SET
  chain.name        = 'US-China Trade War (2001-2022)',
  chain.description = 'From China WTO accession through the 2018 tariff war and into the technology decoupling era.',
  chain.rootEventId = '00000000-0000-0000-0000-000000000001',
  chain.createdAt   = datetime('2024-01-01T00:00:00Z'),
  chain.updatedAt   = datetime('2024-01-01T00:00:00Z');

// Link chain to its root
MERGE (chain)-[:ROOT_EVENT]->(wto);

// ── Done ──────────────────────────────────────────────────────────────────────
RETURN 'Neo4j initialisation complete.' AS message;
