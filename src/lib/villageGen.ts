// ---------------------------------------------------------------------------
// Village Procedural Generator
// Generates a full village with zones, villagers, and social network
// ---------------------------------------------------------------------------

import {
  VillageArchetype, VillageZoneType, VillagePersonality,
  VillageVillager, VillageZone, VillageConfig, RelType,
} from './villageTypes';
import { SocialGraph } from './villageSim';

// ── Name pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aldric','Bran','Cedric','Doran','Edric','Finn','Gareth','Hugh','Ivor',
  'Jasper','Kendric','Leif','Magnus','Nils','Osric','Piers','Rowan','Soren',
  'Thane','Ulric','Vance','Wren','Yorick','Zane','Kael','Torin','Rolf',
  'Ada','Bria','Calla','Dara','Elara','Fern','Greta','Hana','Ivy',
  'Kira','Luna','Mira','Neva','Opal','Rhea','Sage','Tara','Una',
  'Vera','Wynn','Xara','Yara','Zara','Lyra','Orla','Eira','Maren',
  'Silas','Bram','Colt','Dex','Eamon','Flint','Gil','Hal','Jem',
  'Knox','Lars','Moss','Nash','Otto','Penn','Reed','Shaw','Tuck',
  'Wade','Axel','Bryn','Cade','Dale','Eli','Fox','Gage','Hart',
  'Isla','Joss','Kit','Lark','Neve','Pip','Ren','Sol','Tess','Val','Willa',
];

const LAST_NAMES = [
  'Ashford','Briar','Cooper','Drake','Elder','Frost','Grove','Hollow',
  'Ironwood','Keen','Lark','Moss','North','Oakley','Pine','Reed',
  'Stone','Thorn','Vale','Wold','Yew','Archer','Baker','Carter',
  'Dyer','Fisher','Harper','Mason','Miller','Potter','Sawyer',
  'Smith','Tanner','Thatcher','Turner','Walker','Weaver','Wright',
  'Barrow','Cliff','Dale','Field','Glenn','Heath','Hill','Lake',
  'Marsh','Pond','Ridge','Shore','Stream','Brook','Croft','Forge',
  'Haven','Mead','Wick','Warden',
];

// ── Archetype personality defaults (center ± 0.15 noise) ────────────────────

const ARCHETYPE_TRAITS: Record<VillageArchetype, VillagePersonality> = {
  farmer:    { aggression: 0.20, cooperation: 0.70, riskTolerance: 0.30, rationality: 0.50, patience: 0.80 },
  merchant:  { aggression: 0.30, cooperation: 0.50, riskTolerance: 0.60, rationality: 0.70, patience: 0.50 },
  craftsman: { aggression: 0.20, cooperation: 0.60, riskTolerance: 0.40, rationality: 0.60, patience: 0.70 },
  elder:     { aggression: 0.10, cooperation: 0.80, riskTolerance: 0.20, rationality: 0.80, patience: 0.90 },
  guard:     { aggression: 0.60, cooperation: 0.50, riskTolerance: 0.50, rationality: 0.50, patience: 0.40 },
  healer:    { aggression: 0.10, cooperation: 0.90, riskTolerance: 0.30, rationality: 0.60, patience: 0.80 },
  scholar:   { aggression: 0.10, cooperation: 0.60, riskTolerance: 0.40, rationality: 0.90, patience: 0.70 },
  laborer:   { aggression: 0.30, cooperation: 0.60, riskTolerance: 0.40, rationality: 0.40, patience: 0.50 },
  noble:     { aggression: 0.40, cooperation: 0.40, riskTolerance: 0.50, rationality: 0.60, patience: 0.50 },
  outcast:   { aggression: 0.50, cooperation: 0.20, riskTolerance: 0.70, rationality: 0.50, patience: 0.30 },
};

// ── Zone type -> archetype weights ──────────────────────────────────────────

