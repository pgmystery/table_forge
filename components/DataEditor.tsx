import React, { useState } from 'react';
import { FieldDefinition, FieldType, RowData } from '../types';
import { Trash2, Plus, Copy, Image as ImageIcon, ChevronDown, ChevronUp, Upload } from 'lucide-react';

interface DataEditorProps {
  schema: FieldDefinition[];
  rows: RowData[];
  onRowsChange: (rows: RowData[]) => void;
}

const DataEditor: React.FC<DataEditorProps> = ({ schema, rows, onRowsChange }) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const updateCell = (rowIndex: number, fieldId: string, value: any) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [fieldId]: value };
    onRowsChange(newRows);
  };

  const addRow = () => {
    const newRow: RowData = {};
    schema.forEach(f => {
      newRow[f.id] = f.defaultValue || (f.type === FieldType.Boolean ? false : '');
    });
    onRowsChange([...rows, newRow]);
  };

  const deleteRow = (index: number) => {
    onRowsChange(rows.filter((_, i) => i !== index));
  };

  const duplicateRow = (index: number) => {
    const rowToCopy = rows[index];
    const newRows = [...rows];
    newRows.splice(index + 1, 0, { ...rowToCopy });
    onRowsChange(newRows);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= rows.length) return;
    const newRows = [...rows];
    const temp = newRows[index];
    newRows[index] = newRows[index + direction];
    newRows[index + direction] = temp;
    onRowsChange(newRows);
  };

  // Helper to render input based on type
  const renderCellInput = (row: RowData, rowIndex: number, field: FieldDefinition) => {
    const value = row[field.id];

    switch (field.type) {
      case FieldType.Boolean:
        return (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => updateCell(rowIndex, field.id, e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
          </div>
        );
      case FieldType.Select:
        return (
          <select
            value={value || ''}
            onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 focus:outline-none p-1 rounded hover:bg-slate-800"
          >
            <option value="" disabled>Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt} className="bg-slate-900 text-slate-200">{opt}</option>
            ))}
          </select>
        );
      case FieldType.KeyValueSelect:
        return (
          <select
            value={value || ''}
            onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
            className="w-full bg-transparent text-sm text-indigo-200 focus:outline-none p-1 rounded hover:bg-slate-800 font-medium"
          >
            <option value="" disabled>Select...</option>
            {field.keyValueOptions?.map((opt, idx) => (
              <option key={idx} value={opt.value} className="bg-slate-900 text-slate-200">
                {opt.key}
              </option>
            ))}
          </select>
        );
      case FieldType.LongText:
        return (
            <textarea
              value={value || ''}
              onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
              className="w-full bg-transparent text-sm text-slate-200 focus:outline-none p-1 rounded hover:bg-slate-800 min-h-[2.5rem] resize-y"
              rows={1}
            />
        );
      case FieldType.Image:
        return (
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700 relative group/preview">
                    {value ? (
                        <img src={value} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600"/>
                    )}
                 </div>
                 <div className="flex-1 flex items-center min-w-0 gap-1">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
                        placeholder="https://..."
                        className="flex-1 w-full bg-transparent text-sm text-slate-200 focus:outline-none p-1 rounded hover:bg-slate-800 min-w-0"
                    />
                    <label className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded cursor-pointer transition-colors flex-shrink-0" title="Upload Image">
                        <Upload size={14} />
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        if(ev.target?.result) {
                                            updateCell(rowIndex, field.id, ev.target.result);
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                    </label>
                 </div>
            </div>
        )
      case FieldType.Number:
        return (
             <input
                type="number"
                value={value || ''}
                onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
                className="w-full bg-transparent text-sm text-slate-200 focus:outline-none p-1 rounded hover:bg-slate-800 text-right font-mono"
            />
        )
      default: // Text
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 focus:outline-none p-1 rounded hover:bg-slate-800"
          />
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse relative">
          <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
            <tr>
              <th className="p-2 w-16 border-b border-r border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                #
              </th>
              {schema.map(field => (
                <th key={field.id} className="p-3 border-b border-r border-slate-800 text-left min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{field.name}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-1 rounded">{field.type}</span>
                  </div>
                </th>
              ))}
              <th className="p-2 border-b border-slate-800 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr 
                key={index} 
                className={`group border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors ${hoveredRow === index ? 'bg-slate-900/30' : ''}`}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="p-2 border-r border-slate-800 text-center text-xs text-slate-500 font-mono">
                  {index + 1}
                </td>
                {schema.map(field => (
                  <td key={field.id} className="p-2 border-r border-slate-800/50 align-top">
                    {renderCellInput(row, index, field)}
                  </td>
                ))}
                <td className="p-2 text-center whitespace-nowrap">
                   <div className="flex items-center justify-center gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col">
                        <button onClick={() => moveRow(index, -1)} disabled={index === 0} className="hover:text-indigo-400 disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => moveRow(index, 1)} disabled={index === rows.length - 1} className="hover:text-indigo-400 disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <button onClick={() => duplicateRow(index)} className="p-1 hover:text-blue-400" title="Duplicate"><Copy size={14}/></button>
                      <button onClick={() => deleteRow(index)} className="p-1 hover:text-red-400" title="Delete"><Trash2 size={14}/></button>
                   </div>
                </td>
              </tr>
            ))}
            
            {/* Empty State / Add Row Area */}
            {rows.length === 0 && (
                <tr>
                    <td colSpan={schema.length + 2} className="p-12 text-center text-slate-600">
                        <p className="mb-4">No data yet.</p>
                        <button 
                            onClick={addRow}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Create First Row
                        </button>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Floating Add Button if rows exist */}
      {rows.length > 0 && (
          <div className="absolute bottom-6 right-8">
              <button 
                onClick={addRow}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg shadow-indigo-900/50 hover:scale-105 transition-all flex items-center justify-center"
                title="Add New Row"
              >
                  <Plus size={24} />
              </button>
          </div>
      )}
    </div>
  );
};

export default DataEditor;