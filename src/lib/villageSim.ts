// ---------------------------------------------------------------------------
// Village Simulation Engine
// O(N) per turn via zone-based processing + sparse social network
// Runs async with yield between turns to keep UI responsive
// ---------------------------------------------------------------------------

import {
  VillageVillager, VillageZone, VillageConfig, VillageEvent,
  VillageTurnSnapshot, VillageResult, VillageActionType, VillageArchetype,
  RelType,
} from './villageTypes';

// ── SocialGraph — sparse adjacency map with O(1) lookups ────────────────────

export class SocialGraph {
  private adj = new Map<string, Map<string, { strength: number; type: RelType }>>();

  addEdge(a: string, b: string, strength: number, type: RelType) {
    if (!this.adj.has(a)) this.adj.set(a, new Map());
    if (!this.adj.has(b)) this.adj.set(b, new Map());
    this.adj.get(a)!.set(b, { strength, type });
    this.adj.get(b)!.set(a, { strength, type });
  }

  getNeighbors(id: string): Map<string, { strength: number; type: RelType }> {
    return this.adj.get(id) || new Map();
  }

  getRelation(a: string, b: string) {
    return this.adj.get(a)?.get(b);
  }

  updateStrength(a: string, b: string, delta: number) {
    const rel = this.adj.get(a)?.get(b);
    if (rel) {
      rel.strength = clamp(rel.strength + delta, -1, 1);
      const rev = this.adj.get(b)?.get(a);
      if (rev) rev.strength = rel.strength;
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Zone-based villager index ───────────────────────────────────────────────

function indexByZone(villagers: VillageVillager[]): Map<string, VillageVillager[]> {
  const map = new Map<string, VillageVillager[]>();
  for (const v of villagers) {
    if (v.status !== 'active' && v.status !== 'sick') continue;
    if (!map.has(v.zoneId)) map.set(v.zoneId, []);
    map.get(v.zoneId)!.push(v);
  }
  return map;
}

// ── Action selection — personality + needs driven, O(k) per villager ────────

interface ActionChoice { action: VillageActionType; targetId?: string }

function selectAction(
  v: VillageVillager,
  zone: VillageZone,
  zonemates: VillageVillager[],
  graph: SocialGraph,
  config: VillageConfig,
): ActionChoice {
  const neighbors = graph.getNeighbors(v.id);
  const p = v.personality;

  // Needs assessment
  const hungry = zone.food < zonemates.length * 1.5 ? 0.6 : 0;
  const poor = v.wealth < 15 ? (15 - v.wealth) / 15 : 0;
  const unhealthy = v.health < 50 ? (50 - v.health) / 50 : 0;
  const lonely = v.mood < 40 ? (40 - v.mood) / 40 : 0;
  const unsafe = zone.safety < 40 ? (40 - zone.safety) / 40 : 0;

  // Find zonemates who are also neighbors in the social graph
  const localNeighbors: { id: string; strength: number; type: RelType }[] = [];
  for (const mate of zonemates) {
    if (mate.id === v.id) continue;
    const rel = neighbors.get(mate.id);
    if (rel) localNeighbors.push({ id: mate.id, ...rel });
  }

  const friends = localNeighbors.filter(n => n.strength > 0.1);
  const rivals = localNeighbors.filter(n => n.strength < -0.2);

  // Score each action
  const scores = new Map<VillageActionType, { score: number; targetId?: string }>();

  // Work — always available
  const workBonus = v.archetype === 'farmer' && zone.type === 'farmland' ? 0.3
    : v.archetype === 'merchant' && zone.type === 'market' ? 0.3
    : v.archetype === 'craftsman' && zone.type === 'workshop' ? 0.3
    : v.archetype === 'guard' && zone.type === 'barracks' ? 0.2
    : 0;
  scores.set('work', { score: 0.35 + hungry * 0.4 + poor * 0.3 + p.patience * 0.1 + workBonus });

  // Rest
  scores.set('rest', { score: 0.1 + unhealthy * 0.5 + (1 - p.patience) * 0.05 });

  // Socialize
  if (friends.length > 0) {
    const t = pick(friends);
    scores.set('socialize', { score: 0.15 + lonely * 0.4 + p.cooperation * 0.2, targetId: t.id });
  }

  // Trade
  if (localNeighbors.length > 0) {
    const t = pick(localNeighbors);
    scores.set('trade', { score: 0.1 + poor * 0.3 + hungry * 0.2 + p.rationality * 0.15, targetId: t.id });
  }

  // Cooperate
  if (friends.length > 0) {
    const t = pick(friends);
    scores.set('cooperate', { score: 0.1 + p.cooperation * 0.4 + lonely * 0.15, targetId: t.id });
  }

  // Conflict
  if (rivals.length > 0) {
    const t = pick(rivals);
    scores.set('conflict', {
      score: p.aggression * 0.4 + config.conflictTendency * 0.2 + (1 - p.patience) * 0.1,
      targetId: t.id,
    });
  }

  // Steal
  if (poor > 0.4 && localNeighbors.length > 0 && p.riskTolerance > 0.4) {
    const t = pick(localNeighbors);
    scores.set('steal', { score: poor * 0.3 * p.riskTolerance * (1 - p.cooperation) * 0.8, targetId: t.id });
  }

  // Build
  if (zone.infrastructure < 80) {
    scores.set('build', { score: p.cooperation * 0.15 + p.patience * 0.1 + (zone.infrastructure < 40 ? 0.15 : 0) });
  }

  // Archetype-specific
  if (v.archetype === 'guard') {
    scores.set('patrol', { score: 0.25 + unsafe * 0.4 + p.aggression * 0.1 });
  }
  if (v.archetype === 'healer' && zonemates.some(m => m.health < 50 && m.id !== v.id)) {
    const sick = zonemates.filter(m => m.health < 50 && m.id !== v.id);
    scores.set('heal', { score: 0.3 + p.cooperation * 0.3, targetId: pick(sick).id });
  }
  if (v.archetype === 'scholar' && friends.length > 0) {
    scores.set('teach', { score: 0.2 + p.cooperation * 0.2 + p.rationality * 0.1, targetId: pick(friends).id });
  }
  if ((v.archetype === 'healer' || v.archetype === 'scholar' || v.archetype === 'elder') && zone.type === 'temple') {
    scores.set('pray', { score: 0.2 + p.patience * 0.15 });
  }

  // Migration
  if (config.migrationEnabled && (zone.food < zonemates.length * 0.5 || zone.safety < 20) && p.riskTolerance > 0.5) {
    scores.set('migrate', { score: 0.15 + p.riskTolerance * 0.2 });
  }

  // Add noise
  let best: { action: VillageActionType; score: number; targetId?: string } = { action: 'work', score: -1 };
  for (const [action, data] of scores) {
    const noisy = data.score + Math.random() * 0.12;
    if (noisy > best.score) {
      best = { action, score: noisy, targetId: data.targetId };
    }
  }

  return { action: best.action, targetId: best.targetId };
}

// ── Execute action — apply effects to villager, target, zone ────────────────

function executeAction(
  v: VillageVillager,
  choice: ActionChoice,
  zone: VillageZone,
  villagersById: Map<string, VillageVillager>,
  graph: SocialGraph,
  turn: number,
): VillageEvent | null {
  const target = choice.targetId ? villagersById.get(choice.targetId) : undefined;

  switch (choice.action) {
    case 'work': {
      if (v.archetype === 'farmer' && (zone.type === 'farmland' || zone.type === 'outskirts')) {
        zone.food += 3;
      } else if (v.archetype === 'laborer') {
        zone.food += 1;
        zone.wealth += 0.5;
      } else if (v.archetype === 'merchant') {
        zone.wealth += 2;
        v.wealth += 1.5;
      } else if (v.archetype === 'craftsman') {
        zone.wealth += 1;
        v.wealth += 1;
        zone.infrastructure = clamp(zone.infrastructure + 0.3, 0, 100);
      } else {
        zone.wealth += 0.5;
        v.wealth += 0.5;
      }
      v.mood = clamp(v.mood - 2, 0, 100);
      return null; // routine, no event
    }

    case 'rest': {
      v.health = clamp(v.health + 8, 0, 100);
      v.mood = clamp(v.mood + 5, 0, 100);
      if (v.status === 'sick' && v.health > 60) v.status = 'active';
      return null;
    }

    case 'socialize': {
      if (target) {
        v.mood = clamp(v.mood + 6, 0, 100);
        target.mood = clamp(target.mood + 4, 0, 100);
        graph.updateStrength(v.id, target.id, 0.05);
      }
      return null;
    }

    case 'trade': {
      if (target) {
        const gain = 1 + Math.random() * 2;
        v.wealth += gain;
        target.wealth += gain * 0.8;
        v.mood = clamp(v.mood + 2, 0, 100);
        target.mood = clamp(target.mood + 2, 0, 100);
        graph.updateStrength(v.id, target.id, 0.03);
      }
      return null;
    }

    case 'cooperate': {
      if (target) {
        v.mood = clamp(v.mood + 4, 0, 100);
        target.mood = clamp(target.mood + 6, 0, 100);
        target.health = clamp(target.health + 3, 0, 100);
        graph.updateStrength(v.id, target.id, 0.08);
      }
      return null;
    }

    case 'conflict': {
      if (!target) return null;
      const vPower = v.health * 0.5 + v.personality.aggression * 30 + Math.random() * 20;
      const tPower = target.health * 0.5 + target.personality.aggression * 30 + Math.random() * 20;
      const won = vPower > tPower;

      if (won) {
        const loot = Math.min(target.wealth * 0.3, 10);
        v.wealth += loot;
        target.wealth -= loot;
        target.health = clamp(target.health - 10, 0, 100);
        target.mood = clamp(target.mood - 12, 0, 100);
        v.mood = clamp(v.mood + 3, 0, 100);
      } else {
        const loot = Math.min(v.wealth * 0.3, 10);
        target.wealth += loot;
        v.wealth -= loot;
        v.health = clamp(v.health - 10, 0, 100);
        v.mood = clamp(v.mood - 12, 0, 100);
      }
      graph.updateStrength(v.id, target.id, -0.15);
      zone.safety = clamp(zone.safety - 2, 0, 100);

      return {
        turn,
        type: 'conflict',
        actorIds: [v.id, target.id],
        zoneId: zone.id,
        description: `${v.name} clashed with ${target.name} in ${zone.name}${won ? ` and prevailed` : ` but was defeated`}.`,
        significance: 7,
      };
    }

    case 'steal': {
      if (!target) return null;
      const success = Math.random() < (0.3 + v.personality.riskTolerance * 0.2);
      if (success) {
        const loot = Math.min(target.wealth * 0.4, 15);
        v.wealth += loot;
        target.wealth -= loot;
        target.mood = clamp(target.mood - 10, 0, 100);
        graph.updateStrength(v.id, target.id, -0.2);
      } else {
        v.mood = clamp(v.mood - 8, 0, 100);
        v.health = clamp(v.health - 5, 0, 100);
        zone.safety = clamp(zone.safety - 1, 0, 100);
        graph.updateStrength(v.id, target.id, -0.25);
      }
      return {
        turn,
        type: 'theft',
        actorIds: [v.id, target.id],
        zoneId: zone.id,
        description: success
          ? `${v.name} stole from ${target.name} in ${zone.name}.`
          : `${v.name} tried to steal from ${target.name} but was caught.`,
        significance: success ? 7 : 6,
      };
    }

    case 'build': {
      zone.infrastructure = clamp(zone.infrastructure + 1.5, 0, 100);
      v.wealth = Math.max(0, v.wealth - 1);
      v.mood = clamp(v.mood + 2, 0, 100);
      return null;
    }

    case 'patrol': {
      zone.safety = clamp(zone.safety + 2, 0, 100);
      v.mood = clamp(v.mood - 1, 0, 100);
      return null;
    }

    case 'heal': {
      if (target) {
        target.health = clamp(target.health + 15, 0, 100);
        target.mood = clamp(target.mood + 5, 0, 100);
        if (target.status === 'sick' && target.health > 60) target.status = 'active';
        v.mood = clamp(v.mood + 3, 0, 100);
        graph.updateStrength(v.id, target.id, 0.06);
      }
      return null;
    }

    case 'teach': {
      if (target) {
        target.mood = clamp(target.mood + 4, 0, 100);
        v.mood = clamp(v.mood + 2, 0, 100);
        graph.updateStrength(v.id, target.id, 0.04);
      }
      return null;
    }

    case 'pray': {
      const buff = Math.random();
      if (buff < 0.3) v.health = clamp(v.health + 5, 0, 100);
      else if (buff < 0.6) v.mood = clamp(v.mood + 8, 0, 100);
      else v.mood = clamp(v.mood + 3, 0, 100);
      return null;
    }

    case 'migrate': {
      // handled separately
      return null;
    }

    default:
      return null;
  }
}

// ── Zone production & consumption ───────────────────────────────────────────

function processZoneEconomy(zone: VillageZone, pop: number, config: VillageConfig) {
  // Base production by zone type
  const prodMultiplier = 1 - config.scarcity * 0.5;
  switch (zone.type) {
    case 'farmland':
      zone.food += pop * 0.8 * prodMultiplier;
      break;
    case 'market':
      zone.wealth += pop * 0.5 * prodMultiplier;
      break;
    case 'workshop':
      zone.wealth += pop * 0.3 * prodMultiplier;
      zone.infrastructure = clamp(zone.infrastructure + 0.2, 0, 100);
      break;
    case 'outskirts':
      zone.food += pop * 0.3 * prodMultiplier;
      break;
    default:
      break;
  }

  // Consumption
  zone.food -= pop * 1.0;

  // Natural decay
  zone.safety = clamp(zone.safety - 0.5, 0, 100);
  zone.infrastructure = clamp(zone.infrastructure - 0.1, 0, 100);
}

// ── Food redistribution between adjacent zones ──────────────────────────────

function redistributeFood(zones: VillageZone[]) {
  // Simple: zones with surplus share with zones with deficit
  const surplus: VillageZone[] = [];
  const deficit: VillageZone[] = [];
  for (const z of zones) {
    if (z.food > 50) surplus.push(z);
    else if (z.food < 10) deficit.push(z);
  }

  for (const def of deficit) {
    for (const sur of surplus) {
      if (sur.food <= 30) continue;
      // Check adjacency (manhattan distance <= 2)
      if (Math.abs(sur.x - def.x) + Math.abs(sur.y - def.y) <= 2) {
        const transfer = Math.min(sur.food * 0.2, 20);
        sur.food -= transfer;
        def.food += transfer;
      }
    }
  }
}

// ── Global events ───────────────────────────────────────────────────────────

function rollGlobalEvents(
  zones: VillageZone[],
  villagers: VillageVillager[],
  byZone: Map<string, VillageVillager[]>,
  turn: number,
  config: VillageConfig,
): VillageEvent[] {
  const events: VillageEvent[] = [];

  // Disaster check
  if (Math.random() < config.disasterFrequency) {
    const eventType = Math.random();
    const targetZone = pick(zones);
    const zonePop = byZone.get(targetZone.id) || [];

    if (eventType < 0.2) {
      // Epidemic
      for (const v of zonePop) {
        if (Math.random() < 0.4) {
          v.health = clamp(v.health - 20, 0, 100);
          v.mood = clamp(v.mood - 10, 0, 100);
          if (v.health < 30) v.status = 'sick';
        }
      }
      events.push({
        turn, type: 'epidemic',
        actorIds: zonePop.map(v => v.id).slice(0, 5),
        zoneId: targetZone.id,
        description: `An epidemic swept through ${targetZone.name}, sickening many.`,
        significance: 9,
      });
    } else if (eventType < 0.4) {
      // Bandits
      targetZone.safety = clamp(targetZone.safety - 20, 0, 100);
      targetZone.wealth = Math.max(0, targetZone.wealth - 15);
      for (const v of zonePop) {
        v.mood = clamp(v.mood - 8, 0, 100);
        v.wealth = Math.max(0, v.wealth - 3);
      }
      events.push({
        turn, type: 'disaster',
        actorIds: [],
        zoneId: targetZone.id,
        description: `Bandits raided ${targetZone.name}, stealing goods and causing fear.`,
        significance: 9,
      });
    } else if (eventType < 0.55) {
      // Fire
      targetZone.infrastructure = clamp(targetZone.infrastructure - 15, 0, 100);
      for (const v of zonePop) {
        if (Math.random() < 0.2) v.health = clamp(v.health - 15, 0, 100);
        v.mood = clamp(v.mood - 10, 0, 100);
      }
      events.push({
        turn, type: 'disaster',
        actorIds: [],
        zoneId: targetZone.id,
        description: `A fire broke out in ${targetZone.name}, damaging buildings.`,
        significance: 9,
      });
    } else if (eventType < 0.7) {
      // Famine (affects farmlands)
      const farmlands = zones.filter(z => z.type === 'farmland');
      for (const fl of farmlands) {
        fl.food = Math.max(0, fl.food * 0.4);
      }
      events.push({
        turn, type: 'disaster',
        actorIds: [],
        zoneId: farmlands[0]?.id || targetZone.id,
        description: `A blight destroyed crops across the farmlands.`,
        significance: 10,
      });
    } else {
      // Festival (positive!)
      for (const v of villagers) {
        if (v.status === 'active') v.mood = clamp(v.mood + 10, 0, 100);
      }
      events.push({
        turn, type: 'festival',
        actorIds: [],
        zoneId: targetZone.id,
        description: `A grand festival lifted spirits across the village!`,
        significance: 8,
      });
    }
  }

  // Seasonal harvest bonus (every 10 turns)
  if (turn > 0 && turn % 10 === 0) {
    const farmlands = zones.filter(z => z.type === 'farmland');
    for (const fl of farmlands) {
      fl.food += 40;
    }
    if (farmlands.length > 0) {
      events.push({
        turn, type: 'harvest',
        actorIds: [],
        zoneId: farmlands[0].id,
        description: `The harvest season brought abundant food to the farmlands.`,
        significance: 8,
      });
    }
  }

  return events;
}

// ── Health/status checks ────────────────────────────────────────────────────

function processHealthDecay(
  villagers: VillageVillager[],
  byZone: Map<string, VillageVillager[]>,
  zones: VillageZone[],
  turn: number,
): VillageEvent[] {
  const events: VillageEvent[] = [];
  const zoneMap = new Map(zones.map(z => [z.id, z]));

  for (const v of villagers) {
    if (v.status === 'deceased' || v.status === 'migrated') continue;

    const zone = zoneMap.get(v.zoneId);
    if (!zone) continue;

    // Starvation
    if (zone.food < 0) {
      v.health = clamp(v.health - 5, 0, 100);
      v.mood = clamp(v.mood - 5, 0, 100);
    }

    // Natural decay
    v.mood = clamp(v.mood - 1, 0, 100);
    v.health = clamp(v.health - 0.3, 0, 100);

    // Safety affects mood
    if (zone.safety < 30) {
      v.mood = clamp(v.mood - 2, 0, 100);
    }

    // Sick villagers deteriorate
    if (v.status === 'sick') {
      v.health = clamp(v.health - 3, 0, 100);
    }

    // Death check
    if (v.health <= 0) {
      v.status = 'deceased';
      events.push({
        turn, type: 'death',
        actorIds: [v.id],
        zoneId: v.zoneId,
        description: `${v.name} (${v.archetype}) has perished in ${zone.name}.`,
        significance: 7,
      });
    }
  }

  return events;
}

// ── Migration ───────────────────────────────────────────────────────────────

function processMigrations(
  villagers: VillageVillager[],
  zones: VillageZone[],
  migrators: Set<string>,
  turn: number,
): VillageEvent[] {
  const events: VillageEvent[] = [];
  const zoneMap = new Map(zones.map(z => [z.id, z]));

  for (const vId of migrators) {
    const v = villagers.find(vil => vil.id === vId);
    if (!v || v.status !== 'active') continue;

    const currentZone = zoneMap.get(v.zoneId);
    if (!currentZone) continue;

    // Find adjacent zones with better conditions
    const candidates = zones.filter(z =>
      z.id !== v.zoneId &&
      Math.abs(z.x - currentZone.x) + Math.abs(z.y - currentZone.y) <= 2 &&
      z.food > 10 && z.safety > currentZone.safety - 10
    );

    if (candidates.length > 0) {
      const dest = pick(candidates);
      const oldZone = currentZone.name;
      v.zoneId = dest.id;
      events.push({
        turn, type: 'migration',
        actorIds: [v.id],
        zoneId: dest.id,
        description: `${v.name} migrated from ${oldZone} to ${dest.name}.`,
        significance: 5,
      });
    }
  }

  return events;
}

// ── Compute snapshot ────────────────────────────────────────────────────────

function computeSnapshot(
  turn: number,
  zones: VillageZone[],
  villagers: VillageVillager[],
  events: VillageEvent[],
  graph: SocialGraph,
): VillageTurnSnapshot {
  const active = villagers.filter(v => v.status === 'active' || v.status === 'sick');
  const population = active.length;
  const avgMood = population > 0 ? active.reduce((s, v) => s + v.mood, 0) / population : 0;
  const avgHealth = population > 0 ? active.reduce((s, v) => s + v.health, 0) / population : 0;
  const totalWealth = active.reduce((s, v) => s + v.wealth, 0);
  const totalFood = zones.reduce((s, z) => s + Math.max(0, z.food), 0);

  // Zone stats
  const zoneStats: VillageTurnSnapshot['zoneStats'] = {};
  const byZone = indexByZone(active);
  for (const zone of zones) {
    const zv = byZone.get(zone.id) || [];
    zoneStats[zone.id] = {
      population: zv.length,
      avgMood: zv.length > 0 ? zv.reduce((s, v) => s + v.mood, 0) / zv.length : 0,
      avgHealth: zv.length > 0 ? zv.reduce((s, v) => s + v.health, 0) / zv.length : 0,
      food: Math.max(0, zone.food),
      wealth: zone.wealth,
      safety: zone.safety,
      infrastructure: zone.infrastructure,
    };
  }

  // Archetype stats
  const archetypeStats: VillageTurnSnapshot['archetypeStats'] = {};
  const archetypeGroups = new Map<VillageArchetype, VillageVillager[]>();
  for (const v of active) {
    if (!archetypeGroups.has(v.archetype)) archetypeGroups.set(v.archetype, []);
    archetypeGroups.get(v.archetype)!.push(v);
  }
  for (const [arch, group] of archetypeGroups) {
    archetypeStats[arch] = {
      count: group.length,
      avgMood: group.reduce((s, v) => s + v.mood, 0) / group.length,
      avgWealth: group.reduce((s, v) => s + v.wealth, 0) / group.length,
    };
  }

  // Inter-zone connections (aggregated from social graph)
  const interZoneMap = new Map<string, number>();
  for (const v of active) {
    const neighbors = graph.getNeighbors(v.id);
    for (const [nId, rel] of neighbors) {
      const neighbor = villagers.find(vil => vil.id === nId);
      if (!neighbor || neighbor.zoneId === v.zoneId) continue;
      const key = [v.zoneId, neighbor.zoneId].sort().join('|');
      interZoneMap.set(key, (interZoneMap.get(key) || 0) + Math.abs(rel.strength));
    }
  }
  const interZoneConnections = Array.from(interZoneMap.entries()).map(([key, strength]) => {
    const [from, to] = key.split('|');
    return { from, to, strength };
  });

  // Global metrics
  const tension = clamp(
    1 - zones.reduce((s, z) => s + z.safety, 0) / (zones.length * 100) +
    events.filter(e => e.type === 'conflict' || e.type === 'theft').length * 0.05,
    0, 1,
  );
  const prosperity = clamp(
    totalFood / (population * 3) * 0.5 + totalWealth / (population * 30) * 0.5,
    0, 1,
  );
  const cohesion = clamp(avgMood / 100 * 0.5 + (1 - tension) * 0.5, 0, 1);

  return {
    turn, population, avgMood, avgHealth, totalWealth, totalFood,
    zoneStats, archetypeStats,
    events: events.filter(e => e.significance >= 6),
    tension, prosperity, cohesion,
    interZoneConnections,
  };
}

// ── Generate final narrative ────────────────────────────────────────────────

function generateNarrative(
  config: VillageConfig,
  zones: VillageZone[],
  villagers: VillageVillager[],
  turns: VillageTurnSnapshot[],
): { narrative: string; insights: string[] } {
  const first = turns[0];
  const last = turns[turns.length - 1];
  const deaths = villagers.filter(v => v.status === 'deceased').length;
  const active = villagers.filter(v => v.status === 'active' || v.status === 'sick').length;
  const totalConflicts = turns.reduce(
    (s, t) => s + t.events.filter(e => e.type === 'conflict').length, 0,
  );
  const totalDisasters = turns.reduce(
    (s, t) => s + t.events.filter(e => e.type === 'disaster' || e.type === 'epidemic').length, 0,
  );

  const moodDelta = last.avgMood - first.avgMood;
  const wealthDelta = last.totalWealth - first.totalWealth;

  const narrative = [
    `Over ${config.totalTurns} turns, the village of ${config.populationSize} souls experienced `,
    totalDisasters > 3 ? 'significant hardship' : totalDisasters > 0 ? 'occasional challenges' : 'relative peace',
    `. ${deaths > 0 ? `${deaths} villagers perished.` : 'No lives were lost.'}`,
    ` ${totalConflicts} conflicts erupted across the zones.`,
    ` Village mood ${moodDelta > 5 ? 'improved' : moodDelta < -5 ? 'declined' : 'remained stable'}`,
    ` and total wealth ${wealthDelta > 100 ? 'grew significantly' : wealthDelta < -100 ? 'fell sharply' : 'held steady'}.`,
    ` ${active} villagers remain at the simulation's end.`,
  ].join('');

  const insights: string[] = [];

  // Find most prosperous zone
  const bestZone = zones.reduce((best, z) =>
    z.wealth > best.wealth ? z : best, zones[0]);
  insights.push(`${bestZone.name} (${bestZone.type}) was the most prosperous zone.`);

  // Find most dangerous zone
  const worstSafety = zones.reduce((worst, z) =>
    z.safety < worst.safety ? z : worst, zones[0]);
  insights.push(`${worstSafety.name} had the lowest safety rating (${Math.round(worstSafety.safety)}%).`);

  if (moodDelta < -10) {
    insights.push(`Village morale dropped significantly — consider fewer disasters or more healers/elders.`);
  }
  if (deaths > config.populationSize * 0.1) {
    insights.push(`High mortality rate (${deaths} deaths) — food scarcity and conflict were major factors.`);
  }
  if (totalConflicts > config.totalTurns * 2) {
    insights.push(`Frequent conflicts suggest high aggression traits or rival-dense social networks.`);
  }
  if (last.prosperity > 0.7) {
    insights.push(`The village achieved high prosperity — balanced economy and good infrastructure.`);
  }

  return { narrative, insights };
}

// ── Main simulation loop (async, yields between turns) ──────────────────────

export async function runVillageSimulation(
  config: VillageConfig,
  zones: VillageZone[],
  villagers: VillageVillager[],
  graph: SocialGraph,
  onProgress: (turn: number, snapshot: VillageTurnSnapshot) => void,
): Promise<VillageResult> {
  const turns: VillageTurnSnapshot[] = [];
  const villagersById = new Map(villagers.map(v => [v.id, v]));

  for (let turn = 0; turn < config.totalTurns; turn++) {
    const turnEvents: VillageEvent[] = [];
    const byZone = indexByZone(villagers);
    const migrators = new Set<string>();

    // 1. Zone economy (production + consumption)
    for (const zone of zones) {
      const pop = (byZone.get(zone.id) || []).length;
      processZoneEconomy(zone, pop, config);
    }

    // 2. Food redistribution
    redistributeFood(zones);

    // 3. Each villager takes one action
    for (const zone of zones) {
      const zonemates = byZone.get(zone.id) || [];
      for (const v of zonemates) {
        if (v.status !== 'active') continue;
        const choice = selectAction(v, zone, zonemates, graph, config);
        if (choice.action === 'migrate') {
          migrators.add(v.id);
          continue;
        }
        const event = executeAction(v, choice, zone, villagersById, graph, turn);
        if (event) turnEvents.push(event);
      }
    }

    // 4. Process migrations
    const migrationEvents = processMigrations(villagers, zones, migrators, turn);
    turnEvents.push(...migrationEvents);

    // 5. Health decay and death checks
    const healthEvents = processHealthDecay(villagers, byZone, zones, turn);
    turnEvents.push(...healthEvents);

    // 6. Global events
    const globalEvents = rollGlobalEvents(zones, villagers, indexByZone(villagers), turn, config);
    turnEvents.push(...globalEvents);

    // 7. Compute and store snapshot
    const snapshot = computeSnapshot(turn, zones, villagers, turnEvents, graph);
    turns.push(snapshot);

    // 8. Report progress and yield to main thread
    onProgress(turn, snapshot);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const { narrative, insights } = generateNarrative(config, zones, villagers, turns);

  return {
    id: `village-${Date.now()}`,
    config,
    zones,
    villagers,
    turns,
    finalNarrative: narrative,
    insights,
  };
}
