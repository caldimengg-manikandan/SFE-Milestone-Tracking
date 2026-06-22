import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Loader2,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Upload,
  Settings,
  Sparkles,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import chatbotAPI from '../../services/chatbot';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Chat state
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Status & Ingestion state
  const [systemStatus, setSystemStatus] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const messagesEndRef = useRef(null);
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.is_staff || user.role === 'admin' || user.is_superuser;

  // Fetch sessions & status on mount
  useEffect(() => {
    if (isOpen) {
      loadSessions();
      loadSystemStatus();
    }
  }, [isOpen]);

  // Load session history when active session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionDetail(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadSystemStatus = async () => {
    try {
      const res = await chatbotAPI.getStatus();
      setSystemStatus(res.data);
    } catch (e) {
      console.error('Failed to load chatbot status:', e);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await chatbotAPI.getSessions();
      setSessions(res.data);
      if (res.data.length > 0 && !currentSessionId) {
        setCurrentSessionId(res.data[0].id);
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
  };

  const loadSessionDetail = async (sessionId) => {
    try {
      setIsLoading(true);
      const res = await chatbotAPI.getSessionDetail(sessionId);
      setMessages(res.data.messages || []);
      setError(null);
    } catch (e) {
      console.error('Failed to load session details:', e);
      setError('Could not load chat history.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const res = await chatbotAPI.createSession(`Chat ${sessions.length + 1}`);
      setSessions([res.data, ...sessions]);
      setCurrentSessionId(res.data.id);
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat thread?')) return;
    
    try {
      await chatbotAPI.deleteSession(sessionId);
      const updated = sessions.filter(s => s.id !== sessionId);
      setSessions(updated);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || input.trim();
    if (!text) return;

    if (!textToSend) setInput('');
    setError(null);

    // Optimistically add user message
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await chatbotAPI.query(text, currentSessionId);
      
      // Update session ID if a new session was auto-created
      if (!currentSessionId) {
        setCurrentSessionId(res.data.session_id);
        loadSessions();
      }

      // Process UI actions
      const uiActions = res.data.ui_actions || [];
      uiActions.forEach((action) => {
        if (action.type === 'NAVIGATE') {
          navigate(action.payload);
        } else if (action.type === 'SHOW_TOAST') {
          const toastType = action.payload.type || 'success';
          if (toastType === 'success') {
            toast.success(action.payload.message);
          } else if (toastType === 'error') {
            toast.error(action.payload.message);
          } else {
            toast(action.payload.message);
          }
        } else if (action.type === 'REFRESH_DATA') {
          if (action.payload === 'employees') {
            window.dispatchEvent(new CustomEvent('refresh-employees'));
          } else if (action.payload === 'projects') {
            window.dispatchEvent(new CustomEvent('refresh-projects'));
          } else if (action.payload === 'customers') {
            window.dispatchEvent(new CustomEvent('refresh-customers'));
          }
        }
      });

      // Append bot response
      const tempBotMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.data.response,
        timestamp: new Date().toISOString(),
        metadata: { citations: res.data.citations }
      };
      setMessages(prev => [...prev, tempBotMsg]);
    } catch (e) {
      console.error('Query failure:', e);
      setError(e.response?.data?.error || 'Failed to connect to chatbot.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadFile.name.replace('.pdf', ''));

    try {
      await chatbotAPI.uploadWorkflow(formData);
      setUploadSuccess(true);
      setUploadFile(null);
      loadSystemStatus();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.error || 'Ingestion failed. Ensure the server is online.');
    } finally {
      setUploading(false);
    }
  };

  // Pre-configured suggestions based on standard app workflows
  const suggestedPrompts = [
    "How does the RFQ workflow operate?",
    "How do I create a new project?",
    "What are the steps in Erection Estimation?"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[1000] font-sans antialiased text-slate-800">
      {/* ── Chat Bubble Button ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center text-white
          shadow-lg shadow-amber-500/20 hover:scale-110 active:scale-95
          transition-all duration-300 relative
          bg-gradient-to-tr from-amber-500 via-orange-500 to-orange-600
        `}
        aria-label="Open Chatbot"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 animate-pulse" />}
        
        {/* Pulsing indicator when local server is online */}
        {systemStatus?.ollama_connected && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
        )}
      </button>

      {/* ── Main Chat Panel (Slide Up Card) ── */}
      {isOpen && (
        <div className="absolute bottom-[72px] right-0 w-[400px] h-[600px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <header className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-950 text-white flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-inner">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide">Steel Fab Assist</h3>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${systemStatus?.ollama_connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  {systemStatus?.is_cloud ? 'Cloud' : 'Offline'} ({systemStatus?.model_configured || 'llama3.2'})
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Body Panels */}
          <div className="flex-1 overflow-hidden relative flex">
            {/* -- SETTINGS & UPLOAD PANEL -- */}
            {showSettings ? (
              <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col p-4 overflow-y-auto scrollbar-thin">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Context Manager
                  </h4>
                  <button onClick={() => setShowSettings(false)} className="text-xs text-amber-600 font-bold hover:underline">
                    Back to Chat
                  </button>
                </div>

                {/* System Status Details */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 mb-4 shadow-sm text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Ollama Server:</span>
                    <span className={`font-bold ${systemStatus?.ollama_connected ? 'text-emerald-600' : 'text-red-500'}`}>
                      {systemStatus?.ollama_connected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Server Endpoint:</span>
                    <span className="text-slate-700 font-mono text-[10px]">{systemStatus?.ollama_url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Loaded Model:</span>
                    <span className="text-slate-700 font-mono text-[10px]">{systemStatus?.model_configured}</span>
                  </div>
                  {systemStatus?.active_document ? (
                    <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-500">Active Workflow:</span>
                        <span className="text-slate-800 text-[11px] truncate max-w-[150px]" title={systemStatus.active_document.title}>
                          {systemStatus.active_document.title}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Database Index Chunks:</span>
                        <span>{systemStatus.active_document.chunk_count} blocks</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 pt-2 mt-2 text-center text-amber-600 font-medium text-[11px] py-1 bg-amber-50 rounded">
                      ⚠️ No workflow PDF indexed.
                    </div>
                  )}
                </div>

                {/* Document Ingestion (Only for admins) */}
                {isAdmin ? (
                  <form onSubmit={handleFileUpload} className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-sm space-y-3">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-700 mb-1">Index New Workflow PDF</label>
                      <p className="text-[10px] text-slate-400 leading-tight mb-2.5">
                        Uploading a PDF parses pages into text context chunks to ground the model offline.
                      </p>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full border border-slate-200 p-1.5 rounded-lg"
                      />
                    </div>

                    {uploadError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-1.5 text-[10px] text-red-700 leading-normal">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {uploadSuccess && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-1.5 text-[10px] text-emerald-700 leading-normal">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>PDF ingested successfully. Ready for queries!</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={uploading || !uploadFile}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting & Indexing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" /> Upload & Train
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-100 border border-slate-200/50 rounded-xl p-3 text-center text-slate-400 text-[11px] leading-normal font-medium mt-1">
                    🔒 Administrator credentials required to upload and re-index PDF documents.
                  </div>
                )}
              </div>
            ) : null}

            {/* -- CHAT PANEL SIDEBAR (History) -- */}
            <div className="w-[80px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-400 py-3 px-1.5 z-10">
              <button
                onClick={handleCreateSession}
                className="w-full py-2 mb-3 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg flex flex-col items-center justify-center transition-colors border border-slate-700/50 group"
                title="New Chat Session"
              >
                <PlusIcon className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold mt-1 uppercase tracking-wider">New</span>
              </button>

              <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setCurrentSessionId(s.id)}
                    className={`
                      relative group cursor-pointer w-full aspect-square rounded-lg flex flex-col items-center justify-center border transition-all text-center p-1
                      ${currentSessionId === s.id
                        ? 'bg-amber-500/10 border-amber-500 text-white font-bold'
                        : 'bg-slate-950/20 border-slate-800 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'}
                    `}
                    title={s.title}
                  >
                    <MessageSquare className="w-4 h-4 mb-0.5" />
                    <span className="text-[7.5px] font-medium block truncate max-w-full leading-tight">
                      {s.title.substring(0, 10)}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-slate-950/80 rounded hover:bg-red-500 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* -- MESSAGES WINDOW -- */}
            <div className="flex-1 bg-slate-50/60 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center text-center h-full max-w-xs mx-auto space-y-4 pt-4">
                    <div className="p-3.5 bg-white shadow border border-slate-100 rounded-2xl flex items-center justify-center text-amber-500 animate-bounce">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">
                        {systemStatus?.is_cloud ? 'Cloud' : 'Offline'} Workflow Assistant
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">
                        Ask questions about the Steel Fab workflow. {systemStatus?.is_cloud ? 'Answers are generated using the configured cloud LLM.' : 'Local models generate answers completely offline.'}
                      </p>
                    </div>

                    {/* Suggestion prompt tags */}
                    <div className="space-y-2 w-full pt-2">
                      {suggestedPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(p)}
                          className="w-full text-left p-2.5 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-semibold text-slate-600 transition-all flex items-center gap-2 group shadow-sm hover:shadow"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate group-hover:text-slate-900">{p}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                      >
                        <div
                          className={`
                            max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm
                            ${msg.sender === 'user'
                              ? 'bg-slate-800 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}
                          `}
                        >
                          {/* Message Text with Simple Break formatting */}
                          <div className="whitespace-pre-wrap font-medium">
                            {msg.text}
                          </div>


                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex justify-start animate-pulse">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2 shadow-sm font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          <span>Thinking...</span>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 leading-normal">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <div className="flex-1">
                          <p className="font-bold">Chatbot Error</p>
                          <p className="text-[11px] mt-0.5 text-red-600">{error}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Text Input area */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2 shrink-0 shadow-inner"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={systemStatus?.ollama_connected ? "Ask a question..." : "Waiting for Ollama..."}
                  disabled={isLoading || !systemStatus?.ollama_connected}
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !systemStatus?.ollama_connected}
                  className="p-2.5 bg-slate-900 hover:bg-amber-500 hover:text-white text-slate-400 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:bg-slate-100"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline icons for self-containment
function PlusIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
