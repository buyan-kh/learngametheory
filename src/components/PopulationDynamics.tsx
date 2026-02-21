'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameAnalysis } from '@/lib/types';
import {
  runPopulationSimulation,
  type PopulationConfig,
  type PopulationResult,
} from '@/lib/populationSim';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRATEGY_COLORS = [
  '#00b894', '#6c5ce7', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
  '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff',
];

function getColor(index: number): string {
  return STRATEGY_COLORS[index % STRATEGY_COLORS.length];
}

// ---------------------------------------------------------------------------
// Config Slider
// ---------------------------------------------------------------------------

function ConfigSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[#55efc4] font-medium">{label}</span>
        <span className="text-[11px] text-[#e0e0ff] font-mono bg-[#25253e] px-2 py-0.5 rounded">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00b894]
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#51cf66]
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,184,148,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#00b894] [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-[#51cf66]"
        style={{
          background: `linear-gradient(to right, #00b894 0%, #00b894 ${((value - min) / (max - min)) * 100}%, #25253e ${((value - min) / (max - min)) * 100}%, #25253e 100%)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function SkullIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 20v2h8v-2" />
      <path d="M12.5 17-.5-1h-1l-.5 1" />
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
    </svg>
  );
}

function DnaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 15c6.667-6 13.333 0 20-6" />
      <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
      <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
      <path d="M17 6l-2.5-2.5" />
      <path d="M14 8l-1-1" />
      <path d="M7 18l2.5 2.5" />
      <path d="M3.5 14.5l.5.5" />
      <path d="M20 9l.5.5" />
      <path d="M6.5 12.6l1 .9" />
      <path d="M16.5 10.4l1 .9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stacked Area Chart
// ---------------------------------------------------------------------------

interface StackedAreaChartProps {
  result: PopulationResult;
  hoveredGen: number | null;
  onHover: (gen: number | null) => void;
}

function StackedAreaChart({ result, hoveredGen, onHover }: StackedAreaChartProps) {
  const { generations, allStrategies, config } = result;

  const chartWidth = 700;
  const chartHeight = 320;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const chartData = useMemo(() => {
    if (generations.length === 0) return { paths: [], xLabels: [], yLabels: [] };

    const numGens = generations.length;
    const xScale = (gen: number) => padding.left + (gen / Math.max(numGens - 1, 1)) * innerWidth;
    const yScale = (pct: number) => padding.top + (1 - pct / 100) * innerHeight;

    // Compute cumulative percentages per generation for stacking.
    const stackedData: number[][] = []; // [genIndex][stratIndex] = cumulative pct
    for (let g = 0; g < numGens; g++) {
      const gen = generations[g];
      const total = config.populationSize;
      let cumPct = 0;
      const row: number[] = [];
      for (const strat of allStrategies) {
        cumPct += ((gen.strategyCounts[strat] ?? 0) / total) * 100;
        row.push(cumPct);
      }
      stackedData.push(row);
    }

    // Build SVG path for each strategy area (bottom to top of its band).
    const paths: { strategy: string; color: string; d: string }[] = [];

    for (let sIdx = allStrategies.length - 1; sIdx >= 0; sIdx--) {
      const strategy = allStrategies[sIdx];
      const color = getColor(sIdx);

      // Top edge (current strategy's cumulative top).
      const topPoints: string[] = [];
      for (let g = 0; g < numGens; g++) {
        const x = xScale(g);
        const y = yScale(stackedData[g][sIdx]);
        topPoints.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }

      // Bottom edge (previous strategy's cumulative top, or 0 for first).
      const bottomPoints: string[] = [];
      for (let g = numGens - 1; g >= 0; g--) {
        const x = xScale(g);
        const y = sIdx > 0
          ? yScale(stackedData[g][sIdx - 1])
          : yScale(0);
        bottomPoints.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }

      const d = `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`;
      paths.push({ strategy, color, d });
    }

    // Axis labels.
    const xLabelCount = Math.min(10, numGens);
    const xStep = Math.max(1, Math.floor(numGens / xLabelCount));
    const xLabels: { x: number; label: string }[] = [];
    for (let g = 0; g < numGens; g += xStep) {
      xLabels.push({ x: xScale(g), label: `${g}` });
    }
    // Always include the last generation.
    if (xLabels.length === 0 || xLabels[xLabels.length - 1].label !== `${numGens - 1}`) {
      xLabels.push({ x: xScale(numGens - 1), label: `${numGens - 1}` });
    }

    const yLabels = [0, 25, 50, 75, 100].map((pct) => ({
      y: yScale(pct),
      label: `${pct}%`,
    }));

    return { paths, xLabels, yLabels, xScale };
  }, [generations, allStrategies, config.populationSize, innerWidth, innerHeight, padding.left, padding.top]);

  const hoverX = useMemo(() => {
    if (hoveredGen === null || !chartData.xScale) return null;
    return chartData.xScale(hoveredGen);
  }, [hoveredGen, chartData]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (generations.length === 0) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scaleX = chartWidth / rect.width;
      const adjustedX = mouseX * scaleX;

      const gen = Math.round(
        ((adjustedX - padding.left) / innerWidth) * (generations.length - 1),
      );
      const clampedGen = Math.max(0, Math.min(gen, generations.length - 1));
      onHover(clampedGen);
    },
    [generations.length, innerWidth, padding.left, chartWidth, onHover],
  );

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    >
      {/* Grid lines */}
      {chartData.yLabels.map((yl) => (
        <line
          key={yl.label}
          x1={padding.left}
          y1={yl.y}
          x2={chartWidth - padding.right}
          y2={yl.y}
          stroke="#25253e"
          strokeWidth={1}
        />
      ))}

      {/* Stacked areas */}
      {chartData.paths.map((p) => (
        <path
          key={p.strategy}
          d={p.d}
          fill={p.color}
          fillOpacity={0.7}
          stroke={p.color}
          strokeWidth={0.5}
        />
      ))}

      {/* Hover line */}
      {hoverX !== null && (
        <line
          x1={hoverX}
          y1={padding.top}
          x2={hoverX}
          y2={chartHeight - padding.bottom}
          stroke="#fff"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={0.6}
        />
      )}

      {/* X-axis labels */}
      {chartData.xLabels.map((xl) => (
        <text
          key={xl.label}
          x={xl.x}
          y={chartHeight - padding.bottom + 18}
          textAnchor="middle"
          fill="#a0a0c0"
          fontSize={10}
        >
          {xl.label}
        </text>
      ))}

      {/* Y-axis labels */}
      {chartData.yLabels.map((yl) => (
        <text
          key={yl.label}
          x={padding.left - 8}
          y={yl.y + 3}
          textAnchor="end"
          fill="#a0a0c0"
          fontSize={10}
        >
          {yl.label}
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={padding.left + innerWidth / 2}
        y={chartHeight - 2}
        textAnchor="middle"
        fill="#888"
        fontSize={11}
      >
        Generation
      </text>
      <text
        x={12}
        y={padding.top + innerHeight / 2}
        textAnchor="middle"
        fill="#888"
        fontSize={11}
        transform={`rotate(-90, 12, ${padding.top + innerHeight / 2})`}
      >
        Population %
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Fitness Timeline Chart
// ---------------------------------------------------------------------------

interface FitnessTimelineProps {
  result: PopulationResult;
}

function FitnessTimeline({ result }: FitnessTimelineProps) {
  const { generations, allStrategies } = result;

  const chartWidth = 700;
  const chartHeight = 180;
  const padding = { top: 15, right: 20, bottom: 35, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const chartData = useMemo(() => {
    if (generations.length === 0) return { lines: [], xLabels: [], yLabels: [] };

    const numGens = generations.length;
    const xScale = (gen: number) => padding.left + (gen / Math.max(numGens - 1, 1)) * innerWidth;

    // Find fitness range across all generations and strategies.
    let minFit = Infinity;
    let maxFit = -Infinity;
    for (const gen of generations) {
      for (const s of allStrategies) {
        const f = gen.strategyFitness[s] ?? 0;
        if ((gen.strategyCounts[s] ?? 0) > 0) {
          if (f < minFit) minFit = f;
          if (f > maxFit) maxFit = f;
        }
      }
    }
    if (minFit === Infinity) { minFit = 0; maxFit = 10; }
    if (maxFit === minFit) { maxFit = minFit + 1; }

    // Add some padding to the range.
    const range = maxFit - minFit;
    const yMin = Math.max(0, minFit - range * 0.1);
    const yMax = maxFit + range * 0.1;
    const yScale = (val: number) =>
      padding.top + (1 - (val - yMin) / (yMax - yMin)) * innerHeight;

    // Build line paths for each strategy.
    const lines: { strategy: string; color: string; d: string }[] = [];

    for (let sIdx = 0; sIdx < allStrategies.length; sIdx++) {
      const strategy = allStrategies[sIdx];
      const color = getColor(sIdx);
      const points: string[] = [];

      for (let g = 0; g < numGens; g++) {
        const gen = generations[g];
        if ((gen.strategyCounts[strategy] ?? 0) > 0) {
          const x = xScale(g);
          const y = yScale(gen.strategyFitness[strategy] ?? 0);
          points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }
      }

      if (points.length > 0) {
        const d = `M${points.join(' L')}`;
        lines.push({ strategy, color, d });
      }
    }

    // Axis labels.
    const xLabelCount = Math.min(10, numGens);
    const xStep = Math.max(1, Math.floor(numGens / xLabelCount));
    const xLabels: { x: number; label: string }[] = [];
    for (let g = 0; g < numGens; g += xStep) {
      xLabels.push({ x: xScale(g), label: `${g}` });
    }

    const ySteps = 4;
    const yLabels: { y: number; label: string }[] = [];
    for (let i = 0; i <= ySteps; i++) {
      const val = yMin + (i / ySteps) * (yMax - yMin);
      yLabels.push({ y: yScale(val), label: val.toFixed(1) });
    }

    return { lines, xLabels, yLabels };
  }, [generations, allStrategies, innerWidth, innerHeight, padding.left, padding.top]);

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full">
      {/* Grid lines */}
      {chartData.yLabels.map((yl, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={yl.y}
          x2={chartWidth - padding.right}
          y2={yl.y}
          stroke="#25253e"
          strokeWidth={1}
        />
      ))}

      {/* Lines */}
      {chartData.lines.map((l) => (
        <path
          key={l.strategy}
          d={l.d}
          fill="none"
          stroke={l.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* X-axis labels */}
      {chartData.xLabels.map((xl) => (
        <text
          key={xl.label}
          x={xl.x}
          y={chartHeight - padding.bottom + 16}
          textAnchor="middle"
          fill="#a0a0c0"
          fontSize={10}
        >
          {xl.label}
        </text>
      ))}

      {/* Y-axis labels */}
      {chartData.yLabels.map((yl, i) => (
        <text
          key={i}
          x={padding.left - 8}
          y={yl.y + 3}
          textAnchor="end"
          fill="#a0a0c0"
          fontSize={10}
        >
          {yl.label}
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={padding.left + innerWidth / 2}
        y={chartHeight - 2}
        textAnchor="middle"
        fill="#888"
        fontSize={11}
      >
        Generation
      </text>
      <text
        x={12}
        y={padding.top + innerHeight / 2}
        textAnchor="middle"
        fill="#888"
        fontSize={11}
        transform={`rotate(-90, 12, ${padding.top + innerHeight / 2})`}
      >
        Avg Fitness
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pie Chart
// ---------------------------------------------------------------------------

interface PieChartProps {
  strategyCounts: Record<string, number>;
  allStrategies: string[];
  size?: number;
}

function PieChart({ strategyCounts, allStrategies, size = 140 }: PieChartProps) {
  const total = Object.values(strategyCounts).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const radius = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const slices = useMemo(() => {
    const result: { strategy: string; color: string; d: string; pct: number }[] = [];
    let startAngle = -Math.PI / 2;

    for (let i = 0; i < allStrategies.length; i++) {
      const strat = allStrategies[i];
      const count = strategyCounts[strat] ?? 0;
      if (count === 0) continue;

      const pct = (count / total) * 100;
      const sweepAngle = (count / total) * 2 * Math.PI;
      const endAngle = startAngle + sweepAngle;

      // Handle full circle case.
      if (pct >= 99.9) {
        result.push({
          strategy: strat,
          color: getColor(i),
          d: `M${cx} ${cy - radius} A${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`,
          pct,
        });
        break;
      }

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = sweepAngle > Math.PI ? 1 : 0;

      const d = `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      result.push({ strategy: strat, color: getColor(i), d, pct });

      startAngle = endAngle;
    }

    return result;
  }, [strategyCounts, allStrategies, total, cx, cy, radius]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice) => (
        <path
          key={slice.strategy}
          d={slice.d}
          fill={slice.color}
          fillOpacity={0.85}
          stroke="#1a1a2e"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Hover Tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  result: PopulationResult;
  generation: number;
}

