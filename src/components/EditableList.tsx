'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditableListProps {
  items: string[];
  label: string;
  color: string;
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  onEdit: (index: number, newValue: string) => void;
  minItems?: number;
}

export default function EditableList({
  items,
  label,
  color,
  onAdd,
  onRemove,
  onEdit,
  minItems = 0,
}: EditableListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
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
    setEditValue(items[index]);
  };

  const confirmEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      onEdit(editingIndex, editValue.trim());
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
      onAdd(addValue.trim());
      setAddValue('');
      setIsAdding(false);
    }
  };

  const cancelAdd = () => {
    setAddValue('');
    setIsAdding(false);
  };

  const canRemove = items.length > minItems;

  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider opacity-50">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 mt-1">
        <AnimatePresence mode="popLayout">
          {items.map((item, i) => (
            <motion.div
              key={`${label}-${i}-${item}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="relative"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {editingIndex === i ? (
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
                  className="text-[10px] px-1.5 py-0.5 rounded-full border bg-[#0d0d20] outline-none"
                  style={{
                    borderColor: color,
                    color: color,
                    minWidth: '60px',
                  }}
                />
              ) : (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 cursor-default"
                  style={{
                    borderColor: color + '40',
                    color: color,
                  }}
                >
                  {item}
                  {hoveredIndex === i && (
                    <span className="inline-flex items-center gap-0.5 ml-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(i);
                        }}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        title="Edit"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      {canRemove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(i);
                          }}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </span>
                  )}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add button / input */}
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.div
              key="add-input"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
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
                onBlur={() => {
                  if (addValue.trim()) {
                    confirmAdd();
                  } else {
                    cancelAdd();
                  }
                }}
                placeholder={`New ${label.toLowerCase().replace(/s$/, '')}...`}
                className="text-[10px] px-1.5 py-0.5 rounded-full border bg-[#0d0d20] outline-none placeholder:opacity-40"
                style={{
                  borderColor: color + '60',
                  color: color,
                  minWidth: '80px',
                }}
              />
            </motion.div>
          ) : (
            <motion.button
              key="add-button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsAdding(true)}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed opacity-40 hover:opacity-70 transition-opacity"
              style={{
                borderColor: color + '60',
                color: color,
              }}
            >
              +
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
