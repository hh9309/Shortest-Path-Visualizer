import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '../types';
import { Brain, Send, Loader2, KeyRound, User, Bot, Trash2 } from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

interface AIInsightsPanelProps {
  nodes: Node[];
  edges: Edge[];
  startNodeId: string;
  endNodeId: string;
}

type ModelType = 'deepseek' | 'gemini';

interface Message {
    role: 'user' | 'model';
    content: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ nodes, edges, startNodeId, endNodeId }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<ModelType>('gemini');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string>('');
  
  // Ref for scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Keep track of Gemini Chat Session
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getGraphContext = () => {
    const startNode = nodes.find(n => n.id === startNodeId)?.label || startNodeId;
    const endNode = nodes.find(n => n.id === endNodeId)?.label || endNodeId;

    const edgesDesc = edges.map(e => {
        const s = nodes.find(n => n.id === e.source)?.label || e.source;
        const t = nodes.find(n => n.id === e.target)?.label || e.target;
        return `${s} -> ${t} (权重: ${e.weight})`;
    }).join('\n');

    return `
当前图结构数据：
节点列表：${nodes.map(n => n.label).join(', ')}
边列表：
${edgesDesc}

起点：${startNode}
终点：${endNode}
    `.trim();
  };

  const getSystemPrompt = () => {
    const context = getGraphContext();
    return `
你是一个运筹学专家助手，专门帮助用户分析图论和最短路径问题。
${context}

请基于上述图数据回答用户的问题。如果用户要求分析，请：
1. 预测从起点到终点的最短路径和总权重。
2. 解释双标号法（Dijkstra算法）在这个具体图上的执行思路。
3. 指出图中的关键节点。
    `.trim();
  };

  const initializeChat = async (promptText: string) => {
      setError('');
      setLoading(true);
      
      const currentSystemPrompt = getSystemPrompt();

      // Optimistic UI update
      setMessages(prev => [...prev, { role: 'user', content: promptText }]);

      try {
          let reply = '';
          if (model === 'gemini') {
            const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
            // Initialize chat with system instruction
            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: currentSystemPrompt
                }
            });
            setGeminiChat(chat);

            const result: GenerateContentResponse = await chat.sendMessage({ message: promptText });
            reply = result.text || '无返回内容';

          } else {
            // DeepSeek - create fresh history with system prompt
            const msgs = [
                { role: 'system', content: currentSystemPrompt },
                { role: 'user', content: promptText }
            ];
            
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: msgs,
                    stream: false
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `API Error: ${res.status}`);
            }

            const data = await res.json();
            reply = data.choices?.[0]?.message?.content || '无返回内容';
          }
          
          setMessages(prev => [...prev, { role: 'model', content: reply }]);

      } catch (err: any) {
          setError(err.message || '请求发生错误');
      } finally {
          setLoading(false);
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !apiKey) return;
    const userMsg = input.trim();
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
        let reply = '';
        if (model === 'gemini') {
            if (!geminiChat) {
                // If chat session is lost or not initialized, re-init with context
                // This handles cases where user might have cleared history manually or something unexpected happened
                await initializeChat(userMsg);
                return;
            }
            const result: GenerateContentResponse = await geminiChat.sendMessage({ message: userMsg });
            reply = result.text || '无返回内容';
        } else {
             // DeepSeek - Reconstruct history
             const context = getGraphContext();
             const systemPrompt = `你是一个运筹学专家。${context}`;
             
             // Map internal 'model' role to OpenAI 'assistant' role
             const apiMessages = [
                 { role: 'system', content: systemPrompt },
                 ...messages.map(m => ({ 
                     role: m.role === 'model' ? 'assistant' : 'user', 
                     content: m.content 
                 })),
                 { role: 'user', content: userMsg }
             ];

             const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: apiMessages,
                    stream: false
                })
            });
             
             if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error?.message || `API Error: ${res.status}`);
            }
            const data = await res.json();
            reply = data.choices?.[0]?.message?.content || '无返回内容';
        }
        setMessages(prev => [...prev, { role: 'model', content: reply }]);

    } catch (err: any) {
         setError(err.message || '请求发生错误');
         setLoading(false); // Make sure to stop loading state on error
    } finally {
        setLoading(false);
    }
  };

  const handleStart = () => {
      if (!apiKey) {
          setError("请先输入 API Key");
          return;
      }
      setMessages([]);
      initializeChat("请分析这个图的最短路径问题。");
  };

  const handleClear = () => {
      setMessages([]);
      setGeminiChat(null);
      setError('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10">
            <h2 className="text-sm font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-2"><Brain size={16} className="text-purple-600"/> AI 智能洞察</span>
                {messages.length > 0 && (
                    <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors" title="清除对话">
                        <Trash2 size={16} />
                    </button>
                )}
            </h2>
        </div>

        {/* Setup Area (Only if no messages) */}
        {messages.length === 0 ? (
            <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 text-center">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Brain size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">准备分析</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        输入 API Key，选择模型，AI 将自动读取当前画布中的节点和边，为您解析最短路径方案。
                    </p>
                    
                    <div className="space-y-4 text-left">
                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">选择模型</label>
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                                <button 
                                    onClick={() => setModel('gemini')}
                                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                        model === 'gemini' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Gemini 2.5
                                </button>
                                <div className="w-px bg-slate-200"></div>
                                <button 
                                    onClick={() => setModel('deepseek')}
                                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                        model === 'deepseek' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    DeepSeek
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block flex items-center gap-1">
                                <KeyRound size={12}/> API Key
                            </label>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={`输入 ${model === 'gemini' ? 'Google' : 'DeepSeek'} API Key`}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <button 
                            onClick={handleStart}
                            disabled={loading || !nodes.length}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            开始分析
                        </button>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                                <div className="mt-0.5 min-w-[4px] h-3 bg-red-400 rounded-full"></div>
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <>
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                     {messages.map((msg, idx) => (
                        <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-purple-600 text-white'
                            }`}>
                                {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                            </div>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                msg.role === 'user' 
                                ? 'bg-white text-slate-800 border border-slate-100 rounded-tr-none' 
                                : 'bg-purple-600 text-white rounded-tl-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                     ))}
                     {loading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                                <Bot size={16}/>
                            </div>
                            <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                                <Loader2 size={16} className="animate-spin text-purple-600" />
                            </div>
                        </div>
                     )}
                     <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200">
                    {error && (
                         <div className="mb-2 text-xs text-red-500 px-2 truncate" title={error}>{error}</div>
                    )}
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            placeholder="继续提问..."
                            className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                            disabled={loading}
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={loading || !input.trim()}
                            className="p-2.5 rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-sm"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </>
        )}
    </div>
  );
};

export default AIInsightsPanel;