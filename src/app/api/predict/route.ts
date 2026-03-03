import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a world-class geopolitical, economic, and strategic analyst. You are given a complex multi-player simulation state — players, their actions, relationships, resources, and world events — and must predict what will happen next.

Think like a combination of: a CIA analyst, a Wall Street quant, a game theory professor, and a historian. Consider:
- Each player's incentives, personality traits, and past behavior patterns
- Alliance dynamics and how they might shift
- Resource constraints and economic pressures
- Historical parallels to real-world scenarios
- Second and third-order effects of recent actions
- Black swan possibilities

Return a JSON object (and ONLY a JSON object, no markdown, no code fences) with this structure:

{
  "shortTerm": "Prediction for the next 1-3 turns. Be specific about which players will do what and why.",
  "mediumTerm": "Prediction for the next 5-10 turns. Describe emerging trends, alliance shifts, and escalation/de-escalation patterns.",
  "longTerm": "End-game prediction. Who wins and why? What's the final state of the world?",
  "mostLikelyOutcome": "The single most probable outcome described in 2-3 sentences.",
  "wildcardScenario": "A plausible but surprising scenario that could upend everything. Think black swans, betrayals, unexpected alliances.",
  "playerPredictions": {
    "player_id": {
      "likelyStrategy": "What this player will most likely do next and why",
      "survivalProbability": 0.8,
      "threatLevel": 0.5
    }
  },
  "confidenceLevel": 0.7
}

Be bold with predictions. Don't hedge everything. Take clear analytical positions.
Be specific — name players, reference their traits and past actions.
Make it feel like a real intelligence briefing, not a generic analysis.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { players, relationships, turns, config, scenarioDescription } = body;

    if (!players || !turns) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Build a compact state summary for the AI
    const recentTurns = (turns as Array<{
      turn: number;
      narrative: string;
      worldState: { tension: number; cooperation: number; volatility: number };
      playerStates: Record<string, {
        cumulativePayoff: number;
        actionTaken: string;
        targetPlayer?: string;
        status: string;
        alliances: string[];
        rivals: string[];
      }>;
    }>).slice(-10);
    const lastTurn = recentTurns[recentTurns.length - 1];

    const playerSummary = (players as Array<{
      id: string;
      name: string;
      type: string;
      goals: string[];
      personalityTraits: {
        aggression: number;
        cooperation: number;
        riskTolerance: number;
        rationality: number;
        patience: number;
      };
      resources: Array<{ name: string; amount: number }>;
    }>).map((p) => {
      const state = lastTurn?.playerStates[p.id];
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        goals: p.goals,
        traits: p.personalityTraits,
        resources: p.resources.map((r) => `${r.name}: ${r.amount}`),
        currentScore: state?.cumulativePayoff ?? 0,
        status: state?.status ?? 'active',
        alliances: state?.alliances ?? [],
        rivals: state?.rivals ?? [],
      };
    });

    const recentNarratives = recentTurns.map(
      (t) => `Turn ${t.turn}: ${t.narrative}`,
    ).join('\n');

    const relSummary = (relationships as Array<{
      fromId: string;
      toId: string;
      type: string;
      strength: number;
    }>).map((r) => {
      const fromName = (players as Array<{ id: string; name: string }>).find((p) => p.id === r.fromId)?.name ?? r.fromId;
      const toName = (players as Array<{ id: string; name: string }>).find((p) => p.id === r.toId)?.name ?? r.toId;
      return `${fromName} → ${toName}: ${r.type} (strength: ${r.strength.toFixed(2)})`;
    });

    const prompt = `Analyze this open-world game theory simulation and predict what happens next.

SCENARIO: ${scenarioDescription || 'Custom multi-player strategic simulation'}

PLAYERS:
${JSON.stringify(playerSummary, null, 2)}

RELATIONSHIPS:
${relSummary.join('\n')}

RECENT EVENTS:
${recentNarratives}

WORLD STATE:
- Tension: ${lastTurn?.worldState.tension.toFixed(2) ?? 'N/A'}
- Cooperation: ${lastTurn?.worldState.cooperation.toFixed(2) ?? 'N/A'}
- Volatility: ${lastTurn?.worldState.volatility.toFixed(2) ?? 'N/A'}
- Current Turn: ${lastTurn?.turn ?? 0} of ${config?.totalTurns ?? 30}

CONFIG:
- Elimination enabled: ${config?.eliminationEnabled ?? true}
- Shocks enabled: ${config?.enableShocks ?? true}
- Diplomacy weight: ${config?.diplomacyWeight ?? 0.5}

Provide your strategic prediction.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      system: SYSTEM_PROMPT,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    let prediction;
    try {
      prediction = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Failed to parse prediction' }, { status: 500 });
      }
    }

    return NextResponse.json({ prediction });
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 },
    );
  }
}
