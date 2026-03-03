import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

const PLAYER_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
  '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff',
];

const SYSTEM_PROMPT = `You are a world-building game theory expert. Given a real-world scenario described in natural language, create a detailed multi-player open-world simulation setup.

Think deeply about WHO the real players are, WHAT their actual incentives are, WHAT resources they control, and HOW they relate to each other. Be specific and realistic — not generic.

Return a JSON object (and ONLY a JSON object, no markdown, no code fences) with this structure:

{
  "players": [
    {
      "id": "player_1",
      "name": "Specific name (e.g., 'United States', 'JPMorgan Chase', 'OPEC')",
      "emoji": "single relevant emoji",
      "type": "nation|corporation|individual|organization|market|custom",
      "description": "2-3 sentence description of who this player is and what they want",
      "goals": ["specific goal 1", "specific goal 2", "specific goal 3"],
      "resources": [
        { "name": "Resource name", "amount": 10, "maxAmount": 20, "regenerationRate": 0.5 }
      ],
      "constraints": ["constraint 1", "constraint 2"],
      "personalityTraits": {
        "aggression": 0.5,
        "cooperation": 0.5,
        "riskTolerance": 0.5,
        "rationality": 0.5,
        "patience": 0.5
      }
    }
  ],
  "relationships": [
    {
      "fromId": "player_1",
      "toId": "player_2",
      "type": "alliance|rivalry|trade|dependency|threat|neutral",
      "strength": 0.5,
      "history": ["Brief historical context"]
    }
  ],
  "rules": [
    {
      "id": "rule_1",
      "name": "Rule name",
      "description": "What this rule does",
      "type": "constraint|trigger|modifier|victory|elimination",
      "condition": "When this condition is met",
      "effect": "This happens",
      "active": true
    }
  ],
  "shocks": [
    {
      "id": "shock_1",
      "name": "Potential shock event",
      "description": "What could happen",
      "probability": 0.1,
      "effects": [
        { "playerId": "player_1", "resourceChanges": {}, "payoffDelta": -3 }
      ]
    }
  ],
  "suggestedConfig": {
    "totalTurns": 30,
    "enableShocks": true,
    "shockFrequency": 0.5,
    "allianceFlexibility": 0.5,
    "eliminationEnabled": true,
    "eliminationThreshold": -20,
    "resourceScarcity": 0.3,
    "informationAsymmetry": 0.3,
    "diplomacyWeight": 0.5
  }
}

IMPORTANT:
- Include 2-8 players depending on the scenario complexity
- Be SPECIFIC to the real-world scenario — use real names, real resources, real dynamics
- Personality traits should reflect actual behavior patterns (e.g., aggressive nations get high aggression)
- Resources should be domain-specific (e.g., "Military Power", "Oil Reserves", "Market Cap", "Political Capital")
- Relationships should reflect real-world alliances and rivalries
- Rules should capture the actual constraints of the scenario
- Shocks should be plausible real-world disruptions
- Every player must have at least 1 resource and 2 goals
- Create relationships between ALL player pairs
- Be bold and analytical — this is for education, not diplomacy`;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Create an open-world game theory simulation setup for this scenario:\n\n"${input}"`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    let setup;
    try {
      setup = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setup = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Failed to parse setup' }, { status: 500 });
      }
    }

    // Assign colors and positions to players
    if (setup.players) {
      const playerCount = setup.players.length;
      setup.players = setup.players.map((player: Record<string, unknown>, i: number) => ({
        ...player,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        alliances: [],
        rivals: [],
        position: {
          x: 300 + 200 * Math.cos((2 * Math.PI * i) / playerCount),
          y: 250 + 150 * Math.sin((2 * Math.PI * i) / playerCount),
        },
      }));
    }

    // Add triggered: false to shocks
    if (setup.shocks) {
      setup.shocks = setup.shocks.map((shock: Record<string, unknown>) => ({
        ...shock,
        triggered: false,
        turn: 0,
      }));
    }

    // Initialize relationship history as arrays if not present
    if (setup.relationships) {
      setup.relationships = setup.relationships.map((rel: Record<string, unknown>) => ({
        ...rel,
        history: Array.isArray(rel.history) ? rel.history : [],
      }));
    }

    return NextResponse.json({ setup });
  } catch (error) {
    console.error('Open world setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create simulation setup' },
      { status: 500 },
    );
  }
}
