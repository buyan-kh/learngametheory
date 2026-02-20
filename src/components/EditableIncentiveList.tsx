'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Incentive {
  incentive: string;
  strength: number;
}

interface EditableIncentiveListProps {
  incentives: Incentive[];
  playerId: string;
  color: string;
  onAdd: (incentive: string, strength: number) => void;
  onRemove: (index: number) => void;
  onEdit: (index: number, updates: { incentive?: string; strength?: number }) => void;
}

export default function EditableIncentiveList({
  incentives,
  playerId,
  color,
  onAdd,
  onRemove,
  onEdit,
}: EditableIncentiveListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addStrength, setAddStrength] = useState(0.5);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingIndex]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(incentives[index].incentive);
  };

  const confirmEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      onEdit(editingIndex, { incentive: editValue.trim() });
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const confirmAdd = () => {
    if (addValue.trim()) {
      onAdd(addValue.trim(), addStrength);
      setAddValue('');
      setAddStrength(0.5);
      setIsAdding(false);
    }
  };

  const cancelAdd = () => {
    setAddValue('');
    setAddStrength(0.5);
    setIsAdding(false);
  };

  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider opacity-50">
        Incentives
      </span>
      <AnimatePresence mode="popLayout">
        {incentives.map((inc, i) => (
          <motion.div
            key={`incentive-${playerId}-${i}-${inc.incentive}`}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-1 group"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${inc.strength * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-[10px] opacity-70 w-6 text-right">
                {Math.round(inc.strength * 100)}%
              </span>
              {hoveredIndex === i && (
                <span className="inline-flex items-center gap-0.5">
                  <button
                    onClick={() => startEdit(i)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color }}
                    title="Edit"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onRemove(i)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color }}
                    title="Remove"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
            {editingIndex === i ? (
              <div className="mt-0.5 space-y-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={confirmEdit}
                  className="text-[10px] w-full px-1.5 py-0.5 rounded border bg-[#0d0d20] outline-none"
                  style={{
                    borderColor: color + '60',
                    color: color,
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-[9px] opacity-40">Strength</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(inc.strength * 100)}
                    onChange={(e) =>
                      onEdit(i, { strength: Number(e.target.value) / 100 })
                    }
                    className="flex-1 h-1 accent-current cursor-pointer"
                    style={{ color }}
                  />
                  <span className="text-[9px] opacity-50 w-6 text-right">
                    {Math.round(inc.strength * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[10px] opacity-60 mt-0.5">{inc.incentive}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add incentive */}
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="add-incentive-input"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mt-2 space-y-1 p-2 rounded border border-dashed"
            style={{ borderColor: color + '30' }}
          >
            <input
              ref={addInputRef}
              type="text"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmAdd();
                if (e.key === 'Escape') cancelAdd();
              }}
              placeholder="New incentive..."
              className="text-[10px] w-full px-1.5 py-0.5 rounded border bg-[#0d0d20] outline-none placeholder:opacity-40"
              style={{
                borderColor: color + '40',
                color: color,
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-[9px] opacity-40">Strength</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(addStrength * 100)}
                onChange={(e) => setAddStrength(Number(e.target.value) / 100)}
                className="flex-1 h-1 accent-current cursor-pointer"
                style={{ color }}
              />
              <span className="text-[9px] opacity-50 w-6 text-right">
                {Math.round(addStrength * 100)}%
              </span>
            </div>
            <div className="flex gap-1 justify-end">
              <button
                onClick={cancelAdd}
                className="text-[9px] px-2 py-0.5 rounded opacity-50 hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="text-[9px] px-2 py-0.5 rounded font-bold transition-opacity"
                style={{
                  backgroundColor: color + '20',
                  color: color,
                  opacity: addValue.trim() ? 1 : 0.4,
                }}
                disabled={!addValue.trim()}
              >
                Add
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="add-incentive-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsAdding(true)}
            className="mt-2 text-[10px] px-2 py-0.5 rounded-full border border-dashed opacity-40 hover:opacity-70 transition-opacity"
            style={{
              borderColor: color + '60',
              color: color,
            }}
          >
            + Add Incentive
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
