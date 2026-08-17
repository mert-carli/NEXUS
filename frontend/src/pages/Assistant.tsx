import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { Bot, Send, Loader2, AlertCircle, RefreshCw, FileCode, ChevronRight } from 'lucide-react'
import { api, BASE_URL } from '@/services/api'

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: {
    similarity_score: number
    start_line: number
    end_line: number
    relative_path: string
    file_id: string
  }[]
  isStreaming?: boolean
}

import ChangeCenter, { EditItem } from '../components/ChangeCenter'
import AgentStatus from '../components/AgentStatus'
import { useAgentStore } from '@/store/agentStore'

function renderMessageContent(content: string, isStreaming?: boolean, onTestFail?: (output: string) => void) {
  const editRegex = /<edit\s+file="([^"]+)">\s*<search>\s*([\s\S]*?)\s*<\/search>\s*<replace>\s*([\s\S]*?)\s*<\/replace>\s*<\/edit>/g;
  const edits: EditItem[] = [];
  let match;

  while ((match = editRegex.exec(content)) !== null) {
    edits.push({
      filePath: match[1],
      searchStr: match[2],
      replaceStr: match[3]
    });
  }

  // Remove raw <edit> blocks from readable message
  let textPart = content.replace(/<edit\s+file="[^"]+">[\s\S]*?<\/edit>/g, '').trim();

  // If streaming and currently in the middle of <edit>
  if (isStreaming && textPart.includes('<edit')) {
    textPart = textPart.substring(0, textPart.indexOf('<edit')).trim();
  }

  return (
    <div className="space-y-3">
      {textPart && (
        <div className="whitespace-pre-wrap leading-relaxed">
          {textPart}
        </div>
      )}

      {isStreaming && content.includes('<edit') && edits.length === 0 && (
        <div className="my-3 border border-[#202832] rounded-xl p-3.5 bg-[#0D1117] animate-pulse text-xs text-[#8B949E] flex items-center gap-2 font-mono">
          <span className="h-2 w-2 rounded-full bg-[#18A957] animate-pulse" />
          Formulating code edits in NEXUS Change Center...
        </div>
      )}

      {edits.length > 0 && (
        <ChangeCenter
          goalTitle="Proposed Code Modifications"
          edits={edits}
          onTestFail={onTestFail}
        />
      )}

      {isStreaming && !content.includes('<edit') && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-[#18A957] animate-pulse align-middle" />
      )}
    </div>
  );
}