function GenTooltip({ result, generation }: TooltipProps) {
  const gen = result.generations[generation];
  if (!gen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="bg-[#25253e] border border-[#35355e] rounded-lg px-3 py-2 shadow-xl"
    >
      <div className="text-[11px] text-[#a0a0c0] mb-1.5 font-medium">
        Generation {generation}
      </div>
      {result.allStrategies.map((strat, i) => {
        const count = gen.strategyCounts[strat] ?? 0;
        const pct = ((count / result.config.populationSize) * 100).toFixed(1);
        const fitness = gen.strategyFitness[strat]?.toFixed(2) ?? '--';
        return (
          <div key={strat} className="flex items-center gap-2 text-[11px] leading-tight mb-0.5">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: getColor(i) }}
            />
            <span className="text-[#e0e0ff] min-w-[80px]">{strat}</span>
            <span className="text-[#a0a0c0] font-mono">{count} ({pct}%)</span>
            <span className="text-[#888] font-mono ml-1">fit: {fitness}</span>
          </div>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface PopulationDynamicsProps {
  analysis: GameAnalysis;
}

export default function PopulationDynamics({ analysis }: PopulationDynamicsProps) {
  const [config, setConfig] = useState<PopulationConfig>({
    populationSize: 100,
    generations: 50,
    mutationRate: 0.02,
    selectionPressure: 0.5,
  });
  const [result, setResult] = useState<PopulationResult | null>(null);
  const [hoveredGen, setHoveredGen] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(() => {
    setIsRunning(true);
    // Use a tiny timeout so the UI can show the running state before blocking.
    setTimeout(() => {
      const res = runPopulationSimulation(analysis, config);
      setResult(res);
      setIsRunning(false);
    }, 50);
  }, [analysis, config]);

  const lastGen = useMemo(() => {
    if (!result || result.generations.length === 0) return null;
    return result.generations[result.generations.length - 1];
  }, [result]);

  return (
    <div className="space-y-4">
      {/* ---- Config Panel ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a1a2e] border border-[#25253e] rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <DnaIcon className="w-5 h-5 text-[#00b894]" />
          <h3 className="text-sm font-semibold text-[#e0e0ff]">
            Population Dynamics Configuration
          </h3>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-4 mb-4">
          <ConfigSlider
            label="Population Size"
            value={config.populationSize}
            min={20}
            max={500}
            step={10}
            displayValue={`${config.populationSize}`}
            onChange={(v) => setConfig((c) => ({ ...c, populationSize: v }))}
          />
          <ConfigSlider
            label="Generations"
            value={config.generations}
            min={10}
            max={200}
            step={10}
            displayValue={`${config.generations}`}
            onChange={(v) => setConfig((c) => ({ ...c, generations: v }))}
          />
          <ConfigSlider
            label="Mutation Rate"
            value={config.mutationRate}
            min={0}
            max={0.1}
            step={0.005}
            displayValue={`${(config.mutationRate * 100).toFixed(1)}%`}
            onChange={(v) => setConfig((c) => ({ ...c, mutationRate: v }))}
          />
          <ConfigSlider
            label="Selection Pressure"
            value={config.selectionPressure}
            min={0}
            max={1}
            step={0.1}
            displayValue={config.selectionPressure.toFixed(1)}
            onChange={(v) => setConfig((c) => ({ ...c, selectionPressure: v }))}
          />
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="px-5 py-2 rounded-lg font-medium text-sm text-white transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-[#00b894] hover:bg-[#00a884] active:scale-[0.97]
            shadow-[0_0_16px_rgba(0,184,148,0.3)]"
        >
          {isRunning ? 'Evolving...' : 'Run Evolution'}
        </button>
      </motion.div>

      {/* ---- Results ---- */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Stacked Area Chart */}
            <div className="bg-[#1a1a2e] border border-[#25253e] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-[#55efc4] mb-1">
                Population Composition Over Time
              </h4>
              <p className="text-[10px] text-[#888] mb-3">
                Each colored band represents a strategy&apos;s share of the population. Hover to see exact counts.
              </p>

              <div className="relative">
                <StackedAreaChart
                  result={result}
                  hoveredGen={hoveredGen}
                  onHover={setHoveredGen}
                />

                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredGen !== null && (
                    <div className="absolute top-0 right-0 z-10">
                      <GenTooltip result={result} generation={hoveredGen} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3">
                {result.allStrategies.map((strat, i) => (
                  <div key={strat} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: getColor(i) }}
                    />
                    <span className="text-[11px] text-[#c0c0e0]">{strat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fitness Timeline */}
            <div className="bg-[#1a1a2e] border border-[#25253e] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-[#55efc4] mb-1">
                Strategy Fitness Over Time
              </h4>
              <p className="text-[10px] text-[#888] mb-3">
                Average payoff for each strategy per generation. Shows which strategies are performing well.
              </p>
              <FitnessTimeline result={result} />
            </div>

            {/* Results Panel */}
            <div className="bg-[#1a1a2e] border border-[#25253e] rounded-xl p-4">
              <h4 className="text-xs font-semibold text-[#55efc4] mb-4">
                Evolution Results
              </h4>

              <div className="flex flex-wrap gap-4 mb-5">
                {/* Winner badge */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 bg-[#00b894]/15 border border-[#00b894]/30 rounded-lg px-3 py-2"
                >
                  <TrophyIcon className="w-5 h-5 text-[#ffd700]" />
                  <div>
                    <div className="text-[10px] text-[#55efc4] font-medium">Dominant Strategy</div>
                    <div className="text-sm text-white font-semibold">
                      {result.dominantStrategy}
                    </div>
                    {lastGen && (
                      <div className="text-[10px] text-[#a0a0c0]">
                        {((lastGen.strategyCounts[result.dominantStrategy] ?? 0) / config.populationSize * 100).toFixed(1)}% of population
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Extinct badges */}
                {result.extinctStrategies.map((strat, i) => (
                  <motion.div
                    key={strat}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="flex items-center gap-2 bg-[#e17055]/15 border border-[#e17055]/30 rounded-lg px-3 py-2"
                  >
                    <SkullIcon className="w-5 h-5 text-[#e17055]" />
                    <div>
                      <div className="text-[10px] text-[#e17055] font-medium">Extinct</div>
                      <div className="text-sm text-[#c0c0e0] font-semibold">{strat}</div>
                    </div>
                  </motion.div>
                ))}
                {result.extinctStrategies.length === 0 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2 bg-[#6c5ce7]/15 border border-[#6c5ce7]/30 rounded-lg px-3 py-2"
                  >
                    <DnaIcon className="w-4 h-4 text-[#a29bfe]" />
                    <div>
                      <div className="text-[10px] text-[#a29bfe] font-medium">No Extinctions</div>
                      <div className="text-[11px] text-[#c0c0e0]">All strategies survived</div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Pie chart + final distribution */}
              <div className="flex flex-wrap items-start gap-6 mb-5">
                {lastGen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-[10px] text-[#888] mb-2 font-medium">
                      Final Population Distribution
                    </div>
                    <PieChart
                      strategyCounts={lastGen.strategyCounts}
                      allStrategies={result.allStrategies}
                    />
                  </motion.div>
                )}

                {lastGen && (
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-[10px] text-[#888] mb-2 font-medium">
                      Final Counts
                    </div>
                    <div className="space-y-1.5">
                      {result.allStrategies.map((strat, i) => {
                        const count = lastGen.strategyCounts[strat] ?? 0;
                        const pct = (count / config.populationSize) * 100;
                        return (
                          <div key={strat} className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: getColor(i) }}
                            />
                            <span className="text-[11px] text-[#c0c0e0] min-w-[80px]">
                              {strat}
                            </span>
                            <div className="flex-1 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: getColor(i) }}
                              />
                            </div>
                            <span className="text-[10px] text-[#a0a0c0] font-mono min-w-[60px] text-right">
                              {count} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Insights */}
              <div>
                <div className="text-[10px] text-[#888] mb-2 font-medium">
                  Evolutionary Insights
                </div>
                <div className="space-y-2">
                  {result.insights.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="text-[12px] text-[#c0c0e0] leading-relaxed bg-[#25253e]/50 rounded-lg px-3 py-2 border-l-2 border-[#00b894]/40"
                    >
                      {insight}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