const ZONE_ARCHETYPE_WEIGHTS: Record<VillageZoneType, Partial<Record<VillageArchetype, number>>> = {
  farmland:    { farmer: 60, laborer: 25, guard: 5, merchant: 5, elder: 5 },
  market:      { merchant: 50, craftsman: 20, laborer: 15, guard: 5, noble: 5, scholar: 5 },
  workshop:    { craftsman: 50, laborer: 30, merchant: 10, scholar: 5, guard: 5 },
  temple:      { healer: 35, scholar: 30, elder: 25, laborer: 10 },
  barracks:    { guard: 60, laborer: 20, craftsman: 10, noble: 5, outcast: 5 },
  manor:       { noble: 40, guard: 20, merchant: 15, scholar: 15, elder: 10 },
  residential: { laborer: 25, merchant: 15, craftsman: 15, farmer: 15, guard: 10, healer: 5, elder: 5, scholar: 5, noble: 3, outcast: 2 },
  outskirts:   { outcast: 30, farmer: 25, laborer: 25, guard: 10, craftsman: 10 },
};

// ── Zone layout template ────────────────────────────────────────────────────

const ZONE_TEMPLATES: { type: VillageZoneType; namePrefix: string; popShare: number }[] = [
  { type: 'farmland',    namePrefix: 'North Fields',  popShare: 0.10 },
  { type: 'farmland',    namePrefix: 'South Fields',  popShare: 0.10 },
  { type: 'farmland',    namePrefix: 'East Meadow',   popShare: 0.08 },
  { type: 'residential', namePrefix: 'Old Quarter',   popShare: 0.10 },
  { type: 'residential', namePrefix: 'New Quarter',   popShare: 0.10 },
  { type: 'market',      namePrefix: 'Market Square',  popShare: 0.10 },
  { type: 'workshop',    namePrefix: 'Craft District', popShare: 0.08 },
  { type: 'temple',      namePrefix: 'Temple Hill',    popShare: 0.06 },
  { type: 'barracks',    namePrefix: 'Guard Post',     popShare: 0.08 },
  { type: 'manor',       namePrefix: 'Lord\'s Manor',  popShare: 0.05 },
  { type: 'outskirts',   namePrefix: 'The Outskirts',  popShare: 0.07 },
  { type: 'residential', namePrefix: 'River Ward',     popShare: 0.08 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function noise(center: number, spread: number): number {
  return clamp(center + (Math.random() - 0.5) * 2 * spread, 0, 1);
}

function weightedPick<T extends string>(weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// ── Generators ──────────────────────────────────────────────────────────────

function generateName(usedNames: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  // Fallback: append number
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${Math.floor(Math.random() * 100)}`;
  usedNames.add(name);
  return name;
}

export function generateZones(config: VillageConfig): VillageZone[] {
  const count = Math.min(config.zoneCount, ZONE_TEMPLATES.length);
  const templates = ZONE_TEMPLATES.slice(0, count);

  // Normalize population shares
  const totalShare = templates.reduce((s, t) => s + t.popShare, 0);

  // Arrange in a rough grid/circle
  const cols = Math.ceil(Math.sqrt(count));
  const zones: VillageZone[] = templates.map((t, i) => {
    const pop = Math.round((t.popShare / totalShare) * config.populationSize);
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      id: `zone-${i}`,
      name: t.namePrefix,
      type: t.type,
      capacity: Math.ceil(pop * 1.4),
      food: t.type === 'farmland' ? pop * 5 : pop * 2,
      wealth: t.type === 'market' ? pop * 3 : t.type === 'manor' ? pop * 4 : pop,
      infrastructure: t.type === 'manor' ? 80 : t.type === 'workshop' ? 70 : t.type === 'barracks' ? 65 : 50,
      safety: t.type === 'barracks' ? 85 : t.type === 'manor' ? 75 : t.type === 'outskirts' ? 30 : 55,
      x: col,
      y: row,
    };
  });

  return zones;
}

export function generateVillagers(config: VillageConfig, zones: VillageZone[]): VillageVillager[] {
  const usedNames = new Set<string>();
  const villagers: VillageVillager[] = [];

  // Calculate population per zone
  const totalShare = ZONE_TEMPLATES.slice(0, zones.length).reduce((s, t) => s + t.popShare, 0);
  const zonePops: number[] = zones.map((_, i) => {
    const template = ZONE_TEMPLATES[i];
    return Math.round((template.popShare / totalShare) * config.populationSize);
  });

  // Adjust last zone to hit exact population
  const assigned = zonePops.reduce((s, n) => s + n, 0);
  zonePops[zonePops.length - 1] += config.populationSize - assigned;

  for (let zi = 0; zi < zones.length; zi++) {
    const zone = zones[zi];
    const pop = zonePops[zi];
    const weights = ZONE_ARCHETYPE_WEIGHTS[zone.type];

    for (let j = 0; j < pop; j++) {
      const archetype = weightedPick<VillageArchetype>(weights);
      const base = ARCHETYPE_TRAITS[archetype];
      const personality: VillagePersonality = {
        aggression: noise(base.aggression + config.conflictTendency * 0.15, 0.15),
        cooperation: noise(base.cooperation, 0.15),
        riskTolerance: noise(base.riskTolerance, 0.15),
        rationality: noise(base.rationality, 0.15),
        patience: noise(base.patience, 0.15),
      };

      villagers.push({
        id: `v-${villagers.length}`,
        name: generateName(usedNames),
        archetype,
        zoneId: zone.id,
        personality,
        health: 70 + Math.random() * 30,
        mood: 50 + Math.random() * 30,
        wealth: archetype === 'noble' ? 80 + Math.random() * 40
              : archetype === 'merchant' ? 40 + Math.random() * 30
              : 10 + Math.random() * 25,
        status: 'active',
      });
    }
  }

  return villagers;
}

export function generateSocialNetwork(
  villagers: VillageVillager[],
  zones: VillageZone[],
  config: VillageConfig,
): SocialGraph {
  const graph = new SocialGraph();

  // Index villagers by zone for fast lookup
  const byZone = new Map<string, VillageVillager[]>();
  for (const v of villagers) {
    if (!byZone.has(v.zoneId)) byZone.set(v.zoneId, []);
    byZone.get(v.zoneId)!.push(v);
  }

  // Build zone adjacency (zones at manhattan distance <= 1 in grid)
  const zoneAdj = new Map<string, string[]>();
  for (const z of zones) {
    const neighbors: string[] = [];
    for (const z2 of zones) {
      if (z2.id === z.id) continue;
      if (Math.abs(z.x - z2.x) + Math.abs(z.y - z2.y) <= 2) {
        neighbors.push(z2.id);
      }
    }
    zoneAdj.set(z.id, neighbors);
  }

  // For each villager, create connections
  const targetConnections = config.connectionsPerPerson;

  for (const v of villagers) {
    const existing = graph.getNeighbors(v.id);
    const needed = targetConnections - existing.size;
    if (needed <= 0) continue;

    const zonemates = (byZone.get(v.zoneId) || []).filter(
      m => m.id !== v.id && !existing.has(m.id)
    );
    const adjZoneIds = zoneAdj.get(v.zoneId) || [];

    // ~70% same-zone connections, ~30% cross-zone
    const inZoneCount = Math.ceil(needed * 0.7);
    const crossZoneCount = needed - inZoneCount;

    // Same-zone connections
    const shuffledZonemates = zonemates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(inZoneCount, shuffledZonemates.length); i++) {
      const target = shuffledZonemates[i];
      const sameName = v.name.split(' ')[1] === target.name.split(' ')[1];
      const type: RelType = sameName ? 'family'
        : (v.archetype === 'merchant' || target.archetype === 'merchant') ? 'trade'
        : (v.archetype === 'outcast' || target.archetype === 'outcast') ? 'rival'
        : Math.random() < 0.15 ? 'rival'
        : 'friend';
      const strength = type === 'family' ? 0.5 + Math.random() * 0.4
        : type === 'rival' ? -(0.1 + Math.random() * 0.5)
        : type === 'trade' ? 0.2 + Math.random() * 0.4
        : 0.2 + Math.random() * 0.5;
      graph.addEdge(v.id, target.id, strength, type);
    }

    // Cross-zone connections
    if (adjZoneIds.length > 0) {
      for (let i = 0; i < crossZoneCount; i++) {
        const adjZone = pick(adjZoneIds);
        const pool = (byZone.get(adjZone) || []).filter(m => !graph.getNeighbors(v.id).has(m.id));
        if (pool.length === 0) continue;
        const target = pick(pool);
        const type: RelType = (v.archetype === 'merchant' || target.archetype === 'merchant') ? 'trade' : 'neutral';
        const strength = 0.1 + Math.random() * 0.3;
        graph.addEdge(v.id, target.id, strength, type);
      }
    }
  }

  return graph;
}

export function generateVillage(config: VillageConfig): {
  zones: VillageZone[];
  villagers: VillageVillager[];
  graph: SocialGraph;
} {
  const zones = generateZones(config);
  const villagers = generateVillagers(config, zones);
  const graph = generateSocialNetwork(villagers, zones, config);
  return { zones, villagers, graph };
}
