import React, { useState } from 'react';
import { FieldType, ProjectData, FieldDefinition, RowData, GroupDefinition } from './types';
import SchemaEditor from './components/SchemaEditor';
import DataEditor from './components/DataEditor';
import { exportToCsv, downloadCsv, downloadJson } from './services/csvService';
import { generateGameContent } from './services/geminiService';
import {
  Table2,
  Upload,
  Download,
  Sparkles,
  Layout,
  Database,
  Loader2,
  FileJson,
  FilePlus,
  Settings2
} from 'lucide-react';

const INITIAL_SCHEMA: FieldDefinition[] = [
  { id: '1', name: 'Name', type: FieldType.Text },
  { id: '2', name: 'Cost', type: FieldType.Number },
  { id: '3', name: 'Description', type: FieldType.LongText },
  { id: '4', name: 'Rarity', type: FieldType.Select, options: ['Common', 'Uncommon', 'Rare'] },
  { id: '5', name: 'Card Art', type: FieldType.ImageURL },
  { id: '6', name: 'Local Asset', type: FieldType.ImageFile }
];

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData>({
    name: 'My Board Game',
    schema: JSON.parse(JSON.stringify(INITIAL_SCHEMA)),
    groups: [],
    rows: [],
    assetPrefix: '',
    csvSeparator: ','
  });

  const [showSchema, setShowSchema] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Gemini API Key from environment
  const apiKey = process.env.API_KEY;

  const handleSchemaChange = (newSchema: FieldDefinition[]) => {
    setProject(prev => ({ ...prev, schema: newSchema }));
  };

  const handleRowsChange = (newRows: RowData[]) => {
    setProject(prev => ({ ...prev, rows: newRows }));
  };

  const handleGroupsChange = (newGroups: GroupDefinition[]) => {
    setProject(prev => ({ ...prev, groups: newGroups }));
  };

  const handleGlobalPrefixChange = (newPrefix: string) => {
    setProject(prev => {
      const updatedRows = prev.rows.map(row => {
        // Check if this row belongs to a group that OVERRIDES the prefix
        const group = row.__groupId ? prev.groups.find(g => g.id === row.__groupId) : undefined;
        // If group has a specific prefix (not null/undefined), it takes precedence, so we DON'T update this row with global prefix
        if (group && group.assetPrefix !== undefined && group.assetPrefix !== null) {
          return row;
        }

        const newRow = { ...row };
        let changed = false;

        prev.schema.forEach(field => {
          if (field.type === FieldType.ImageFile) {
            const cellData = newRow[field.id];
            // Update only if we have a valid object and a filename to reconstruct from
            if (cellData && typeof cellData === 'object' && cellData.fileName) {
              newRow[field.id] = {
                ...cellData,
                filePath: newPrefix + cellData.fileName
              };
              changed = true;
            }
          }
        });
        return changed ? newRow : row;
      });

      return {
        ...prev,
        assetPrefix: newPrefix,
        rows: updatedRows
      };
    });
  };

  const handleExportClick = () => {
    const separator = project.csvSeparator || ',';
    const csv = exportToCsv(project, separator);
    downloadCsv(csv, `${project.name.toLowerCase().replace(/\s+/g, '-')}.csv`);
  };

  const handleSaveProject = () => {
    downloadJson(project, project.name);
  };

  const handleNewProject = () => {
    if (confirm("Start a new project? All unsaved data will be lost.")) {
      setProject({
        name: 'My Board Game',
        schema: JSON.parse(JSON.stringify(INITIAL_SCHEMA)),
        groups: [],
        rows: [],
        assetPrefix: '',
        csvSeparator: ','
      });
      setGenerationPrompt('');
    }
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.schema && data.rows) {
          // Ensure groups exists for legacy files
          if (!data.groups) data.groups = [];
          if (!data.assetPrefix) data.assetPrefix = '';
          if (!data.csvSeparator) data.csvSeparator = ',';
          setProject(data);
        } else {
          alert("Invalid project file format.");
        }
      } catch (err) {
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleAiGenerate = async () => {
    if (!apiKey) {
      alert("API Key is missing in environment variables.");
      return;
    }

    setIsGenerating(true);
    try {
      const generatedItem = await generateGameContent(apiKey, project.schema, generationPrompt);

      // Auto-fill image with picsum if image field exists and AI returned a description or empty
      const enrichedItem = { ...generatedItem };
      project.schema.forEach(field => {
        if (field.type === FieldType.ImageURL) {
          const seed = generatedItem[field.id] || Math.random().toString(36).substring(7);
          if (!enrichedItem[field.id]?.startsWith('http')) {
            enrichedItem[field.id] = `https://picsum.photos/seed/${encodeURIComponent(seed)}/200/200`;
          }
        }
        if (field.type === FieldType.ImageFile) {
          if (!enrichedItem[field.id]) {
            enrichedItem[field.id] = { fileName: "placeholder.png", filePath: "placeholder.png", fileData: null };
          } else if (typeof enrichedItem[field.id] === 'string') {
            // Populate both fileName and filePath from AI string
            const name = enrichedItem[field.id];
            enrichedItem[field.id] = { fileName: name, filePath: name, fileData: null };
          }
        }
      });

      handleRowsChange([...project.rows, enrichedItem]);
      setGenerationPrompt('');
      setShowAiModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to generate content. See console.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation / Toolbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/30">
            <Table2 className="text-white" size={20} />
          </div>
          <input
            type="text"
            value={project.name}
            onChange={(e) => setProject(p => ({...p, name: e.target.value}))}
            className="bg-transparent text-lg font-bold text-slate-100 focus:outline-none focus:border-b border-indigo-500 w-48 hover:bg-slate-800/50 rounded px-1 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 mr-4 border border-slate-700">
            <button
              onClick={() => setShowSchema(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${showSchema ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Layout size={16} /> Structure
            </button>
            <button
              onClick={() => setShowSchema(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${!showSchema ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Database size={16} /> Data
            </button>
          </div>

          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <FilePlus size={16} /> New
          </button>

          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg cursor-pointer border border-slate-700 transition-colors">
            <Upload size={16} />
            Load
            <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
          </label>

          <button
            onClick={handleSaveProject}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <FileJson size={16} /> Save
          </button>

          <button
            onClick={handleExportClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium rounded-lg transition-colors ml-2"
            title="Export to CSV"
          >
            <Download size={16} /> Export CSV
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-2 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title="Project Settings"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Schema Editor Sidebar (Collapsible or always visible in Structure mode) */}
        {(showSchema) && (
          <SchemaEditor
            fields={project.schema}
            onChange={handleSchemaChange}
          />
        )}

        {/* Data Table */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950/50">
          {/* Toolbar for Data View */}
          <div className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between">
            <div className="text-sm text-slate-400">
              {project.rows.length} items • {project.schema.length} fields • {project.groups.length} groups
            </div>

            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-105"
            >
              <Sparkles size={16} /> AI Generate Item
            </button>
          </div>

          <DataEditor
            schema={project.schema}
            rows={project.rows}
            groups={project.groups}
            assetPrefix={project.assetPrefix}
            onRowsChange={handleRowsChange}
            onGroupsChange={handleGroupsChange}
          />
        </div>
      </main>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-[400px] shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-indigo-400" size={20} />
                Magic Fill
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              Describe the item you want to create. The AI will match your current table structure.
            </p>

            <textarea
              value={generationPrompt}
              onChange={(e) => setGenerationPrompt(e.target.value)}
              placeholder="e.g. A legendary sword made of ice that freezes enemies..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 min-h-[100px] resize-none mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAiGenerate}
                disabled={isGenerating || !generationPrompt.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-[450px] shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings2 className="text-slate-400" size={20} />
                Project Settings
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            {/* Asset Prefix Section */}
            <div className="mb-8 border-b border-slate-800 pb-6">
              <h4 className="text-sm font-bold text-indigo-400 mb-4 uppercase tracking-wider">Asset Management</h4>

              <label className="block text-sm font-medium text-slate-300 mb-2">Asset Path Prefix</label>
              <div className="text-xs text-slate-400 mb-2">
                Automatically prepended to filenames when uploading images to <code>ImageFile</code> fields.
              </div>
              <input
                type="text"
                value={project.assetPrefix || ''}
                onChange={(e) => handleGlobalPrefixChange(e.target.value)}
                placeholder="e.g. res://sprites/"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <span>Example result:</span>
                <span className="text-indigo-400 font-mono bg-slate-900 px-1 rounded">{(project.assetPrefix || 'prefix/') + 'image.png'}</span>
              </div>
            </div>

            {/* CSV Settings Section */}
            <div className="mb-2">
              <h4 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-wider">Export Configuration</h4>
              <p className="text-xs text-slate-400 mb-3">
                Select the separator character used when generating CSV files.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${project.csvSeparator === ',' ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'}`}>
                  <input
                    type="radio"
                    name="separator"
                    value=","
                    checked={project.csvSeparator === ','}
                    onChange={() => setProject(prev => ({...prev, csvSeparator: ','}))}
                    className="text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">Comma (,)</span>
                    <span className="text-[10px] text-slate-500">Standard</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${project.csvSeparator === ';' ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-slate-700 bg-slate-950/50 hover:border-slate-500'}`}>
                  <input
                    type="radio"
                    name="separator"
                    value=";"
                    checked={project.csvSeparator === ';'}
                    onChange={() => setProject(prev => ({...prev, csvSeparator: ';'}))}
                    className="text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-200">Semicolon (;)</span>
                    <span className="text-[10px] text-slate-500">Excel / EU</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-900/50 transition-colors"
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

export default App;
