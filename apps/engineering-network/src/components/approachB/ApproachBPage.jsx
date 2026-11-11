import React, { useState } from 'react';
import { 
  BookOpen, FileText, History, ExternalLink, ShieldCheck, 
  UserCheck, Bot, CheckCircle2, ChevronRight, ChevronDown, 
  Building2, User, AlertCircle, Link2, Check
} from 'lucide-react';
import { PROJECT_DATA } from '../../data/projectData';

export function ApproachBPage({ 
  activeTab, 
  onSelectTab, 
  onSelectOrg, 
  onSelectEngineer, 
  onSelectEvidence 
}) {
  // Timeline State
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [selectedStageId, setSelectedStageId] = useState('stage-5');

  // WBS Tree State
  const [expandedNodes, setExpandedNodes] = useState({
    'WBS-1': true,
    'WBS-1.1': true,
    'WBS-1.2': true,
    'WBS-1.3': true,
    'WBS-1.4': true,
    'WBS-1.5': true,
  });

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
    <div className="w-full max-w-full min-w-0 bg-white rounded-xl border border-slate-300 p-4 sm:p-8 shadow-sm space-y-6 text-slate-800 font-sans">
      {/* MediaWiki Article Header */}
      <div className="border-b border-slate-300 pb-3 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-ink tracking-tight">
              {PROJECT_DATA.name}
            </h1>
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
              条目编号：{PROJECT_DATA.code}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>[版本 {PROJECT_DATA.revisionHistory[0].version}]</span>
            <span>·</span>
            <span>最后修订：2026-10-25</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          出自 Project Atlas 工程维基百科 · 自由、可核验的工程纪事与履约条目数据库
        </p>
      </div>

      {/* Encyclopedic View Switcher Tabs (Consistent 4 Views, Single Main Task Per Screen) */}
      <div className="border-b-2 border-slate-200">
        <nav className="flex items-center gap-1 sm:gap-2 -mb-0.5 overflow-x-auto no-scrollbar text-xs sm:text-sm">
          {[
            { id: 'overview', label: '条目概览 (Overview)' },
            { id: 'timeline', label: '纪事年表 (Timeline)' },
            { id: 'structure', label: '工作分解与组织 (Structure/WBS)' },
            { id: 'network', label: '网络存证与引用 (Network & Evidence)' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`py-2 px-3 sm:px-4 font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
                    : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* VIEW 1: OVERVIEW (WIKI ARTICLE & CLASSIC INFOBOX) */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Layout: Main Article Column + Classic Wikipedia Infobox */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left: Article Prose & Table of Contents (TOC) */}
            <div className="flex-1 space-y-5 text-sm sm:text-base leading-relaxed text-slate-800">
              {/* Lead Paragraph */}
              <p className="text-justify text-slate-800">
                <strong className="font-bold">{PROJECT_DATA.name}</strong>（工程代号：<code className="font-mono bg-slate-100 px-1 rounded text-xs">{PROJECT_DATA.id}</code>，简称为<strong>示范厂房</strong>）是位于中国某示范工业高新区的重要先进装备重载与超净集成制造设施<sup><button onClick={() => onSelectEvidence('EVD-P001-A01')} className="text-emerald-700 hover:underline font-bold text-xs" title="查看文献 [1] 土地与立项批文">[1]</button></sup>。项目由<strong>{PROJECT_DATA.client.name}</strong>出资发包建设，总包由特级资质企业<strong>Demo Organization B</strong>承建，设计由<strong>Demo Organization C</strong>完成图审<sup><button onClick={() => onSelectEvidence('EVD-P001-C01')} className="text-emerald-700 hover:underline font-bold text-xs" title="查看文献 [2] 施工图审查合格证">[2]</button></sup>。工程于 2025 年 5 月依法取得建筑工程施工许可证并全面开工<sup><button onClick={() => onSelectEvidence('EVD-P001-B01')} className="text-emerald-700 hover:underline font-bold text-xs" title="查看文献 [3] 建筑工程施工许可证">[3]</button></sup>。
              </p>

              <p className="text-justify text-slate-800 text-sm">
                该工程包含 85 米大跨度空间重型网架体系与高等级万级洁净空间动力环境。截至 2026 年 10 月，工程正处于<strong>{PROJECT_DATA.currentPhase}</strong>阶段，主体结构关键网架单元已顶升就位并通过三方探伤验收<sup><button onClick={() => onSelectEvidence('EVD-P001-089')} className="text-emerald-700 hover:underline font-bold text-xs" title="查看文献 [4] 钢结构提升验收">[4]</button></sup>。
              </p>

              {/* Classic MediaWiki Table of Contents (TOC) */}
              <div className="bg-slate-50 border border-slate-300 p-4 rounded max-w-md my-4">
                <div className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>目录 (Contents)</span>
                  <span className="text-[10px] text-slate-400 font-normal">[隐藏]</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-800">
                  <li>
                    <button onClick={() => onSelectTab('overview')} className="hover:underline font-medium">
                      工程概述与建设基本信息
                    </button>
                    <ol className="list-decimal list-inside pl-4 space-y-0.5 text-slate-600">
                      <li>专业标段划分</li>
                      <li>参与方核验公报</li>
                    </ol>
                  </li>
                  <li>
                    <button onClick={() => onSelectTab('timeline')} className="hover:underline font-medium">
                      工程生命周期全链年表 (8 阶段)
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onSelectTab('structure')} className="hover:underline font-medium">
                      工作分解结构 (WBS) 与合同履约矩阵
                    </button>
                  </li>
                  <li>
                    <button onClick={() => onSelectTab('network')} className="hover:underline font-medium">
                      参建网络拓扑、证据链与修订审计记录
                    </button>
                  </li>
                </ol>
              </div>

              {/* Sub-section: Disciplines & Bids Table */}
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-ink border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <span className="text-slate-400">§ 1.1</span> 专业标段与承包分工表
                </h3>
                <div className="overflow-x-auto border border-slate-300 rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300">标段编码</th>
                        <th className="p-2 border-r border-slate-300">工程专业范围</th>
                        <th className="p-2 border-r border-slate-300">承接责任机构</th>
                        <th className="p-2">合同履约状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {PROJECT_DATA.disciplinesAndBids.map((b, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-semibold border-r border-slate-200">{b.code}</td>
                          <td className="p-2 border-r border-slate-200">{b.name}</td>
                          <td className="p-2 border-r border-slate-200 font-medium text-emerald-800">{b.org}</td>
                          <td className="p-2 font-mono text-[11px]">{b.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-section: Recent Chronicle */}
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-ink border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <span className="text-slate-400">§ 1.2</span> 最近工程纪事与签发存证
                </h3>
                <div className="space-y-2 text-xs">
                  {PROJECT_DATA.recentUpdates.map((up, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border-l-4 border-emerald-600 rounded-r border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{up.title}</span>
                        <span className="font-mono text-slate-500">{up.date}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{up.summary}</p>
                      <div className="mt-1 text-right">
                        <button
                          onClick={() => onSelectEvidence(up.refId)}
                          className="text-emerald-700 hover:underline font-semibold"
                        >
                          核验证据 [{up.refId}] →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Mature Classic MediaWiki Infobox */}
            <aside className="w-full lg:w-80 shrink-0 bg-slate-50 border-2 border-slate-300 rounded p-3 text-xs space-y-3 font-sans shadow-xs">
              <div className="bg-slate-200 text-ink font-bold text-center py-1.5 text-sm rounded-t border-b border-slate-300">
                {PROJECT_DATA.shortName}
              </div>

              {/* Placeholder Blueprint / Schematic Image */}
              <div className="border border-slate-300 bg-white p-2 rounded text-center space-y-1">
                <div className="h-28 bg-slate-100 rounded border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                  <Building2 className="w-8 h-8 text-slate-400 mb-1" />
                  <span className="text-[11px] font-mono">DEMO_PLANT_ELEVATION.SVG</span>
                  <span className="text-[10px] text-amber-700">（虚构原型示意图）</span>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  图 1：DEMO Project P001 工业示范厂房结构透视
                </div>
              </div>

              {/* Key Attributes Table */}
              <div className="border border-slate-300 rounded overflow-hidden">
                <div className="bg-slate-200 font-bold p-1.5 text-center text-[11px] border-b border-slate-300">
                  工程核心档案指标
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium w-28 border-r border-slate-200">工程类型</th>
                      <td className="p-1.5 text-slate-800">{PROJECT_DATA.type}</td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">地理区位</th>
                      <td className="p-1.5 text-slate-800">{PROJECT_DATA.location}</td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">建设单位</th>
                      <td className="p-1.5">
                        <button
                          onClick={() => onSelectOrg(PROJECT_DATA.client.id)}
                          className="text-emerald-800 font-bold hover:underline"
                        >
                          {PROJECT_DATA.client.name}
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">当前阶段</th>
                      <td className="p-1.5 font-bold text-emerald-800">{PROJECT_DATA.currentPhase}</td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">规划周期</th>
                      <td className="p-1.5 font-mono">{PROJECT_DATA.plannedCycle}</td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">投资总额</th>
                      <td className="p-1.5 font-mono text-slate-600">{PROJECT_DATA.investmentScale}</td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">建筑面积</th>
                      <td className="p-1.5 font-mono text-slate-600">{PROJECT_DATA.grossFloorArea}</td>
                    </tr>
                    <tr>
                      <th className="p-1.5 bg-slate-100 text-slate-600 font-medium border-r border-slate-200">核验状态</th>
                      <td className="p-1.5">
                        <span className="text-emerald-700 font-bold">5/7 家已核实 (71%)</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Version & Archival Footnote */}
              <div className="text-[11px] text-slate-500 space-y-1 bg-white p-2 border border-slate-300 rounded">
                <div><strong>存证链版本：</strong>v2.4</div>
                <div><strong>修订时间戳：</strong>2026-10-25 18:30</div>
                <div><strong>原型演示规范：</strong>工程百科数据结构示范规范 (Mock)</div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE (CHRONICLE & GANTT COMPARISON) */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Section Heading */}
          <div className="border-b border-slate-200 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-serif font-bold text-ink">
                2. 工程生命周期年表与计划/实际对比 (Chronicle & Timeline)
              </h2>
              <p className="text-xs text-slate-500">
                规划 → 设计 → 招标 → 采购 → 施工 → 调试 → 运营 → 扩建
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">筛选范围：</span>
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
              >
                <option value="all">全部 8 个生命周期阶段</option>
                <option value="historical">历史已完成阶段 (4)</option>
                <option value="current">当前进行阶段 (1)</option>
                <option value="future">未来计划阶段 (3)</option>
              </select>
            </div>
          </div>

          {/* Interactive Chronicle Table */}
          <div className="overflow-x-auto border border-slate-300 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                  <th className="p-2.5 border-r border-slate-300 w-12 text-center">序号</th>
                  <th className="p-2.5 border-r border-slate-300 w-32">阶段名称</th>
                  <th className="p-2.5 border-r border-slate-300 w-36">计划时序 (Planned)</th>
                  <th className="p-2.5 border-r border-slate-300 w-36">实际时序 (Actual)</th>
                  <th className="p-2.5 border-r border-slate-300">里程碑与实施纪事摘要</th>
                  <th className="p-2.5 w-24 text-right">核验证据</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStages.map((stage, idx) => {
                  const isSelected = selectedStageId === stage.id;
                  const isCurrent = stage.status === 'IN_PROGRESS';
                  const isFuture = stage.status === 'PLANNED' || stage.status === 'PROSPECTIVE';

                  return (
                    <tr
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
                      className={`cursor-pointer transition-colors focus:outline-none focus:bg-emerald-100 ${
                        isSelected 
                          ? 'bg-emerald-50/70 font-medium' 
                          : isCurrent 
                          ? 'bg-amber-50/40' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-bold text-ink">
                        {stage.name}
                        {isCurrent && (
                          <span className="block text-[10px] text-amber-800 font-normal">
                            [当前实施中]
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600">
                        {stage.plannedTime}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-mono">
                        <span className={isFuture ? 'text-slate-400 italic' : 'text-emerald-800 font-semibold'}>
                          {stage.actualTime}
                        </span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-slate-700">
                        <div><strong>{stage.milestone}</strong></div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{stage.summary}</div>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvidence(stage.evidenceId);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                          }}
                          className="text-emerald-700 hover:underline font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
                        >
                          [存证]
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dynamic Participant Changes Box for Wiki */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-2 text-xs">
            <h4 className="font-bold text-ink flex items-center gap-2">
              <span>阶段参建机构履约变动说明（选中阶段：“{selectedStage.name}”）</span>
              <span className="text-slate-500 font-mono">[{selectedStage.plannedTime}]</span>
            </h4>
            <p className="text-slate-700">
              在该阶段中，以下主体依法定职责与合同授权开展工作：
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedStage.participants.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 font-medium"
                >
                  ✓ {p}
                </span>
              ))}
            </div>
            <div className="text-slate-500 text-[11px] pt-1">
              注：依据合同与住建主管部门备案要求，缺失或未决阶段工期数据明确标注为“未知/未公开”，严禁推断虚假完成比例。
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: STRUCTURE (WBS OBS ENCYCLOPEDIC HIERARCHY) */}
      {activeTab === 'structure' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Heading */}
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-lg font-serif font-bold text-ink">
              3. 工程工作分解结构 (WBS) 与组织责任分配表 (OBS)
            </h2>
            <p className="text-xs text-slate-500">
              从整体项目逐级分解至具体工程包，明确合同阶段（投标 / 授标 / 履约 / 交付 / 验收）与执业责任人。
            </p>
          </div>

          {/* WBS Encyclopedic Outline */}
          <div className="space-y-4">
            {PROJECT_DATA.wbsTree.map((root) => (
              <div key={root.id} className="border border-slate-300 rounded overflow-hidden">
                {/* Level 1 Header */}
                <div className="bg-slate-100 p-3 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold text-ink text-xs sm:text-sm">
                  <span>{root.code} {root.title}</span>
                  <div className="text-xs flex items-center gap-2 text-slate-600 font-normal">
                    <span>责任主体：{root.org}</span>
                    <span className="font-mono bg-white px-1.5 py-0.5 border rounded">阶段：{root.contractPhase}</span>
                  </div>
                </div>

                {/* Level 2 & 3 Items Table */}
                <div className="divide-y divide-slate-200 text-xs">
                  {root.children.map((pkg) => (
                    <div key={pkg.id} className="p-3 bg-white space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-ink">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                            {pkg.code}
                          </span>
                          <span className="whitespace-normal break-words">{pkg.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-normal shrink-0">
                          <span>承接：<button onClick={() => onSelectOrg(pkg.orgId)} className="font-semibold text-emerald-800 hover:underline">{pkg.org}</button></span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border">
                            合同状态：{pkg.contractPhase}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pkg.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {pkg.verificationStatus === 'VERIFIED' ? '已核实' : '自述'}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-600 pl-4 border-l-2 border-slate-200 text-[11px] space-y-1">
                        <div className="whitespace-normal break-words"><strong>交付物要求：</strong>{pkg.deliverable}</div>
                        {pkg.engineer && (
                          <div>
                            <strong>核验执业工程师：</strong>
                            <button
                              onClick={() => pkg.engineerId && onSelectEngineer(pkg.engineerId)}
                              className="text-emerald-800 font-medium hover:underline ml-1"
                            >
                              {pkg.engineer}
                            </button>
                          </div>
                        )}
                        {pkg.children && pkg.children.length > 0 && (
                          <div className="pt-1">
                            <span className="font-semibold text-slate-700">包含工序：</span>
                            <ul className="list-disc list-inside text-slate-500 pl-2">
                              {pkg.children.map(sub => (
                                <li key={sub.id}>
                                  <span className="font-mono">{sub.code}</span> {sub.title} ({sub.deliverable}) - 状态: {sub.contractPhase}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: NETWORK & EVIDENCE (WIKI CITATIONS & REVISION AUDIT) */}
      {activeTab === 'network' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Heading */}
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-lg font-serif font-bold text-ink">
              4. 参建网络事实存证、参考文献与修订历史
            </h2>
            <p className="text-xs text-slate-500">
              遵循学术百科事实溯源规范，所有参建主张均由存证链与纠错审计记录支撑。
            </p>
          </div>

          {/* Triplet Fact Statements Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-slate-700">
              § 4.1 核心参建三元组事实陈述 (Knowledge Triples)
            </h3>
            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold">
                    <th className="p-2 border-r border-slate-300">主体 (Subject)</th>
                    <th className="p-2 border-r border-slate-300">法律/合同关系 (Predicate)</th>
                    <th className="p-2 border-r border-slate-300">客体 (Object)</th>
                    <th className="p-2 border-r border-slate-300">核验等级</th>
                    <th className="p-2 text-right">出处与审计</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {PROJECT_DATA.network.edges.map((edge) => (
                    <tr key={edge.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                        {edge.source.startsWith('ORG-') ? (
                          <button
                            onClick={() => onSelectOrg(edge.source)}
                            className="text-emerald-800 hover:underline font-bold text-left"
                            title="查看机构档案"
                          >
                            {edge.source}
                          </button>
                        ) : (
                          <span>{edge.source}</span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600 font-medium">
                        {edge.label}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                        {edge.target.startsWith('ORG-') ? (
                          <button
                            onClick={() => onSelectOrg(edge.target)}
                            className="text-emerald-800 hover:underline font-bold text-left"
                            title="查看机构档案"
                          >
                            {edge.target}
                          </button>
                        ) : edge.target.startsWith('ENG-') ? (
                          <button
                            onClick={() => onSelectEngineer(edge.target)}
                            className="text-emerald-800 hover:underline font-bold text-left"
                            title="查看工程师档案"
                          >
                            {edge.target}
                          </button>
                        ) : (
                          <span>{edge.target}</span>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          edge.verificationLevel === 'VERIFIED' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : edge.verificationLevel === 'SELF_CLAIMED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {edge.verificationLevel === 'VERIFIED' ? '已核实' : edge.verificationLevel === 'SELF_CLAIMED' ? '自述' : 'AI候选'}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => onSelectEvidence(edge.evidenceId)}
                          className="text-emerald-700 hover:underline font-semibold"
                        >
                          核查凭据 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Style Footnote References */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-slate-700">
              § 4.2 参考文献与出处存证 (References & Footnotes)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700">
              {PROJECT_DATA.footnotes.map((fn) => (
                <li key={fn.index} className="p-2 bg-slate-50 border border-slate-200 rounded">
                  <span className="font-semibold text-ink">{fn.title}</span>，
                  <span className="text-slate-600">{fn.source}</span>，
                  <span className="font-mono text-slate-500">归档代码：{fn.archiveCode}</span>，
                  <span className="text-slate-500">发布日期：{fn.pubDate}</span>。
                  <button
                    onClick={() => onSelectEvidence(fn.evidenceId)}
                    className="text-emerald-700 hover:underline ml-2 font-medium"
                  >
                    {fn.linkText}
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* Revision History & Errata Table */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>§ 4.3 条目修订历史与版本变更记录 (Revision History)</span>
              <span className="text-xs font-normal text-slate-400 font-mono">共 5 次版本演进</span>
            </h3>

            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-20">版本号</th>
                    <th className="p-2 border-r border-slate-300 w-36">修订时间戳</th>
                    <th className="p-2 border-r border-slate-300 w-48">修订责任主体 / 密钥</th>
                    <th className="p-2">版本变更摘要与说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {PROJECT_DATA.revisionHistory.map((rev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold text-emerald-800 border-r border-slate-200">
                        {rev.version}
                      </td>
                      <td className="p-2 font-mono text-slate-500 border-r border-slate-200">
                        {rev.date}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="font-medium text-slate-800">{rev.editor}</span>
                      </td>
                      <td className="p-2 text-slate-600">
                        {rev.comment}
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
