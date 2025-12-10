import React, { useState, useMemo, useEffect } from 'react';
import { FieldDefinition, FieldType, RowData, GroupDefinition } from '../types';
import { Trash2, Plus, Copy, ChevronDown, ChevronUp, Upload, FileImage, Link, FolderPlus, FolderOpen, Folder, MoreHorizontal, Settings } from 'lucide-react';

interface DataEditorProps {
  schema: FieldDefinition[];
  rows: RowData[];
  groups: GroupDefinition[];
  assetPrefix?: string;
  onRowsChange: (rows: RowData[]) => void;
  onGroupsChange: (groups: GroupDefinition[]) => void;
}

const DataEditor: React.FC<DataEditorProps> = ({ schema, rows, groups, assetPrefix = '', onRowsChange, onGroupsChange }) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [activeMenuRow, setActiveMenuRow] = useState<number | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Track selected group ID for adding new rows. null represents "Ungrouped".
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Map for O(1) group lookup
  const groupMap = useMemo(() => {
    return new Map(groups.map(g => [g.id, g]));
  }, [groups]);

  // If the selected group is deleted, reset selection to null (Ungrouped)
  useEffect(() => {
    if (selectedGroupId && !groups.find(g => g.id === selectedGroupId)) {
      setSelectedGroupId(null);
    }
  }, [groups, selectedGroupId]);

  const updateCell = (rowIndex: number, fieldId: string, value: any) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [fieldId]: value };
    onRowsChange(newRows);
  };

  const addRow = (groupId?: string | null) => {
    const targetGroupId = groupId === null ? undefined : groupId;
    const newRow: RowData = { __groupId: targetGroupId };
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
    // Copy keeping the same group ID
    newRows.splice(index + 1, 0, { ...rowToCopy });
    onRowsChange(newRows);
  };

  const moveRowWithinGroup = (originalIndex: number, direction: -1 | 1, currentGroupId: string | undefined) => {
    // Create a list of indices that belong to this group
    const groupIndices = rows.map((r, i) => ({ ...r, index: i } as RowData & { index: number }))
                             .filter(r => r.__groupId === currentGroupId)
                             .map(r => r.index);

    const currentGroupPos = groupIndices.indexOf(originalIndex);
    if (currentGroupPos === -1) return;

    const targetGroupPos = currentGroupPos + direction;
    if (targetGroupPos < 0 || targetGroupPos >= groupIndices.length) return;

    const targetIndex = groupIndices[targetGroupPos];

    const newRows = [...rows];
    const temp = newRows[originalIndex];
    newRows[originalIndex] = newRows[targetIndex];
    newRows[targetIndex] = temp;

    onRowsChange(newRows);
  };

  const assignRowToGroup = (rowIndex: number, groupId: string | undefined) => {
    const newRows = [...rows];
    newRows[rowIndex] = { ...newRows[rowIndex], __groupId: groupId };
    onRowsChange(newRows);
    setActiveMenuRow(null); // Close menu after selection
  };

  // Group Management
  const addGroup = () => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    const newGroup: GroupDefinition = {
      id: newId,
      name: `Group ${groups.length + 1}`,
      collapsed: false
    };
    onGroupsChange([...groups, newGroup]);
    setSelectedGroupId(newId); // Select the newly created group
  };

  const updateGroup = (id: string, updates: Partial<GroupDefinition>) => {
    onGroupsChange(groups.map(g => g.id === id ? { ...g, ...updates } : g));

    // Propagate asset prefix change to rows
    if ('assetPrefix' in updates) {
      // If updates.assetPrefix is undefined/null, it means we might be resetting to global (if UI supported it),
      // or just updating to a new string.
      // Logic: Use specific new prefix, or fallback to global if undefined is passed (Reset scenario).
      const newEffectivePrefix = (updates.assetPrefix !== undefined && updates.assetPrefix !== null)
                                 ? updates.assetPrefix
                                 : assetPrefix;

      const updatedRows = rows.map(row => {
        // Only affect rows in this group
        if (row.__groupId !== id) return row;

        const newRow = { ...row };
        let rowChanged = false;

        schema.forEach(field => {
          if (field.type === FieldType.ImageFile) {
            const cellData = newRow[field.id];
            // Only update if we have a valid file object with a filename to rebuild from
            if (cellData && typeof cellData === 'object' && cellData.fileName) {
              newRow[field.id] = {
                ...cellData,
                filePath: newEffectivePrefix + cellData.fileName
              };
              rowChanged = true;
            }
          }
        });

        return rowChanged ? newRow : row;
      });

      onRowsChange(updatedRows);
    }
  };

  const deleteGroup = (id: string) => {
    if (confirm("Delete this group? Rows will be ungrouped.")) {
      onGroupsChange(groups.filter(g => g.id !== id));
      const newRows = rows.map(r => r.__groupId === id ? { ...r, __groupId: undefined } : r);
      onRowsChange(newRows);
    }
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
      case FieldType.ImageURL:
        return (
          <div className="flex items-center gap-2 group/url">
            {value && typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:')) ? (
              <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700 relative">
                <img src={value} alt="preview" className="w-full h-full object-cover" />
              </div>
            ) : (
               <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 flex items-center justify-center border border-slate-700 text-slate-600">
                 <Link size={14} />
               </div>
             )}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => updateCell(rowIndex, field.id, e.target.value)}
              placeholder="https://..."
              className="flex-1 w-full bg-transparent text-sm text-slate-200 focus:outline-none p-1 rounded hover:bg-slate-800 min-w-0"
            />
          </div>
        );
      case FieldType.ImageFile:
        // Ensure structure is robust
        const fileValue = typeof value === 'string' ? { fileName: value, filePath: value, fileData: null } : value;
        const fileName = fileValue?.fileName || '';
        const filePath = fileValue?.filePath || fileName || '';
        const fileData = fileValue?.fileData;

        // Determine effective prefix: Group > Global
        const group = row.__groupId ? groupMap.get(row.__groupId) : undefined;
        // Use group prefix if strictly defined (allow empty string if intended?), here we assume if present it overrides
        // A common pattern: if group.assetPrefix is undefined, use global. If it is string (even empty), use it.
        // But for simplicity in UX, usually users set "Folder/" for group.
        const effectivePrefix = (group?.assetPrefix !== undefined && group.assetPrefix !== null)
                                ? group.assetPrefix
                                : assetPrefix;

        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700 relative flex items-center justify-center">
              {fileData ? (
                <img src={fileData} alt="preview" className="w-full h-full object-cover" />
              ) : (
                 <FileImage size={14} className="text-slate-600"/>
               )}
            </div>
            <div className="flex-1 flex items-center min-w-0 gap-2">
              <input
                type="text"
                value={filePath}
                onChange={(e) => updateCell(rowIndex, field.id, {
                  ...fileValue,
                  filePath: e.target.value,
                  // If they change the path manually, we update the path but keep the original filename if they haven't cleared it
                  fileName: fileName || e.target.value
                })}
                placeholder={effectivePrefix ? `Prefix: ${effectivePrefix}` : "Path to asset..."}
                className={`flex-1 w-full bg-transparent text-sm focus:outline-none p-1 rounded hover:bg-slate-800 min-w-0 ${filePath ? 'text-indigo-300' : 'text-slate-500'}`}
                title={effectivePrefix ? `Active Prefix: ${effectivePrefix}` : "No prefix"}
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
                          updateCell(rowIndex, field.id, {
                            fileName: file.name,
                            filePath: effectivePrefix + file.name, // Prepend effective prefix
                            fileData: ev.target.result
                          });
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

  // Organize rows into groups
  const groupedData = useMemo(() => {
    const rowsWithIndices = rows.map((r, i) => ({ ...r, _originalIndex: i } as RowData & { _originalIndex: number }));

    const result = groups.map(group => ({
      ...group,
      items: rowsWithIndices.filter(r => r.__groupId === group.id)
    }));

    // Add Ungrouped
    const ungroupedItems = rowsWithIndices.filter(r => !r.__groupId || !groups.find(g => g.id === r.__groupId));

    return {
      groups: result,
      ungrouped: ungroupedItems
    };
  }, [rows, groups]);

  const getSelectedGroupName = () => {
    if (selectedGroupId === null) return 'Ungrouped';
    return groups.find(g => g.id === selectedGroupId)?.name || 'Unknown Group';
  };

  const editingGroup = useMemo(() => groups.find(g => g.id === editingGroupId), [groups, editingGroupId]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Backdrop for menu closing */}
      {activeMenuRow !== null && (
        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveMenuRow(null)}></div>
      )}

      <div className="bg-slate-900 border-b border-slate-800 p-2 flex items-center justify-between">
        <div className="text-xs text-slate-500 font-bold px-2">GROUPS</div>
        <button
          onClick={addGroup}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-indigo-600 hover:text-white px-2 py-1 rounded text-slate-300 transition-colors"
        >
          <FolderPlus size={14} /> Add Group
        </button>
      </div>

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
            <th className="p-2 border-b border-slate-800 w-32">Actions</th>
          </tr>
          </thead>
          <tbody>
          {/* Render Groups */}
          {groupedData.groups.map(group => (
            <React.Fragment key={group.id}>
              {/* Group Header */}
              <tr
                className={`border-b border-slate-800 transition-colors cursor-pointer ${selectedGroupId === group.id ? 'bg-indigo-900/40 border-l-4 border-l-indigo-500' : 'bg-slate-900/50 hover:bg-slate-900 border-l-4 border-l-transparent'}`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <td className="p-2 text-center border-r border-slate-800 text-slate-500">
                  <button onClick={(e) => { e.stopPropagation(); updateGroup(group.id, { collapsed: !group.collapsed }); }}>
                    {group.collapsed ? <Folder size={14} /> : <FolderOpen size={14} />}
                  </button>
                </td>
                <td colSpan={schema.length} className="p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={group.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                      className="bg-transparent font-bold text-sm text-indigo-300 focus:outline-none focus:text-white"
                    />
                    <span className="text-xs text-slate-500">({group.items.length})</span>
                    {selectedGroupId === group.id && <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded ml-2">Active</span>}

                    {group.assetPrefix && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded ml-2 flex items-center gap-1 border border-slate-700" title={`Asset Prefix: ${group.assetPrefix}`}>
                                        <FolderOpen size={10} /> {group.assetPrefix}
                                    </span>
                    )}
                  </div>
                </td>
                <td className="p-2 text-center flex items-center justify-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); }}
                    className="text-slate-600 hover:text-indigo-400 p-1"
                    title="Group Settings"
                  >
                    <Settings size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} className="text-slate-600 hover:text-red-400 p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>

              {/* Group Rows */}
              {!group.collapsed && group.items.map((row) => (
                <tr
                  key={row._originalIndex}
                  className={`group border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors ${hoveredRow === row._originalIndex ? 'bg-slate-900/30' : ''}`}
                  onMouseEnter={() => setHoveredRow(row._originalIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="p-2 border-r border-slate-800 text-center text-xs text-slate-500 font-mono">
                    {row._originalIndex + 1}
                  </td>
                  {schema.map(field => (
                    <td key={field.id} className="p-2 border-r border-slate-800/50 align-top">
                      {renderCellInput(row, row._originalIndex, field)}
                    </td>
                  ))}
                  <td className="p-2 text-center whitespace-nowrap">
                    {/* Added explicit opacity control: if menu is open, force opacity 100 */}
                    <div className={`flex items-center justify-center gap-1 transition-opacity ${activeMenuRow === row._originalIndex ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
                      <div className="flex flex-col">
                        <button onClick={() => moveRowWithinGroup(row._originalIndex, -1, group.id)} className="hover:text-indigo-400"><ChevronUp size={12} /></button>
                        <button onClick={() => moveRowWithinGroup(row._originalIndex, 1, group.id)} className="hover:text-indigo-400"><ChevronDown size={12} /></button>
                      </div>
                      <button onClick={() => duplicateRow(row._originalIndex)} className="p-1 hover:text-blue-400" title="Duplicate"><Copy size={14}/></button>

                      {/* Group Mover Dropdown - Click Activated with Z-Index fix */}
                      <div className={`relative ${activeMenuRow === row._originalIndex ? 'z-50' : ''}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenuRow(activeMenuRow === row._originalIndex ? null : row._originalIndex); }}
                          className={`p-1 hover:text-slate-200 ${activeMenuRow === row._originalIndex ? 'text-indigo-400' : ''}`}
                        >
                          <MoreHorizontal size={14}/>
                        </button>

                        {activeMenuRow === row._originalIndex && (
                          <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded shadow-xl p-1 w-40 max-h-48 overflow-y-auto">
                            <div className="text-[10px] text-slate-500 uppercase font-bold px-2 py-1 border-b border-slate-800 mb-1">Move to</div>
                            <button
                              onClick={(e) => { e.stopPropagation(); assignRowToGroup(row._originalIndex, undefined); }}
                              className="w-full text-left text-xs p-2 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"
                            >
                              <FolderOpen size={12} className="text-slate-500" /> Ungrouped
                            </button>
                            {groups.filter(g => g.id !== group.id).map(g => (
                              <button
                                key={g.id}
                                onClick={(e) => { e.stopPropagation(); assignRowToGroup(row._originalIndex, g.id); }}
                                className="w-full text-left text-xs p-2 hover:bg-slate-800 rounded text-slate-300 truncate flex items-center gap-2"
                              >
                                <Folder size={12} className="text-indigo-400" /> {g.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button onClick={() => deleteRow(row._originalIndex)} className="p-1 hover:text-red-400" title="Delete"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Inline Add Row Button */}
              {!group.collapsed && (
                <tr className="border-b border-slate-800/30">
                  <td colSpan={schema.length + 2} className="p-0">
                    <button
                      onClick={() => addRow(group.id)}
                      className="w-full py-1 text-xs text-slate-600 hover:text-indigo-400 hover:bg-slate-900/50 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-all"
                    >
                      <Plus size={10} /> Add to {group.name}
                    </button>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}

          {/* Ungrouped Section */}
          {/* Always show header if groups exist, so it can be selected */}
          {groups.length > 0 && (
            <tr
              className={`border-b border-slate-800 transition-colors cursor-pointer ${selectedGroupId === null ? 'bg-indigo-900/40 border-l-4 border-l-indigo-500' : 'bg-slate-900/50 hover:bg-slate-900 border-l-4 border-l-transparent'}`}
              onClick={() => setSelectedGroupId(null)}
            >
              <td className="p-2 text-center border-r border-slate-800 text-slate-500">
                <FolderOpen size={14} className="opacity-50" />
              </td>
              <td colSpan={schema.length} className="p-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400">Ungrouped</span>
                  <span className="text-xs text-slate-600 ml-2">({groupedData.ungrouped.length})</span>
                  {selectedGroupId === null && <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded ml-2">Active</span>}
                </div>
              </td>
              <td className="p-2"></td>
            </tr>
          )}

          {groupedData.ungrouped.map((row) => (
            <tr
              key={row._originalIndex}
              className={`group border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors ${hoveredRow === row._originalIndex ? 'bg-slate-900/30' : ''}`}
              onMouseEnter={() => setHoveredRow(row._originalIndex)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <td className="p-2 border-r border-slate-800 text-center text-xs text-slate-500 font-mono">
                {row._originalIndex + 1}
              </td>
              {schema.map(field => (
                <td key={field.id} className="p-2 border-r border-slate-800/50 align-top">
                  {renderCellInput(row, row._originalIndex, field)}
                </td>
              ))}
              <td className="p-2 text-center whitespace-nowrap">
                <div className={`flex items-center justify-center gap-1 transition-opacity ${activeMenuRow === row._originalIndex ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
                  <div className="flex flex-col">
                    <button onClick={() => moveRowWithinGroup(row._originalIndex, -1, undefined)} className="hover:text-indigo-400"><ChevronUp size={12} /></button>
                    <button onClick={() => moveRowWithinGroup(row._originalIndex, 1, undefined)} className="hover:text-indigo-400"><ChevronDown size={12} /></button>
                  </div>
                  <button onClick={() => duplicateRow(row._originalIndex)} className="p-1 hover:text-blue-400" title="Duplicate"><Copy size={14}/></button>

                  {/* Group Mover Dropdown - Click Activated */}
                  {groups.length > 0 && (
                    <div className={`relative ${activeMenuRow === row._originalIndex ? 'z-50' : ''}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuRow(activeMenuRow === row._originalIndex ? null : row._originalIndex); }}
                        className={`p-1 hover:text-slate-200 ${activeMenuRow === row._originalIndex ? 'text-indigo-400' : ''}`}
                      >
                        <MoreHorizontal size={14}/>
                      </button>

                      {activeMenuRow === row._originalIndex && (
                        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded shadow-xl p-1 w-40 max-h-48 overflow-y-auto">
                          <div className="text-[10px] text-slate-500 uppercase font-bold px-2 py-1 border-b border-slate-800 mb-1">Move to</div>
                          {groups.map(g => (
                            <button
                              key={g.id}
                              onClick={(e) => { e.stopPropagation(); assignRowToGroup(row._originalIndex, g.id); }}
                              className="w-full text-left text-xs p-2 hover:bg-slate-800 rounded text-slate-300 truncate flex items-center gap-2"
                            >
                              <Folder size={12} className="text-indigo-400" /> {g.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={() => deleteRow(row._originalIndex)} className="p-1 hover:text-red-400" title="Delete"><Trash2 size={14}/></button>
                </div>
              </td>
            </tr>
          ))}

          {/* Empty State / Add Row Area (Global) */}
          {rows.length === 0 && (
            <tr>
              <td colSpan={schema.length + 2} className="p-12 text-center text-slate-600">
                <p className="mb-4">No data yet.</p>
                <button
                  onClick={() => addRow(selectedGroupId)}
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

      {/* Floating Add Button */}
      {rows.length > 0 && (
        <div className="absolute bottom-6 right-8 group/fab">
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/fab:opacity-100 transition-opacity pointer-events-none">
            Add to {getSelectedGroupName()}
          </div>

          <button
            onClick={() => addRow(selectedGroupId)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg shadow-indigo-900/50 hover:scale-105 transition-all flex items-center justify-center"
            title={`Add row to ${getSelectedGroupName()}`}
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Group Settings Modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-[400px] shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="text-indigo-400" size={20} />
                Group Settings
              </h3>
              <button onClick={() => setEditingGroupId(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => updateGroup(editingGroup.id, { name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Asset Path Prefix</label>
                <p className="text-xs text-slate-500 mb-2">Overrides the global project setting for this group.</p>
                <input
                  type="text"
                  value={editingGroup.assetPrefix || ''}
                  onChange={(e) => updateGroup(editingGroup.id, { assetPrefix: e.target.value })}
                  placeholder={assetPrefix ? `Default: ${assetPrefix}` : "e.g. level1/sprites/"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setEditingGroupId(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataEditor;
