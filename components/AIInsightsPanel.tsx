
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
  
  // 核心配置状态 - 尝试从 SessionStorage 恢复
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

  // 当配置变更时重置聊天上下文以应用新设置
  useEffect(() => {
    setGeminiChat(null);
  }, [selectedModel, userApiKey]);

  /**
   * 增强型 API Key 清洗逻辑
   * 彻底剔除所有非 ASCII 字符、控制字符及首尾空格，解决 Headers 编码冲突
   */
  const getCleanKey = (key: string) => {
    return key.replace(/[\u007F-\uFFFF]/g, "").replace(/[\s\t\n\r]/g, "").trim();
  };

  const handleApplyConfig = () => {
    const cleanKey = getCleanKey(userApiKey);
    if (!cleanKey || cleanKey.length < 10) {
      setError('请输入有效的 API-Key (通常以 AIza 开头)');
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

    return `你是一位资深运筹学导师，专注于图论与最短路径算法。
当前图结构如下：
${edgesDesc}

你的任务：使用“双标号法”（Dijkstra算法变体，包含P永久标号与T临时标号）分析从节点 ${startNode} 到 ${endNode} 的路径。

分析指南：
1. 识别当前拓扑中的关键路径与瓶颈。
2. 解释标号的更新逻辑（如何从 T 标号转为 P 标号）。
3. ${selectedModel === 'deepseek' ? '风格：深度数学推导，严谨且详尽。' : '风格：策略洞察，侧重于全局优化建议。'}
4. 约束：回答必须高度专业且精炼，严禁超过 300 字。`;
  };

  const handleSendMessage = async (customMsg?: string) => {
    // 自动回退：如果用户没输 Key，尝试使用环境内置 Key (如果有)
    const activeKey = getCleanKey(userApiKey) || (process.env.API_KEY ? getCleanKey(process.env.API_KEY) : '');
    
    if (!activeKey) {
      setShowSettings(true);
      setError('未检测到有效的 API Key，请先配置。');
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
      
      // 模型映射
      const modelName = selectedModel === 'gemini' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      
      // 如果是 Pro 模型，启用 Thinking 增强逻辑分析能力
      const config = {
        systemInstruction: getSystemPrompt(),
        ...(modelName.includes('pro') ? { thinkingConfig: { thinkingBudget: 2000 } } : {})
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
      
      if (!text) throw new Error("AI 返回了空响应，可能是由于安全过滤或配额限制。");
      
      setMessages(prev => [...prev, { role: 'model', content: text }]);
      setIsKeyValid(true); // 成功响应，确认 Key 有效
    } catch (err: any) {
      console.error("AI SDK Error:", err);
      const errorMsg = err.message || '';
      
      if (errorMsg.includes('API key not valid')) {
        setError('API Key 无效，请重新输入。');
        setIsKeyValid(false);
      } else if (errorMsg.includes('quota')) {
        setError('API 配额已耗尽或请求过快。');
      } else if (errorMsg.includes('fetch')) {
        setError('网络请求失败，请检查网络连接或代理设置。');
      } else {
        setError(`AI 响应异常: ${errorMsg.slice(0, 50)}...`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans border-t border-slate-200">
      {/* 顶部状态栏 */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-5 py-3 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
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
                {isKeyValid ? '内核已加载' : '等待安全配置'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => { setMessages([]); setGeminiChat(null); }} 
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-all border ${
              showSettings 
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-50/20">
        {/* 设置面板 */}
        {showSettings && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-2xl z-40 p-6 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8 max-w-sm mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Settings size={18}/></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">智能洞察配置</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">Engine Parameters</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-1.5 text-slate-300 hover:text-slate-900 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 max-w-sm mx-auto w-full pb-8">
              {/* API Key 录入 */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  <span>API-Key 安全授权</span>
                  {isKeyValid && <span className="text-emerald-500 text-[8px] flex items-center gap-1"><Check size={10}/> Verified</span>}
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Key size={14}/></div>
                  <input 
                    type={showKey ? "text" : "password"}
                    value={userApiKey}
                    onChange={(e) => {
                      setUserApiKey(e.target.value);
                      setIsKeyValid(false);
                    }}
                    placeholder="粘贴 AIza... 格式的密钥"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* 模型切换 */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">选择逻辑内核</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['gemini', 'deepseek'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                        selectedModel === m 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      <div className={`p-1 rounded-md ${selectedModel === m ? 'bg-white/20' : 'bg-slate-50'}`}>
                        {m === 'gemini' ? <Cpu size={12}/> : <Bot size={12}/>}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tight">{m === 'gemini' ? 'Gemini 3 Pro' : 'Fast Insight'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={handleApplyConfig}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-[11px] shadow-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck size={16} className="text-indigo-400" />
                  保存并同步配置
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 聊天内容区 */}
        <div ref={chatContainerRef} className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[250px]">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-10 animate-pulse"></div>
                <div className={`relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-indigo-50 transition-all ${isKeyValid ? 'text-indigo-600' : 'text-slate-300'}`}>
                  {isKeyValid ? <Sparkles size={32} className="fill-indigo-600" /> : <Lock size={32} />}
                </div>
              </div>
              <h3 className="text-sm font-black text-slate-900">算法智能洞察</h3>
              <p className="text-[10px] text-slate-400 mt-2 mb-8 max-w-[200px] leading-relaxed font-bold">
                {isKeyValid ? '就绪！点击下方按钮，基于当前 P/T 标号生成深度分析。' : '请先点击右上角设置图标录入密钥。'}
              </p>
              
              <button 
                onClick={() => handleSendMessage("基于当前网络拓扑和双标号状态，请分析最短路径趋势。")}
                disabled={loading || !isKeyValid}
                className="px-8 py-3 bg-indigo-600 text-white text-[11px] font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-20 disabled:grayscale"
              >
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="text-amber-300 fill-amber-300"/>}
                生成 300 字洞察报告
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-sm transition-all ${msg.role === 'user' ? 'bg-white text-slate-400' : 'bg-slate-900 text-white border-slate-800'}`}>
                    {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-[12px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap transition-all ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm"><Bot size={16}/></div>
                  <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">逻辑推演中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 错误浮窗 */}
      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <Info size={14} />
          {error}
        </div>
      )}

      {/* 底部输入栏 */}
      {messages.length > 0 && !showSettings && (
        <div className="p-3 bg-white border-t border-slate-100 shadow-sm z-20 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="询问特定标号逻辑或算法瓶颈..."
              className="flex-1 px-5 py-2.5 rounded-full border border-slate-100 bg-slate-50 text-[12px] font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
              disabled={loading || !isKeyValid}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={loading || !input.trim() || !isKeyValid} 
              className="p-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:bg-indigo-600 active:scale-90 disabled:opacity-20 transition-all flex-shrink-0"
            >
              <Send size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