export default function Assistant() {
  const { activeProject, setActiveProject, setSelectedFileId, setJumpToLine } = useProjectStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexProgress, setIndexProgress] = useState<any>(null)
  const [isAgentic, setIsAgentic] = useState(false)
  
  const { status, telemetry, setStatus, setPlan, upsertStep, setActiveQuery, setTelemetry, reset } = useAgentStore()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (location.state && (location.state as any).prefill) {
      setInput((location.state as any).prefill)
      setIsAgentic(true)
    }
  }, [location.state])

  const startIndexing = async () => {
    if (!activeProject) return
    setIsIndexing(true)
    setIndexProgress({ status: 'Starting...' })
    
    try {
      const response = await fetch(`${BASE_URL}/projects/${activeProject.id}/index`, {
        method: 'POST',
      })
      if (!response.body) throw new Error("No body")
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'error') {
              console.error("Indexing Error:", data.message)
              alert("Error: " + data.message)
              setIsIndexing(false)
              return
            }
            if (data.type === 'complete') {
              try {
                const updated = await api.getProject(activeProject.id)
                setActiveProject(updated)
              } catch {
                setActiveProject({ ...activeProject, index_status: 'READY' })
              }
              setIsIndexing(false)
              setIndexProgress(null)
              return
            }
            setIndexProgress(data)
          }
        }
      }
    } catch (e: any) {
      alert("Error indexing: " + e.message)
      setIsIndexing(false)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeProject || isGenerating) return
    if (activeProject.index_status !== 'READY') {
      alert("Please index the project first.")
      return
    }

    const query = input.trim()
    setInput('')
    reset()
    setActiveQuery(query)
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setIsGenerating(true)

    // Add empty assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])

    try {
      const response = await fetch(`${BASE_URL}/projects/${activeProject.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, is_agentic: isAgentic })
      })

      if (!response.body) throw new Error("No body")
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'token') {
              setMessages(prev => {
                const newMessages = [...prev]
                const lastIdx = newMessages.length - 1
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  content: newMessages[lastIdx].content + (data.text || data.token || '')
                }
                return newMessages
              })
            } else if (data.type === 'sources') {
               setMessages(prev => {
                const newMessages = [...prev]
                const lastIdx = newMessages.length - 1
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  sources: data.sources
                }
                return newMessages
              })
            } else if (data.type === 'state') {
               setStatus(data.status)
            } else if (data.type === 'step') {
               upsertStep({
                 id: data.step_id,
                 title: data.title,
                 status: data.status,
                 detail: data.detail,
                 timestamp: Date.now()
               })
            } else if (data.type === 'plan') {
               setPlan({ goal: data.goal, steps: data.steps })
            } else if (data.type === 'error') {
               alert("Error: " + data.message)
            } else if (data.type === 'message_end') {
              setMessages(prev => {
                const newMessages = [...prev]
                const lastIdx = newMessages.length - 1
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  isStreaming: false
                }
                return newMessages
              })
            }
          }
        }
      }
    } catch (e: any) {
       alert("Error in chat: " + e.message)
       setMessages(prev => {
         const newMessages = [...prev]
         const lastIdx = newMessages.length - 1
         newMessages[lastIdx] = {
           ...newMessages[lastIdx],
           isStreaming: false
         }
         return newMessages
       })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTestFail = (output: string) => {
    // Automatically trigger a new message with the test output
    const msg = `The edit was applied, but the automated tests failed. Please analyze the test output and propose a fix:\n\n\`\`\`text\n${output}\n\`\`\``;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    triggerLLM(msg);
  }

  const triggerLLM = async (query: string) => {
    if (activeProject?.index_status !== 'READY' || isGenerating) return;
    setIsGenerating(true);
    reset();
    setActiveQuery(query);
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${activeProject.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, is_agentic: isAgentic })
      });

      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') {
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  content: newMessages[lastIdx].content + (data.text || data.token || '')
                };
                return newMessages;
              });
            } else if (data.type === 'sources') {
               setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  sources: data.sources
                };
                return newMessages;
              });
            } else if (data.type === 'state') {
               setStatus(data.status);
            } else if (data.type === 'step') {
               upsertStep({
                 id: data.step_id,
                 title: data.title,
                 status: data.status,
                 detail: data.detail,
                 timestamp: Date.now()
               });
            } else if (data.type === 'plan') {
               setPlan({ goal: data.goal, steps: data.steps });
            } else if (data.type === 'telemetry') {
               setTelemetry({
                 tokens_per_second: data.tokens_per_second,
                 eval_count: data.eval_count,
                 prompt_eval_count: data.prompt_eval_count,
                 total_tokens: data.total_tokens,
                 latency_ms: data.latency_ms,
                 total_duration_ms: data.total_duration_ms
               });
            } else if (data.type === 'error') {
               alert("Error: " + data.message);
            } else if (data.type === 'message_end') {
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                newMessages[lastIdx] = {
                  ...newMessages[lastIdx],
                  isStreaming: false
                };
                return newMessages;
              });
            }
          }
        }
      }
    } catch (e: any) {
       alert("Error in chat: " + e.message);
       setMessages(prev => {
         const newMessages = [...prev];
         const lastIdx = newMessages.length - 1;
         newMessages[lastIdx] = {
           ...newMessages[lastIdx],
           isStreaming: false
         };
         return newMessages;
       });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSourceClick = (fileId: string, line: number) => {
    setSelectedFileId(fileId)
    setJumpToLine(line)
    navigate('/code')
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Bot className="h-12 w-12 text-[#8B949E]/30 mb-4" />
        <p className="text-sm text-[#8B949E]">No project open.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] bg-[#0D1117] rounded-xl border border-[#202832] overflow-hidden">
      {/* Banner */}
      {activeProject.index_status !== 'READY' && (
        <div className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/20 p-3 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[#F59E0B] text-sm">
             <AlertCircle className="h-4 w-4" />
             <span>Project requires indexing to use AI Assistant.</span>
           </div>
           <button 
             onClick={startIndexing}
             disabled={isIndexing}
             className="px-3 py-1.5 bg-[#F59E0B] text-black text-xs font-semibold rounded hover:bg-[#F59E0B]/80 transition-colors flex items-center gap-2"
           >
             {isIndexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
             {isIndexing ? 'Indexing...' : 'Index Now'}
           </button>
        </div>
      )}

      {/* Indexing Modal Overlay */}
      {isIndexing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
           <div className="bg-[#11161D] border border-[#202832] p-6 rounded-lg max-w-sm w-full text-center">
              <Loader2 className="h-8 w-8 text-[#18A957] animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#F3F4F6] mb-2">Indexing Project</h3>
              {indexProgress && (
                <div className="text-sm text-[#8B949E]">
                  <p>{indexProgress.type === 'start' ? 'Starting...' : indexProgress.type === 'progress' ? `File ${indexProgress.file} (${indexProgress.percentage}%)` : 'Processing...'}</p>
                  {indexProgress.type === 'progress' && (
                    <div className="w-full bg-[#202832] h-2 rounded-full mt-3 overflow-hidden">
                       <div className="bg-[#18A957] h-full transition-all duration-300" style={{ width: `${indexProgress.percentage}%` }} />
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono">
        <AgentStatus />

        {/* Live System Inference Telemetry HUD */}
        {status !== 'IDLE' && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#0D1117] border border-[#8B5CF6]/30 text-xs shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8B5CF6]" />
              </span>
              <span className="text-[#8B5CF6] font-bold uppercase tracking-wider">
                ● {status}
              </span>
              <span className="text-[#8B949E] text-[11px]">
                {status === 'ANALYZING' ? 'Retrieving AST vector chunks...' : status === 'PLANNING' ? 'Synthesizing modification plan...' : 'Generating precise code diffs...'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-[#8B949E]">
                INFERENCE: <strong className="text-[#18A957]">{telemetry?.tokens_per_second ? `${telemetry.tokens_per_second} tok/s` : 'IDLE'}</strong>
              </span>
              <span className="text-[#202832]">|</span>
              <span className="text-[#8B949E]">
                TOKENS: <strong className="text-[#F3F4F6]">{telemetry?.total_tokens ? `${telemetry.total_tokens.toLocaleString()}` : '0'}</strong>
              </span>
              <span className="text-[#202832]">|</span>
              <span className="text-[#8B949E]">
                SANDBOX: <strong className="text-[#10B981]">INTACT</strong>
              </span>
            </div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
             <Bot className="h-12 w-12 text-[#8B949E] mb-4" />
             <p className="text-[#8B949E]">Ask anything about your codebase.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded bg-[#18A957]/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-[#18A957]" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-[#202832] text-[#F3F4F6] px-4 py-2.5 rounded-2xl rounded-tr-sm' : ''}`}>
                 <div className={`prose prose-invert max-w-none text-sm ${msg.role === 'assistant' ? 'text-[#F3F4F6]' : ''}`}>
                    {msg.role === 'assistant' ? renderMessageContent(msg.content, msg.isStreaming, handleTestFail) : msg.content}
                 </div>
                 
                 {/* Sources */}
                 {msg.sources && msg.sources.length > 0 && (
                   <div className="mt-4 pt-3 border-t border-[#202832] grid gap-2">
                     <p className="text-xs font-semibold text-[#8B949E] mb-1">Sources Context:</p>
                     {msg.sources.map((src, idx) => (
                        <div key={idx} className="bg-[#11161D] border border-[#202832] rounded p-2 flex items-center justify-between group">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <FileCode className="h-3.5 w-3.5 text-[#8B949E] shrink-0" />
                             <span className="text-xs text-[#F3F4F6] truncate">{src.relative_path}</span>
                             <span className="text-[10px] text-[#8B949E] font-mono">Lines {src.start_line}-{src.end_line}</span>
                          </div>
                          <button 
                            onClick={() => handleSourceClick(src.file_id, src.start_line)}
                            className="opacity-0 group-hover:opacity-100 p-1 bg-[#202832] rounded text-[#8B949E] hover:text-[#F3F4F6] transition-all"
                            title="Open in code editor"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#202832] bg-[#11161D]">
         <div className="flex items-center justify-between mb-2 px-1">
           <label className="flex items-center gap-2 text-xs text-[#8B949E] cursor-pointer hover:text-[#F3F4F6] transition-colors">
             <input 
               type="checkbox" 
               checked={isAgentic}
               onChange={e => setIsAgentic(e.target.checked)}
               className="rounded border-[#202832] bg-[#0D1117] text-[#18A957] focus:ring-[#18A957] focus:ring-offset-0"
             />
             Enable Agent Mode (Plan & Edit)
           </label>
           <button 
             onClick={reset}
             className="text-[10px] text-[#8B949E] hover:text-[#F3F4F6]"
             title="Reset Agent State"
           >
             Clear Agent State
           </button>
         </div>
         <div className="relative flex items-center">
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={isGenerating || activeProject.index_status !== 'READY'}
              placeholder={activeProject.index_status !== 'READY' ? "Index project to chat..." : "Ask about the code..."}
              className="w-full bg-[#0D1117] border border-[#202832] rounded-lg pl-4 pr-12 py-3 text-sm text-[#F3F4F6] focus:outline-none focus:border-[#18A957]/50 transition-colors disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isGenerating || activeProject.index_status !== 'READY'}
              className="absolute right-2 p-1.5 text-[#8B949E] hover:text-[#18A957] disabled:opacity-50 transition-colors rounded-md hover:bg-[#202832]"
            >
              <Send className="h-4 w-4" />
            </button>
         </div>
      </div>
    </div>
  )
}
