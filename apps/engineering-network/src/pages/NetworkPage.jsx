import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Building2, User, ChevronRight, 
  Sparkles, Search, Check, Plus
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { useI18n } from '../i18n/I18nContext';

export function NetworkPage({ followingIds, onToggleFollow }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';

  useEffect(() => {
    document.title = isZh
      ? '工程行业人脉与组织网络 · 工程行业网络 (暂称) (V4.1)'
      : (locale === 'th' ? 'เครือข่ายวิศวกรวิชาชีพ · Engineering Network (V4.1)' : 'Professional Network · Engineering Network (V4.1)');
  }, [locale, isZh]);

  const handleSelectTab = (tabId) => {
    if (tabId === 'all') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab: tabId });
    }
  };

  // Mock Engineers List (Bilingual data)
  const engineers = [
    {
      id: 'ENG-01',
      name: isZh ? '张建华 (Demo Engineer 01)' : 'Demo Engineer 01 (Zhang Jianhua)',
      title: isZh ? '一级建造师 · 模拟施工总监' : 'Licensed Builder · Site Construction Director',
      company: isZh ? '华东智能建造集团 (特级总包)' : 'East China Smart Construction (EPC General Contractor)',
      specialty: isZh ? '空间网架整体顶升、钢结构现场总调' : 'Heavy space truss synchronized lifting, site master dispatch',
      projectCount: 3,
      isVerified: true
    },
    {
      id: 'ENG-02',
      name: isZh ? '李明轩 (Demo Engineer 02)' : 'Demo Engineer 02 (Li Mingxuan)',
      title: isZh ? '一级注册结构师 · 模拟结构设计专家' : 'Principal Structural Engineer · Design Director',
      company: isZh ? '同济工程设计研究院 (甲级院)' : 'Tongji Engineering Design Institute (Class-A Institute)',
      specialty: isZh ? '复杂空间大跨结构、BIM深化协同' : 'Complex long-span structures, BIM coordination',
      projectCount: 2,
      isVerified: true
    },
    {
      id: 'ENG-03',
      name: isZh ? '王宏伟 (Demo Engineer 03)' : 'Demo Engineer 03 (Wang Hongwei)',
      title: isZh ? '机电安装总工 · 洁净微振控制专家' : 'Cleanroom MEP Lead · Precision Process Piping',
      company: isZh ? '洁净机电动力安装 (ORG-E 专业分包)' : 'Cleanroom MEP Installation (ORG-E Subcontractor)',
      specialty: isZh ? '工业厂房洁净微振动基台、暖通动力与高纯管线' : 'Cleanroom micro-vibration inertia bases, precision HVAC MEP',
      projectCount: 3,
      isVerified: false
    },
    {
      id: 'ENG-04',
      name: isZh ? '赵国栋 (Demo Engineer 04)' : 'Demo Engineer 04 (Zhao Guodong)',
      title: isZh ? '总监理工程师 · 全过程质量监督总监' : 'Chief Supervision Engineer · Quality & Safety Lead',
      company: isZh ? '中咨工程监理咨询 (ORG-G 综合监理)' : 'Zhongzi Engineering Supervision (ORG-G Consultant)',
      specialty: isZh ? '施工全过程旁站见证、隐蔽工程质量验收签章' : 'Station witness inspection, statutory joint milestone acceptance',
      projectCount: 4,
      isVerified: true
    },
    {
      id: 'ENG-05',
      name: isZh ? '陈德峰 (Demo Engineer 05)' : 'Demo Engineer 05 (Chen Defeng)',
      title: isZh ? '注册岩土工程师 · 深基坑地基专家' : 'Licensed Geotechnical Engineer · Deep Foundations',
      company: isZh ? '上海地基工程专业承包 (ORG-D 专业分包)' : 'Shanghai Foundation Subcontracting (ORG-D Subcontractor)',
      specialty: isZh ? '地下连续墙与深基坑伺服支撑、桩基静动载测试' : 'Diaphragm wall, servo steel strut shoring, foundation piling',
      projectCount: 3,
      isVerified: true
    }
  ];

  // Mock Organizations List (Canonical mapping: ORG-D Foundation, ORG-E MEP, ORG-G Supervision)
  const organizations = [
    {
      id: 'ORG-A',
      name: isZh ? '华东智能建造投资发展集团 (ORG-A)' : 'East China Smart Manufacturing Investment (ORG-A)',
      role: isZh ? '建设单位 · 业主项目部' : 'Owner / Client Project Dept',
      level: isZh ? '重大工程投资建设管理主体' : 'Major Industrial Infrastructure Client',
      activeProjects: 3,
      verified: true
    },
    {
      id: 'ORG-B',
      name: isZh ? '华东智能建造工程总承包 (ORG-B)' : 'East China Smart Construction EPC (ORG-B)',
      role: isZh ? '施工总承包 · 特级资质单位' : 'EPC Prime Contractor · Special Class',
      level: isZh ? '工业建筑与大跨度钢结构总包履约' : 'Industrial and long-span spatial structures',
      activeProjects: 8,
      verified: true
    },
    {
      id: 'ORG-C',
      name: isZh ? '同济工程勘察设计研究院 (ORG-C)' : 'Tongji Engineering Design Institute (ORG-C)',
      role: isZh ? '勘察设计单位 · 甲级建筑设计院' : 'Design & Survey · Class-A Architectural',
      level: isZh ? '施工图协同深化与数字化BIM审图' : 'BIM forward design and statutory review',
      activeProjects: 5,
      verified: true
    },
    {
      id: 'ORG-D',
      name: isZh ? '上海地基工程专业承包 (ORG-D)' : 'Shanghai Foundation Subcontractor (ORG-D)',
      role: isZh ? '专业分包单位 · 地基基础工程专业承包' : 'Specialized Subcontractor · Foundations',
      level: isZh ? '地下连续墙与深基坑支护施工' : 'Diaphragm wall and deep excavation construction',
      activeProjects: 3,
      verified: true
    },
    {
      id: 'ORG-E',
      name: isZh ? '洁净机电动力科技安装 (ORG-E)' : 'Cleanroom Precision MEP Subcontractor (ORG-E)',
      role: isZh ? '专业分包单位 · 建筑机电洁净工程承包' : 'Specialized Subcontractor · Cleanroom MEP',
      level: isZh ? '高等级超净室 HVAC 空调动力与微振阻尼' : 'Cleanroom HVAC systems and micro-vibration damping',
      activeProjects: 2,
      verified: false
    },
    {
      id: 'ORG-G',
      name: isZh ? '中咨工程监理咨询顾问 (ORG-G)' : 'Zhongzi Engineering Supervision (ORG-G)',
      role: isZh ? '工程监理单位 · 综合资质顾问' : 'Supervision & Quality Advisory',
      level: isZh ? '建设工程全过程质量与安全旁站监理' : 'Full lifecycle quality and safety station supervision',
      activeProjects: 4,
      verified: true
    }
  ];

  // Filter based on search query
  const filteredEngineers = engineers.filter(eng => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return eng.name.toLowerCase().includes(q) || eng.title.toLowerCase().includes(q) || eng.specialty.toLowerCase().includes(q);
  });

  const filteredOrgs = organizations.filter(org => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return org.name.toLowerCase().includes(q) || org.role.toLowerCase().includes(q) || org.level.toLowerCase().includes(q);
  });

  const tabOptions = locale === 'en' ? [
    { id: 'all', label: 'All Network' },
    { id: 'people', label: 'Licensed Engineers' },
    { id: 'companies', label: 'Contractors' },
  ] : locale === 'th' ? [
    { id: 'all', label: 'เครือข่ายทั้งหมด' },
    { id: 'people', label: 'วิศวกรผู้เชี่ยวชาญ' },
    { id: 'companies', label: 'บริษัทผู้รับเหมา' },
  ] : [
    { id: 'all', label: '全部人脉' },
    { id: 'people', label: '执业工程师' },
    { id: 'companies', label: '参建企业' },
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 font-sans text-ink">
      {/* 1. Header Bar */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-ink flex items-center gap-2">
                <span>{dict.nav?.network || '工程人脉与组织网络'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-semibold">
                  Network Mosaic
                </span>
              </h1>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              {isZh 
                ? '以工程师与建造主体为核心，进入专属主页查看完整执业资质与历史存证'
                : 'People & contractors first. Enter individual profile to inspect licensed credentials and audit history.'}
            </p>
          </div>

          {/* Quick AI Graph Discovery CTA */}
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-ink border border-hairline text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>{isZh ? '语义关系图谱 (AI)' : 'Graph Discovery (AI)'}</span>
          </button>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {tabOptions.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all text-xs ${
                  isActive
                    ? 'bg-accent text-white font-semibold shadow-xs'
                    : 'bg-surface-subtle text-ink-muted hover:text-ink hover:bg-surface-hover border border-hairline'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Avatar/Photo Mosaic Grid Leads (V4 Strict Requirement: People First, Responsive 2-4 Columns) */}
      {(activeTab === 'all' || activeTab === 'people') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span>{isZh ? '推荐工程同侪人脉' : 'Recommended Peer Engineers'} ({filteredEngineers.length})</span>
            </h2>
          </div>

          {/* Responsive 2-4 Column Photo Mosaic Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredEngineers.map(eng => {
              const isFollowing = followingIds ? followingIds.has(eng.id) : false;
              return (
                <div
                  key={eng.id}
                  onClick={() => navigate(`/people/${eng.id.toLowerCase()}`)}
                  className="bg-surface border border-hairline hover:border-accent rounded-xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group select-none"
                >
                  <div className="space-y-2.5">
                    {/* Compact Avatar Top Row */}
                    <div className="flex items-center justify-between">
                      <Avatar type="user" name={eng.name} size="md" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleFollow) onToggleFollow(eng.id);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                          isFollowing
                            ? 'bg-surface-subtle text-ink hover:bg-surface-hover border border-hairline'
                            : 'bg-accent hover:bg-accent-hover text-white'
                        }`}
                      >
                        {isFollowing ? (isZh ? '已关注' : 'Following') : (isZh ? '+ 关注' : '+ Follow')}
                      </button>
                    </div>

                    {/* Name & Title */}
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-ink group-hover:text-accent transition-colors line-clamp-1">
                        {eng.name}
                      </h3>
                      <p className="text-[11px] text-ink-muted line-clamp-1 font-medium mt-0.5">
                        {eng.title}
                      </p>
                    </div>

                    {/* Company */}
                    <p className="text-[11px] text-ink-faint truncate">
                      {eng.company}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px] text-ink-muted mt-2">
                    <span className="font-mono text-accent font-semibold">
                      {eng.projectCount} {isZh ? '项工程' : 'projects'}
                    </span>
                    <span className="text-ink-faint group-hover:text-accent transition-colors">
                      {isZh ? '主页' : 'View'} →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Organizations Section */}
      {(activeTab === 'all' || activeTab === 'companies') && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              <span>{isZh ? '参建骨干工程企业' : 'Participating Contractors'} ({filteredOrgs.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrgs.map(org => {
              const isFollowing = followingIds ? followingIds.has(org.id) : false;
              return (
                <div
                  key={org.id}
                  onClick={() => navigate(`/companies/${org.id.toLowerCase()}`)}
                  className="bg-surface border border-hairline hover:border-accent rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group select-none space-y-2.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-hairline flex items-center justify-center text-accent shrink-0 font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs sm:text-sm text-ink group-hover:text-accent transition-colors truncate">
                            {org.name}
                          </h3>
                          <span className="text-[10px] text-ink-muted">
                            {org.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-ink-muted line-clamp-2">
                      {org.level}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-hairline flex items-center justify-between text-[11px]">
                    <span className="font-mono text-accent">
                      {org.activeProjects} {isZh ? '在建标段' : 'active works'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleFollow) onToggleFollow(org.id);
                      }}
                      className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] transition-all ${
                        isFollowing 
                          ? 'bg-surface-subtle text-ink border border-hairline' 
                          : 'bg-accent text-white'
                      }`}
                    >
                      {isFollowing ? (isZh ? '已关注' : 'Following') : (isZh ? '+ 关注' : '+ Follow')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default NetworkPage;
