// ---------------------------------------------------------------------------
// Village Simulation Types — optimized for 500+ agent simulations
// ---------------------------------------------------------------------------

export type VillageArchetype =
  | 'farmer' | 'merchant' | 'craftsman' | 'elder'
  | 'guard' | 'healer' | 'scholar' | 'laborer'
  | 'noble' | 'outcast';

export type VillageZoneType =
  | 'residential' | 'market' | 'farmland' | 'workshop'
  | 'temple' | 'barracks' | 'manor' | 'outskirts';

export interface VillagePersonality {
  aggression: number;    // 0-1
  cooperation: number;   // 0-1
  riskTolerance: number; // 0-1
  rationality: number;   // 0-1
  patience: number;      // 0-1
}

export interface VillageVillager {
  id: string;
  name: string;
  archetype: VillageArchetype;
  zoneId: string;
  personality: VillagePersonality;
  health: number;      // 0-100
  mood: number;        // 0-100
  wealth: number;      // 0+
  status: 'active' | 'sick' | 'migrated' | 'deceased';
}

export interface VillageZone {
  id: string;
  name: string;
  type: VillageZoneType;
  capacity: number;
  food: number;
  wealth: number;
  infrastructure: number; // 0-100
  safety: number;         // 0-100
  x: number;
  y: number;
}

export type RelType = 'friend' | 'rival' | 'family' | 'trade' | 'neutral';

export type VillageActionType =
  | 'work' | 'trade' | 'cooperate' | 'conflict'
  | 'socialize' | 'rest' | 'steal' | 'build'
  | 'pray' | 'patrol' | 'heal' | 'teach' | 'migrate';

export interface VillageEvent {
  turn: number;
  type: 'action' | 'conflict' | 'trade' | 'disaster' | 'festival'
      | 'epidemic' | 'harvest' | 'death' | 'migration' | 'theft';
  actorIds: string[];
  zoneId: string;
  description: string;
  significance: number; // 1-10
}

export interface VillageTurnSnapshot {
  turn: number;
  population: number;
  avgMood: number;
  avgHealth: number;
  totalWealth: number;
  totalFood: number;
  zoneStats: Record<string, {
    population: number;
    avgMood: number;
    avgHealth: number;
    food: number;
    wealth: number;
    safety: number;
    infrastructure: number;
  }>;
  archetypeStats: Partial<Record<VillageArchetype, {
    count: number;
    avgMood: number;
    avgWealth: number;
  }>>;
  events: VillageEvent[];
  tension: number;
  prosperity: number;
  cohesion: number;
  interZoneConnections: { from: string; to: string; strength: number }[];
}

export interface VillageConfig {
  populationSize: number;
  zoneCount: number;
  totalTurns: number;
  turnSpeed: number;
  connectionsPerPerson: number;
  disasterFrequency: number;
  scarcity: number;
  conflictTendency: number;
  migrationEnabled: boolean;
}

export interface VillageResult {
  id: string;
  config: VillageConfig;
  zones: VillageZone[];
  villagers: VillageVillager[];
  turns: VillageTurnSnapshot[];
  finalNarrative: string;
  insights: string[];
}

export const DEFAULT_VILLAGE_CONFIG: VillageConfig = {
  populationSize: 500,
  zoneCount: 12,
  totalTurns: 30,
  turnSpeed: 200,
  connectionsPerPerson: 8,
  disasterFrequency: 0.15,
  scarcity: 0.3,
  conflictTendency: 0.2,
  migrationEnabled: true,
};
