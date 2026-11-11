import React, { useState } from 'react';
import { 
  Building2, User, ShieldCheck, UserCheck, Bot, Calendar, Layers, 
  ChevronRight, ChevronDown, CheckCircle2, Clock, AlertTriangle, 
  ExternalLink, FileText, ArrowRight, Filter, Eye, Award, Check
} from 'lucide-react';
import { PROJECT_DATA } from '../../data/projectData';

export function ApproachAPage({ 
  activeTab, 
  onSelectTab, 
  onSelectOrg, 
  onSelectEngineer, 
  onSelectEvidence 
}) {
  // Timeline State
  const [timelineFilter, setTimelineFilter] = useState('all'); // all, historical, current, future
  const [selectedStageId, setSelectedStageId] = useState('stage-5'); // default to Construction

  // Structure (WBS) State - Expanded nodes
  const [expandedNodes, setExpandedNodes] = useState({
    'WBS-1': true,
    'WBS-1.1': false,
    'WBS-1.2': false,
    'WBS-1.3': true,
    'WBS-1.4': false,
    'WBS-1.5': false,
  });

  // Network State
  const [networkFilter, setNetworkFilter] = useState('all'); // all, VERIFIED, SELF_CLAIMED, AI_CANDIDATE

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const selectedStage = PROJECT_DATA.timelineStages.find(s => s.id === selectedStageId) || PROJECT_DATA.timelineStages[4];

  const filteredStages = PROJECT_DATA.timelineStages.filter(stage => {
    if (timelineFilter === 'all') return true;
    return stage.category === timelineFilter;
  });

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {/* Approach A Header Banner */}
      <div className="bg-ink border border-slate-700/80 rounded-2xl p-3.5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
            <span className="font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
              {PROJECT_DATA.id}
            </span>
            <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-medium">
              方案 A · 现代可视化
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              已核实率 71.4% (5/7 主体双向背书)
            </span>
          </div>

          <div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {PROJECT_DATA.name}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{PROJECT_DATA.type}</span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-slate-300 font-medium hidden sm:inline">投资建设方：{PROJECT_DATA.client.name}</span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-emerald-400 font-semibold">当前阶段：{PROJECT_DATA.currentPhase}</span>
            </p>
          </div>

          {/* Quick Metrics Bar: Compressed for Mobile (2 items in 1 row) so tabs stay within 844px fold */}
          <div className="grid grid-cols-2 sm:hidden gap-2 pt-1">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">总包履约进度</span>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                68% 产值 (关键受控)
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">核心参建机构 (OBS)</span>
              <div className="text-xs font-bold text-slate-100 font-mono mt-0.5">
                7 家 (5 家已核实)
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar: Full 4 items on Desktop sm+ */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">规划建设总周期</span>
              <div className="text-sm sm:text-base font-bold text-slate-100 font-mono mt-0.5">
                34 个月 (24Q3-27Q2)
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">总包履约进度</span>
              <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
                68% 产值 (关键受控)
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">核心参建机构 (OBS)</span>
              <div className="text-sm sm:text-base font-bold text-slate-100 font-mono mt-0.5">
                7 家 (5 家已核实)
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400">WBS 核心工程包</span>
              <div className="text-sm sm:text-base font-bold text-slate-100 font-mono mt-0.5">
                5 个分部标段
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Single Main Task Per Screen Rule) - No truncate, concise titles */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 sm:p-1.5 shadow-sm">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[
            { id: 'overview', label: '概览', fullLabel: '1. 概览 (Overview)' },
            { id: 'timeline', label: '时间轴', fullLabel: '2. 时间轴 (Timeline)' },
            { id: 'structure', label: 'WBS结构', fullLabel: '3. WBS (Structure)' },
            { id: 'network', label: '关系证据', fullLabel: '4. 关系证据 (Network)' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`py-2 px-1 sm:px-3 rounded-lg text-center transition-all ${
                  isActive
                    ? 'bg-ink text-white shadow font-semibold'
                    : 'text-slate-600 hover:text-ink hover:bg-slate-100'
                }`}
              >
                <div className="text-xs sm:text-sm font-bold whitespace-nowrap">
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.fullLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Grid: Structured Infobox & Verification Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Infobox Card (Left 2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  项目综合工程档案信息框 (Infobox)
                </h2>
                <span className="text-xs text-slate-400 font-mono">CODE: {PROJECT_DATA.code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">工程类型 / 专业行业</span>
                  <div className="font-semibold text-slate-800">{PROJECT_DATA.type}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">建设地点与坐标</span>
                  <div className="font-semibold text-slate-800">{PROJECT_DATA.location}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{PROJECT_DATA.coordinates}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">项目建设方 (业主 / Client)</span>
                  <div>
                    <button
                      onClick={() => onSelectOrg(PROJECT_DATA.client.id)}
                      className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      {PROJECT_DATA.client.name}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] text-slate-500">{PROJECT_DATA.client.role}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">当前实施阶段</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {PROJECT_DATA.currentPhase}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">(第 5/8 阶段)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">投资总规模 (原型假数据)</span>
                  <div className="font-semibold text-slate-800 font-mono">{PROJECT_DATA.investmentScale}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">规划建设建筑面积 (原型假数据)</span>
                  <div className="font-semibold text-slate-800 font-mono">{PROJECT_DATA.grossFloorArea}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">最近归档修订版本</span>
                  <div className="font-mono text-slate-700 text-xs">{PROJECT_DATA.lastUpdated}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium">存证数据来源</span>
                  <div className="text-xs text-slate-600">{PROJECT_DATA.sourceAndVersion}</div>
                </div>
              </div>

              {/* Disciplines & Bids Summary */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                  专业标段与承接机构分配 (Disciplines & Bids)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {PROJECT_DATA.disciplinesAndBids.map((pkg, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] text-slate-500">{pkg.code}</div>
                        <div className="font-medium text-slate-800 whitespace-normal break-words">{pkg.name}</div>
                        <div className="text-[11px] text-emerald-700 whitespace-normal break-words">{pkg.org}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border text-slate-600 shrink-0">
                        {pkg.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Verification Status Overview Card (Right 1 col) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-ink flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                参建方存证核验状态
              </h2>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      已双向核实 (Verified)
                    </span>
                    <span className="font-mono font-bold text-emerald-800">5 家机构 (71.4%)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    经建设方公章/住建备案/监理签字联合背书，证据置信度最高。
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      参建方自述 (Self-Reported)
                    </span>
                    <span className="font-mono font-bold text-blue-800">1 家机构 (14.3%)</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1">
                    分包方提报履约声明，等待工程款凭据或监理复核转正。
                  </p>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-amber-600" />
                      AI 候选关联 (AI Candidate)
                    </span>
                    <span className="font-mono font-bold text-amber-800">1 家机构 (14.3%)</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">
                    公开中标公报 NLP 提取，未确权前仅作候选线索参考。
                  </p>
                </div>
              </div>

              {/* Action Jump to Network & Evidence */}
              <div className="pt-2">
                <button
                  onClick={() => onSelectTab('network')}
                  className="w-full py-2 bg-ink hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>打开完整参建网络与存证库</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Updates & Milestones Feed */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                工程最新动态纪事与存证记录 (Recent Updates)
              </h2>
              <span className="text-xs text-slate-400">时间倒序归档</span>
            </div>

            <div className="space-y-3">
              {PROJECT_DATA.recentUpdates.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border">
                        {item.date}
                      </span>
                      <span className="font-bold text-ink text-xs sm:text-sm">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {item.summary}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => onSelectEvidence(item.refId)}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-emerald-300"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>查看存证 ({item.refId})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls: Filter & Rule Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">阶段过滤：</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                {[
                  { id: 'all', label: '全部 8 个阶段' },
                  { id: 'historical', label: '历史完成' },
                  { id: 'current', label: '当前进行中' },
                  { id: 'future', label: '未来规划' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTimelineFilter(f.id)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      timelineFilter === f.id
                        ? 'bg-ink text-white font-medium shadow-xs'
                        : 'text-slate-600 hover:text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>数据规范：未来阶段或缺失指标严格标为“未知/未公开”，严禁虚构百分比。</span>
            </div>
          </div>

          {/* Interactive 8-Stage Horizontal Step Ribbon */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-between min-w-[720px] relative">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>

              {PROJECT_DATA.timelineStages.map((stage, idx) => {
                const isSelected = selectedStageId === stage.id;
                const isCompleted = stage.status === 'COMPLETED';
                const isCurrent = stage.status === 'IN_PROGRESS';
                const isFuture = stage.status === 'PLANNED' || stage.status === 'PROSPECTIVE';

                return (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`relative z-10 flex flex-col items-center group text-center p-2 rounded-lg transition-all ${
                      isSelected ? 'scale-105' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-colors ${
                      isCompleted 
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-50'
                        : isCurrent 
                        ? 'bg-amber-500 text-ink ring-4 ring-amber-100 animate-pulse'
                        : 'bg-slate-200 text-slate-600 border border-slate-300'
                    } ${isSelected ? 'ring-surface' : ''}`}>
                      {idx + 1}
                    </div>
                    <span className={`text-xs font-bold mt-1.5 ${isSelected ? 'text-emerald-700 underline' : 'text-slate-800'}`}>
                      {stage.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {stage.englishName}
                    </span>
                    <span className={`text-[9px] mt-0.5 px-1 rounded ${
                      isCompleted ? 'bg-emerald-100 text-emerald-800' : isCurrent ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isCompleted ? '已完成' : isCurrent ? '进行中' : '计划/未公开'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Planned vs Actual Comparison Timeline Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Stages List (Left 2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              {filteredStages.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                const isCurrent = stage.status === 'IN_PROGRESS';
                const isCompleted = stage.status === 'COMPLETED';
                const isFuture = stage.status === 'PLANNED' || stage.status === 'PROSPECTIVE';

                return (
                  <div
                    key={stage.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`选择${stage.name}阶段`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStageId(stage.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedStageId(stage.id);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCompleted ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-amber-500 text-ink' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {stage.id.split('-')[1]}
                        </span>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-ink flex items-center gap-2">
                            {stage.name} ({stage.englishName})
                            {isCurrent && (
                              <span className="text-[10px] bg-amber-500 text-ink font-extrabold px-1.5 py-0.2 rounded animate-pulse">
                                当前施工实施中
                              </span>
                            )}
                          </h3>
                        </div>
                      </div>

                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isCompleted ? 'bg-emerald-100 text-emerald-800' : isCurrent ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {stage.variance}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2">
                      {stage.summary}
                    </p>

                    {/* Planned vs Actual Double Bars */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 font-medium text-[11px] block">计划工期排程 (Planned):</span>
                          <span className="font-mono font-semibold text-slate-700">{stage.plannedTime}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 font-medium text-[11px] block">实际进展归档 (Actual):</span>
                          <span className={`font-mono font-semibold ${
                            isFuture ? 'text-slate-400 italic' : 'text-emerald-700'
                          }`}>
                            {stage.actualTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">关键里程碑：<strong className="text-slate-800">{stage.milestone}</strong></span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvidence(stage.evidenceId);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                          }}
                          className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
                        >
                          存证凭据 →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Participant Changes Interactive Panel (Right 1 col) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  阶段联动 (Timeline Interaction)
                </span>
                <h3 className="text-base font-bold text-ink mt-0.5">
                  “{selectedStage.name}”阶段参与关系动态变化
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="font-semibold text-slate-700">阶段基本概况:</span>
                  <div className="text-slate-600">{selectedStage.summary}</div>
                  <div className="font-mono text-[11px] text-slate-500 pt-1">
                    计划时间：{selectedStage.plannedTime}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-2">
                    该阶段履约/进入参建主体 ({selectedStage.participants.length} 个):
                  </span>
                  <div className="space-y-1.5">
                    {selectedStage.participants.map((pName, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-medium text-ink">{pName}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-emerald-800 border border-emerald-300">
                          本阶段履约主体
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-ink text-white rounded-lg space-y-2 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    阶段核验结论
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {selectedStage.status === 'COMPLETED' 
                      ? '本阶段已完成多方联合竣工或图审核验，所有相关技术资料与签章已归档存证。'
                      : selectedStage.status === 'IN_PROGRESS'
                      ? '当前正在进行旁站监理与实测实量，大跨度钢网架第 4 单元已通过一级焊缝探伤验收。'
                      : '前置施工节点未关闭，调试及运营参数暂未公开。'}
                  </p>
                  <button
                    onClick={() => onSelectEvidence(selectedStage.evidenceId)}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-center text-xs transition-colors"
                  >
                    查看该阶段数字存证记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: STRUCTURE (WBS + OBS) */}
      {activeTab === 'structure' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Explanation */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                工作分解结构 (WBS) 与组织职责矩阵 (OBS)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                严格区分：投标 / 授标 / 履约 / 交付 / 验收，杜绝混淆为泛化的“参与”。
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">投标</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">授标</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">履约</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">交付</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">验收</span>
            </div>
          </div>

          {/* WBS Interactive Tree */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
            {PROJECT_DATA.wbsTree.map((rootNode) => (
              <div key={rootNode.id} className="space-y-3">
                {/* Level 1: Project Root */}
                <div className="p-3.5 bg-ink text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-extrabold bg-emerald-600 px-2 py-0.5 rounded">
                      {rootNode.code}
                    </span>
                    <span className="font-bold text-sm sm:text-base">
                      {rootNode.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => onSelectOrg(PROJECT_DATA.client.id)}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      {rootNode.org}
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                      {rootNode.contractPhase}
                    </span>
                  </div>
                </div>

                {/* Level 2 Packages */}
                <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-slate-200">
                  {rootNode.children.map((pkg) => {
                    const isExpanded = !!expandedNodes[pkg.id];
                    return (
                      <div key={pkg.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        {/* Package Header Row */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={`${pkg.code} ${pkg.title}，状态：${isExpanded ? '已展开' : '已折叠'}`}
                          aria-expanded={isExpanded}
                          onClick={() => toggleNode(pkg.id)}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleNode(pkg.id);
                            }
                          }}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-100 transition-colors focus:outline-none focus:bg-slate-100"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleNode(pkg.id);
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                              }}
                              aria-label={isExpanded ? `折叠工程包 ${pkg.code} ${pkg.title}` : `展开工程包 ${pkg.code} ${pkg.title}`}
                              aria-expanded={isExpanded}
                              className="p-1 rounded bg-white border border-slate-300 text-slate-600 shrink-0 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300">
                              {pkg.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs sm:text-sm text-ink whitespace-normal break-words">
                                {pkg.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 whitespace-normal break-words mt-0.5">
                                交付物：{pkg.deliverable}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-xs pl-8 sm:pl-0">
                            {/* Contract Phase Badge */}
                            <span className={`px-2 py-0.5 rounded border font-semibold text-[11px] ${pkg.contractPhaseBadge}`}>
                              合同阶段：{pkg.contractPhase}
                            </span>

                            {/* Verification status pill */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pkg.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : pkg.verificationStatus === 'SELF_CLAIMED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {pkg.verificationStatus === 'VERIFIED' ? '已核实' : pkg.verificationStatus === 'SELF_CLAIMED' ? '自述' : 'AI候选'}
                            </span>
                          </div>
                        </div>

                        {/* Package Expanded Body */}
                        {isExpanded && (
                          <div className="p-3.5 bg-white border-t border-slate-200 space-y-3 text-xs">
                            {/* Responsible OBS Organization & Personnel */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-slate-400 text-[11px] block">责任参建主体 (OBS 映射):</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Building2 className="w-4 h-4 text-slate-500" />
                                  <button
                                    onClick={() => onSelectOrg(pkg.orgId)}
                                    className="font-bold text-ink hover:text-emerald-700 hover:underline text-left"
                                  >
                                    {pkg.org} ({pkg.orgRole})
                                  </button>
                                </div>
                              </div>

                              {pkg.engineer && (
                                <div>
                                  <span className="text-slate-400 text-[11px] block">委派核验工程师:</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <User className="w-4 h-4 text-emerald-600" />
                                    <button
                                      onClick={() => pkg.engineerId && onSelectEngineer(pkg.engineerId)}
                                      className="font-bold text-emerald-800 hover:underline text-left"
                                    >
                                      {pkg.engineer}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sub-work packages */}
                            {pkg.children && pkg.children.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider block">
                                  子工序明细 (Level 3 Work Items):
                                </span>
                                {pkg.children.map((sub) => (
                                  <div key={sub.id} className="p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border shrink-0">
                                        {sub.code}
                                      </span>
                                      <span className="font-semibold text-slate-800 whitespace-normal break-words">{sub.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] shrink-0">
                                      <span className="text-slate-500 whitespace-normal break-words">{sub.deliverable}</span>
                                      <span className={`px-1.5 py-0.2 rounded border font-mono ${sub.contractPhaseBadge}`}>
                                        {sub.contractPhase}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: NETWORK & EVIDENCE */}
      {activeTab === 'network' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Filter Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                参建关系拓扑与数字存证追溯 (Network & Evidence)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                有限深度高可读性架构，点击任意节点或关系线均可弹出完整证据与审计记录。
              </p>
            </div>

            {/* Verification State Filter Chips */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">状态筛选:</span>
              <button
                onClick={() => setNetworkFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  networkFilter === 'all' ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                全部 ({PROJECT_DATA.network.nodes.length})
              </button>
              <button
                onClick={() => setNetworkFilter('VERIFIED')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  networkFilter === 'VERIFIED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                已核实 (5)
              </button>
              <button
                onClick={() => setNetworkFilter('SELF_CLAIMED')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  networkFilter === 'SELF_CLAIMED' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
                }`}
              >
                自述 (2)
              </button>
              <button
                onClick={() => setNetworkFilter('AI_CANDIDATE')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  networkFilter === 'AI_CANDIDATE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'
                }`}
              >
                AI候选 (1)
              </button>
            </div>
          </div>

          {/* Visual Topology Diagram Container */}
          <div className="bg-ink text-white rounded-2xl p-5 border border-hairline shadow-xl space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-hairline pb-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 已核实 (Verified)
                </span>
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 自述 (Self-reported)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-400 bg-amber-500/30"></span> AI候选 (AI Candidate)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                交互提示：点击卡片或连线查看存证详情
              </span>
            </div>

            {/* Central Node: Project Root */}
            <div className="flex justify-center">
              <div 
                onClick={() => onSelectEvidence('EVD-P001-A01')}
                className="bg-emerald-950 border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-900/30 text-center cursor-pointer hover:scale-105 transition-all max-w-sm"
              >
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  项目第一实体 (Primary Entity)
                </span>
                <div className="font-extrabold text-sm sm:text-base text-white mt-0.5">
                  {PROJECT_DATA.id}
                </div>
                <div className="text-xs text-emerald-200 mt-1">
                  智能高端装备制造基地示范厂房
                </div>
              </div>
            </div>

            {/* Layer 1: Core Contracted Organizations */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3 text-center">
                第一层级：发包、总承包、设计院与监理机构 (OBS Core)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PROJECT_DATA.obsCoreOrgs.map(org => (
                  <div
                    key={org.id}
                    className="p-3 rounded-xl border bg-surface-subtle hover:bg-slate-800 transition-all border-emerald-500/60 shadow-md group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => onSelectOrg(org.id)}
                        className="font-bold text-white group-hover:text-emerald-400 transition-colors text-left hover:underline"
                        title="查看机构履约业绩链"
                      >
                        {org.name}
                      </button>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{org.role}</div>
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                      <button
                        onClick={() => onSelectOrg(org.id)}
                        className="text-emerald-400 hover:underline font-mono"
                      >
                        企业档案 →
                      </button>
                      <button
                        onClick={() => onSelectEvidence(org.evidenceId)}
                        className="text-slate-400 hover:text-white"
                      >
                        核验证据
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer 2: Specialized Subcontractors & Suppliers (With Different Verification Levels!) */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3 text-center">
                第二层级：专业分包与设备供应机构 (具有鲜明存证状态差异)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Org D: Verified */}
                <div className="p-3 rounded-xl border-2 border-emerald-500 bg-surface-subtle hover:bg-slate-800 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onSelectOrg('ORG-D')}
                      className="font-bold text-xs text-white hover:text-emerald-300 text-left hover:underline"
                    >
                      Demo Organization D
                    </button>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      已核实
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">地基基础专业分包</div>
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                    <button
                      onClick={() => onSelectOrg('ORG-D')}
                      className="text-emerald-400 hover:underline font-mono"
                    >
                      分包业绩链 →
                    </button>
                    <button
                      onClick={() => onSelectEvidence('EVD-P001-D01')}
                      className="text-slate-400 hover:text-white"
                    >
                      查看验收存证
                    </button>
                  </div>
                </div>

                {/* Org E: Self-Reported */}
                <div className="p-3 rounded-xl border-2 border-blue-500 bg-surface-subtle hover:bg-slate-800 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onSelectOrg('ORG-E')}
                      className="font-bold text-xs text-white hover:text-blue-300 text-left hover:underline"
                    >
                      Demo Organization E
                    </button>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      参建方自述
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">洁净机电专业承包</div>
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                    <button
                      onClick={() => onSelectOrg('ORG-E')}
                      className="text-blue-300 hover:underline font-mono"
                    >
                      自述档案 →
                    </button>
                    <button
                      onClick={() => onSelectEvidence('EVD-P001-E01')}
                      className="text-slate-400 hover:text-white"
                    >
                      提报记录
                    </button>
                  </div>
                </div>

                {/* Org F: AI Candidate */}
                <div className="p-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-950/20 hover:bg-amber-950/40 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => onSelectOrg('ORG-F')}
                      className="font-bold text-xs text-amber-200 hover:text-amber-100 text-left hover:underline"
                    >
                      Demo Organization F
                    </button>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                      AI 候选
                    </span>
                  </div>
                  <div className="text-xs text-amber-300 mt-1">重型起重装备制造商</div>
                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                    <button
                      onClick={() => onSelectOrg('ORG-F')}
                      className="text-amber-400 hover:underline font-mono"
                    >
                      候选主体 →
                    </button>
                    <button
                      onClick={() => onSelectEvidence('EVD-P001-F01')}
                      className="text-amber-300 hover:text-white"
                    >
                      标讯候选
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 3: Certified Key Engineers */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3 text-center">
                第三层级：关键岗位执业核验工程师 (Real-name Verified Personnel)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PROJECT_DATA.certifiedEngineers.map(eng => (
                  <div
                    key={eng.id}
                    className={`p-3 rounded-xl border bg-surface-subtle hover:bg-slate-800 transition-all ${
                      eng.status === 'VERIFIED' ? 'border-emerald-500/50' : 'border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => onSelectEngineer(eng.id)}
                        className="font-bold text-white hover:text-emerald-400 text-left hover:underline"
                        title="查看工程师执业档案"
                      >
                        {eng.name}
                      </button>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        eng.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'
                      }`}>
                        {eng.status === 'VERIFIED' ? '已核实' : '自述'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{eng.title}</div>
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                      <button
                        onClick={() => onSelectEngineer(eng.id)}
                        className="text-emerald-400 hover:underline font-mono"
                      >
                        执业印章/档案 →
                      </button>
                      <button
                        onClick={() => onSelectEvidence(eng.evidenceId)}
                        className="text-slate-400 hover:text-white"
                      >
                        任职存证
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Direct Evidence Items Table for Fast Inspection */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-ink text-sm sm:text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                当前项目核心存证索引表 (Evidence Index)
              </h3>
              <span className="text-xs text-slate-400">点击行即可查看详细存证凭证与纠错审计记录</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-3">存证编号</th>
                    <th className="py-2.5 px-3">核验状态</th>
                    <th className="py-2.5 px-3">来源文件出处</th>
                    <th className="py-2.5 px-3">声明/签发时间</th>
                    <th className="py-2.5 px-3">关联工程包 (WBS)</th>
                    <th className="py-2.5 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {Object.values(PROJECT_DATA.evidenceDb).slice(0, 7).map((evd) => (
                    <tr
                      key={evd.id}
                      onClick={() => onSelectEvidence(evd.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-ink">{evd.id}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evd.verificationLevel === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : evd.verificationLevel === 'SELF_CLAIMED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {evd.verificationLevelCn || evd.verificationLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-normal break-words">{evd.sourceType}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{evd.timestamp.split(' ')[0]}</td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-normal break-words">{evd.wbsPackage}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-emerald-700 hover:underline font-semibold">
                          查看凭证 →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
