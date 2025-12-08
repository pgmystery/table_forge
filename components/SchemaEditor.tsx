import React, { useState } from 'react';
import { FieldDefinition, FieldType } from '../types';
import { Plus, Trash2, GripVertical, Settings, X } from 'lucide-react';

interface SchemaEditorProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ fields, onChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const generateId = () => {
    // Fallback for environments where crypto.randomUUID is not available (non-secure contexts)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  };

  const addField = () => {
    const newField: FieldDefinition = {
      id: generateId(),
      name: 'New Field',
      type: FieldType.Text,
    };
    onChange([...fields, newField]);
    setEditingId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const row = e.currentTarget.closest('[data-row-id]');
    if (row) {
        e.dataTransfer.setDragImage(row, 20, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    if (draggedIndex === index) return;

    const newFields = [...fields];
    const [draggedItem] = newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);
    
    onChange(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Helper for Key-Value Options
  const addKeyValueOption = (fieldId: string, currentOptions: { key: string; value: string }[] = []) => {
    updateField(fieldId, { 
        keyValueOptions: [...currentOptions, { key: 'New Label', value: 'value_1' }] 
    });
  };

  const updateKeyValueOption = (
      fieldId: string, 
      optionIndex: number, 
      key: string, 
      value: string, 
      currentOptions: { key: string; value: string }[]
  ) => {
      const newOptions = [...currentOptions];
      newOptions[optionIndex] = { key, value };
      updateField(fieldId, { keyValueOptions: newOptions });
  };

  const removeKeyValueOption = (
      fieldId: string, 
      optionIndex: number, 
      currentOptions: { key: string; value: string }[]
  ) => {
      const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
      updateField(fieldId, { keyValueOptions: newOptions });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-80 shrink-0">
      <div className="p-4 border-b border-slate-800 bg-slate-950">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Settings size={18} className="text-indigo-400" />
          Field Schema
        </h2>
        <p className="text-xs text-slate-400 mt-1">Define your game data structure</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {fields.map((field, index) => (
          <div 
            key={field.id}
            data-row-id={field.id}
            onDragOver={(e) => handleDragOver(e, index)}
            className={`p-3 rounded-lg border transition-all ${
              editingId === field.id 
                ? 'bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                : 'bg-slate-900 border-slate-700 hover:border-slate-600'
            } ${draggedIndex === index ? 'opacity-40 border-dashed border-slate-600' : ''}`}
          >
            <div className="flex items-start gap-2">
              <div 
                className="mt-2 text-slate-500 cursor-grab active:cursor-grabbing hover:text-slate-300 touch-none"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical size={16} />
              </div>
              
              <div className="flex-1 space-y-3 min-w-0">
                {/* Field Name */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    onFocus={() => setEditingId(field.id)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Health Points"
                  />
                </div>

                {/* Field Type */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                    onFocus={() => setEditingId(field.id)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={FieldType.Text}>Text (Short)</option>
                    <option value={FieldType.LongText}>Text (Long/Description)</option>
                    <option value={FieldType.Number}>Number</option>
                    <option value={FieldType.Boolean}>Checkbox (Boolean)</option>
                    <option value={FieldType.Select}>Dropdown List (Simple)</option>
                    <option value={FieldType.KeyValueSelect}>Mapped Dropdown (Key → Value)</option>
                    <option value={FieldType.Image}>Image / URL</option>
                  </select>
                </div>

                {/* Simple Select Options */}
                {field.type === FieldType.Select && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Options (comma separated)</label>
                    <input
                      type="text"
                      value={field.options?.join(', ') || ''}
                      onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Common, Rare, Epic"
                    />
                  </div>
                )}

                {/* Key-Value Select Options */}
                {field.type === FieldType.KeyValueSelect && (
                    <div className="bg-slate-950 border border-slate-700 rounded p-2 mt-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Mapped Options</label>
                        <div className="grid grid-cols-[1fr_1fr_20px] gap-2 items-center mb-2">
                             <span className="text-[10px] text-slate-400 font-medium pl-1">Display Label</span>
                             <span className="text-[10px] text-slate-400 font-medium pl-1">Export Value</span>
                             <span></span>
                        </div>
                        
                        <div className="space-y-2">
                            {(field.keyValueOptions || []).map((opt, optIdx) => (
                                <div key={optIdx} className="grid grid-cols-[1fr_1fr_20px] gap-2 items-center">
                                    <input 
                                        type="text" 
                                        value={opt.key}
                                        onChange={(e) => updateKeyValueOption(field.id, optIdx, e.target.value, opt.value, field.keyValueOptions || [])}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none placeholder-slate-600"
                                        placeholder="Label"
                                    />
                                    <input 
                                        type="text" 
                                        value={opt.value}
                                        onChange={(e) => updateKeyValueOption(field.id, optIdx, opt.key, e.target.value, field.keyValueOptions || [])}
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-indigo-300 font-mono focus:border-indigo-500 outline-none placeholder-slate-600"
                                        placeholder="Value"
                                    />
                                    <button 
                                        onClick={() => removeKeyValueOption(field.id, optIdx, field.keyValueOptions || [])}
                                        className="text-slate-600 hover:text-red-400 flex justify-center items-center h-full w-full"
                                        title="Remove Option"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button 
                            onClick={() => addKeyValueOption(field.id, field.keyValueOptions)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 mt-3 px-1 py-1 hover:bg-slate-900 rounded w-full justify-center border border-dashed border-slate-800 hover:border-indigo-500/50 transition-colors"
                        >
                            <Plus size={12} /> Add Option
                        </button>
                    </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeField(field.id);
                }}
                className="mt-1 text-slate-500 hover:text-red-400 transition-colors p-1"
                title="Remove Field"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addField}
          className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-indigo-400 hover:border-indigo-400 hover:bg-slate-900 transition-all flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <Plus size={16} /> Add Field
        </button>
      </div>
    </div>
  );
};

export default SchemaEditor;