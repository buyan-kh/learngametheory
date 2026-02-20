import { createClient } from './supabase/client';
import { GameAnalysis, Scenario } from './types';

export async function saveScenario(
  userId: string,
  input: string,
  analysis: GameAnalysis
): Promise<Scenario | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('scenarios')
    .insert({
      user_id: userId,
      input,
      analysis,
    })
    .select('id, input, analysis, created_at')
    .single();

  if (error) {
    console.error('Error saving scenario:', error.message);
    return null;
  }

  return data as Scenario;
}

export async function getUserScenarios(userId: string): Promise<Scenario[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('scenarios')
    .select('id, input, analysis, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scenarios:', error.message);
    return [];
  }

  return (data ?? []) as Scenario[];
}

export async function deleteScenario(scenarioId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', scenarioId);

  if (error) {
    console.error('Error deleting scenario:', error.message);
    return false;
  }

  return true;
}

export async function getScenario(scenarioId: string): Promise<Scenario | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('scenarios')
    .select('id, input, analysis, created_at')
    .eq('id', scenarioId)
    .single();

  if (error) {
    console.error('Error fetching scenario:', error.message);
    return null;
  }

  return data as Scenario;
}
