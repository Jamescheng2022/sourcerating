'use client';

import { useState, useEffect, useRef } from 'react';

type Stats = {
  cash: number;
  reputation: number;
  alignment: number;
};

type GameState = {
  turn: number;
  timeline: string;
  protagonist: string;
  stats: Stats;
  assets: string[];
  relationships: {
    allies: string[];
    enemies: string[];
    debts: any[];
  };
  flags: string[];
};

type Option = {
  id: string;
  text: string;
  risk?: string;
};

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState>({
    turn: 1,
    timeline: "1920-01",
    protagonist: "林镇�?,
    stats: { cash: 1000, reputation: 50, alignment: 0 },
    assets: ["吉隆坡祖�?],
    relationships: { allies: [], enemies: [], debts: [] },
    flags: [],
  });

  const [storyLog, setStoryLog] = useState<string[]>([
    "你在南洋的码头睁开眼，空气中弥漫着咸腥的海味和热带的湿气�?920年，大变局的序幕已经拉开。你手里攥着那张通往吉隆坡的船票，兜里仅�?000块，但你的眼中闪烁着重生的光芒�?
  ]);
  const [options, setOptions] = useState<Option[]>([
    { id: "A", text: "低调行事：去橡胶园打短工攒钱", risk: "�? },
    { id: "B", text: "险中求胜：在码头黑市做二手贩�?, risk: "�? },
    { id: "C", text: "社交借力：找旧友林二叔谋份差�?, risk: "�? }
  ]);
  const [customInput, setCustomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storyLog]);

  const handleAction = async (inputText: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/game/next_turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: "test_user_1",
          session_id: "session_abc",
          input_text: inputText,
          current_state: gameState
        }),
      });
      const data = await response.json();
      setStoryLog([...storyLog, `> 你选择了：${inputText}`, data.story_text]);
      setGameState(data.new_state);
      setOptions(data.options);
    } catch (error) {
      console.error("AI 正在南洋赶路...", error);
      setStoryLog([...storyLog, `> 系统消息：AI 后端未连接，请先启动 API 服务。`]);
    } finally {
      setLoading(false);
      setCustomInput("");
    }
  };

  return (
    <div className="min-h-screen bg-[#1a2f23] text-[#e0d7c6] font-serif p-4 md:p-8 flex flex-col items-center">
      {/* Stat Bar */}
      <div className="w-full max-w-4xl bg-[#2a3f33] border-b border-[#c5a059] p-4 flex justify-between shadow-2xl mb-6 sticky top-0 z-10">
        <div className="flex flex-col items-center">
          <span className="text-[#c5a059] text-xs uppercase tracking-widest font-bold">资金�?(Cash)</span>
          <span className="text-xl font-bold font-mono">\$ {gameState.stats.cash.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#c5a059] text-xs uppercase tracking-widest font-bold">名望�?(Rep)</span>
          <span className="text-xl font-bold font-mono">{gameState.stats.reputation}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#c5a059] text-xs uppercase tracking-widest font-bold">阵营 (Align)</span>
          <span className="text-xl font-bold font-mono">{gameState.stats.alignment > 0 ? "教父" : "枭雄"} ({gameState.stats.alignment})</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#c5a059] text-xs uppercase tracking-widest font-bold">时间 (Time)</span>
          <span className="text-xl font-bold font-mono">{gameState.timeline}</span>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Story Area */}
        <div className="md:col-span-2 bg-[#fdfaf3] text-[#2c3e50] p-6 rounded-sm shadow-inner overflow-y-auto max-h-[60vh] border-r-4 border-[#c5a059] relative" ref={scrollRef}>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-gray-200 to-transparent"></div>
          {storyLog.map((text, i) => (
            <p key={i} className={`mb-4 leading-relaxed ${text.startsWith('>') ? 'text-[#c5a059] italic font-bold' : 'text-lg'}`}>
              {text}
            </p>
          ))}
          {loading && <p className="text-center italic animate-pulse">AI 正在构思南洋的下一�?..</p>}
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#2a3f33] p-4 border border-[#c5a059] rounded-sm">
            <h3 className="text-[#c5a059] font-bold mb-3 uppercase tracking-wider text-sm">🎲 命运轮盘</h3>
            <div className="flex flex-col gap-3">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleAction(opt.text)}
                  disabled={loading}
                  className="bg-transparent border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-white p-3 text-left transition-all duration-300 disabled:opacity-50 text-sm"
                >
                  <span className="font-bold mr-2">{opt.id}.</span> {opt.text}
                  {opt.risk && <span className="float-right text-[10px] bg-red-900 text-white px-1 rounded ml-2">风险: {opt.risk}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#2a3f33] p-4 border border-[#c5a059] rounded-sm">
            <h3 className="text-[#c5a059] font-bold mb-3 uppercase tracking-wider text-sm">💡 自定破局 (Freeform)</h3>
            <textarea
              className="w-full bg-[#1a2f23] border border-[#c5a059] p-2 text-sm text-[#e0d7c6] focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
              rows={3}
              placeholder="在这里输入你的神仙手�?.."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              disabled={loading}
            ></textarea>
            <button
              onClick={() => handleAction(customInput)}
              disabled={loading || !customInput.trim()}
              className="w-full mt-2 bg-[#c5a059] text-white p-2 font-bold hover:bg-[#b08e4d] disabled:opacity-50"
            >
              提交决策 (Submit)
            </button>
          </div>

          <div className="bg-[#2a3f33] p-4 border border-[#c5a059] rounded-sm flex-1">
            <h3 className="text-[#c5a059] font-bold mb-2 uppercase tracking-wider text-sm">📜 资产与人�?/h3>
            <ul className="text-xs space-y-2">
              {gameState.assets.map((asset, i) => <li key={i} className="flex items-center">🏦 {asset}</li>)}
              <li className="text-gray-500 italic">暂无社交债务...</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-[10px] text-[#c5a059] opacity-50 uppercase tracking-[0.2em]">
        &copy; 1920 Nanyang Richest Man Simulator - Powered by AI & sourcerating
      </footer>
    </div>
  );
}

