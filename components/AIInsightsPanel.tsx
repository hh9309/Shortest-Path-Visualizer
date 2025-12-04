
import React, { useState } from 'react';
import { Node, Edge } from '../types';
import { Brain, Send, Loader2, KeyRound } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AIInsightsPanelProps {
  nodes: Node[];
  edges: Edge[];
  startNodeId: string;
  endNodeId: string;
}

type ModelType = 'deepseek' | 'gemini';

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ nodes, edges, startNodeId, endNodeId }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<ModelType>('gemini');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  const generatePrompt = () => {
    const startNode = nodes.find(n => n.id === startNodeId)?.label || startNodeId;
    const endNode = nodes.find(n => n.id === endNodeId)?.label || endNodeId;

    const edgesDesc = edges.map(e => {
        const s = nodes.find(n => n.id === e.source)?.label || e.source;
        const t = nodes.find(n => n.id === e.target)?.label || e.target;
        return `${s} -> ${t} (权重: ${e.weight})`;
    }).join('\n');

    return `
我有一个图论的最短路问题，请帮我分析。
图的结构如下：
节点列表：${nodes.map(n => n.label).join(', ')}
边列表：
${edgesDesc}

起点是：${startNode}
终点是：${endNode}

请完成以下任务：
1. 预测从起点到终点的最短路径和总权重。
2. 简要解释双标号法（Dijkstra算法）在这个具体图上的执行思路。
3. 指出图中的关键节点或瓶颈。

请用中文回答，格式清晰。
    `.trim();
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
        setError('请输入 API Key');
        return;
    }
    setError('');
    setLoading(true);
    setResponse('');

    const prompt = generatePrompt();

    try {
        if (model === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setResponse(result.text || '无返回内容');
        } else {
            // DeepSeek API Call
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: prompt }],
                    stream: false
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || 'API 请求失败');
            }

            const data = await res.json();
            setResponse(data.choices?.[0]?.message?.content || '无返回内容');
        }
    } catch (err: any) {
        setError(err.message || '请求发生错误');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Brain size={16} className="text-purple-600"/> 
                AI 智能洞察
            </h2>
            <p className="text-xs text-slate-500 mt-1">分析图结构并解释最短路问题</p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Settings */}
            <div className="space-y-3">
                <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">选择模型</label>
                    <div className="flex rounded-md shadow-sm border border-slate-300 overflow-hidden">
                        <button 
                            onClick={() => setModel('gemini')}
                            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                model === 'gemini' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Gemini 2.5
                        </button>
                        <div className="w-px bg-slate-300"></div>
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
                        className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button 
                    onClick={handleAnalyze}
                    disabled={loading || !nodes.length}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    开始分析
                </button>
            </div>

            {/* Output */}
            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                    {error}
                </div>
            )}

            {response && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">分析结果</div>
                    <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap shadow-sm">
                        {response}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default AIInsightsPanel;
