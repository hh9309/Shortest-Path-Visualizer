
import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '../types';
import { 
  Brain, Send, Loader2, User, Bot, Trash2, Sparkles, 
  Settings, X, Check, ShieldCheck, Zap, Cpu, Key, 
  Eye, EyeOff, Lock, Unlock, ChevronRight, Info
} from 'lucide-react';
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
  const [userApiKey, setUserApiKey] = useState<string>(() => sessionStorage.getItem('path_ai_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(() => !!sessionStorage.getItem('path_ai_key'));
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ 
        top: chatContainerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  useEffect(() => { 
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // 配置变更时重置
  useEffect(() => {
    setGeminiChat(null);
  }, [selectedModel, userApiKey]);

  /**
   * 严格清洗 API Key
   */
  const getCleanKey = (key: string) => {
    if (!key) return '';
    return key.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '').trim();
  };

  const handleApplyConfig = () => {
    const cleanKey = getCleanKey(userApiKey);
    if (!cleanKey || cleanKey.length < 10) {
      setError('请输入有效的 API-Key');
      setIsKeyValid(false);
      return;
    }
    sessionStorage.setItem('path_ai_key', cleanKey);
    setError('');
    setIsKeyValid(true);
    setShowSettings(false);
  };

  const getSystemPrompt = () => {
    const startNode = nodes.find(n => n.id === startNodeId)?.label || startNodeId;
    const endNode = nodes.find(n => n.id === endNodeId)?.label || endNodeId;
    const edgesDesc = edges.map(e => {
      const s = nodes.find(n => n.id === e.source)?.label || e.source;
      const t = nodes.find(n => n.id === e.target)?.label || e.target;
      return `${s} -> ${t} (权重: ${e.weight})`;
    }).join('\n');

    return `你是一位顶级运筹学专家。当前网络结构：\n${edgesDesc}\n
目标：分析从 ${startNode} 到 ${endNode} 的最短路径执行方案。
算法：双标号法（Dijkstra变体）。
${selectedModel === 'deepseek' 
  ? '思维模式：采用基础逻辑链，详尽解析每一个标号的变化及潜在路径排除逻辑。' 
  : '思维模式：采用 Gemini 2.5 核心策略，快速给出最优路径建议及算法关键点。'}
约束：你的回答必须精准且极具启发性，字数严禁超过 300 字。`;
  };

  const handleSendMessage = async (customMsg?: string) => {
    const activeKey = getCleanKey(userApiKey) || (process.env.API_KEY ? getCleanKey(process.env.API_KEY) : '');
    
    if (!activeKey) {
      setShowSettings(true);
      setError('请先在配置中录入有效的 API Key。');
      return;
    }

    const userMsg = customMsg || input.trim();
    if (!userMsg) return;
    
    setInput('');
    setError('');
    setLoading(true);
    
    if (!customMsg) setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      // 根据用户要求修改模型：Gemini 2.5 替代原 Gemini 3 Pro，DeepSeek 映射为基础 Flash 版
      const modelName = selectedModel === 'gemini' ? 'gemini-2.5-flash-preview-09-2025' : 'gemini-3-flash-preview';
      
      const config = {
        systemInstruction: getSystemPrompt(),
        // 2.5 系列支持思维链预算
        ...(selectedModel === 'gemini' ? { thinkingConfig: { thinkingBudget: 2000 } } : {})
      };

      let currentChat = geminiChat;
      if (!currentChat) {
        currentChat = ai.chats.create({
          model: modelName,
          config: config,
        });
        setGeminiChat(currentChat);
      }

      const response: GenerateContentResponse = await currentChat.sendMessage({ message: userMsg });
      const text = response.text;
      
      if (!text) throw new Error("AI 引擎未返回有效文本内容。");
      
      setMessages(prev => [...prev, { role: 'model', content: text }]);
      setIsKeyValid(true);
    } catch (err: any) {
      console.error("AI Insight Error:", err);
      const msg = err.message || '';
      if (msg.includes('key not valid') || msg.includes('401')) {
        setError('API Key 校验失败，请检查并重新输入。');
        setIsKeyValid(false);
        setShowSettings(true);
      } else if (msg.includes('fetch')) {
        setError('网络连接异常，无法访问 AI 服务。');
      } else {
        setError(`AI 响应异常：请确认 Key 有效性及网络。`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans border-t border-slate-200">
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-5 py-3.5 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100 ring-2 ring-white">
            <Brain size={18} />
          </div>
          <div>
            <h2 className="text-[11px] font-black text-slate-800 tracking-tight flex items-center gap-2">
              AI 决策引擎
              <span className={`w-1.5 h-1.5 rounded-full ${isKeyValid ? 'bg-emerald-500' : 'bg-slate-300'} animate-pulse`}></span>
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isKeyValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isKeyValid ? '逻辑内核已就绪' : '等待身份验证'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => { setMessages([]); setGeminiChat(null); }} 
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="重置对话"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-all border ${
              showSettings 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' 
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="配置中心"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-50/20">
        {showSettings && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-2xl z-40 p-6 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8 max-w-sm mx-auto w-full flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-inner"><Settings size={18}/></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">引擎内核配置</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">Logic & Auth Setup</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-1.5 text-slate-300 hover:text-slate-900 transition-all rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 max-w-sm mx-auto w-full pb-8">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>安全授权 (API-Key)</span>
                  {isKeyValid && <span className="text-emerald-500 text-[8px] flex items-center gap-1 font-bold animate-pulse"><Check size={10}/> 已验证</span>}
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><Key size={14}/></div>
                  <input 
                    type={showKey ? "text" : "password"}
                    value={userApiKey}
                    onChange={(e) => {
                      setUserApiKey(e.target.value);
                      setIsKeyValid(false);
                    }}
                    placeholder="请输入有效的 API-Key..."
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">逻辑演化内核</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['gemini', 'deepseek'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      className={`relative p-3.5 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedModel === m 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md transition-colors ${selectedModel === m ? 'bg-white/20' : 'bg-slate-50'}`}>
                        {m === 'gemini' ? <Cpu size={12}/> : <Bot size={12}/>}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tight">
                        {m === 'gemini' ? 'Gemini 2.5' : 'DeepSeek (基础)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex-shrink-0">
                <button
                  onClick={handleApplyConfig}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[11px] shadow-2xl hover:bg-indigo-900 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group active:scale-95"
                >
                  <ShieldCheck size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  保存配置并初始化引擎
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={chatContainerRef} className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[300px]">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[40px] opacity-10 animate-pulse"></div>
                <div className={`relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl border border-indigo-50 transition-all duration-500 ${isKeyValid ? 'text-indigo-600 scale-110' : 'text-slate-200 rotate-6'}`}>
                  {isKeyValid ? <Sparkles size={32} className="fill-indigo-600 animate-pulse" /> : <Lock size={32} />}
                </div>
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">算法智能推演报告</h3>
              <p className="text-[10px] text-slate-400 mt-2.5 mb-8 max-w-[220px] leading-relaxed font-bold">
                {isKeyValid 
                  ? '一切就绪！点击下方按钮，由所选内核为您生成 300 字以内的最短路径执行策略。' 
                  : '要开启智能分析，请先在右上角设置中配置 API-Key。'}
              </p>
              
              <button 
                onClick={() => handleSendMessage("请基于当前的拓扑结构与标号状态，给出最短路径的逻辑分析报告。")}
                disabled={loading || !isKeyValid}
                className="px-8 py-3.5 bg-indigo-600 text-white text-[11px] font-black rounded-xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-20 disabled:grayscale"
              >
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="text-amber-300 fill-amber-300"/>}
                生成 300 字决策洞察
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm transition-all ${msg.role === 'user' ? 'bg-white text-slate-400 border-slate-100' : 'bg-slate-900 text-white border-slate-800'}`}>
                    {msg.role === 'user' ? <User size={18}/> : <Bot size={18}/>}
                  </div>
                  <div className={`max-w-[85%] rounded-[1.25rem] px-5 py-3.5 text-[12px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap transition-all ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg animate-pulse"><Bot size={18}/></div>
                  <div className="bg-white border border-slate-100 px-5 py-3.5 rounded-[1.25rem] rounded-tl-none shadow-sm flex items-center gap-4">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">Deep Logic Computing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-xl text-[10px] font-black shadow-2xl z-50 animate-in fade-in zoom-in duration-300 flex items-center gap-3">
          <Info size={16} />
          {error}
        </div>
      )}

      {messages.length > 0 && !showSettings && (
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-20 flex-shrink-0">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="继续深挖标号细节或瓶颈分析..."
              className="flex-1 px-6 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-[12px] font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all outline-none shadow-inner"
              disabled={loading || !isKeyValid}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={loading || !input.trim() || !isKeyValid} 
              className="w-11 h-11 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 disabled:opacity-20 transition-all flex-shrink-0"
            >
              <Send size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
