import { useState, useEffect } from 'react';
import { Bot, Sparkles, Wrench, Save, Info, CheckSquare, Square as SquareIcon } from 'lucide-react';
import { agentConfigAPI } from '../services/agentConfig';
import toast from 'react-hot-toast';

export default function AgentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [personaInstructions, setPersonaInstructions] = useState('');
  const [availableTools, setAvailableTools] = useState([]);
  const [enabledTools, setEnabledTools] = useState(new Set());

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await agentConfigAPI.get();
      setPersonaInstructions(res.data.persona_instructions || '');
      const tools = res.data.available_tools || [];
      setAvailableTools(tools);
      const fetchedEnabled = res.data.enabled_tools;
      if (!fetchedEnabled || fetchedEnabled.length === 0) {
        setEnabledTools(new Set(tools.map(t => t.name)));
      } else {
        setEnabledTools(new Set(fetchedEnabled));
      }
    } catch (err) {
      toast.error('Failed to load agent settings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = (toolName) => {
    setEnabledTools(prev => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  const selectAllTools = () => {
    setEnabledTools(new Set(availableTools.map(t => t.name)));
  };

  const clearAllTools = () => {
    setEnabledTools(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await agentConfigAPI.update({
        persona_instructions: personaInstructions,
        enabled_tools: Array.from(enabledTools),
      });
      if (res.data) {
        if (res.data.persona_instructions !== undefined) setPersonaInstructions(res.data.persona_instructions);
        if (res.data.enabled_tools) setEnabledTools(new Set(res.data.enabled_tools));
      }
      toast.success('Agent settings saved.');
    } catch (err) {
      toast.error('Failed to save agent settings.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading agent settings...</span>
      </div>
    );
  }

  const allActive = enabledTools.size === availableTools.length && availableTools.length > 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Agent Settings</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                allActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${allActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {enabledTools.size} of {availableTools.length} Tools Active {allActive ? '(Default All Enabled)' : ''}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-450 mt-0.5">Define the chatbot's persona and control which actions it may perform.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Persona Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Agent Persona</h3>
        </div>
        <textarea
          value={personaInstructions}
          onChange={(e) => setPersonaInstructions(e.target.value)}
          rows={6}
          placeholder="e.g. Respond in a concise, formal tone. Always mention the relevant project code when discussing milestones."
          className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none transition-all resize-y"
        />
        <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl flex gap-2.5 select-none">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-[10px] font-bold leading-normal">
            This text adds tone, emphasis, and scope guidance on top of the assistant's built-in safety and tool-usage rules — it cannot disable them.
          </span>
        </div>
      </div>

      {/* Tools Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Enabled Tools</h3>
          </div>
          <div className="flex items-center gap-2 select-none">
            <button
              type="button"
              onClick={selectAllTools}
              className="text-[9px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAllTools}
              className="text-[9px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableTools.map(tool => {
            const isEnabled = enabledTools.has(tool.name);
            return (
              <button
                type="button"
                key={tool.name}
                onClick={() => toggleTool(tool.name)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 select-none ${
                  isEnabled
                    ? 'bg-slate-50 border-slate-300 hover:border-slate-400'
                    : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/80 hover:border-slate-200'
                }`}
              >
                {isEnabled ? (
                  <CheckSquare className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
                ) : (
                  <SquareIcon className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-[11px] font-bold ${isEnabled ? 'text-slate-850' : 'text-slate-450'}`}>
                    {tool.name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-snug">
                    {tool.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
