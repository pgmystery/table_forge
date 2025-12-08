import React, { useState } from 'react';
import { FieldType, ProjectData, FieldDefinition, RowData } from './types';
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
  FileJson
} from 'lucide-react';

const INITIAL_SCHEMA: FieldDefinition[] = [
  { id: '1', name: 'Name', type: FieldType.Text },
  { id: '2', name: 'Cost', type: FieldType.Number },
  { id: '3', name: 'Description', type: FieldType.LongText },
  { id: '4', name: 'Rarity', type: FieldType.Select, options: ['Common', 'Uncommon', 'Rare'] },
  { id: '5', name: 'Image', type: FieldType.Image }
];

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectData>({
    name: 'My Board Game',
    schema: INITIAL_SCHEMA,
    rows: []
  });

  const [showSchema, setShowSchema] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  // Gemini API Key from environment or manual override (in a real app)
  // Since we cannot prompt user for input as per instructions, we rely on env.
  // We assume process.env.API_KEY is available.
  const apiKey = process.env.API_KEY;

  const handleSchemaChange = (newSchema: FieldDefinition[]) => {
    // When schema changes, we should try to preserve existing data keys if IDs match
    setProject(prev => ({ ...prev, schema: newSchema }));
  };

  const handleRowsChange = (newRows: RowData[]) => {
    setProject(prev => ({ ...prev, rows: newRows }));
  };

  const handleExportCsv = () => {
    const csv = exportToCsv(project);
    downloadCsv(csv, `${project.name.toLowerCase().replace(/\s+/g, '-')}.csv`);
  };

  const handleSaveProject = () => {
      downloadJson(project, project.name);
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
            if (field.type === FieldType.Image) {
                 // Use a random seed based on content to get a consistent image for the item
                 const seed = generatedItem[field.id] || Math.random().toString(36).substring(7);
                 enrichedItem[field.id] = `https://picsum.photos/seed/${encodeURIComponent(seed)}/200/200`;
            }
        });

        handleRowsChange([...project.rows, enrichedItem]);
        setGenerationPrompt('');
        setShowAiModal(false);
    } catch (error) {
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
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium rounded-lg transition-colors ml-2"
            >
                <Download size={16} /> Export CSV
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
                    {project.rows.length} items • {project.schema.length} fields
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
                onRowsChange={handleRowsChange}
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
    </div>
  );
};

export default App;
