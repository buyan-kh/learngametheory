import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/scenarios — list user's saved scenarios
export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('scenarios')
    .select('id, input, analysis, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scenarios: data ?? [] });
}

// POST /api/scenarios — save a new scenario
export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { input, analysis } = body;

  if (!input || !analysis) {
    return NextResponse.json({ error: 'Missing input or analysis' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      user_id: user.id,
      input,
      analysis,
    })
    .select('id, input, analysis, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scenario: data }, { status: 201 });
}
