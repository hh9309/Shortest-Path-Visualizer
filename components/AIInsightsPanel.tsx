
import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '../types';
import { Brain, Send, Loader2, User, Bot, Trash2, Sparkles, Settings, X, Check, Key, ShieldCheck, Zap, Lock, Unlock, Eye, EyeOff, ChevronRight, Cpu } from 'lucide-react';
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
  
  // 核心配置状态
  const [manualKey, setManualKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<ModelType | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  // 确认 API-Key 并开启下一步
  const handleConfirmKey = () => {
    if (manualKey.trim().length < 8) {
      setError('API-Key 长度不足，请检查后重新输入');
      return;
    }
    setSavedKey(manualKey.trim());
    setError('');
  };

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
${selectedModel === 'deepseek' ? '请以 DeepSeek 的深度逻辑思维，详尽拆解每一步标号的变化原因。' : '请以 Gemini 的高效总结能力，给出最核心的决策洞察。'}`;
  };

  const handleSendMessage = async (customMsg?: string) => {
    if (!savedKey || !selectedModel) {
      setShowSettings(true);
      setError('请先完成引擎配置：1.录入 Key 并确认 -> 2.选择模型');
      return;
    }

    const userMsg = customMsg || input.trim();
    if (!userMsg) return;
    
    setInput('');
    setError('');
    setLoading(true);
    
    if (!customMsg) setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const ai = new GoogleGenAI({ apiKey: savedKey });
      
      let currentChat = geminiChat;
      const modelName = selectedModel === 'gemini' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

      if (!currentChat) {
        currentChat = ai.chats.create({
          model: modelName,
          config: { systemInstruction: getSystemPrompt() },
        });
        setGeminiChat(currentChat);
      }

      const response: GenerateContentResponse = await currentChat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', content: response.text || 'AI 响应为空' }]);
    } catch (err: any) {
      setError(err.message || '调用失败。请检查 Key 是否有效。');
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = savedKey !== '' && selectedModel !== null;

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
              {isConfigured ? (
                <span className="text-[10px] text-emerald-600 font-black uppercase flex items-center gap-1">
                  <ShieldCheck size={10}/> {selectedModel === 'gemini' ? 'Gemini 3 Pro' : 'DeepSeek V3'} 已连接
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Lock size={10}/> 引擎未就绪
                </span>
              )}
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
            title="配置中心"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-50/20">
        {/* Settings Overlay - 强化视觉反馈的配置面板 */}
        {showSettings && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-xl z-40 p-6 flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="flex items-center justify-between mb-10 max-w-md mx-auto w-full">
              <div>
                <h3 className="text-lg font-black text-slate-900">AI 引擎配置中心</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">System Engine Config</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-2 text-slate-300 hover:text-slate-900 bg-slate-50 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-10 max-w-md mx-auto w-full pb-10">
              {/* Step 1: Manual Key Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-black text-slate-700 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] shadow-lg shadow-slate-200">1</span>
                    身份验证: 手工录入 API-KEY
                  </label>
                  {savedKey && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                       <Check size={12} strokeWidth={3}/>
                       <span className="text-[10px] font-black uppercase">已验证</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <Key size={18}/>
                    </div>
                    <input 
                      type={showKey ? "text" : "password"}
                      value={manualKey}
                      onChange={(e) => setManualKey(e.target.value)}
                      placeholder="在此输入您的 API-Key..."
                      className={`w-full pl-12 pr-12 py-5 rounded-2xl border-2 transition-all text-sm font-mono outline-none shadow-sm ${
                        savedKey 
                        ? 'bg-emerald-50/20 border-emerald-500/30 text-emerald-800' 
                        : 'bg-white border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50'
                      }`}
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showKey ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                  </div>
                  <button 
                    onClick={handleConfirmKey}
                    disabled={!manualKey || manualKey === savedKey}
                    className={`w-full py-4 rounded-2xl text-xs font-black transition-all shadow-xl active:scale-95 ${
                      manualKey === savedKey 
                      ? 'bg-slate-100 text-slate-400 cursor-default' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                    }`}
                  >
                    {savedKey ? '更新并重新校验 Key' : '立即校验并锁定 Key'}
                  </button>
                </div>
              </div>

              {/* Step 2: Model Select - 显著提升可见性 */}
              <div className={`space-y-5 transition-all duration-500 ${!savedKey ? 'opacity-30' : 'opacity-100'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-black text-slate-700 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] shadow-lg shadow-slate-200">2</span>
                    模型选择: 决定算法逻辑
                  </label>
                  {!savedKey ? (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 italic">
                      需先完成第一步 <ChevronRight size={10}/>
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-blue-600 flex items-center gap-1 animate-pulse">
                      <Zap size={10} className="fill-blue-600"/> 就绪
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  {(['gemini', 'deepseek'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      disabled={!savedKey}
                      className={`relative overflow-hidden p-6 rounded-3xl border-2 font-black text-xs transition-all flex flex-col items-center gap-3 group ${
                        selectedModel === m 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-200 scale-[1.05] z-10' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/30'
                      } ${!savedKey ? 'cursor-not-allowed grayscale-[0.5]' : 'cursor-pointer'}`}
                    >
                      <div className={`p-3 rounded-2xl transition-all ${
                        selectedModel === m ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-300 group-hover:text-blue-400'
                      }`}>
                        {m === 'gemini' ? <Cpu size={28}/> : <Bot size={28}/>}
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[13px] tracking-tight">{m === 'gemini' ? 'Gemini 3 Pro' : 'DeepSeek V3'}</span>
                        <span className={`text-[9px] mt-1 font-bold px-2 py-0.5 rounded-full ${
                          selectedModel === m ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {m === 'gemini' ? '专家分析' : '深度逻辑'}
                        </span>
                      </div>
                      
                      {selectedModel === m && (
                        <div className="absolute top-3 right-3 bg-white text-blue-600 rounded-full p-0.5 shadow-lg">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Final Step */}
              <div className="pt-6 border-t border-slate-100">
                <button
                  disabled={!isConfigured}
                  onClick={() => setShowSettings(false)}
                  className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-sm shadow-2xl shadow-blue-200 disabled:opacity-20 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 group"
                >
                  <Sparkles size={20} className="text-amber-300 fill-amber-300 group-hover:rotate-12 transition-transform" />
                  保存配置并开始洞察
                </button>
                {error && <p className="mt-4 text-[11px] text-red-500 text-center font-black bg-red-50 py-3 rounded-xl border border-red-100 animate-bounce">{error}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        <div ref={chatContainerRef} className="h-full overflow-y-auto p-5 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="relative mb-8">
                <div className="w-28 h-28 bg-white text-blue-600 rounded-[3rem] flex items-center justify-center shadow-2xl border border-blue-50 animate-pulse">
                  <Sparkles size={54} className="fill-blue-600" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white">
                  <Zap size={20} className="fill-white"/>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">准备好获取深度见解了吗？</h3>
              <p className="text-[13px] text-slate-400 mt-4 mb-10 max-w-[320px] leading-relaxed font-bold">
                “输入 API-Key ➜ 确认并锁定 ➜ 选择引擎”
                <br/>
                <span className="text-blue-500/70">完成配置后，AI 将为您拆解每一轮双标号法的执行细节。</span>
              </p>
              
              {!isConfigured ? (
                <button 
                  onClick={() => setShowSettings(true)}
                  className="px-12 py-5 bg-slate-900 text-white text-xs font-black rounded-2xl shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95 group"
                >
                  <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" /> 立即前往配置中心
                </button>
              ) : (
                <button 
                  onClick={() => handleSendMessage("请分析当前图的最短路径问题并给出执行策略。")}
                  disabled={loading}
                  className="px-14 py-5 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95"
                >
                  {loading ? <Loader2 size={24} className="animate-spin"/> : <Zap size={24} className="text-amber-300 fill-amber-300"/>}
                  生成完整算法洞察报告
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8 pb-4 max-w-4xl mx-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-lg transition-all ${msg.role === 'user' ? 'bg-white text-slate-600 border-slate-100' : 'bg-slate-900 text-white border-slate-800'}`}>
                    {msg.role === 'user' ? <User size={22}/> : <Bot size={22}/>}
                  </div>
                  <div className={`max-w-[85%] rounded-[2rem] px-7 py-5 text-[14px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap transition-all ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><Bot size={22}/></div>
                  <div className="bg-white border border-slate-100 px-7 py-5 rounded-[2rem] rounded-tl-none shadow-sm flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2.5 h-2.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-black tracking-widest uppercase">模型正在推演矩阵标号...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      {messages.length > 0 && !showSettings && (
        <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-20px_40px_rgba(0,0,0,0.03)] z-20">
          <div className="flex items-center gap-4 max-w-5xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="询问具体的双标号法执行细节..."
              className="flex-1 px-8 py-5 rounded-full border-2 border-slate-50 bg-slate-50 text-[14px] font-bold focus:ring-8 focus:ring-blue-50 focus:bg-white focus:border-blue-500 transition-all outline-none shadow-inner"
              disabled={loading}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={loading || !input.trim()} 
              className="p-5 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 active:scale-90 disabled:opacity-10 transition-all flex-shrink-0"
            >
              <Send size={28} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
