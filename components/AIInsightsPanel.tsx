
import React, { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '../types';
import { Brain, Send, Loader2, User, Bot, Trash2, Sparkles, Settings, X, Check, ShieldCheck, Zap, Cpu, Key, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
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
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [geminiChat, setGeminiChat] = useState<Chat | null>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => { 
    // 内容变化或加载状态变化时滚动到底部
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // 当模型或 Key 改变时，重置对话上下文
  useEffect(() => {
    setGeminiChat(null);
  }, [selectedModel, userApiKey]);

  /**
   * 清洗 API Key，防止 Header 编码错误 (non ISO-8859-1 code point)
   */
  const getCleanKey = (key: string) => {
    return key.replace(/[^\x00-\x7F]/g, "").trim();
  };

  const handleApplyConfig = () => {
    const cleanKey = getCleanKey(userApiKey);
    if (!cleanKey || cleanKey.length < 10) {
      setError('请输入有效的 API-Key');
      setIsKeyValid(false);
      return;
    }
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

    return `你是一位运筹学专家。当前网络图数据：\n${edgesDesc}\n
目标：分析从 ${startNode} 到 ${endNode} 的最短路径。
当前算法执行模式：双标号法（P 标号与 T 标号更新逻辑）。
${selectedModel === 'deepseek' ? '请以深度逻辑思维，详尽拆解每一步标号的变化原因。' : '请以高效总结能力，给出最核心的决策洞察。'}
注意：你的回答内容必须高度精炼，字数严格限制在 300 字以内。`;
  };

  const handleSendMessage = async (customMsg?: string) => {
    if (!isKeyValid) {
      setShowSettings(true);
      setError('请先在配置中录入 API-Key 并确认');
      return;
    }

    const userMsg = customMsg || input.trim();
    if (!userMsg) return;
    
    setInput('');
    setError('');
    setLoading(true);
    
    if (!customMsg) setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const apiKey = getCleanKey(userApiKey);
      const ai = new GoogleGenAI({ apiKey });
      
      let currentChat = geminiChat;
      const modelName = selectedModel === 'gemini' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

      if (!currentChat) {
        currentChat = ai.chats.create({
          model: modelName,
          config: { 
            systemInstruction: getSystemPrompt(),
          },
        });
        setGeminiChat(currentChat);
      }

      const response: GenerateContentResponse = await currentChat.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', content: response.text || 'AI 响应为空' }]);
    } catch (err: any) {
      console.error("AI Error:", err);
      setError('AI 响应异常。请确认 Key 的有效性及网络连接。');
      if (err.message?.includes('key not valid')) setIsKeyValid(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden font-sans border-t border-slate-200">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Brain size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-800 tracking-tight">AI 决策引擎</h2>
            <div className="flex items-center gap-1.5">
              {isKeyValid ? (
                <span className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-1">
                  <ShieldCheck size={8}/> 引擎就绪
                </span>
              ) : (
                <span className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-1">
                  <Lock size={8}/> 待录入 Key
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => { setMessages([]); setGeminiChat(null); }} 
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-all"
              title="清空聊天记录"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-all border ${showSettings ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-slate-50/20">
        {/* Settings Overlay - 添加 overflow-y-auto 解决不可见问题 */}
        {showSettings && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-xl z-40 p-5 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-5 max-w-sm mx-auto w-full flex-shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900">引擎配置</h3>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Engine Setup</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1 text-slate-300 hover:text-slate-900 bg-slate-50 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 max-w-sm mx-auto w-full pb-6">
              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Key size={10} /> 录入 API-Key
                </label>
                <div className="relative">
                  <input 
                    type={showKey ? "text" : "password"}
                    value={userApiKey}
                    onChange={(e) => {
                      setUserApiKey(e.target.value);
                      setIsKeyValid(false);
                    }}
                    placeholder="在此粘贴您的 API Key..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Model Select */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={10} /> 模型选择 (图标已缩放)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['gemini', 'deepseek'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 group ${
                        selectedModel === m 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                      }`}
                    >
                      <div className={`p-1 rounded-md ${selectedModel === m ? 'bg-white/20' : 'bg-slate-50'}`}>
                        {m === 'gemini' ? <Cpu size={10}/> : <Bot size={10}/>}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tight">{m === 'gemini' ? 'Gemini 3' : 'DeepSeek'}</span>
                      {selectedModel === m && (
                        <div className="absolute top-1 right-1 bg-white text-blue-600 rounded-full p-0.5 shadow-sm">
                          <Check size={6} strokeWidth={6} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex-shrink-0">
                <button
                  onClick={handleApplyConfig}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[11px] shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={14} /> 确认并开始推演
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat History - 核心内容区域，自带滚动条 */}
        <div ref={chatContainerRef} className="h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[250px]">
              <div className="relative mb-4">
                <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-blue-50 transition-all ${isKeyValid ? 'text-blue-600' : 'text-slate-300'}`}>
                  {isKeyValid ? <Sparkles size={28} className="fill-blue-600 animate-pulse" /> : <Lock size={28} />}
                </div>
              </div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">AI 算法辅助报告</h3>
              <p className="text-[10px] text-slate-400 mt-2 mb-6 max-w-[220px] leading-relaxed font-bold">
                {isKeyValid ? '一切就绪！点击下方按钮，获取 300 字以内的最短路径执行策略报告。' : '当前尚未配置 API 密钥，请点击右上角设置图标开始。'}
              </p>
              
              <button 
                onClick={() => handleSendMessage("请分析当前图的最短路径问题并给出执行策略。")}
                disabled={loading || !isKeyValid}
                className="px-8 py-3 bg-blue-600 text-white text-[11px] font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-20 disabled:grayscale"
              >
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14} className="text-amber-300 fill-amber-300"/>}
                生成 300 字洞察报告
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-sm transition-all ${msg.role === 'user' ? 'bg-white text-slate-600 border-slate-100' : 'bg-slate-900 text-white border-slate-800'}`}>
                    {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-[12px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap transition-all ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm"><Bot size={14}/></div>
                  <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">模型思考中...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error Message Display - 自动浮现 */}
      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {error}
        </div>
      )}

      {/* Input Bar - 底部输入栏 */}
      {messages.length > 0 && !showSettings && (
        <div className="p-3 bg-white border-t border-slate-100 shadow-sm z-20 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="继续询问最短路算法细节..."
              className="flex-1 px-5 py-2.5 rounded-full border border-slate-100 bg-slate-50 text-[12px] font-bold focus:bg-white focus:border-blue-500 transition-all outline-none"
              disabled={loading || !isKeyValid}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={loading || !input.trim() || !isKeyValid} 
              className="p-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 active:scale-90 disabled:opacity-20 transition-all flex-shrink-0"
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
