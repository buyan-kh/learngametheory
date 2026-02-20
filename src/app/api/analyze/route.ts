import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

const PLAYER_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
];

const SYSTEM_PROMPT = `You are a game theory expert analyst. Given a real-world scenario described in natural language, analyze it through the lens of game theory.

Return a JSON object (and ONLY a JSON object, no markdown, no code fences) with this exact structure:

{
  "title": "Short catchy title for this game",
  "summary": "2-3 sentence summary of the game theory situation",
  "gameType": "e.g. Prisoner's Dilemma, Chicken Game, Coordination Game, Auction, Bargaining, Public Goods, Zero-Sum, etc.",
  "gameTypeDescription": "1-2 sentence explanation of this game type",
  "players": [
    {
      "id": "player_1",
      "name": "Player name or role",
      "emoji": "single relevant emoji",
      "role": "Brief role description",
      "goals": ["goal1", "goal2"],
      "strategies": ["strategy1", "strategy2", "strategy3"]
    }
  ],
  "connections": [
    {
      "from": "player_1",
      "to": "player_2",
      "type": "cooperation|competition|dependency|negotiation",
      "label": "Brief description of relationship",
      "strength": 0.8
    }
  ],
  "rules": ["Rule 1 of the game", "Rule 2", "Rule 3"],
  "incentives": [
    { "playerId": "player_1", "incentive": "Description of incentive", "strength": 0.9 }
  ],
  "outcomes": [
    {
      "id": "outcome_1",
      "label": "Short outcome name",
      "description": "What happens in this outcome",
      "payoffs": { "player_1": 8, "player_2": 3 },
      "likelihood": 0.4,
      "type": "best|worst|nash|pareto|likely"
    }
  ],
  "strategies": [
    {
      "playerId": "player_1",
      "name": "Strategy name",
      "description": "What this strategy entails",
      "risk": "low|medium|high",
      "expectedPayoff": 7
    }
  ],
  "payoffMatrix": [
    {
      "strategies": { "player_1": "Strategy A", "player_2": "Strategy X" },
      "payoffs": { "player_1": 5, "player_2": 5 }
    }
  ],
  "recommendation": "What strategy would a game theorist recommend and why (2-3 sentences)",
  "nashEquilibrium": "Describe the Nash Equilibrium of this game (1-2 sentences)",
  "dominantStrategy": "Describe if any player has a dominant strategy (1-2 sentences)",
  "realWorldParallel": "A famous game theory example this resembles and why (1-2 sentences)"
}

IMPORTANT:
- Include 2-5 players depending on the scenario
- Include at least 4-6 outcomes (must include at least one of each type: best, worst, nash, likely)
- Payoff values should be on a scale of 0-10
- Likelihood values should sum to roughly 1.0 across all outcomes
- Include at least 2 strategies per player
- Make the payoff matrix cover the most important strategy combinations
- Be specific and insightful, not generic
- Ensure the analysis teaches the user about game theory concepts`;

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
          content: `Analyze this situation using game theory:\n\n"${input}"`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response' }, { status: 500 });
    }

    let analysis;
    try {
      analysis = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
      }
    }

    // Assign colors and positions to players
    analysis.players = analysis.players.map((player: Record<string, unknown>, i: number) => ({
      ...player,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      position: {
        x: 300 + 200 * Math.cos((2 * Math.PI * i) / analysis.players.length),
        y: 250 + 150 * Math.sin((2 * Math.PI * i) / analysis.players.length),
      },
    }));

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze scenario' },
      { status: 500 }
    );
  }
}
