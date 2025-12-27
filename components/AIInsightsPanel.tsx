
import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '../types';
import { Brain, Send, Loader2, User, Bot, Trash2, Sparkles, Settings, X, Check, ShieldCheck, Zap, Cpu, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

interface AIInsightsPanelProps {
  nodes: Node[];
  edges: Edge[];
  startNodeId: string;
  endNodeId: string;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

type ModelType = 'gemini' | 'deepseek';

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ nodes, edges, startNodeId, endNodeId }) => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  // 当模型改变时，重置对话上下文
  useEffect(() => {
    setGeminiChat(null);
  }, [selectedModel]);

  const getSystemPrompt = () => {
    const startNode = nodes.find(n => n.id === startNodeId)?.label || startNodeId;
    const endNode = nodes.find(n => n.id === endNodeId)?.label || endNodeId;
    const edgesDesc = edges.map(e => {
      const s = nodes.find(n => n.id === e.source)?.label || e.source;
      const t = nodes.find(n => n.id === e.target)?.label || e.target;
      return `${s} -> ${t} (权重: ${e.weight})`;
    }).join('\n');

    return `你是一位运筹学专家。当前网络图数据：\n${edgesDesc}\n
目标：分析从 ${startNode} 到 ${endNode} 的最短路径。
当前算法执行模式：双标号法（P 标号与 T 标号更新逻辑）。
${selectedModel === 'deepseek' ? '请以深度逻辑思维，详尽拆解每一步标号的变化原因。' : '请以高效总结能力，给出最核心的决策洞察。'}
注意：你的回答内容必须精炼，严格限制在 300 字以内。`;
  };

  const handleSendMessage = async (customMsg?: string) => {
    const userMsg = customMsg || input.trim();
    if (!userMsg) return;
    
    setInput('');
    setError('');
    setLoading(true);
    
    if (!customMsg) setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      // 必须使用 process.env.API_KEY 初始化的 GoogleGenAI
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let currentChat = geminiChat;
      const modelName = selectedModel === 'gemini' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

      if (!currentChat) {
        currentChat = ai.chats.create({
          model: modelName,
          config: { 
            systemInstruction: getSystemPrompt(),
            maxOutputTokens: 600, // 配合 300 字限制
          },
        });
        setGeminiChat(currentChat);
      }

      const response: GenerateContentResponse = await currentChat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', content: response.text || 'AI 响应为空' }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      setError('AI 引擎响应异常，请确保网络连接正常。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight">AI 决策引擎</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-1">
                <ShieldCheck size={10}/> 核心引擎就绪
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => { setMessages([]); setGeminiChat(null); }} 
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="清空聊天记录"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl transition-all border ${showSettings ? 'bg-blue-600 border-blue-600 text-white shadow-xl rotate-90' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title="模型选择"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-50/20">
        {/* Settings Overlay - 简化后的模型选择面板 */}
        {showSettings && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-xl z-40 p-6 flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="flex items-center justify-between mb-8 max-w-md mx-auto w-full">
              <div>
                <h3 className="text-lg font-black text-slate-900">模型选择: 决定算法</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Algorithm Strategy Select</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-2 text-slate-300 hover:text-slate-900 bg-slate-50 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8 max-w-md mx-auto w-full pb-10">
              <div className="grid grid-cols-2 gap-4">
                {(['gemini', 'deepseek'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`relative overflow-hidden p-3 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1.5 group ${
                      selectedModel === m 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.02] z-10' 
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-all ${
                      selectedModel === m ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-300 group-hover:text-blue-400'
                    }`}>
                      {m === 'gemini' ? <Cpu size={12}/> : <Bot size={12}/>}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] tracking-tight">{m === 'gemini' ? 'Gemini 3 Pro' : 'DeepSeek V3'}</span>
                      <span className={`text-[7px] mt-0.5 font-bold px-1.5 py-0.5 rounded-full ${
                        selectedModel === m ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {m === 'gemini' ? '专家总结' : '逻辑推演'}
                      </span>
                    </div>
                    
                    {selectedModel === m && (
                      <div className="absolute top-1.5 right-1.5 bg-white text-blue-600 rounded-full p-0.5 shadow-lg">
                        <Check size={8} strokeWidth={5} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  <Sparkles size={18} className="text-amber-300 fill-amber-300" />
                  保存并返回
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div ref={chatContainerRef} className="h-full overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-white text-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-blue-50 animate-pulse">
                  <Sparkles size={48} className="fill-blue-600" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">准备好获取深度见解了吗？</h3>
              <p className="text-[12px] text-slate-400 mt-4 mb-8 max-w-[280px] leading-relaxed font-bold">
                点击下方按钮生成针对当前图结构的执行洞察。
                <br/>
                <span className="text-blue-500/70">内容将严格限制在 300 字内。</span>
              </p>
              
              <button 
                onClick={() => handleSendMessage("请分析当前图的最短路径问题并给出执行策略。")}
                disabled={loading}
                className="px-12 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
              >
                {loading ? <Loader2 size={20} className="animate-spin"/> : <Zap size={20} className="text-amber-300 fill-amber-300"/>}
                生成算法报告
              </button>
            </div>
          ) : (
            <div className="space-y-8 pb-4 max-w-4xl mx-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-md transition-all ${msg.role === 'user' ? 'bg-white text-slate-600 border-slate-100' : 'bg-slate-900 text-white border-slate-800'}`}>
                    {msg.role === 'user' ? <User size={20}/> : <Bot size={20}/>}
                  </div>
                  <div className={`max-w-[85%] rounded-[1.5rem] px-6 py-4 text-[14px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap transition-all ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md"><Bot size={20}/></div>
                  <div className="bg-white border border-slate-100 px-6 py-4 rounded-[1.5rem] rounded-tl-none shadow-sm flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">计算中...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl z-50 animate-bounce">
          {error}
        </div>
      )}

      {/* Input Bar */}
      {messages.length > 0 && !showSettings && (
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-15px_30px_rgba(0,0,0,0.02)] z-20">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="询问双标号法细节..."
              className="flex-1 px-6 py-4 rounded-full border-2 border-slate-50 bg-slate-50 text-[13px] font-bold focus:ring-4 focus:ring-blue-50 focus:bg-white focus:border-blue-500 transition-all outline-none shadow-inner"
              disabled={loading}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={loading || !input.trim()} 
              className="p-4 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 active:scale-90 disabled:opacity-10 transition-all flex-shrink-0"
            >
              <Send size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
