import { ORGANIZATIONS, canonicalEntity } from './canonicalEntities.js';
/**
 * FICTIONAL DEMO DATA FOR ENGINEERING NETWORK / PROJECT ATLAS
 * 硬性数据规则：全部为虚构原型数据，只用通用占位名。
 * 严禁真实企业、真实人物、真实案号。
 */

export const FICTIONAL_DISCLAIMER = "FICTIONAL DEMO DATA / 原型演示虚构数据 (仅供 UX Spike 验证，所有数据、企业、人员与案号均为虚构)";

export const PROJECT_DATA = {
  id: "DEMO-PRJ-P001",
  code: "P001",
  name: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
  shortName: "DEMO Project P001 (示范厂房)",
  brand: "Engineering Network / Project Atlas (工作名)",
  type: "工业建筑 / 高端装备重型结构与超净机电车间",
  sector: "智能装备制造与微纳洁净空间",
  location: "中国某示范工业高新区未来科技大道 88 号 (虚构地标)",
  coordinates: "30.25°N, 120.15°E (虚构基准点)",
  status: "在建履约中 (Construction Phase)",
  currentPhase: "施工建造 (Construction)",
  currentPhaseIndex: 4, // 0 to 7
  investmentScale: "约 12.8 亿元人民币 (原型假数据)",
  grossFloorArea: "158,000 平方米 (原型假数据)",
  plannedCycle: "2024-Q3 至 2027-Q2 (共 34 个月)",
  lastUpdated: "2026-10-25 18:30:00 (归档修订版 v2.4)",
  sourceAndVersion: "Project Atlas 核心工程存证链 v2.4 / 多方数字签章公报",
  
  // 参建主体统计
  stats: {
    totalOrgs: 7,
    verifiedOrgs: 5,
    selfClaimedOrgs: 1,
    aiCandidateOrgs: 1,
    totalEngineers: 4,
    verifiedEngineers: 3,
    selfClaimedEngineers: 1,
    totalWorkPackages: 5,
    milestonesCount: 8,
  },

  // 业主与发起方
  client: {
    id: "ORG-A",
    name: "Demo Organization A",
    title: "Demo Organization A (高端制造投资发展有限公司)",
    role: "建设单位 / 业主发包方 (Owner / Client)",
    verificationLevel: "VERIFIED",
    verifiedDate: "2024-06-20",
    trackRecordSnippet: "虚构投资机构，主导示范产业园区建设，累计持证发包项目 4 个 (DEMO)。",
  },

  // 标段与专业划分
  disciplinesAndBids: [
    { code: "PKG-DS-01", name: "勘察设计与全阶段 BIM 数字化咨询", org: "Demo Organization C", orgId: "ORG-C", status: "已验收交付" },
    { code: "PKG-CV-01", name: "桩基工程与地下地基处理标段", org: "Demo Organization D", orgId: "ORG-D", status: "已验收交付" },
    { code: "PKG-ST-02", name: "大跨度钢结构及屋面围护主体工程", org: "Demo Organization B", orgId: "ORG-B", status: "履约中 (85%)" },
    { code: "PKG-ME-03", name: "洁净厂房动力空调机电及管道安装", org: "Demo Organization E", orgId: "ORG-E", status: "履约中 (42%)" },
    { code: "PKG-EQ-04", name: "自动化工艺生产线机组供应与集成", org: "Demo Organization F", orgId: "ORG-F", status: "授标完成 (准备进场)" },
    { code: "PKG-SV-01", name: "全过程质量安全监督与工程监理", org: "Demo Organization G", orgId: "ORG-G", status: "履约中" },
  ],

  // 最近动态纪事
  recentUpdates: [
    {
      date: "2026-10-18",
      title: "大跨度钢网架第 4 单元顺利顶升至设计标高",
      summary: "总包 Demo Organization B 连同监理 Demo Organization G 完成现场形变激光扫描与焊缝探伤验收，符合验评标准。",
      type: "MILESTONE",
      verified: true,
      refId: "EVD-P001-089"
    },
    {
      date: "2026-09-02",
      title: "洁净室恒温恒湿机电管线综合深化方案通过专家评审",
      summary: "分包 Demo Organization E 提交 B1 区域管线碰撞优化模型，由设计院 Demo Organization C 签章确认。",
      type: "TECHNICAL",
      verified: true,
      refId: "EVD-P001-072"
    },
    {
      date: "2026-07-15",
      title: "AI 候选事实抓取：新增工艺设备供应商预招募公告",
      summary: "公开采招平台抓取到辅助洁净输送系统设备意向候选信息，待建设方确认存证。",
      type: "AI_CANDIDATE",
      verified: false,
      refId: "EVD-P001-055"
    }
  ],

  // 8 大生命周期阶段及甘特对比
  timelineStages: [
    {
      id: "stage-1",
      name: "规划立项",
      englishName: "Planning",
      category: "historical",
      plannedTime: "2024-07 至 2024-08",
      actualTime: "2024-07 至 2024-09",
      variance: "延后 1 个月",
      status: "COMPLETED",
      summary: "完成项目用地审批、节能审查与立项核准登记。",
      milestone: "立项核准批复 (2024-08-25)",
      participants: ["Demo Organization A"],
      evidenceId: "EVD-P001-001"
    },
    {
      id: "stage-2",
      name: "工程设计",
      englishName: "Design",
      category: "historical",
      plannedTime: "2024-09 至 2025-01",
      actualTime: "2024-09 至 2025-01",
      variance: "按期达成",
      status: "COMPLETED",
      summary: "方案规划、地勘报告、施工图设计审图及 BIM 全生命周期建模。",
      milestone: "施工图图审合格证书 (2025-01-18)",
      participants: ["Demo Organization A", "Demo Organization C", "Demo Engineer 02"],
      evidenceId: "EVD-P001-012"
    },
    {
      id: "stage-3",
      name: "工程招标",
      englishName: "Tender",
      category: "historical",
      plannedTime: "2025-02 至 2025-04",
      actualTime: "2025-02 至 2025-05",
      variance: "延后 3 周 (标段答疑澄清)",
      status: "COMPLETED",
      summary: "施工总承包招标、地基基础分包公开招标、监理单位招标确定。",
      milestone: "EPC 总承包中标通知书 (2025-05-10)",
      participants: ["Demo Organization A", "Demo Organization B", "Demo Organization G"],
      evidenceId: "EVD-P001-028"
    },
    {
      id: "stage-4",
      name: "设备采购",
      englishName: "Procurement",
      category: "historical",
      plannedTime: "2025-05 至 2025-10",
      actualTime: "2025-05 至 2025-11",
      variance: "延后 1 个月 (长周期备件订货周期)",
      status: "COMPLETED",
      summary: "主受电变压器、特种洁净空调机组、重型双梁起重行车前置订购。",
      milestone: "关键首批主设备出厂见证报告 (2025-11-05)",
      participants: ["Demo Organization B", "Demo Organization F"],
      evidenceId: "EVD-P001-042"
    },
    {
      id: "stage-5",
      name: "施工建造",
      englishName: "Construction",
      category: "current",
      plannedTime: "2025-07 至 2026-12",
      actualTime: "2025-08 进行中 (已完成约 68% 产值)",
      variance: "关键路径受控",
      status: "IN_PROGRESS",
      summary: "主体钢网架封顶、洁净隔墙与机电主管线综合穿插施工。",
      milestone: "主体结构阶段性验收 (2026-08-30)",
      participants: ["Demo Organization B", "Demo Organization D", "Demo Organization E", "Demo Organization G", "Demo Engineer 01", "Demo Engineer 03", "Demo Engineer 04"],
      evidenceId: "EVD-P001-077"
    },
    {
      id: "stage-6",
      name: "系统调试",
      englishName: "Commissioning",
      category: "future",
      plannedTime: "2027-01 至 2027-03",
      actualTime: "未知/未公开 (前置工序尚未完成)",
      variance: "未知/未公开",
      status: "PLANNED",
      summary: "暖通洁净度风量平衡测试、工艺介质管路打压气密调试、动力联锁试车。",
      milestone: "洁净厂房百级区气流流型验证合格 (待定)",
      participants: ["Demo Organization B", "Demo Organization E", "Demo Organization F"],
      evidenceId: "EVD-P001-PLAN-01"
    },
    {
      id: "stage-7",
      name: "交付运营",
      englishName: "Operation",
      category: "future",
      plannedTime: "2027-04 至 2027-06",
      actualTime: "未知/未公开",
      variance: "未知/未公开",
      status: "PLANNED",
      summary: "多方联合竣工验收、不动产权籍测绘、交付业主智慧工厂运行组。",
      milestone: "建设工程竣工联合验收意见书 (待定)",
      participants: ["Demo Organization A", "Demo Organization B", "Demo Organization G"],
      evidenceId: "EVD-P001-PLAN-02"
    },
    {
      id: "stage-8",
      name: "后期扩建",
      englishName: "Expansion",
      category: "future",
      plannedTime: "远期规划 (2028+)",
      actualTime: "未知/未公开",
      variance: "未知/未公开",
      status: "PROSPECTIVE",
      summary: "预留二期智能化微纳产线扩产工位及综合动力机房预留接口。",
      milestone: "二期总体概念扩初规划 (未公开)",
      participants: ["Demo Organization A"],
      evidenceId: "EVD-P001-PLAN-03"
    }
  ],

  // WBS 与 OBS 责任树形矩阵
  // 严格区分：投标 / 授标 / 履约 / 交付 / 验收
  // 每个节点明确提供 orgId 与 engineerId（指向 entityDossiers 键）
  wbsTree: [
    {
      id: "WBS-1",
      code: "1.0",
      title: "DEMO Project P001 工业示范厂房工程 (整体工程)",
      level: 1,
      org: "Demo Organization A",
      orgId: "ORG-A",
      orgRole: "建设单位 / 项目总发起",
      contractPhase: "履约",
      contractPhaseBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      engineer: null,
      engineerId: null,
      verificationStatus: "VERIFIED",
      deliverable: "现代化绿色智能示范厂房整体交付",
      children: [
        {
          id: "WBS-1.1",
          code: "1.1",
          title: "勘察设计与方案深化工程包 (PKG-DS-01)",
          level: 2,
          org: "Demo Organization C",
          orgId: "ORG-C",
          orgRole: "设计总院 (Design Institute)",
          contractPhase: "验收",
          contractPhaseBadge: "bg-purple-100 text-purple-800 border-purple-300",
          engineer: "Demo Engineer 02 (主任结构师)",
          engineerId: "ENG-02",
          verificationStatus: "VERIFIED",
          deliverable: "全套施工图设计图审报告及全生命周期数字化 BIM 模型",
          children: [
            {
              id: "WBS-1.1.1",
              code: "1.1.1",
              title: "工程地质勘察与边坡专项计算",
              level: 3,
              org: "Demo Organization C",
              orgId: "ORG-C",
              contractPhase: "验收",
              contractPhaseBadge: "bg-purple-100 text-purple-800 border-purple-300",
              engineer: "Demo Engineer 02",
              engineerId: "ENG-02",
              verificationStatus: "VERIFIED",
              deliverable: "详勘地质柱状图与承载力报告 (已归档)"
            },
            {
              id: "WBS-1.1.2",
              code: "1.1.2",
              title: "主体大跨结构有限元验算与抗震设计",
              level: 3,
              org: "Demo Organization C",
              orgId: "ORG-C",
              contractPhase: "验收",
              contractPhaseBadge: "bg-purple-100 text-purple-800 border-purple-300",
              engineer: "Demo Engineer 02",
              engineerId: "ENG-02",
              verificationStatus: "VERIFIED",
              deliverable: "抗震设防专项审查专家意见书"
            }
          ]
        },
        {
          id: "WBS-1.2",
          code: "1.2",
          title: "地基基础与地下工程包 (PKG-CV-01)",
          level: 2,
          org: "Demo Organization D",
          orgId: "ORG-D",
          orgRole: "地基基础专业分包商",
          contractPhase: "交付",
          contractPhaseBadge: "bg-blue-100 text-blue-800 border-blue-300",
          engineer: "现场施工员 01 (委任代表)",
          engineerId: null,
          verificationStatus: "VERIFIED",
          deliverable: "680 根高强混凝土预应力管桩及基坑封闭止水帷幕",
          children: [
            {
              id: "WBS-1.2.1",
              code: "1.2.1",
              title: "预应力高强管桩静压施工",
              level: 3,
              org: "Demo Organization D",
              orgId: "ORG-D",
              contractPhase: "交付",
              contractPhaseBadge: "bg-blue-100 text-blue-800 border-blue-300",
              engineer: null,
              engineerId: null,
              verificationStatus: "VERIFIED",
              deliverable: "低应变与高应变桩基承载力抽检 100% 合格记录"
            }
          ]
        },
        {
          id: "WBS-1.3",
          code: "1.3",
          title: "钢结构主体与建筑围护工程包 (PKG-ST-02)",
          level: 2,
          org: "Demo Organization B",
          orgId: "ORG-B",
          orgRole: "EPC 工程施工总承包方",
          contractPhase: "履约",
          contractPhaseBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          engineer: "Demo Engineer 01 (项目总监 / 执业建造师)",
          engineerId: "ENG-01",
          verificationStatus: "VERIFIED",
          deliverable: "85米大跨度双向刚接网架、金属夹芯隔热外维护墙系统",
          children: [
            {
              id: "WBS-1.3.1",
              code: "1.3.1",
              title: "重型十字钢柱及吊车梁吊装",
              level: 3,
              org: "Demo Organization B",
              orgId: "ORG-B",
              contractPhase: "履约",
              contractPhaseBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
              engineer: "Demo Engineer 01",
              engineerId: "ENG-01",
              verificationStatus: "VERIFIED",
              deliverable: "钢结构柱梁节点一级焊缝全长超声波探伤报告"
            },
            {
              id: "WBS-1.3.2",
              code: "1.3.2",
              title: "屋面空间钢网架液压同步整体提升",
              level: 3,
              org: "Demo Organization B",
              orgId: "ORG-B",
              contractPhase: "履约",
              contractPhaseBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
              engineer: "Demo Engineer 01",
              engineerId: "ENG-01",
              verificationStatus: "VERIFIED",
              deliverable: "同步提升位移实时监控曲线与应力监测表"
            }
          ]
        },
        {
          id: "WBS-1.4",
          code: "1.4",
          title: "洁净机电与暖通动力安装工程包 (PKG-ME-03)",
          level: 2,
          org: "Demo Organization E",
          orgId: "ORG-E",
          orgRole: "机电安装专业分包商",
          contractPhase: "履约",
          contractPhaseBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          engineer: "Demo Engineer 03 (机电技术总工)",
          engineerId: "ENG-03",
          verificationStatus: "SELF_CLAIMED",
          deliverable: "万级/千级洁净室环境动力控制系统、工艺冷却水循环管道",
          children: [
            {
              id: "WBS-1.4.1",
              code: "1.4.1",
              title: "主风管及高阻高效过滤机组吊装",
              level: 3,
              org: "Demo Organization E",
              orgId: "ORG-E",
              contractPhase: "履约",
              contractPhaseBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
              engineer: "Demo Engineer 03",
              engineerId: "ENG-03",
              verificationStatus: "SELF_CLAIMED",
              deliverable: "镀锌风管漏光法与漏风量试验测试记录 (待总包复核)"
            }
          ]
        },
        {
          id: "WBS-1.5",
          code: "1.5",
          title: "核心工艺生产设备系统 (PKG-EQ-04)",
          level: 2,
          org: "Demo Organization F",
          orgId: "ORG-F",
          orgRole: "自动化成套设备制造商",
          contractPhase: "授标",
          contractPhaseBadge: "bg-amber-100 text-amber-800 border-amber-300",
          engineer: null,
          engineerId: null,
          verificationStatus: "AI_CANDIDATE",
          deliverable: "50吨双小车变频桥式起重机及洁净物料输送轨道",
          children: [
            {
              id: "WBS-1.5.1",
              code: "1.5.1",
              title: "起重设备轨道基础与机架制作",
              level: 3,
              org: "Demo Organization F",
              orgId: "ORG-F",
              contractPhase: "授标",
              contractPhaseBadge: "bg-amber-100 text-amber-800 border-amber-300",
              engineer: null,
              engineerId: null,
              verificationStatus: "AI_CANDIDATE",
              deliverable: "设备公开中标技术规格备忘录 (公开标讯自动关联，待三方存证)"
            }
          ]
        }
      ]
    }
  ],

  // 关系网络节点与连边 (Network & Evidence)
  network: {
    nodes: [
      {
        id: "PRJ-P001",
        label: "DEMO Project P001",
        type: "PROJECT",
        category: "project",
        statusText: "在建核心项目",
        verificationLevel: "VERIFIED",
        orgRef: null,
        evidenceId: "EVD-P001-A01"
      },
      {
        id: "ORG-A",
        label: "Demo Organization A",
        type: "OWNER",
        category: "organization",
        statusText: "建设单位 (发包方)",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-P001-A01"
      },
      {
        id: "ORG-B",
        label: "Demo Organization B",
        type: "EPC_CONTRACTOR",
        category: "organization",
        statusText: "施工总承包方",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-P001-B01"
      },
      {
        id: "ORG-C",
        label: "Demo Organization C",
        type: "DESIGN_INSTITUTE",
        category: "organization",
        statusText: "工程设计院",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-P001-C01"
      },
      {
        id: "ORG-D",
        label: "Demo Organization D",
        type: "SUBCONTRACTOR_CIVIL",
        category: "organization",
        statusText: "地基基础专业分包",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-P001-D01"
      },
      {
        id: "ORG-E",
        label: "Demo Organization E",
        type: "SUBCONTRACTOR_MEP",
        category: "organization",
        statusText: "洁净机电专业承包 (自述)",
        verificationLevel: "SELF_CLAIMED",
        evidenceId: "EVD-P001-E01"
      },
      {
        id: "ORG-F",
        label: "Demo Organization F",
        type: "EQUIPMENT_SUPPLIER",
        category: "organization",
        statusText: "核心设备供应商 (AI抓取)",
        verificationLevel: "AI_CANDIDATE",
        evidenceId: "EVD-P001-F01"
      },
      {
        id: "ORG-G",
        label: "Demo Organization G",
        type: "SUPERVISION",
        category: "organization",
        statusText: "工程综合监理机构",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-P001-G01"
      },
      {
        id: "ENG-01",
        label: "Demo Engineer 01",
        type: "ENGINEER",
        category: "engineer",
        statusText: "项目总监 (总包执业)",
        verificationLevel: "VERIFIED",
        orgRef: "ORG-B",
        evidenceId: "EVD-ENG-01"
      },
      {
        id: "ENG-02",
        label: "Demo Engineer 02",
        type: "ENGINEER",
        category: "engineer",
        statusText: "主任结构设计师 (设计总院)",
        verificationLevel: "VERIFIED",
        orgRef: "ORG-C",
        evidenceId: "EVD-ENG-02"
      },
      {
        id: "ENG-03",
        label: "Demo Engineer 03",
        type: "ENGINEER",
        category: "engineer",
        statusText: "机电安装技术总工 (自述)",
        verificationLevel: "SELF_CLAIMED",
        orgRef: "ORG-E",
        evidenceId: "EVD-ENG-03"
      },
      {
        id: "ENG-04",
        label: "Demo Engineer 04",
        type: "ENGINEER",
        category: "engineer",
        statusText: "总监理工程师 (监理机构)",
        verificationLevel: "VERIFIED",
        orgRef: "ORG-G",
        evidenceId: "EVD-ENG-04"
      }
    ],
    edges: [
      {
        id: "EDGE-1",
        source: "ORG-A",
        target: "PRJ-P001",
        label: "建设发包与投资监管",
        contractType: "发包主体",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-EDGE-01"
      },
      {
        id: "EDGE-2",
        source: "ORG-A",
        target: "ORG-B",
        label: "EPC 施工总承包 (履约推进中)",
        contractType: "总承包业务",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-EDGE-02"
      },
      {
        id: "EDGE-3",
        source: "ORG-A",
        target: "ORG-C",
        label: "工程设计与数字化咨询 (已交付完成)",
        contractType: "勘察设计业务",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-EDGE-03"
      },
      {
        id: "EDGE-4",
        source: "ORG-A",
        target: "ORG-G",
        label: "全过程工程质量监理 (监督履责中)",
        contractType: "监理业务",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-EDGE-04"
      },
      {
        id: "EDGE-5",
        source: "ORG-B",
        target: "ORG-D",
        label: "地基与深基础工程专业分包 (已验收交付)",
        contractType: "专业分包业务",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-EDGE-05"
      },
      {
        id: "EDGE-6",
        source: "ORG-B",
        target: "ORG-E",
        label: "洁净厂房机电工程专业分包 (自述施工中)",
        contractType: "专业分包业务",
        verificationLevel: "SELF_CLAIMED",
        evidenceId: "EVD-EDGE-06"
      },
      {
        id: "EDGE-7",
        source: "ORG-B",
        target: "ORG-F",
        label: "起重与工艺设备公开标讯 (AI候选)",
        contractType: "设备供货",
        verificationLevel: "AI_CANDIDATE",
        evidenceId: "EVD-EDGE-07"
      },
      {
        id: "EDGE-8",
        source: "ORG-B",
        target: "ENG-01",
        label: "派驻项目总监与现场代表",
        contractType: "人员任命",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-ENG-01"
      },
      {
        id: "EDGE-9",
        source: "ORG-C",
        target: "ENG-02",
        label: "指定工程设计项目负责人",
        contractType: "人员任命",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-ENG-02"
      },
      {
        id: "EDGE-10",
        source: "ORG-E",
        target: "ENG-03",
        label: "机电现场安装技术负责人 (自述)",
        contractType: "自述任命",
        verificationLevel: "SELF_CLAIMED",
        evidenceId: "EVD-ENG-03"
      },
      {
        id: "EDGE-11",
        source: "ORG-G",
        target: "ENG-04",
        label: "总监理工程师常驻现场",
        contractType: "人员委派",
        verificationLevel: "VERIFIED",
        evidenceId: "EVD-ENG-04"
      }
    ]
  },

  // 证据存证详情库 (完整补齐所有 29 个被引用的 EVD- 编号)
  // 未来阶段显式定义为 PLANNED/PROSPECTIVE，标注未发生/未公开
  evidenceDb: {

    // 6. 扩展工程项目 P002-P008 及新参建关系存证
    "EVD-P002-001": {
      id: "EVD-P002-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "深基坑支护工程施工许可及联合质监备案",
      sourceOrg: "示范区住房和城乡建设局",
      timestamp: "2025-03-12 10:00:00 CST",
      wbsPackage: "PKG-CV-02 地下连续墙与基坑围护工程",
      summary: "P002 地下综合交通枢纽 32 米超深基坑施工许可核发，联合质监站完成第一阶段受力监测方案备案。",
      hashSignature: "0x0312...0021",
      errataLog: []
    },
    "EVD-P002-002": {
      id: "EVD-P002-002",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "地下连续墙与钢支撑受力监测阶段报告",
      sourceOrg: "第三方基坑安全监测中心与 Demo Organization D",
      timestamp: "2025-11-20 16:30:00 CST",
      wbsPackage: "PKG-CV-02 地下连续墙与基坑围护工程",
      summary: "基坑地连墙水平位移最大值 18mm，支撑轴力受控在设计警报值 70% 以内，通过专家组见证评估。",
      hashSignature: "0x1120...0022",
      errataLog: []
    },
    "EVD-P003-001": {
      id: "EVD-P003-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "临港重大装备总装厂房工程总承包中标公示",
      sourceOrg: "示范公共资源交易中心与港口投资集团",
      timestamp: "2025-08-05 14:00:00 CST",
      wbsPackage: "PKG-ST-03 临港总装车间与配套码头标段",
      summary: "中标结果法定公示结束，Demo Organization B 确认为联合体牵头方中标，授标手续完备。",
      hashSignature: "0x0805...0031",
      errataLog: []
    },
    "EVD-P003-002": {
      id: "EVD-P003-002",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "码头泊位地基强夯与陆域回填承载力验收记录",
      sourceOrg: "交通水运工程质量监督站",
      timestamp: "2026-04-18 11:20:00 CST",
      wbsPackage: "PKG-MR-01 临港配套重型码头与护岸标段",
      summary: "重型总装滚装码头陆域回填承载力检测合格，地基交工质量验评结论为优良。",
      hashSignature: "0x0418...0032",
      errataLog: []
    },
    "EVD-P004-001": {
      id: "EVD-P004-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "超净电子微环境动力机电施工图审定通知书",
      sourceOrg: "电子工业工程建设质量数字化图审机构",
      timestamp: "2025-09-10 15:00:00 CST",
      wbsPackage: "PKG-ME-04 超净车间工艺动力管线工程",
      summary: "P004 高新微电子洁净厂房百级微环境机电方案通过联合图审，具备进场深化条件。",
      hashSignature: "0x0910...0041",
      errataLog: []
    },
    "EVD-P004-002": {
      id: "EVD-P004-002",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "洁净空调冷热源机组现场开箱验收签证",
      sourceOrg: "建设单位与监理 Demo Organization G 联合见证",
      timestamp: "2026-06-22 09:30:00 CST",
      wbsPackage: "PKG-ME-04 超净车间工艺动力管线工程",
      summary: "大型无油磁悬浮离心冷水机组及高保真新风过滤系统现场进场开箱核验合格，资料齐全。",
      hashSignature: "0x0622...0042",
      errataLog: []
    },
    "EVD-P005-001": {
      id: "EVD-P005-001",
      verificationLevel: "SELF_CLAIMED",
      verificationLevelCn: "机构自述 (SELF_CLAIMED)",
      sourceType: "装配式空间网架结构加工出厂合格证与自检报告",
      sourceOrg: "Demo Organization H 钢结构制造实业集团质量检测部",
      timestamp: "2026-01-15 14:00:00 CST",
      wbsPackage: "PKG-ST-05 装配式钢网架结构制作加工标段",
      summary: "Demo Organization H 提报装配式球节点网架出厂批次合格证，正申请第三方抽检复验背书。",
      hashSignature: "0x0115...0051",
      errataLog: []
    },
    "EVD-P006-001": {
      id: "EVD-P006-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "自动化集装箱堆场重载水稳基底验收记录",
      sourceOrg: "港口建设工程质量监督检测站",
      timestamp: "2026-03-30 16:45:00 CST",
      wbsPackage: "PKG-MR-02 自动化集装箱堆场及重载道路",
      summary: "P006 自动化轨道吊堆场 45 吨重载道路基层压实度与回弹弯沉检测符合港口设计规范要求。",
      hashSignature: "0x0330...0061",
      errataLog: []
    },
    "EVD-P007-001": {
      id: "EVD-P007-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "绿电制氢储罐压力容器特种设备检验许可",
      sourceOrg: "特种设备安全检验研究院",
      timestamp: "2026-05-18 10:15:00 CST",
      wbsPackage: "PKG-NE-01 氢能深冷储运装置及工艺管道",
      summary: "大型球形储氢压力容器设计图纸与现场首道无损探伤方案审定通过，获发特种设备制造监督检验证书。",
      hashSignature: "0x0518...0071",
      errataLog: []
    },
    "EVD-P008-001": {
      id: "EVD-P008-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "跨江斜拉桥主塔索鞍吊装就位测控凭证",
      sourceOrg: "桥梁工程质量检测国家重点实验室与监理 Demo Organization G",
      timestamp: "2026-07-08 17:00:00 CST",
      wbsPackage: "PKG-BR-01 跨江特大跨斜拉桥主塔与主梁标段",
      summary: "主塔索鞍高空就位坐标三维激光雷达实测偏差小于 2mm，满足毫米级高精度索鞍安装标准。",
      hashSignature: "0x0708...0081",
      errataLog: []
    },
    "EVD-ENG-05": {
      id: "EVD-ENG-05",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "模拟岩土工程师与桩基分部验收示意单 (虚构记录)",
      sourceOrg: "示范区建设管理机构 (原型模拟)",
      timestamp: "2024-09-01 09:00:00 CST",
      wbsPackage: "1.2 桩基工程与地下地基处理标段",
      summary: "Demo Engineer 05 示意担任岩土工程人员，负责 DEMO Project P001 与 P002 深基坑地基持力层验收示意 (无真实执业资格)。",
      hashSignature: "0x0901...0055",
      errataLog: []
    },

    // 1. 机构与项目节点存证
    "EVD-P001-A01": {
      id: "EVD-P001-A01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "官方发包公报与国有土地使用证",
      sourceOrg: "示范工业区行政审批局与建设规划署 (虚构公信主体)",
      timestamp: "2024-06-20 10:15:32 CST",
      wbsPackage: "1.0 DEMO Project P001 整体项目",
      summary: "投资发展核准批件编号 MOCK-PRJ-APPROVE-2024-098；土地出让权属示范存证已核备 (Mock)。",
      hashSignature: "0x7f88...9a21 (原型模拟哈希存证)",
      errataLog: [
        { date: "2024-06-20", action: "初始存证建档", user: "经开区数据网关", note: "原始登记通过核验" }
      ]
    },
    "EVD-P001-B01": {
      id: "EVD-P001-B01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "公开中标通知与施工许可证公示",
      sourceOrg: "建设行政主管部门与项目部公开公报 (原型演示)",
      timestamp: "2025-05-12 14:00:00 CST",
      wbsPackage: "1.3 钢结构主体与建筑围护工程包 (PKG-ST-02)",
      summary: "依法取得建筑工程施工许可证 (许可证号 FAKE-BUILD-PERMIT-2025-019)，工程进入钢结构主体施工阶段。商业合同细节及财务金额属企业机密，不予公开展示。",
      hashSignature: "MOCK-PERMIT-2025-019",
      errataLog: [
        { date: "2025-05-12", action: "施工许可公示归档", user: "Demo Organization A", note: "施工许可证法定公报核对一致" },
        { date: "2025-08-01", action: "现场主要管理人员备案", user: "Demo Organization G 监理组", note: "项目总监及现场指挥团队履责公示" }
      ]
    },
    "EVD-P001-C01": {
      id: "EVD-P001-C01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "施工图联合审查合格书及 BIM 设计交付确认单",
      sourceOrg: "第三方施工图审查咨询中心 (虚构认证机构)",
      timestamp: "2025-01-20 09:30:00 CST",
      wbsPackage: "1.1 勘察设计与方案深化工程包 (PKG-DS-01)",
      summary: "全套数字化模型及抗震计算书通过专家组论证，无结构安全疑义，交付已闭环验收。",
      hashSignature: "0xaa81...341f",
      errataLog: [
        { date: "2025-01-20", action: "竣工交付确认", user: "Demo Organization C", note: "各专业图纸全部就绪并盖章" }
      ]
    },
    "EVD-P001-D01": {
      id: "EVD-P001-D01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "桩基分部工程验收记录表",
      sourceOrg: "总包 Demo Organization B + 监理 Demo Organization G 共同签发",
      timestamp: "2025-10-15 16:20:00 CST",
      wbsPackage: "1.2 地基基础与地下工程包 (PKG-CV-01)",
      summary: "桩基静载测试报告与动测报告均达优良等级，隐蔽工程验收记录完整合规。",
      hashSignature: "0xee72...890b",
      errataLog: [
        { date: "2025-10-15", action: "分部工程验收确认", user: "Demo Engineer 04 (总监)", note: "现场桩基实测抽检合格率 100%" }
      ]
    },
    "EVD-P001-E01": {
      id: "EVD-P001-E01",
      verificationLevel: "SELF_CLAIMED",
      verificationLevelCn: "参建方单方自述 (SELF_CLAIMED)",
      sourceType: "企业官网公开业绩声明与现场工作简报",
      sourceOrg: "Demo Organization E (单方声明提交)",
      timestamp: "2026-04-10 11:25:00 CST",
      wbsPackage: "1.4 洁净机电与暖通动力安装工程包 (PKG-ME-03)",
      summary: "自报承担洁净厂房动力机电安装标段，现场处于施工准备与深化阶段。内部商业合同及财务支付明细属企业机密，不予公开展示。",
      hashSignature: "MOCK-CLAIM-P001-E01",
      errataLog: [
        { date: "2026-04-10", action: "自述凭据提报", user: "Demo Organization E 管理员", note: "提报阶段履约申述，等待总包与业主确权" }
      ]
    },
    "EVD-P001-F01": {
      id: "EVD-P001-F01",
      verificationLevel: "AI_CANDIDATE",
      verificationLevelCn: "AI 候选事实 (AI_CANDIDATE)",
      sourceType: "招投标公共资源服务平台抓取候选 (LLM 结构化抽取)",
      sourceOrg: "公开标讯网络智能抓取引擎 (MOCK 演示数据)",
      timestamp: "2026-07-15 03:00:12 CST",
      wbsPackage: "1.5 核心工艺生产设备系统 (PKG-EQ-04)",
      summary: "算法比对中标公示文件 FAKE-TENDER-NOTICE-2026-788 自动关联，置信度 87.5%，尚未得到该企业或建设单位主动认领，禁止作为确权法律证据。",
      hashSignature: "0x9911...00bc (候选待决状态)",
      errataLog: [
        { date: "2026-07-15", action: "AI 候选解析入库", user: "Atlas 智能爬虫 v3.1", note: "自动发现中标候选人名单，等待人工或数字公钥确认" }
      ]
    },
    "EVD-P001-G01": {
      id: "EVD-P001-G01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "工程监理法定委任及住房城乡建设主管部门备案回执",
      sourceOrg: "建设单位 Demo Organization A 与主管住建部门",
      timestamp: "2025-03-01 15:45:00 CST",
      wbsPackage: "PKG-SV-01 全过程工程监理与质量管控包",
      summary: "受托委任国家注册监理工程师常驻现场，行使施工质量安全与分部验收见证签章职责。内部监理协议条款属商业私密，不予公开展示。",
      hashSignature: "MOCK-PERMIT-P001-G01",
      errataLog: [
        { date: "2025-03-01", action: "监理备案登记", user: "住建行政审批窗口", note: "法定监理资质核验无误" }
      ]
    },

    // 2. 工程师执业任职存证
    "EVD-ENG-01": {
      id: "EVD-ENG-01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "模拟建造师与总承包项目部任职示意记录 (虚构)",
      sourceOrg: "Demo Organization B 施工总承包部",
      timestamp: "2025-05-15 09:00:00 CST",
      wbsPackage: "1.3 钢结构主体与建筑围护工程包",
      summary: "虚构示意编号 FAKE-CN-B1-20210089，现场打卡数据为原型模拟，负责项目施工技术指挥示意 (无真实执业资格)。",
      hashSignature: "0xdd44...7788",
      errataLog: [
        { date: "2025-05-15", action: "任职提报记录", user: "Demo Engineer 01", note: "原型演示确认，无真实执业资格" }
      ]
    },
    "EVD-ENG-02": {
      id: "EVD-ENG-02",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "模拟注册结构师与施工图设计签章示意 (虚构)",
      sourceOrg: "Demo Organization C 设计总院",
      timestamp: "2024-11-10 14:20:00 CST",
      wbsPackage: "1.1 勘察设计与方案深化工程包",
      summary: "虚构示意编号 FAKE-STR-2018-0902，主导大跨度钢结构节点受力验算示意 (原型假数据)。",
      hashSignature: "0x8899...aabb",
      errataLog: [
        { date: "2024-11-10", action: "施工图图纸示意签署", user: "Demo Engineer 02", note: "原型演示设计责任签署，无真实执业资格" }
      ]
    },
    "EVD-ENG-03": {
      id: "EVD-ENG-03",
      verificationLevel: "SELF_CLAIMED",
      verificationLevelCn: "工程师个人自述 (SELF_CLAIMED)",
      sourceType: "工程师个人履历提报示意单 (虚构)",
      sourceOrg: "Demo Engineer 03 个人提报",
      timestamp: "2026-05-02 17:10:00 CST",
      wbsPackage: "1.4 洁净机电与暖通动力安装工程包",
      summary: "声明担任洁净室暖通空调管网调试总工，上传工作照片示意，待分包单位人事核实 (原型假数据)。",
      hashSignature: "0x6677...8899 (单方声明待核)",
      errataLog: [
        { date: "2026-05-02", action: "个人业绩认领申请", user: "Demo Engineer 03", note: "提报履约履历，等待机构确认" }
      ]
    },
    "EVD-ENG-04": {
      id: "EVD-ENG-04",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "模拟监理工程师月度通报示意记录 (虚构)",
      sourceOrg: "Demo Organization G 监理公司",
      timestamp: "2025-04-18 10:00:00 CST",
      wbsPackage: "PKG-SV-01 综合监理包",
      summary: "虚构示意编号 FAKE-SUP-2015-4421，常驻工程现场实施旁站见证与隐蔽工程签章示意 (原型假数据)。",
      hashSignature: "0x4455...6677",
      errataLog: [
        { date: "2025-04-18", action: "监理人员资质备案", user: "Demo Engineer 04", note: "原型比对示意一致，无真实技术验证" }
      ]
    },

    // 3. 合同关系边存证 (EVD-EDGE-01 ~ EVD-EDGE-07)
    "EVD-EDGE-01": {
      id: "EVD-EDGE-01",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "立项发包备案文书",
      sourceOrg: "建设管理部门公开数据网关",
      timestamp: "2024-06-25 11:00:00 CST",
      wbsPackage: "1.0 DEMO Project P001 整体项目",
      summary: "确权发包主体 Demo Organization A 具有完整项目立项及出资合规依据。",
      hashSignature: "0x0101...0101",
      errataLog: []
    },
    "EVD-EDGE-02": {
      id: "EVD-EDGE-02",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "施工总承包发包与工程角色授权 (公开业务)",
      sourceOrg: "项目部与建设单位 Demo Organization A (原型演示)",
      timestamp: "2025-05-20 16:00:00 CST",
      wbsPackage: "1.3 钢结构主体与建筑围护工程包",
      summary: "确权特级资质企业 Demo Organization B 承担主体钢结构施工总承包职责。内部商业合同细节、履约担保单据及财务往来属企业机密，不予公开展示，已延后至私有企业平台。",
      hashSignature: "MOCK-ROLE-EDGE-02",
      errataLog: []
    },
    "EVD-EDGE-03": {
      id: "EVD-EDGE-03",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "工程勘察设计与数字化方案深化 (公开业务)",
      sourceOrg: "Demo Organization A 与 Demo Organization C 联合归档",
      timestamp: "2024-09-05 10:30:00 CST",
      wbsPackage: "1.1 勘察设计与方案深化工程包 (PKG-DS-01)",
      summary: "由 Demo Organization C 完成全阶段工程设计与施工图数字化审查。内部设计委托协议及支付结算凭据属商业私密，不予公开展示。",
      hashSignature: "MOCK-ROLE-EDGE-03",
      errataLog: [
        { date: "2025-01-22", action: "施工图审定合格", user: "Demo Organization A 经办人", note: "施工图审查通过，转入深化交付" }
      ]
    },
    "EVD-EDGE-04": {
      id: "EVD-EDGE-04",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "全过程工程监理法定监督委任 (公开公报)",
      sourceOrg: "Demo Organization A 盖章协同",
      timestamp: "2025-03-05 09:15:00 CST",
      wbsPackage: "PKG-SV-01 全过程工程监理与质量管控包",
      summary: "Demo Organization G 受托常驻现场行使施工质量与工程安全旁站监督职责。内部监理委托协议及服务费率属企业机密，不予公开展示。",
      hashSignature: "MOCK-ROLE-EDGE-04",
      errataLog: []
    },
    "EVD-EDGE-05": {
      id: "EVD-EDGE-05",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "地基基础专业分包与分部验收 (现场工程记录)",
      sourceOrg: "Demo Organization B 与 Demo Organization D 联合记录",
      timestamp: "2025-06-18 15:20:00 CST",
      wbsPackage: "1.2 地基基础与地下工程包 (PKG-CV-01)",
      summary: "桩基工程已于 2025-10 完工并完成分部工程质量联合验收。内部专业分包商业条款与结算单据属企业机密，不予公开展示。",
      hashSignature: "MOCK-ROLE-EDGE-05",
      errataLog: [
        { date: "2025-10-20", action: "桩基分部验收记录", user: "总承包工程管理部", note: "隐蔽工程质量验收记录合格" }
      ]
    },
    "EVD-EDGE-06": {
      id: "EVD-EDGE-06",
      verificationLevel: "SELF_CLAIMED",
      verificationLevelCn: "参建方单方自述 (SELF_CLAIMED)",
      sourceType: "洁净机电专业分包现场进场申报 (自述动态)",
      sourceOrg: "Demo Organization E 单方报送",
      timestamp: "2026-03-01 11:00:00 CST",
      wbsPackage: "1.4 洁净机电与暖通动力安装工程包 (PKG-ME-03)",
      summary: "提报承担洁净厂房动力机电安装工程，现场施工班组进场准备中。商业合同细节及商务条款属企业机密，不予公开展示。",
      hashSignature: "MOCK-ROLE-EDGE-06",
      errataLog: [
        { date: "2026-03-01", action: "进场准备提报", user: "Demo Organization E", note: "自述施工组织方案编制中" }
      ]
    },
    "EVD-EDGE-07": {
      id: "EVD-EDGE-07",
      verificationLevel: "AI_CANDIDATE",
      verificationLevelCn: "AI 候选事实 (AI_CANDIDATE)",
      sourceType: "公开采招中标结果网络公告智能比对",
      sourceOrg: "公开标讯网络智能抓取引擎 (MOCK 演示数据)",
      timestamp: "2026-07-15 03:00:12 CST",
      wbsPackage: "1.5 核心工艺生产设备系统 (PKG-EQ-04)",
      summary: "由公开招投标平台抓取的中标候选公示关联匹配，置信度 87.5%，尚未得到该供应商或总包方正式认领。",
      hashSignature: "0x0707...0707 (AI候选待验)",
      errataLog: []
    },

    // 4. 时间轴阶段存证 (EVD-P001-001/012/028/042/077 与 PLAN-01~03)
    "EVD-P001-001": {
      id: "EVD-P001-001",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "建设用地规划许可证与立项核准批文",
      sourceOrg: "示范区行政审批局与建设规划署",
      timestamp: "2024-08-25 17:00:00 CST",
      wbsPackage: "1.0 整体工程策划阶段",
      summary: "立项核准批复文件 FAKE-PRJ-2024-0825，明确项目用地红线、产业定位与投资总控指标。",
      hashSignature: "0x0825...0001",
      errataLog: []
    },
    "EVD-P001-012": {
      id: "EVD-P001-012",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "施工图数字化图审合格证书",
      sourceOrg: "省建设工程施工图联合审查中心",
      timestamp: "2025-01-18 16:30:00 CST",
      wbsPackage: "1.1 勘察设计与方案深化工程包",
      summary: "审图证书编号 FAKE-DRAW-PASS-2025-0118，全套建筑、结构、机电深化施工图审查合格。",
      hashSignature: "0x0118...0012",
      errataLog: []
    },
    "EVD-P001-028": {
      id: "EVD-P001-028",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "建设工程施工总承包中标通知书",
      sourceOrg: "示范区公共资源交易中心与 Demo Organization A",
      timestamp: "2025-05-10 11:20:00 CST",
      wbsPackage: "1.0 招标投标标段统筹",
      summary: "中标通知书编号 FAKE-BID-2025-0510，确定 Demo Organization B 为第一中标人并依法公示无异议。",
      hashSignature: "0x0510...0028",
      errataLog: []
    },
    "EVD-P001-042": {
      id: "EVD-P001-042",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "关键长周期工艺设备出厂试验见证报告",
      sourceOrg: "国家工业装备产品质量检验检测中心",
      timestamp: "2025-11-05 14:40:00 CST",
      wbsPackage: "1.5 核心工艺生产设备系统 (PKG-EQ-04)",
      summary: "首批重型桥式行车及变配电机组通过工厂出厂耐压与载荷试验，签发出厂见证书准予发货。",
      hashSignature: "0x1105...0042",
      errataLog: []
    },
    "EVD-P001-077": {
      id: "EVD-P001-077",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "主体结构阶段性质量验收鉴定记录",
      sourceOrg: "Demo Organization A、B、C、G 四方联合签发",
      timestamp: "2026-08-30 18:00:00 CST",
      wbsPackage: "1.3 钢结构主体与建筑围护工程包",
      summary: "主体钢结构分部验收合格，全截面焊缝探伤合格率 100%，结构挠度与沉降观测受控在规范限值以内。",
      hashSignature: "0x0830...0077",
      errataLog: [
        { date: "2026-08-30", action: "主体分部工程联合签章", user: "四方代表密钥", note: "阶段验收通过" }
      ]
    },
    "EVD-P001-PLAN-01": {
      id: "EVD-P001-PLAN-01",
      verificationLevel: "PLANNED",
      verificationLevelCn: "未来规划/未发生 (PLANNED)",
      sourceType: "施工总进度计划控制表 (前瞻规划节点)",
      sourceOrg: "总包编制、监理审核之总体进度控制计划",
      timestamp: "2025-06-01 09:00:00 CST (计划拟定日期)",
      wbsPackage: "系统调试工序 (未来工序)",
      summary: "【未来未发生节点】前置土建及洁净机电管线安装目前仍在施工中，系统洁净度平衡及综合试车尚未发生，实际执行时间与实测数据严格标记为“未知/未公开”，禁止推断虚假完成比例。",
      hashSignature: "0xPLAN...0001 (未决计划预存证)",
      errataLog: [
        { date: "2025-06-01", action: "编制排程基准线", user: "总包项目计划工程师", note: "基准工期计划导入" }
      ]
    },
    "EVD-P001-PLAN-02": {
      id: "EVD-P001-PLAN-02",
      verificationLevel: "PLANNED",
      verificationLevelCn: "未来规划/未发生 (PLANNED)",
      sourceType: "竣工联合验收与产权交付策划备忘录",
      sourceOrg: "建设单位项目管理手册 (前瞻规划)",
      timestamp: "2025-06-01 09:00:00 CST (计划拟定日期)",
      wbsPackage: "竣工交付与运营移交 (未来阶段)",
      summary: "【未来未发生节点】建设工程联合验收意见书拟于 2027 年年中办理，当前处于施工阶段，实际验收结论与投产日期为“未知/未公开”。",
      hashSignature: "0xPLAN...0002 (未决计划预存证)",
      errataLog: []
    },
    "EVD-P001-PLAN-03": {
      id: "EVD-P001-PLAN-03",
      verificationLevel: "PROSPECTIVE",
      verificationLevelCn: "远期规划/未公开 (PROSPECTIVE)",
      sourceType: "园区总体规划远景概念设想",
      sourceOrg: "示范工业园区管委会远期战略规划 (原型假数据)",
      timestamp: "2024-05-10 10:00:00 CST",
      wbsPackage: "二期远期智能化扩建 (概念阶段)",
      summary: "【远期概念未公开】示范厂房东侧预留二期扩产用地，具体建设方案与投资规模待一期运营效益达标后决定，所有技术指标均为“未知/未公开”。",
      hashSignature: "0xPLAN...0003 (概念预留)",
      errataLog: []
    },

    // 5. 最近工程动态存证 (EVD-P001-055 / EVD-P001-072 / EVD-P001-089)
    "EVD-P001-055": {
      id: "EVD-P001-055",
      verificationLevel: "AI_CANDIDATE",
      verificationLevelCn: "AI 候选事实 (AI_CANDIDATE)",
      sourceType: "公共采招平台设备预招募公告自动捕获",
      sourceOrg: "公开标讯网络智能抓取引擎 (MOCK 演示数据)",
      timestamp: "2026-07-15 03:00:12 CST",
      wbsPackage: "1.5 核心工艺生产设备系统 (PKG-EQ-04)",
      summary: "AI 爬虫从省招标投标公共服务平台抓取到辅助洁净输送系统设备意向候选信息，尚未获得业主或供应商确认，置信度仅作为候选提示。",
      hashSignature: "0x0715...0055 (AI抓取待决)",
      errataLog: [
        { date: "2026-07-15", action: "网络抓取候选入库", user: "Atlas 智能爬虫", note: "标讯文本语义抽取" }
      ]
    },
    "EVD-P001-072": {
      id: "EVD-P001-072",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "洁净室机电管线综合碰撞优化技术评审意见",
      sourceOrg: "Demo Organization C 设计院与专家评审组",
      timestamp: "2026-09-02 17:30:00 CST",
      wbsPackage: "1.4 洁净机电与暖通动力安装工程包 (PKG-ME-03)",
      summary: "B1 区域风水电气四网管线综合深化 BIM 碰撞消除，经 5 位行业专家现场论证签发合格结论，设计院盖章同意按图施工。",
      hashSignature: "0x0902...0072",
      errataLog: [
        { date: "2026-09-02", action: "专家评审意见归档", user: "评审组秘书处", note: "深化方案核准" }
      ]
    },
    "EVD-P001-089": {
      id: "EVD-P001-089",
      verificationLevel: "VERIFIED",
      verificationLevelCn: "已双向核实 (VERIFIED)",
      sourceType: "大跨度空间钢结构第 4 单元顶升位移与焊缝验收证书",
      sourceOrg: "Demo Organization B (总包) 与 Demo Organization G (监理)",
      timestamp: "2026-10-18 15:45:00 CST",
      wbsPackage: "1.3 钢结构主体与建筑围护工程包 (PKG-ST-02)",
      summary: "大跨度空间钢网架第 4 单元平稳提升至设计标高 +28.500m，全站仪激光扫描形变偏差小于 3mm，超声波焊缝探伤一类焊缝合格率 100%。",
      hashSignature: "0x1018...0089",
      errataLog: [
        { date: "2026-10-18", action: "现场提升联合见证", user: "总监 Demo Engineer 04", note: "旁站监理验收通过" }
      ]
    }
  },

  // 实体档案详情（用于点击公司/工程师时展示虚构业绩链与执业档案）
  entityDossiers: {

    "ORG-H": {
      id: "ORG-H",
      name: "Demo Organization H",
      fullName: "Demo Organization H (钢结构科技制造实业集团)",
      type: "大跨度钢结构专业承包壹级 / 钢结构制造特级资质",
      licenseNo: "FAKE-USCC-91330000H22334455",
      registeredCapital: "3.5 亿元人民币 (原型假数据)",
      verifiedProjectsCount: 14,
      reputationScore: "国家装配式钢结构产业基地 (DEMO)",
      description: "专注于超高层与大跨度管桁架、网架结构深化设计、数控加工与工厂预拼装 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P005", role: "空间网架制造", phase: "验收交付", year: "2025-2026" }
      ]
    },
    "ENG-05": {
      id: "ENG-05",
      name: "Demo Engineer 05",
      title: "注册土木工程师(岩土) / 高级工程师 (地基负责人)",
      orgName: "Demo Organization D (基础工程工程分包有限公司)",
      regNumber: "FAKE-REG-GEO-003892",
      verifiedYears: 14,
      verifiedDeliveries: 7,
      verificationStatus: "VERIFIED",
      bio: "专注复杂软土深基坑支护、超深地下连续墙与抗拔桩载荷试验，主持多项地下综合工程验评 (原型假数据)。",
      milestones: [
        { project: "DEMO Project P001", role: "桩基分部验收工程师 (验收)", badge: "模拟核验", date: "2024-2025" },
        { project: "DEMO Project P002", role: "深基坑技术总监 (履约)", badge: "模拟核验", date: "2025-至今" }
      ]
    },
    "ORG-A": {
      id: "ORG-A",
      name: "Demo Organization A",
      fullName: "Demo Organization A (高端制造投资发展有限公司)",
      type: "项目业主 / 建设投资企业",
      licenseNo: "FAKE-USCC-91330000A12345678",
      registeredCapital: "10 亿元人民币 (原型假数据)",
      verifiedProjectsCount: 4,
      reputationScore: "AA+ 优良履约评级 (DEMO)",
      description: "专注于先进制造业产业园区及重载示范厂房投资建设的专业项目法人主体，本数据为原型测试虚构数据。",
      trackRecord: [
        { project: "DEMO Project P001 (当前示范厂房)", role: "建设发包方", phase: "在建", year: "2024-2027" },
        { project: "DEMO Industrial Park Phase 0 (一期已建)", role: "项目业主", phase: "运营中", year: "2021-2024" },
        { project: "DEMO Warehouse Depot C (智能仓储)", role: "发包主体", phase: "运营中", year: "2020-2022" }
      ]
    },
    "ORG-B": {
      id: "ORG-B",
      name: "Demo Organization B",
      fullName: "Demo Organization B (建筑工程总承包集团)",
      type: "施工总承包特级企业 (EPC General Contractor)",
      licenseNo: "FAKE-USCC-91110000B87654321",
      registeredCapital: "15 亿元人民币 (原型假数据)",
      verifiedProjectsCount: 12,
      reputationScore: "AAA 级国家示范工程总包 (DEMO)",
      description: "具备建筑工程施工总承包特级、钢结构工程专业承包壹级资质，承建各类大型工业与公建项目 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P001 (当前项目)", role: "EPC 施工总承包", phase: "在建履约", year: "2025-2027" },
        { project: "DEMO Aviation Hangar Alpha (大跨度机库)", role: "总承包方", phase: "已验收", year: "2022-2024" },
        { project: "DEMO Heavy Machinery Plant (重型机械车间)", role: "钢结构总包", phase: "已验收", year: "2019-2022" }
      ]
    },
    "ORG-C": {
      id: "ORG-C",
      name: "Demo Organization C",
      fullName: "Demo Organization C (建筑勘察设计研究院)",
      type: "工程设计综合甲级资质院",
      licenseNo: "FAKE-USCC-91310000C33445566",
      registeredCapital: "2 亿元人民币 (原型假数据)",
      verifiedProjectsCount: 18,
      reputationScore: "卓越勘察设计奖 (DEMO)",
      description: "专注超大跨度空间钢结构、绿色工业建筑与全专业数字孪生 BIM 设计 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P001", role: "方案及施工图总院", phase: "设计交付", year: "2024-2025" },
        { project: "DEMO High-tech Fab Beta", role: "洁净厂房设计", phase: "已运营", year: "2021-2023" }
      ]
    },
    "ORG-D": {
      id: "ORG-D",
      name: "Demo Organization D",
      fullName: "Demo Organization D (基础工程工程分包有限公司)",
      type: "地基与基础工程专业承包壹级",
      licenseNo: "FAKE-USCC-91440000D99887766",
      registeredCapital: "8000 万元人民币 (原型假数据)",
      verifiedProjectsCount: 9,
      reputationScore: "优质基础施工履约方 (DEMO)",
      description: "专业从事复杂地基预应力管桩、地下连续墙与深基坑支护专业分包施工 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P001", role: "桩基专业分包", phase: "验收交付", year: "2025" }
      ]
    },
    "ORG-E": {
      id: "ORG-E",
      name: "Demo Organization E",
      fullName: "Demo Organization E (工业洁净机电设备安装工程公司)",
      type: "机电工程施工总承包贰级 / 洁净净化专业资质",
      licenseNo: "FAKE-USCC-91320000E55667788",
      registeredCapital: "6000 万元人民币 (原型假数据)",
      verifiedProjectsCount: 6,
      reputationScore: "自述履约核查中 (DEMO)",
      description: "主要承揽微纳制造、生物医药等高等级洁净厂房 HVAC 与纯水动力管路安装 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P001", role: "洁净机电专业分包", phase: "履约中 (自述)", year: "2026-进行中" }
      ]
    },
    "ORG-F": {
      id: "ORG-F",
      name: "Demo Organization F",
      fullName: "Demo Organization F (重型起重装备制造股份有限公司)",
      type: "特种工业装备设备制造商",
      licenseNo: "FAKE-USCC-91410000F11223344",
      registeredCapital: "1.2 亿元人民币 (原型假数据)",
      verifiedProjectsCount: 15,
      reputationScore: "AI 候选关联待确权 (DEMO)",
      description: "生产欧式变频工业行车、轨道起重机械与洁净行吊设备 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P001", role: "起重行车供货", phase: "授标完成 (待进场)", year: "2026" }
      ]
    },
    "ORG-G": {
      id: "ORG-G",
      name: "Demo Organization G",
      fullName: "Demo Organization G (工程项目管理监理咨询有限公司)",
      type: "工程监理综合资质企业",
      licenseNo: "FAKE-USCC-91120000G77889900",
      registeredCapital: "5000 万元人民币 (原型假数据)",
      verifiedProjectsCount: 22,
      reputationScore: "五星公信监理机构 (DEMO)",
      description: "受业主委托全过程行使施工质量、工程安全、合同与投资监管职责 (原型假数据)。",
      trackRecord: [
        { project: "DEMO Project P001", role: "全过程工程监理", phase: "履约中", year: "2025-2027" }
      ]
    },
    "ENG-01": {
      id: "ENG-01",
      name: "Demo Engineer 01",
      title: "模拟高级建造师 / 施工总监 (演示角色)",
      orgName: "Demo Organization B (建筑工程总承包集团)",
      regNumber: "FAKE-REG-CONST-001928",
      verifiedYears: 16,
      verifiedDeliveries: 5,
      verificationStatus: "VERIFIED",
      bio: "专注于大跨度钢结构安装、装配式工业厂房现场综合组织与安全文明管理，历任多个标段总指挥 (原型假数据)。",
      milestones: [
        { project: "DEMO Project P001", role: "总承包项目总监 (履约)", badge: "模拟核验", date: "2025-至今" },
        { project: "DEMO Aviation Hangar Alpha", role: "钢结构执行经理 (交付)", badge: "已交付验收", date: "2022-2024" }
      ]
    },
    "ENG-02": {
      id: "ENG-02",
      name: "Demo Engineer 02",
      title: "模拟注册结构师 / 正高级工程师 (演示角色)",
      orgName: "Demo Organization C (建筑勘察设计研究院)",
      regNumber: "FAKE-REG-STR-008819",
      verifiedYears: 18,
      verifiedDeliveries: 8,
      verificationStatus: "VERIFIED",
      bio: "长期从事工业大跨度桁架体系、预应力混凝土结构及动力荷载响应计算，主编过多项虚拟设计指引 (原型假数据)。",
      milestones: [
        { project: "DEMO Project P001", role: "工程设计总负责人 (已交付验收)", badge: "模拟核验", date: "2024-2025" }
      ]
    },
    "ENG-03": {
      id: "ENG-03",
      name: "Demo Engineer 03",
      title: "机电安装高级工程师 / 暖通专业负责人 (演示角色)",
      orgName: "Demo Organization E (洁净机电设备安装公司)",
      regNumber: "FAKE-REG-MEP-003341",
      verifiedYears: 11,
      verifiedDeliveries: 3,
      verificationStatus: "SELF_CLAIMED",
      bio: "主要负责万级与千级洁净车间动力风管气密平衡与自控联锁调试，当前业绩处于自述提交状态 (原型假数据)。",
      milestones: [
        { project: "DEMO Project P001", role: "机电现场安装技术负责人 (履约)", badge: "参建方自述", date: "2026-至今" }
      ]
    },
    "ENG-04": {
      id: "ENG-04",
      name: "Demo Engineer 04",
      title: "模拟注册监理师 / 质量安全总监 (演示角色)",
      orgName: "Demo Organization G (工程项目管理监理咨询公司)",
      regNumber: "FAKE-REG-SUP-005522",
      verifiedYears: 20,
      verifiedDeliveries: 10,
      verificationStatus: "VERIFIED",
      bio: "负责示范厂房全周期旁站监理与实测实量，把关材料进场复检与隐蔽验收签章 (原型假数据)。",
      milestones: [
        { project: "DEMO Project P001", role: "总监理工程师 (履约)", badge: "模拟核验", date: "2025-至今" }
      ]
    }
  },

  // 脚注与文献引用 (Wiki 风格脚注)
  footnotes: [
    {
      index: 1,
      id: "cite-1",
      evidenceId: "EVD-P001-A01",
      title: "DEMO Project P001 项目立项与工程建设用地规划许可公示",
      source: "示范工业高新区行政审批门户 (原型公开存证公报)",
      pubDate: "2024-06-25",
      archiveCode: "ARCH-2024-LAND-0091",
      linkText: "[存证存卷 0091]"
    },
    {
      index: 2,
      id: "cite-2",
      evidenceId: "EVD-P001-C01",
      title: "DEMO Project P001 施工图联合审查合格证书与抗震专项论证意见书",
      source: "工程勘察设计质量数字化监管平台 (虚拟认证存证)",
      pubDate: "2025-01-22",
      archiveCode: "ARCH-2025-DRAW-0143",
      linkText: "[设计图审 0143]"
    },
    {
      index: 3,
      id: "cite-3",
      evidenceId: "EVD-P001-B01",
      title: "DEMO Project P001 建筑工程施工许可证与质量安全监督注册凭证",
      source: "示范区住房和城乡建设主管部门备案库",
      pubDate: "2025-05-18",
      archiveCode: "ARCH-2025-PERMIT-0082",
      linkText: "[施工许可 0082]"
    },
    {
      index: 4,
      id: "cite-4",
      evidenceId: "EVD-P001-089",
      title: "DEMO Project P001 阶段性验收报告：大跨度钢结构桁架提升见证记录",
      source: "发承包双方与监理参建关联存证记录 (虚构示意)",
      pubDate: "2026-10-18",
      archiveCode: "ARCH-2026-STEEL-0904",
      linkText: "[验收存证 0904]"
    }
  ],

  // Wiki 修订历史
  revisionHistory: [
    {
      version: "v2.4",
      date: "2026-10-25 18:30",
      editor: "Demo Engineer 01 (已归档)",
      comment: "更新屋面大跨度钢结构提升完成验收节点，补充实测探伤报告附件存证",
      verified: true
    },
    {
      version: "v2.3",
      date: "2026-09-05 14:12",
      editor: "Demo Organization E 管理员 (Self-Claimed)",
      comment: "新增洁净机电标段管综深化模型评审结论，提报阶段履约记录",
      verified: false
    },
    {
      version: "v2.2",
      date: "2026-07-16 04:00",
      editor: "Atlas AI Candidate Bot (MOCK 演示)",
      comment: "自动比对公开招投标信息，抓取起重机设备候选供应商 Demo Organization F",
      verified: false
    },
    {
      version: "v2.1",
      date: "2025-05-20 16:30",
      editor: "Demo Organization A 经办人 (已归档)",
      comment: "EPC 施工总承包中标授标正式生效，导入 WBS 分解结构与施工许可证号",
      verified: true
    },
    {
      version: "v1.0",
      date: "2024-06-25 10:00",
      editor: "示范区工程建档网关 (已归档)",
      comment: "立项完成，生成 DEMO Project P001 初始项目档案与首批哈希索引",
      verified: true
    }
  ],

  // OBS 第一层级：核心参建责任单位 (模拟核验示意)
  obsCoreOrgs: [
    { id: "ORG-A", name: "Demo Organization A", role: "建设单位 (业主)", status: "VERIFIED", evidenceId: "EVD-P001-A01" },
    { id: "ORG-B", name: "Demo Organization B", role: "EPC 施工总承包", status: "VERIFIED", evidenceId: "EVD-P001-B01" },
    { id: "ORG-C", name: "Demo Organization C", role: "勘察设计总院", status: "VERIFIED", evidenceId: "EVD-P001-C01" },
    { id: "ORG-G", name: "Demo Organization G", role: "综合监理机构", status: "VERIFIED", evidenceId: "EVD-P001-G01" }
  ],

  // OBS 第三层级：关键岗位执业工程师 (Mock 演示人员)
  certifiedEngineers: [
    { id: "ENG-01", name: "Demo Engineer 01", title: "项目总监 (模拟角色)", status: "VERIFIED", evidenceId: "EVD-ENG-01" },
    { id: "ENG-02", name: "Demo Engineer 02", title: "主任结构师 (模拟角色)", status: "VERIFIED", evidenceId: "EVD-ENG-02" },
    { id: "ENG-03", name: "Demo Engineer 03", title: "机电安装技术总工 (模拟角色)", status: "SELF_CLAIMED", evidenceId: "EVD-ENG-03" },
    { id: "ENG-04", name: "Demo Engineer 04", title: "总监理工程师 (模拟角色)", status: "VERIFIED", evidenceId: "EVD-ENG-04" }
  ],

  // AI 存证助手模拟问答数据源 (MOCK 演示数据)
  aiCopilotQueries: [
    {
      id: "ai-resp-eng",
      keyword: "负责人",
      queryText: "钢结构标段现场负责人是谁？",
      answer: "【MOCK 演示分析】根据 WBS 1.3 存证记录，大跨度钢结构及屋面围护标段现场负责人为 Demo Engineer 01（任职于 EPC 总包方 Demo Organization B），相关任职为虚构演示人员，无真实法定执业资格。",
      evidenceId: "EVD-ENG-01"
    },
    {
      id: "ai-resp-construction",
      keyword: "关键路径",
      queryText: "当前施工阶段核验与关键路径？",
      answer: "【MOCK 演示分析】DEMO Project P001 当前处于施工建造阶段 (Construction)，关键路径为大跨度桁架提升与洁净动力管线穿插，共关联 7 家参建机构，相关状态均为原型模拟数据。",
      evidenceId: "EVD-P001-B01"
    }
  ]
};


// =========================================================================
// UNIFIED DATA CONTRACT: Projects (P001-P008), Companies, People, Participations, Posts
// =========================================================================

export const PROJECTS_LIST = [
  {
    id: "DEMO-PRJ-P001",
    code: "P001",
    name: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
    shortName: "DEMO Project P001 (示范厂房)",
    brand: "Project Atlas (工作名)",
    type: "工业建筑 / 高端装备重型结构与超净机电车间",
    sector: "工业建筑",
    location: "中国华东示范高新区未来科技大道 88 号",
    region: "华东",
    coordinates: { x: 62, y: 48, grid: "E-4" },
    status: "在建履约中",
    currentPhase: "施工建造 (Construction)",
    currentPhaseIndex: 4,
    investmentScale: "约 12.8 亿元 (原型假数据)",
    grossFloorArea: "158,000 m² (原型假数据)",
    plannedCycle: "2024-Q3 至 2027-Q2 (共 34 个月)",
    lastUpdated: "2026-10-25",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "示范性大型高精尖装备制造基地，涵盖大跨度重型门式钢结构厂房、洁净动力站房与综合研发主楼。核心存证链条覆盖立项、图审、施工许可及第 4 单元高空顶升验收。",
    isFullWiki: true,
    verificationScore: "71.4% (5/7 模拟核验)",
    evidenceId: "EVD-P001-089"
  },
  {
    id: "DEMO-PRJ-P002",
    code: "P002",
    name: "DEMO Project P002: 超大型深基坑与地下交通枢纽综合体工程",
    shortName: "DEMO Project P002 (地下枢纽)",
    brand: "Project Atlas (工作名)",
    type: "土木市政 / 城市深基坑与地下立体轨道换乘枢纽",
    sector: "土木市政",
    location: "示范中心商务区核心绿轴地下空间",
    region: "华东",
    coordinates: { x: 58, y: 52, grid: "D-5" },
    status: "在建履约中",
    currentPhase: "主体基坑支护与土方开挖 (Civil Foundations)",
    currentPhaseIndex: 3,
    investmentScale: "约 24.5 亿元 (原型假数据)",
    grossFloorArea: "210,000 m² (原型假数据)",
    plannedCycle: "2025-Q1 至 2028-Q4 (共 48 个月)",
    lastUpdated: "2026-10-15",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "最大开挖深度达 32 米的多层立体地下交通综合体，临近既有地铁线路，采用 1200mm 超厚地下连续墙结合 4 道预应力混凝土伺服钢支撑体系。",
    isFullWiki: false,
    verificationScore: "80% (4/5 模拟核验)",
    evidenceId: "EVD-P002-001"
  },
  {
    id: "DEMO-PRJ-P003",
    code: "P003",
    name: "DEMO Project P003: 临港重大重型装备总装厂房及配套码头",
    shortName: "DEMO Project P003 (临港总装)",
    brand: "Project Atlas (工作名)",
    type: "工业建筑 / 沿海临港重型装配及重载滚装海运基地",
    sector: "工业建筑",
    location: "示范国际深水临港重工产业综合开发区",
    region: "华南",
    coordinates: { x: 74, y: 72, grid: "G-7" },
    status: "在建履约中",
    currentPhase: "主体钢结构立柱吊装与重型地基处理",
    currentPhaseIndex: 4,
    investmentScale: "约 18.2 亿元 (原型假数据)",
    grossFloorArea: "185,000 m² (原型假数据)",
    plannedCycle: "2025-Q2 至 2027-Q4 (共 30 个月)",
    lastUpdated: "2026-09-28",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "单跨 72 米特大跨度重型机械总装车间，配备 800 吨级重型起重行车系统与专用重载出海滚装出运码头。",
    isFullWiki: false,
    verificationScore: "85% (6/7 模拟核验)",
    evidenceId: "EVD-P003-001"
  },
  {
    id: "DEMO-PRJ-P004",
    code: "P004",
    name: "DEMO Project P004: 高新微电子洁净厂房与机电动力中心",
    shortName: "DEMO Project P004 (微电子洁净)",
    brand: "Project Atlas (工作名)",
    type: "动力机电 / 微电子超净车间与动力中心",
    sector: "动力机电",
    location: "示范高新技术开发区集成电路科学岛 1 号",
    region: "华东",
    coordinates: { x: 65, y: 44, grid: "F-4" },
    status: "在建履约中",
    currentPhase: "机电动力管综穿插安装 (MEP Installation)",
    currentPhaseIndex: 4,
    investmentScale: "约 31.0 亿元 (原型假数据)",
    grossFloorArea: "120,000 m² (原型假数据)",
    plannedCycle: "2025-Q3 至 2027-Q3 (共 24 个月)",
    lastUpdated: "2026-10-12",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "极微振动控制、空气洁净度达高等级标准的高科技生产基地示意，集成特种气体系统、超纯水制备与全自动恒温恒湿空调机组。",
    isFullWiki: false,
    verificationScore: "75% (3/4 模拟核验)",
    evidenceId: "EVD-P004-001"
  },
  {
    id: "DEMO-PRJ-P005",
    code: "P005",
    name: "DEMO Project P005: 示范生态产业园装配式钢网架研发展示中心",
    shortName: "DEMO Project P005 (生态展示中心)",
    brand: "Project Atlas (工作名)",
    type: "工业建筑 / 大跨度空间双曲面装配式钢网架展馆",
    sector: "工业建筑",
    location: "示范生态新区科学大道 102 号",
    region: "华北",
    coordinates: { x: 48, y: 28, grid: "C-2" },
    status: "竣工验收",
    currentPhase: "竣工交付与运营 (Operation & Handover)",
    currentPhaseIndex: 7,
    investmentScale: "约 6.5 亿元 (原型假数据)",
    grossFloorArea: "46,000 m² (原型假数据)",
    plannedCycle: "2024-Q1 至 2026-Q1 (共 24 个月)",
    lastUpdated: "2026-03-20",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "全装配式螺栓球节点双曲面大跨度钢网架结构，融合低碳幕墙与光伏建筑一体化 (BIPV) 技术，已完成竣工联合验收交付运营。",
    isFullWiki: false,
    verificationScore: "100% (4/4 模拟核验)",
    evidenceId: "EVD-P005-001"
  },
  {
    id: "DEMO-PRJ-P006",
    code: "P006",
    name: "DEMO Project P006: 智慧海港自动化集装箱堆场与重载道路工程",
    shortName: "DEMO Project P006 (智慧海港堆场)",
    brand: "Project Atlas (工作名)",
    type: "港口航道 / 自动化无人化集装箱装卸堆场与重载集疏运道路",
    sector: "港口航道",
    location: "示范深水港西作业区二期泊位后方",
    region: "华南",
    coordinates: { x: 78, y: 76, grid: "H-7" },
    status: "在建履约中",
    currentPhase: "重载硬化地基施工与自动化轨道铺设",
    currentPhaseIndex: 4,
    investmentScale: "约 9.8 亿元 (原型假数据)",
    grossFloorArea: "320,000 m² 堆场面积 (原型假数据)",
    plannedCycle: "2025-Q2 至 2027-Q1 (共 22 个月)",
    lastUpdated: "2026-08-10",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "服务于大型无人化自动化轨道吊 (ARMG) 的全贯通重载地基加固工程，耐受 45 吨轮压重载循环载荷，满足数字化智能调度要求。",
    isFullWiki: false,
    verificationScore: "80% (4/5 模拟核验)",
    evidenceId: "EVD-P006-001"
  },
  {
    id: "DEMO-PRJ-P007",
    code: "P007",
    name: "DEMO Project P007: 绿电氢能综合利用装置及深冷储运标段工程",
    shortName: "DEMO Project P007 (绿氢储运工程)",
    brand: "Project Atlas (工作名)",
    type: "新能源工程 / 工业绿氢电解制取与深冷高压储运装置",
    sector: "新能源工程",
    location: "示范清洁能源先导产业集聚示范园",
    region: "西北",
    coordinates: { x: 28, y: 34, grid: "A-3" },
    status: "招标采购",
    currentPhase: "设备招标采购与场地三通一平 (Procurement)",
    currentPhaseIndex: 2,
    investmentScale: "约 11.2 亿元 (原型假数据)",
    grossFloorArea: "82,000 m² (原型假数据)",
    plannedCycle: "2026-Q1 至 2028-Q2 (共 28 个月)",
    lastUpdated: "2026-09-15",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "高压球罐组与低温深冷管道系统成套装置，配套质子交换膜电解制氢车间与防爆防雷接地特种工程。",
    isFullWiki: false,
    verificationScore: "66% (2/3 模拟核验)",
    evidenceId: "EVD-P007-001"
  },
  {
    id: "DEMO-PRJ-P008",
    code: "P008",
    name: "DEMO Project P008: 城市跨江特大跨度双索面斜拉桥标段工程",
    shortName: "DEMO Project P008 (跨江特大桥)",
    brand: "Project Atlas (工作名)",
    type: "土木市政 / 双向八车道公轨合建特大跨径斜拉桥",
    sector: "土木市政",
    location: "示范大江主航道一桥飞架南北干线",
    region: "华东",
    coordinates: { x: 54, y: 46, grid: "D-4" },
    status: "在建履约中",
    currentPhase: "主塔高空索鞍吊装与斜拉索挂设 (Bridge Tower)",
    currentPhaseIndex: 4,
    investmentScale: "约 36.8 亿元 (原型假数据)",
    grossFloorArea: "桥梁全长 4,280 米 (主跨 820 米)",
    plannedCycle: "2023-Q4 至 2027-Q4 (共 48 个月)",
    lastUpdated: "2026-10-20",
    clientOrgId: "ORG-A",
    clientOrgName: "Demo Organization A",
    summary: "特大跨径双塔双索面钢箱梁斜拉桥，主塔高 260 米，集成了深水群桩大体积承台、耐候高强钢箱梁以及智能索力在线监测传感系统。",
    isFullWiki: false,
    verificationScore: "90% (9/10 模拟核验)",
    evidenceId: "EVD-P008-001"
  }
];

export const COMPANIES_LIST = [
  {
    id: "ORG-A",
    slug: "demo-org-a",
    name: "Demo Organization A",
    fullName: "Demo Organization A (高端制造投资发展有限公司)",
    sector: "项目发包 / 园区投资开发",
    services: ["示范产业园区建设投资", "建设单位发包与投资监管", "全周期工程资产运营"],
    region: "全国 / 华东核心区",
    licenseNo: "MOCK-USCC-91110000A12345678",
    registeredCapital: "30 亿元人民币 (原型假数据)",
    reputationScore: "AAA 级国家示范投资主体 (DEMO)",
    description: "虚构国有资本投资控股集团，专注于高新制造示范园区与综合工程建设发包，累计依法持证发包重大项目 8 项 (DEMO)。",
    verificationLevel: "VERIFIED",
    isClaimed: false,
    followersCount: 1850,
    isFollowed: false,
    news: [
      { date: "2026-10-20", title: "示范园区三期高端装备基地完成阶段性投资审核", summary: "累计完成固定资产投资超 8 亿元，各工区受控良好。" }
    ]
  },
  {
    id: "ORG-B",
    slug: "demo-org-b",
    name: "Demo Organization B",
    fullName: "Demo Organization B (建筑工程总承包集团)",
    sector: "施工总承包业务 / 空间钢结构 (Mock)",
    services: ["EPC 工程施工总承包", "大跨度空间钢结构制造安装", "装配式重型工业厂房", "BIM 4D 施工协同与孪生交付"],
    region: "全国 / 重点深耕华东、大湾区",
    licenseNo: "MOCK-USCC-91110000B87654321",
    registeredCapital: "15 亿元人民币 (原型假数据)",
    reputationScore: "AAA 级国家示范工程总包 (DEMO)",
    description: "具备建筑工程施工总承包与大跨度空间钢结构等示范业务能力，承建各类特大型工业车间、机库、高铁站房与空间大跨度网架工程 (原型虚构能力，非国家真实许可)。",
    verificationLevel: "VERIFIED",
    isClaimed: false,
    followersCount: 3420,
    isFollowed: false,
    news: [
      { date: "2026-10-18", title: "DEMO Project P001 大跨度钢网架第 4 单元顺利顶升至设计标高", summary: "现场焊缝探伤合格率 100%，激光三维扫描偏差符合验评规范要求。" },
      { date: "2026-08-05", title: "中标 DEMO Project P003 临港重大装备总装厂房工程总承包标段", summary: "合同范围涵盖 72 米大跨度厂房与配套重载码头。" }
    ]
  },
  {
    id: "ORG-C",
    slug: "demo-org-c",
    name: "Demo Organization C",
    fullName: "Demo Organization C (工程规划勘察设计院)",
    sector: "工程勘察规划设计 / BIM 数字化咨询 (Mock)",
    services: ["空间大跨度结构抗震设计", "绿色低碳建筑数字化设计", "全阶段 BIM 数字化交付咨询", "复杂地质岩土工程勘察"],
    region: "全国 / 国际化工程咨询",
    licenseNo: "MOCK-USCC-91310000C33445566",
    registeredCapital: "2 亿元人民币 (原型假数据)",
    reputationScore: "卓越勘察设计创新领航机构 (DEMO)",
    description: "综合业务工程勘察规划设计院，主导编制多项工业建筑与空间结构数字化建模设计导则 (原型虚构能力，非国家真实许可)。",
    verificationLevel: "VERIFIED",
    isClaimed: false,
    followersCount: 2190,
    isFollowed: false,
    news: [
      { date: "2026-09-02", title: "发布工业厂房数字孪生正向设计技术白皮书 (Mock)", summary: "提出管线全息碰撞自适应优化算法，并在示范项目中成功应用。" }
    ]
  },
  {
    id: "ORG-D",
    slug: "demo-org-d",
    name: "Demo Organization D",
    fullName: "Demo Organization D (基础工程专业建筑公司)",
    sector: "地基与深基础工程专业业务 (Mock)",
    services: ["超深地下连续墙施工", "深基坑伺服支撑与止水帷幕", "预应力高强管桩与灌注桩", "复杂软弱持力层加固"],
    region: "华东 / 华南沿海地质区",
    licenseNo: "MOCK-USCC-91440000D99887766",
    registeredCapital: "8000 万元人民币 (原型假数据)",
    reputationScore: "基坑地基优质标杆履约方 (DEMO)",
    description: "专注复杂城市环境超深基坑、邻近既有交通线基坑受力微变形控制及地下工程施工 (原型假数据)。",
    verificationLevel: "VERIFIED",
    isClaimed: false,
    followersCount: 1470,
    isFollowed: false,
    news: [
      { date: "2025-11-20", title: "DEMO Project P002 地下连续墙与钢支撑受力监测保持稳定", summary: "最大水平变形受控在 18mm，通过专家组见证鉴定。" }
    ]
  },
  {
    id: "ORG-E",
    slug: "demo-org-e",
    name: "Demo Organization E",
    fullName: "Demo Organization E (机电动力科技安装工程公司)",
    sector: "建筑机电动力安装 / 洁净工程专业业务 (Mock)",
    services: ["高等级超净室 HVAC 空调动力系统", "特种高纯气体与纯水动力管路", "工业冷热源磁悬浮主机集成", "洁净室微振动阻尼系统"],
    region: "全国高新技术产业带",
    licenseNo: "MOCK-USCC-91320000E55667788",
    registeredCapital: "6000 万元人民币 (原型假数据)",
    reputationScore: "自述履约核查中 (DEMO)",
    description: "专注于微电子、半导体、精密仪器制造厂房的高性能机电管综与洁净微环境营造 (原型虚构能力，非国家真实许可)。",
    verificationLevel: "SELF_CLAIMED",
    isClaimed: false,
    followersCount: 980,
    isFollowed: false,
    news: [
      { date: "2026-09-02", title: "完成 DEMO Project P001 洁净机电管综碰撞优化专家评审", summary: "已提报分部自检报告，正申请建设方与监理双向背书。" }
    ]
  },
  {
    id: "ORG-F",
    slug: "demo-org-f",
    name: "Demo Organization F",
    fullName: "Demo Organization F (自动化工业生产装备集成商)",
    sector: "特种工业装备设备制造商",
    services: ["大吨位工业变频桥式起重行车", "微电子车间洁净无尘吊装设备", "自动化物流输送线机组集成"],
    region: "华东 / 华中装备产业区",
    licenseNo: "MOCK-USCC-91410000F11223344",
    registeredCapital: "1.2 亿元人民币 (原型假数据)",
    reputationScore: "AI 候选关联待确权 (DEMO)",
    description: "生产欧式低净空智能行车、超净防微尘吊装机组，相关采招数据由公开网络自动捕获 (原型假数据)。",
    verificationLevel: "AI_CANDIDATE",
    isClaimed: false,
    followersCount: 650,
    isFollowed: false,
    news: [
      { date: "2026-07-15", title: "参与 DEMO Project P001 起重设备采招竞标意向提报", summary: "技术规格书初审通过，待业主最终确认授标存证。" }
    ]
  },
  {
    id: "ORG-G",
    slug: "demo-org-g",
    name: "Demo Organization G",
    fullName: "Demo Organization G (工程质量监督监理咨询有限公司)",
    sector: "工程监理与质量见证业务 (Mock)",
    services: ["全过程工程建设监理与见证", "工程质量安全旁站与隐蔽验收", "合同投资履约审核与进度监控"],
    region: "全国主要重点工程区域",
    licenseNo: "MOCK-USCC-91120000G77889900",
    registeredCapital: "5000 万元人民币 (原型假数据)",
    reputationScore: "五星级公信监督监理机构 (DEMO)",
    description: "依据原型设计，行使施工质量安全与分部工程验收签章见证演示职责 (原型虚构机构，非国家真实行政法定职责)。",
    verificationLevel: "VERIFIED",
    isClaimed: false,
    followersCount: 1620,
    isFollowed: false,
    news: [
      { date: "2026-10-18", title: "签发 DEMO Project P001 第 4 单元钢网架顶升见证验收意见", summary: "复核全截面探伤与沉降变形观测，各项数据符合国家验评规范。" }
    ]
  },
  {
    id: "ORG-H",
    slug: "demo-org-h",
    name: "Demo Organization H",
    fullName: "Demo Organization H (钢结构科技制造实业集团)",
    sector: "空间钢结构制造加工 / 专业承包业务 (Mock)",
    services: ["双曲面空间管桁架智能数控加工", "装配式轻重钢结构构件工厂预拼", "大跨度螺栓球节点网架成套生产"],
    region: "华东 / 华北大型工业区",
    licenseNo: "MOCK-USCC-91330000H22334455",
    registeredCapital: "3.5 亿元人民币 (原型假数据)",
    reputationScore: "国家装配式钢结构制造基地 (DEMO)",
    description: "具备钢构制造产能，专注复杂大型会展馆、研发展示中心空间网架高精度工厂化制作 (原型虚构能力，非国家真实许可)。",
    verificationLevel: "SELF_CLAIMED",
    isClaimed: false,
    followersCount: 1150,
    isFollowed: false,
    news: [
      { date: "2026-01-15", title: "DEMO Project P005 装配式钢网架全部构件完成出厂自检", summary: "全批次合格证已在本地系统归档，交付现场拼装组装。" }
    ]
  }
];

export const PEOPLE_LIST = [
  {
    id: "ENG-01",
    slug: "demo-engineer-01",
    name: "Demo Engineer 01",
    title: "模拟高级建造师 / 施工总监 (演示角色)",
    orgId: "ORG-B",
    orgName: "Demo Organization B (建筑工程总承包集团)",
    regNumber: "MOCK-REG-CONST-001928",
    yearsOfExperience: 16,
    verificationBadge: "Mock 核验",
    verificationStatus: "VERIFIED",
    bio: "专注于大跨度空间钢结构高空液压同步顶升、重型装配式工业厂房综合施工组织与安全文明管理，历任多个标段现场总指挥示意 (原型假数据，无真实执业资格)。",
    skills: ["大跨度钢结构", "高空液压同步顶升", "BIM 4D 施工协同", "工程总承包现场指挥", "安全生产管理"],
    followersCount: 830,
    isFollowed: false
  },
  {
    id: "ENG-02",
    slug: "demo-engineer-02",
    name: "Demo Engineer 02",
    title: "模拟注册结构师 / 设计总监 (演示角色)",
    orgId: "ORG-C",
    orgName: "Demo Organization C (工程规划勘察设计院)",
    regNumber: "MOCK-REG-STR-004512",
    yearsOfExperience: 18,
    verificationBadge: "Mock 核验",
    verificationStatus: "VERIFIED",
    bio: "专注于高难复杂空间大跨度网架结构动力特性分析、风洞荷载模拟与数字化全生命周期图审建模，主持多项重大工业工程方案示意 (原型假数据，无真实执业资格)。",
    skills: ["结构抗震抗风设计", "复杂空间钢网架计算", "BIM 数字化正向出图", "数字孪生结构分析"],
    followersCount: 690,
    isFollowed: false
  },
  {
    id: "ENG-03",
    slug: "demo-engineer-03",
    name: "Demo Engineer 03",
    title: "机电安装工程师 / 项目经理 (演示角色)",
    orgId: "ORG-E",
    orgName: "Demo Organization E (机电动力科技安装工程公司)",
    regNumber: "MOCK-REG-MEP-002187",
    yearsOfExperience: 11,
    verificationBadge: "Mock 核验",
    verificationStatus: "SELF_CLAIMED",
    bio: "长期从事洁净室动力环境 HVAC 施工、纯水超纯气体管道系统与磁悬浮冷热源节能机房综合布设与调试示意 (原型假数据)。",
    skills: ["洁净室机电安装", "管线综合碰撞优化 (Navisworks)", "高精恒温恒湿空调调试", "洁净管路洁净焊接"],
    followersCount: 520,
    isFollowed: false
  },
  {
    id: "ENG-04",
    slug: "demo-engineer-04",
    name: "Demo Engineer 04",
    title: "模拟注册监理师 / 总监理工程师 (演示角色)",
    orgId: "ORG-G",
    orgName: "Demo Organization G (工程质量监督监理咨询有限公司)",
    regNumber: "MOCK-REG-SUP-007834",
    yearsOfExperience: 22,
    verificationBadge: "Mock 核验",
    verificationStatus: "VERIFIED",
    bio: "模拟工程监理角色，负责施工全过程旁站监督与工程质量验收示意 (虚构演示数据，无真实执业资格)。",
    skills: ["工程质量监理示意", "分部验收见证签章", "安全风险旁站管控", "多方合同履行监督"],
    followersCount: 910,
    isFollowed: false
  },
  {
    id: "ENG-05",
    slug: "demo-engineer-05",
    name: "Demo Engineer 05",
    title: "模拟岩土工程师 / 地基技术总监 (演示角色)",
    orgId: "ORG-D",
    orgName: "Demo Organization D (基础工程专业建筑公司)",
    regNumber: "MOCK-REG-GEO-003892",
    yearsOfExperience: 14,
    verificationBadge: "Mock 核验",
    verificationStatus: "VERIFIED",
    bio: "专精于沿海复杂软土地质深基坑连续墙、高层桩筏复合地基载荷试验与止水帷幕微变形监测分析示意 (原型假数据，无真实执业资格)。",
    skills: ["深基坑围护工程", "地下连续墙质量控制", "基坑微变形实时监测", "地基载荷检测验收"],
    followersCount: 470,
    isFollowed: false
  }
];

export const PARTICIPATIONS_LIST = [
  // P001 Participations
  {
    id: "PART-P001-01",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-A",
    workPackageId: "PKG-CL-01",
    workPackageName: "建设单位项目立项与法定发包统筹",
    role: "awarding",
    period: "2024-06 至 2027-06",
    deliverable: "完成立项核准批复、规划许可申报与施工总承包招投标法定授标",
    evidenceIds: ["EVD-P001-A01", "EVD-P001-001"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-02",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-B",
    workPackageId: "PKG-ST-02",
    workPackageName: "大跨度钢结构及屋面围护主体工程",
    role: "performance",
    period: "2025-05 至 2027-02",
    deliverable: "大跨度屋盖空间桁架现场加工拼装与高空液压同步提升，完成第 4 单元顶升",
    evidenceIds: ["EVD-P001-B01", "EVD-P001-089", "EVD-P001-077"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-03",
    projectId: "DEMO-PRJ-P001",
    personId: "ENG-01",
    orgId: "ORG-B",
    workPackageId: "PKG-ST-02",
    workPackageName: "大跨度钢结构标段项目总监兼建造师",
    role: "performance",
    period: "2025-05 至 2027-02",
    deliverable: "组织编制液压提升专项施工技术方案，现场签发高空顶升安全质量监控指令",
    evidenceIds: ["EVD-ENG-01", "EVD-P001-089"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-04",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-C",
    workPackageId: "PKG-DS-01",
    workPackageName: "勘察设计与全阶段 BIM 数字化咨询",
    role: "delivery",
    period: "2024-08 至 2025-04",
    deliverable: "提交全套施工图设计文件并通过数字化联合图审，交付正向 BIM 碰撞优化模型",
    evidenceIds: ["EVD-P001-C01", "EVD-P001-012"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-05",
    projectId: "DEMO-PRJ-P001",
    personId: "ENG-02",
    orgId: "ORG-C",
    workPackageId: "PKG-DS-01",
    workPackageName: "勘察设计总监兼结构专业负责人",
    role: "delivery",
    period: "2024-08 至 2025-04",
    deliverable: "主持完成大跨度结构抗震抗风设计与施工图设计文件，签署图审交付记录",
    evidenceIds: ["EVD-ENG-02", "EVD-P001-C01"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-06",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-D",
    workPackageId: "PKG-CV-01",
    workPackageName: "桩基工程与地下地基处理标段",
    role: "acceptance",
    period: "2024-09 至 2025-05",
    deliverable: "完成 1,420 根预应力管桩与钻孔灌注桩施工，通过桩身完整性及静载试验验收",
    evidenceIds: ["EVD-P001-D01"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-07",
    projectId: "DEMO-PRJ-P001",
    personId: "ENG-05",
    orgId: "ORG-D",
    workPackageId: "PKG-CV-01",
    workPackageName: "桩基工程地基技术负责人",
    role: "acceptance",
    period: "2024-09 至 2025-05",
    deliverable: "签署桩基承载力现场检测报告与分部工程联合质量验评表",
    evidenceIds: ["EVD-ENG-05", "EVD-P001-D01"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-08",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-E",
    workPackageId: "PKG-ME-03",
    workPackageName: "洁净厂房动力空调机电及管道安装",
    role: "performance",
    period: "2026-03 至 2027-03",
    deliverable: "完成机房深化管网碰撞优化，提交洁净空调风道与冷水主机进场安装报告",
    evidenceIds: ["EVD-P001-E01", "EVD-P001-072"],
    verificationLevel: "SELF_CLAIMED"
  },
  {
    id: "PART-P001-09",
    projectId: "DEMO-PRJ-P001",
    personId: "ENG-03",
    orgId: "ORG-E",
    workPackageId: "PKG-ME-03",
    workPackageName: "洁净机电专业项目经理",
    role: "performance",
    period: "2026-03 至 2027-03",
    deliverable: "组织编制 B1 区域机电管线综合碰撞优化模型并参与专家技术答辩",
    evidenceIds: ["EVD-ENG-03", "EVD-P001-072"],
    verificationLevel: "SELF_CLAIMED"
  },
  {
    id: "PART-P001-10",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-F",
    workPackageId: "PKG-EQ-04",
    workPackageName: "自动化工艺生产线机组供应与集成",
    role: "bidding",
    period: "2026-07 至 2026-10",
    deliverable: "公开采招设备候选供应商提报，完成变频起重机组技术参数预审",
    evidenceIds: ["EVD-P001-F01", "EVD-P001-055"],
    verificationLevel: "AI_CANDIDATE"
  },
  {
    id: "PART-P001-11",
    projectId: "DEMO-PRJ-P001",
    orgId: "ORG-G",
    workPackageId: "PKG-SV-01",
    workPackageName: "全过程质量安全监督与工程监理",
    role: "performance",
    period: "2024-08 至 2027-06",
    deliverable: "全过程工程监理旁站见证，签署第 4 单元钢结构提升与关键工序验收凭证",
    evidenceIds: ["EVD-P001-G01", "EVD-P001-089"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P001-12",
    projectId: "DEMO-PRJ-P001",
    personId: "ENG-04",
    orgId: "ORG-G",
    workPackageId: "PKG-SV-01",
    workPackageName: "总监理工程师",
    role: "performance",
    period: "2024-08 至 2027-06",
    deliverable: "审核并签发总承包专项施工组织方案与阶段性质量通报",
    evidenceIds: ["EVD-ENG-04", "EVD-P001-G01"],
    verificationLevel: "VERIFIED"
  },

  // P002 Participations
  {
    id: "PART-P002-01",
    projectId: "DEMO-PRJ-P002",
    orgId: "ORG-D",
    workPackageId: "PKG-CV-02",
    workPackageName: "地下连续墙与基坑围护工程标段",
    role: "performance",
    period: "2025-03 至 2026-12",
    deliverable: "完成 1200mm 厚深地连墙成槽灌注与第 1、2 道伺服钢支撑受力监测",
    evidenceIds: ["EVD-P002-001", "EVD-P002-002"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P002-02",
    projectId: "DEMO-PRJ-P002",
    personId: "ENG-05",
    orgId: "ORG-D",
    workPackageId: "PKG-CV-02",
    workPackageName: "深基坑技术总监",
    role: "performance",
    period: "2025-03 至 2026-12",
    deliverable: "主持深基坑自动化受力位移监控系统运行并签署阶段安全评估报告",
    evidenceIds: ["EVD-ENG-05", "EVD-P002-002"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P002-03",
    projectId: "DEMO-PRJ-P002",
    orgId: "ORG-B",
    workPackageId: "PKG-ST-02",
    workPackageName: "地下主体结构土建总承包标段",
    role: "awarding",
    period: "2025-04 至 2028-10",
    deliverable: "中标地下枢纽土建主体结构施工总承包并完成前期施工组织策划",
    evidenceIds: ["EVD-P002-001"],
    verificationLevel: "VERIFIED"
  },

  // P003 Participations
  {
    id: "PART-P003-01",
    projectId: "DEMO-PRJ-P003",
    orgId: "ORG-B",
    workPackageId: "PKG-ST-03",
    workPackageName: "临港总装车间与配套码头总承包",
    role: "awarding",
    period: "2025-08 至 2027-12",
    deliverable: "EPC 施工总承包联合体中标与工程实施总策划",
    evidenceIds: ["EVD-P003-001"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P003-02",
    projectId: "DEMO-PRJ-P003",
    personId: "ENG-01",
    orgId: "ORG-B",
    workPackageId: "PKG-ST-03",
    workPackageName: "临港项目部执行总监",
    role: "performance",
    period: "2025-08 至 2027-12",
    deliverable: "组织 72 米大跨度空间桁架高空拼装吊装技术交底与进场准备",
    evidenceIds: ["EVD-ENG-01", "EVD-P003-001"],
    verificationLevel: "VERIFIED"
  },

  // P004 Participations
  {
    id: "PART-P004-01",
    projectId: "DEMO-PRJ-P004",
    orgId: "ORG-E",
    workPackageId: "PKG-ME-04",
    workPackageName: "微电子超净车间动力机电工程",
    role: "performance",
    period: "2025-09 至 2027-06",
    deliverable: "完成超净微环境动力管综数字化深化设计并通过技术审查",
    evidenceIds: ["EVD-P004-001", "EVD-P004-002"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P004-02",
    projectId: "DEMO-PRJ-P004",
    personId: "ENG-03",
    orgId: "ORG-E",
    workPackageId: "PKG-ME-04",
    workPackageName: "超净机电执行技术经理",
    role: "performance",
    period: "2025-09 至 2027-06",
    deliverable: "主持磁悬浮冷水机组与高效净化送风单元现场进场开箱核验",
    evidenceIds: ["EVD-ENG-03", "EVD-P004-002"],
    verificationLevel: "VERIFIED"
  },

  // P005 Participations
  {
    id: "PART-P005-01",
    projectId: "DEMO-PRJ-P005",
    orgId: "ORG-H",
    workPackageId: "PKG-ST-05",
    workPackageName: "装配式双曲面空间钢网架制作安装",
    role: "delivery",
    period: "2024-05 至 2026-01",
    deliverable: "按期交付全部螺栓球节点网架加工成品，通过工厂出厂检测自验",
    evidenceIds: ["EVD-P005-001"],
    verificationLevel: "SELF_CLAIMED"
  },

  // P006 Participations
  {
    id: "PART-P006-01",
    projectId: "DEMO-PRJ-P006",
    orgId: "ORG-B",
    workPackageId: "PKG-MR-02",
    workPackageName: "智慧堆场重载道路与轨道施工标段",
    role: "performance",
    period: "2025-04 至 2026-11",
    deliverable: "完成 45 吨轮压重载水稳基底浇筑施工并通过质检合格鉴定",
    evidenceIds: ["EVD-P006-001"],
    verificationLevel: "VERIFIED"
  },

  // P007 Participations
  {
    id: "PART-P007-01",
    projectId: "DEMO-PRJ-P007",
    orgId: "ORG-E",
    workPackageId: "PKG-NE-01",
    workPackageName: "绿电氢能深冷储运压力管道标段",
    role: "bidding",
    period: "2026-03 至 2026-09",
    deliverable: "提报压力容器安装施工资格预审并完成特种设备检验许可备案",
    evidenceIds: ["EVD-P007-001"],
    verificationLevel: "VERIFIED"
  },

  // P008 Participations
  {
    id: "PART-P008-01",
    projectId: "DEMO-PRJ-P008",
    orgId: "ORG-B",
    workPackageId: "PKG-BR-01",
    workPackageName: "特大跨径斜拉桥主塔与钢箱梁标段",
    role: "performance",
    period: "2024-02 至 2027-10",
    deliverable: "完成 260 米主塔索鞍高空就位毫米级激光测控与斜拉索挂设验收",
    evidenceIds: ["EVD-P008-001"],
    verificationLevel: "VERIFIED"
  },
  {
    id: "PART-P008-02",
    projectId: "DEMO-PRJ-P008",
    personId: "ENG-01",
    orgId: "ORG-B",
    workPackageId: "PKG-BR-01",
    workPackageName: "桥梁高空结构施工指挥长",
    role: "performance",
    period: "2024-02 至 2027-10",
    deliverable: "现场组织主塔索鞍千吨级吊装姿态调整与安全见证签认",
    evidenceIds: ["EVD-ENG-01", "EVD-P008-001"],
    verificationLevel: "VERIFIED"
  }
];

export const POSTS_LIST = [
  {
    id: "POST-001",
    type: "MILESTONE",
    feedCategory: "site",
    authorType: "org",
    authorId: "ORG-B",
    authorName: "Demo Organization B (建筑工程总承包集团)",
    authorTitle: "EPC 施工总承包示范方 (Mock) · 示范工程牵头方",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
    channel: "工业建筑",
    tags: ["现场", "顶升工法", "钢网架", "激光对齐"],
    title: "【工程里程碑】DEMO Project P001 大跨度钢网架第 4 单元高空顶升圆满成功！",
    content: "今日现场 24 台数字液压千斤顶同步动作，历时 8 小时将重达 680 吨的空间桁架平稳提升至 28.5 米设计标高。经监理机构 Demo Organization G 与施工总监 Demo Engineer 01 联合激光扫描复核，轴线偏差在 2mm 以内，全截面焊缝探伤合格率 100%！",
    illustrationTemplateId: "tpl-prj-01",
    timeAgo: "2 小时前",
    likes: 128,
    comments: [
      { id: "c1", authorName: "Demo Engineer 02", authorTitle: "模拟结构师 (演示角色)", text: "祝贺现场团队！设计阶段对该提升单元进行的瞬态风荷载响应仿真完全受控。", timeAgo: "1小时前" },
      { id: "c2", authorName: "Demo Organization A", authorTitle: "建设单位", text: "向总包与监理现场全体工程师致敬，关键节点受控为年底封闭施工打下坚实基础。", timeAgo: "30分钟前" }
    ],
    shares: 42,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P001-089",
    isMock: true
  },
  {
    id: "POST-002",
    type: "EXPERT_INSIGHT",
    feedCategory: "people",
    authorType: "person",
    authorId: "ENG-01",
    authorName: "Demo Engineer 01",
    authorTitle: "施工总监 / 模拟建造师 (Demo Org B)",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001 (示范厂房)",
    channel: "工业建筑",
    tags: ["人物", "总监手记", "危大工况", "履约雷达"],
    title: "【工程手记】大跨度工业厂房钢结构超高提升现场组织之关键控制点",
    content: "重型空间网架液压同步提升不仅考验设备的微米级位移传感控制，更关键在于多提升吊点反力不均匀系数的实时动载纠偏。在 P001 现场，我们通过布置三维光纤光栅应变计，实时将应力数据回传至 BIM 4D 数字孪生指挥舱，实现了“提升-监测-微调”毫秒级闭环响应。",
    illustrationTemplateId: "tpl-peo-01",
    timeAgo: "5 小时前",
    likes: 95,
    comments: [
      { id: "c3", authorName: "Demo Engineer 04", authorTitle: "总监理工程师 (演示角色)", text: "旁站监理全过程见证，光纤传感监测曲线与理论受力模型契合度极高，值得推广。", timeAgo: "3小时前" }
    ],
    shares: 31,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-ENG-01",
    isMock: true
  },
  {
    id: "POST-003",
    type: "COMPANY_UPDATE",
    feedCategory: "technical",
    authorType: "org",
    authorId: "ORG-C",
    authorName: "Demo Organization C (工程规划勘察设计院)",
    authorTitle: "工程勘察设计综合业务 (Mock) · BIM 数字化咨询",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001 (示范厂房)",
    channel: "工业建筑",
    tags: ["技术", "正向设计", "碰撞消解", "图审"],
    title: "【数字化实践】基于正向设计理念的全专业施工图图审交付总结",
    content: "在 DEMO Project P001 的方案深化阶段，我院数字化团队采用正向全专业协同，提前消除了机电管线与重型柱梁碰撞点 1,240 处，实现了勘察设计成果一次性通过数字化联合图审平台认证。",
    illustrationTemplateId: "tpl-com-02",
    timeAgo: "1 天前",
    likes: 76,
    comments: [],
    shares: 18,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P001-C01",
    isMock: true
  },
  {
    id: "POST-004",
    type: "MILESTONE",
    feedCategory: "site",
    authorType: "org",
    authorId: "ORG-D",
    authorName: "Demo Organization D (基础工程专业建筑公司)",
    authorTitle: "地基基础专业施工业务 (Mock)",
    projectId: "DEMO-PRJ-P002",
    projectName: "DEMO Project P002: 超大型深基坑与地下交通枢纽综合体工程",
    channel: "土木市政",
    tags: ["现场", "深基坑", "伺服支撑", "位移监测"],
    title: "【基坑前沿】P002 城市地下枢纽 32 米深基坑地连墙与第二道钢支撑受力稳定",
    content: "最新沉降与深层水平位移监测报告显示，邻近地铁隧道一侧地连墙深层侧向位移累计为 14.2mm，远低于 25mm 的设计警戒值。预应力伺服钢支撑轴力补偿系统运行良好，确保了周边重要市政基础设施安全运行。",
    illustrationTemplateId: "tpl-prj-02",
    timeAgo: "2 天前",
    likes: 84,
    comments: [
      { id: "c4", authorName: "Demo Engineer 05", authorTitle: "地基工程技术负责人 (演示角色)", text: "伺服支撑智能补压系统起到了决定性支撑作用，下周将开展第三层土方开挖交底。", timeAgo: "1天前" }
    ],
    shares: 25,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P002-002",
    isMock: true
  },
  {
    id: "POST-005",
    type: "EXPERT_INSIGHT",
    feedCategory: "technical",
    authorType: "person",
    authorId: "ENG-03",
    authorName: "Demo Engineer 03",
    authorTitle: "机电安装技术总监 / 项目经理 (演示角色 / Mock)",
    projectId: "DEMO-PRJ-P004",
    projectName: "DEMO Project P004: 高新微电子洁净厂房与机电动力中心",
    channel: "动力机电",
    tags: ["技术", "超洁净室", "微振控制", "阻尼隔振"],
    title: "【机电技术】高科技工业超净车间微振动控制与动力管道抗微震支吊架选型",
    content: "随着纳米级微电子工艺对环境振动容许值的严苛要求（VC-E / VC-G 准则），动力管道的水锤效应与冷冻水泵微振动控制成为机电施工第一难点。我们在 DEMO Project P004 中运用空气弹簧隔振基座与三维黏滞阻尼器，成功将车间地表振速控制在 3μm/s 以内。",
    illustrationTemplateId: "tpl-prj-04",
    timeAgo: "3 天前",
    likes: 112,
    comments: [],
    shares: 38,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P004-001",
    isMock: true
  },
  {
    id: "POST-006",
    type: "COMPANY_UPDATE",
    feedCategory: "project",
    authorType: "org",
    authorId: "ORG-B",
    authorName: "Demo Organization B (建筑工程总承包集团)",
    authorTitle: "EPC 施工总承包示范方 (Mock)",
    projectId: "DEMO-PRJ-P003",
    projectName: "DEMO Project P003: 临港重大重型装备总装厂房及配套码头",
    channel: "工业建筑",
    tags: ["项目", "装配式", "大跨度", "总承包中标"],
    title: "【经营喜讯】成功中标 DEMO Project P003 临港特大跨度总装车间工程总承包",
    content: "感谢业主 Demo Organization A 的信任。本项目集单跨 72 米大跨度厂房与专用重型海运码头于一体，我集团将派出具备多项国家级优质工程业绩的核心团队，确保优质履约。",
    illustrationTemplateId: "tpl-prj-03",
    timeAgo: "4 天前",
    likes: 156,
    comments: [],
    shares: 55,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P003-001",
    isMock: true
  },
  {
    id: "POST-007",
    type: "NEWS",
    feedCategory: "news",
    authorType: "org",
    authorId: "ORG-A",
    authorName: "Demo Organization A (高端制造投资发展有限公司)",
    authorTitle: "建设单位 / 业主发包方 (Owner / Client)",
    projectId: "DEMO-PRJ-P006",
    projectName: "DEMO Project P006: 绿色低碳循环产业园装配式生产基地",
    channel: "新能源工程",
    tags: ["新闻", "政策细则", "BIPV屋面", "低碳补贴"],
    title: "【产业观察】高新区装配式低碳厂房绿色建造补贴与 BIPV 屋面验收细则出台",
    content: "园区管委会今日正式印发支持先进制造业工业厂房绿色建造专项扶持细则，对装配率超过 65% 且屋面光伏覆盖率达标的工业建筑工程给予最高 15% 的财税贴息与绿色通道审批支持。",
    illustrationTemplateId: "tpl-new-01",
    timeAgo: "5 天前",
    likes: 142,
    comments: [
      { id: "c5", authorName: "Demo Engineer 01", authorTitle: "施工总监", text: "这对推进工业厂房装配化施工和绿色智能施工技术推广具有重大政策引导意义。", timeAgo: "4天前" }
    ],
    shares: 63,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P006-001",
    isMock: true
  },
  {
    id: "POST-008",
    type: "EXPERT_INSIGHT",
    feedCategory: "technical",
    authorType: "person",
    authorId: "ENG-02",
    authorName: "Demo Engineer 02",
    authorTitle: "模拟一级注册结构工程师 (演示角色)",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001 (示范厂房)",
    channel: "工业建筑",
    tags: ["技术", "总工验算", "屈曲分析", "有限元"],
    title: "【总工验算】超大跨度空间钢网架提升过程瞬态动力屈曲安全储备复核",
    content: "针对提升工况下的非线性几何大变形，我利用空间有限元模型开展了多阶屈曲模态计算，第一阶屈曲临界荷载系数达到 4.82，远高于设计规范要求的 3.0。提升吊点处附加加劲肋后应力峰值受控在 248.5 MPa。",
    illustrationTemplateId: "tpl-peo-02",
    timeAgo: "6 天前",
    likes: 98,
    comments: [],
    shares: 29,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-ENG-02",
    isMock: true
  },
  {
    id: "POST-009",
    type: "MILESTONE",
    feedCategory: "site",
    authorType: "org",
    authorId: "ORG-B",
    authorName: "Demo Organization B (建筑工程总承包集团)",
    authorTitle: "EPC 施工总承包示范方 (Mock)",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
    channel: "工业建筑",
    tags: ["现场", "重型起重", "履带吊", "设备就位"],
    title: "【现场快讯】1600 吨特重型履带起重机完成 P001 跨间大型生产机组吊装",
    content: "主臂 96 米工况下，历经 3 小时微动试吊与平稳回转，单件重达 420 吨的重型压铸机核心主机精准落位至抗微震设备基台上，就位定位偏差仅 1.2mm。",
    illustrationTemplateId: "tpl-new-02",
    timeAgo: "1 周前",
    likes: 187,
    comments: [
      { id: "c6", authorName: "Demo Engineer 04", authorTitle: "总监理工程师", text: "现场地耐力监测与索具受力传感器全程受控，吊装过程合规闭环。", timeAgo: "6天前" }
    ],
    shares: 72,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P001-089",
    isMock: true
  },
  {
    id: "POST-010",
    type: "TECHNICAL",
    feedCategory: "technical",
    authorType: "org",
    authorId: "ORG-E",
    authorName: "Demo Organization E (工业动力与洁净机电专业公司)",
    authorTitle: "工业动力安装分包业务 (Mock)",
    projectId: "DEMO-PRJ-P004",
    projectName: "DEMO Project P004: 高新微电子洁净厂房与机电动力中心",
    channel: "动力机电",
    tags: ["技术", "微振动隔振器", "空气弹簧", "压差梯度"],
    title: "【工法图解】精密制造洁净厂房空气弹簧主动防微振基座安装调平技术",
    content: "超净室对来自外部道路车辆与内部风机振动的隔离率要求极高。本工艺采用双腔空气弹簧配合黏滞流体阻尼器，通过激光水平仪四点微调注气，实现了基台固有频率降至 1.1Hz 以下的卓越指标。",
    illustrationTemplateId: "tpl-tec-03",
    timeAgo: "1 周前",
    likes: 135,
    comments: [],
    shares: 44,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P004-002",
    isMock: true
  },
  {
    id: "POST-011",
    type: "EXPERT_INSIGHT",
    feedCategory: "people",
    authorType: "person",
    authorId: "ENG-04",
    authorName: "Demo Engineer 04",
    authorTitle: "总监理工程师 (演示角色)",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
    channel: "工业建筑",
    tags: ["人物", "旁站监理", "实测实量", "全息存证"],
    title: "【监理笔记】危大工程隐蔽验收中“全息旁站”与数字签章的实践闭环",
    content: "在网架顶升与焊缝探伤的关键 48 小时内，监理项目部实行双人双岗旁站巡检，实时对照超声探伤仪 A 扫波形记录，所有签证表格均加盖国家数字证书中心认证的执业印章，为工程质量保驾护航。",
    illustrationTemplateId: "tpl-peo-04",
    timeAgo: "1 周前",
    likes: 89,
    comments: [],
    shares: 21,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-ENG-04",
    isMock: true
  },
  {
    id: "POST-012",
    type: "COMPANY_UPDATE",
    feedCategory: "project",
    authorType: "org",
    authorId: "ORG-G",
    authorName: "Demo Organization G (工程质量安全检测咨询集团)",
    authorTitle: "工程监理与质量检验综合业务 (Mock)",
    projectId: "DEMO-PRJ-P001",
    projectName: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
    channel: "工业建筑",
    tags: ["项目", "四方法律关系", "工程协作链", "数字公报"],
    title: "【公报发布】DEMO Project P001 参建四方联合数字质量公报 (第 12 期)",
    content: "业主、总包、专业分包与独立监理联合签署并发布第 12 期履约质量月报。累计完成质量验评单元 184 项，合格率 100%，关键材料溯源码 100% 录入存证链条，履约风险等级评定为低风险(绿色)。",
    illustrationTemplateId: "tpl-rel-01",
    timeAgo: "2 周前",
    likes: 104,
    comments: [],
    shares: 33,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P001-G01",
    isMock: true
  },
  {
    id: "POST-013",
    type: "NEWS",
    feedCategory: "news",
    authorType: "org",
    authorId: "ORG-B",
    authorName: "Demo Organization B (建筑工程总承包集团)",
    authorTitle: "EPC 施工总承包示范方 (Mock)",
    projectId: "DEMO-PRJ-P007",
    projectName: "DEMO Project P007: 绿电智能制造装备产业园示范工程",
    channel: "新能源工程",
    tags: ["新闻", "大宗指数", "特厚钢板", "供应链"],
    title: "【供应链前沿】四季度特厚工业结构钢板现货走势与钢厂轧制交期监测",
    content: "随着沿海多处高端工业总装基地的密集开工，Q355NH 耐候钢及 Z 向抗层状撕裂特厚板需求旺盛。本月重点钢厂排产周期延长至 38 天，建议各项目部提前 45 天锁定原材轧制计划并做好见证取样准备。",
    illustrationTemplateId: "tpl-new-03",
    timeAgo: "2 周前",
    likes: 122,
    comments: [],
    shares: 48,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-P007-001",
    isMock: true
  },
  {
    id: "POST-014",
    type: "MILESTONE",
    feedCategory: "site",
    authorType: "person",
    authorId: "ENG-05",
    authorName: "Demo Engineer 05",
    authorTitle: "地基工程技术负责人 (演示角色)",
    projectId: "DEMO-PRJ-P002",
    projectName: "DEMO Project P002: 超大型深基坑与地下交通枢纽综合体工程",
    channel: "土木市政",
    tags: ["现场", "伺服支撑", "轴力自适应", "地连墙"],
    title: "【现场实测】P002 深基坑第三层土方开挖阶段伺服支撑轴力自适应调节分析",
    content: "今日凌晨气温骤降 8℃，坑内钢支撑温度应力收缩明显。智能伺服液压泵站自动启动补压脉冲，维持预应力稳定在 4600kN，地连墙变形增量成功控制在 0.4mm 以内，基坑安全态势良好。",
    illustrationTemplateId: "tpl-tec-02",
    timeAgo: "2 周前",
    likes: 91,
    comments: [],
    shares: 26,
    isLiked: false,
    isSaved: false,
    evidenceId: "EVD-ENG-05",
    isMock: true
  }
];

export const SEARCH_PRESETS = [
  {
    id: "preset-1",
    query: "做过工业厂房钢结构的企业",
    targetType: "company",
    summary: "匹配在工业厂房、大跨度空间钢结构领域具备演示能力、总包履约业绩及示意存证的企业与关联工程",
    whyMatched: "图谱推理与多源证据链：Demo Organization B 承担 DEMO Project P001 PKG-ST-02 大跨度钢结构主体工程 (履约中)，已核验完成第 4 单元高空顶升 (存证 EVD-P001-089)；示意具备钢结构总承包履约与大跨度网架施工能力；关联企业 Demo Organization H 具备空间网架加工制造示意能力 (虚构模拟)。",
    matchedEntities: [
      {
        id: "ORG-B",
        type: "company",
        name: "Demo Organization B (建筑工程总承包集团)",
        badge: "模拟核验 · 总包履约中",
        route: "/companies/demo-org-b",
        evidenceId: "EVD-P001-089",
        relationSnippet: "DEMO Project P001 PKG-ST-02 钢结构标段总承包方，已完成大跨度网架提升核验"
      },
      {
        id: "DEMO-PRJ-P001",
        type: "project",
        name: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
        badge: "在建履约 · 工业建筑",
        route: "/projects/p001",
        evidenceId: "EVD-P001-089",
        relationSnippet: "工业建筑标杆示范厂房，涵盖大跨度重型门式钢架与屋面网架提升"
      },
      {
        id: "ORG-H",
        type: "company",
        name: "Demo Organization H (钢结构科技制造实业集团)",
        badge: "自述存证 · 专业加工",
        route: "/companies/demo-org-h",
        evidenceId: "EVD-P005-001",
        relationSnippet: "DEMO Project P005 空间网架制造单位，具备双曲面管桁架加工示意能力"
      }
    ]
  },
  {
    id: "preset-2",
    query: "有洁净室机电经验的工程师",
    targetType: "person",
    summary: "检索在洁净厂房、恒温恒湿动力机电系统具备工程经历、BIM 深化及现场管理记录的演示工程师",
    whyMatched: "图谱推理与多源证据链：Demo Engineer 03 挂靠 Demo Organization E，在 DEMO Project P001 中担任 PKG-ME-03 洁净厂房动力机电安装执行经理，主持完成 B1 区域微环境机电管线综合碰撞优化技术评审 (存证 EVD-P001-072)；并在 DEMO Project P004 微电子工程中负责超净冷热源机组开箱验收。",
    matchedEntities: [
      {
        id: "ENG-03",
        type: "person",
        name: "Demo Engineer 03 (机电工程师 / 项目经理)",
        badge: "Mock 核验 · 机电专家",
        route: "/people/demo-engineer-03",
        evidenceId: "EVD-P001-072",
        relationSnippet: "主持 DEMO Project P001 洁净机电管综评审与 DEMO Project P004 净化设备验收"
      },
      {
        id: "ORG-E",
        type: "company",
        name: "Demo Organization E (机电动力科技安装工程公司)",
        badge: "自述履约中",
        route: "/companies/demo-org-e",
        evidenceId: "EVD-P001-072",
        relationSnippet: "专业承接高等级洁净室 HVAC 空调动力与高纯介质管网工程"
      },
      {
        id: "DEMO-PRJ-P004",
        type: "project",
        name: "DEMO Project P004: 高新微电子洁净厂房与机电动力中心",
        badge: "动力机电在建",
        route: "/projects/p004",
        evidenceId: "EVD-P004-001",
        relationSnippet: "高等级微电子超净车间，包含百级洁净微环境示意设计"
      }
    ]
  },
  {
    id: "preset-3",
    query: "华东在建工业项目",
    targetType: "project",
    summary: "筛选区位位于中国华东地区、行业分类属于工业建筑且处于施工建造或履约阶段的核心工程条目",
    whyMatched: "图谱推理与多源证据链：DEMO Project P001 地理区位为华东示范高新区，行业类别为工业建筑，当前阶段处于施工建造履约中 (存证 EVD-P001-001 / EVD-P001-B01)；DEMO Project P004 位于华东示范高新区微电子园，处于动力机电施工阶段。",
    matchedEntities: [
      {
        id: "DEMO-PRJ-P001",
        type: "project",
        name: "DEMO Project P001: 智能高端装备制造基地示范厂房工程",
        badge: "华东 · 工业建筑 · 在建",
        route: "/projects/p001",
        evidenceId: "EVD-P001-001",
        relationSnippet: "华东重点高端装备制造基地示范厂房，总投资约 12.8 亿元"
      },
      {
        id: "DEMO-PRJ-P004",
        type: "project",
        name: "DEMO Project P004: 高新微电子洁净厂房与机电动力中心",
        badge: "华东 · 动力机电 · 在建",
        route: "/projects/p004",
        evidenceId: "EVD-P004-001",
        relationSnippet: "华东高新微电子产业岛核心洁净厂房项目，总投资约 31.0 亿元"
      }
    ]
  }
];

// Attach unified models to PROJECT_DATA
PROJECT_DATA.projects = PROJECTS_LIST;
PROJECT_DATA.companies = COMPANIES_LIST;
PROJECT_DATA.people = PEOPLE_LIST;
PROJECT_DATA.participations = PARTICIPATIONS_LIST;
PROJECT_DATA.posts = POSTS_LIST;
PROJECT_DATA.searchPresets = SEARCH_PRESETS;

// Derivation Helpers
export function getCompanyParticipations(orgId) {
  const normId = normalizeOrgId(orgId);
  return PARTICIPATIONS_LIST.filter(p => p.orgId === normId).map(p => {
    const proj = PROJECTS_LIST.find(pr => pr.id === p.projectId) || {};
    return {
      ...p,
      evidenceId: (p.evidenceIds && p.evidenceIds[0]) || p.evidenceId || '',
      projectName: proj.name || p.projectId,
      projectCode: proj.code || '',
      projectSector: proj.sector || '',
      projectStatus: proj.status || '',
      projectLocation: proj.location || '',
    };
  });
}

export function getPersonParticipations(personId) {
  const normId = normalizePersonId(personId);
  return PARTICIPATIONS_LIST.filter(p => p.personId === normId).map(p => {
    const proj = PROJECTS_LIST.find(pr => pr.id === p.projectId) || {};
    return {
      ...p,
      evidenceId: (p.evidenceIds && p.evidenceIds[0]) || p.evidenceId || '',
      projectName: proj.name || p.projectId,
      projectCode: proj.code || '',
      projectSector: proj.sector || '',
      projectStatus: proj.status || '',
      projectLocation: proj.location || '',
    };
  });
}

export function getProjectParticipations(projectId) {
  const normId = normalizeProjectId(projectId);
  return PARTICIPATIONS_LIST.filter(p => p.projectId === normId).map(p => {
    const org = COMPANIES_LIST.find(o => o.id === p.orgId);
    const person = PEOPLE_LIST.find(pe => pe.id === p.personId);
    return {
      ...p,
      evidenceId: (p.evidenceIds && p.evidenceIds[0]) || p.evidenceId || '',
      orgName: org ? org.name : (p.orgId || ''),
      orgFullName: org ? org.fullName : '',
      personName: person ? person.name : (p.personId || ''),
      personTitle: person ? person.title : '',
    };
  });
}

export function getProjectById(projectId) {
  const normId = normalizeProjectId(projectId);
  return PROJECTS_LIST.find(p => p.id === normId || p.code.toLowerCase() === normId.toLowerCase());
}

export function getCompanyById(orgId) {
  const normId = normalizeOrgId(orgId);
  return COMPANIES_LIST.find(c => c.id === normId || c.slug === normId.toLowerCase());
}

export function getPersonById(personId) {
  const normId = normalizePersonId(personId);
  return PEOPLE_LIST.find(p => p.id === normId || p.slug === normId.toLowerCase());
}

export function normalizeOrgId(param) {
  if (!param) return '';
  const s = String(param).trim().toLowerCase();
  if (s.startsWith('demo-org-')) {
    const letter = s.replace('demo-org-', '').toUpperCase();
    return `ORG-${letter}`;
  }
  return s.toUpperCase();
}

export function normalizePersonId(param) {
  if (!param) return '';
  const s = String(param).trim().toLowerCase();
  if (s.startsWith('demo-engineer-')) {
    const num = s.replace('demo-engineer-', '');
    return `ENG-${num}`;
  }
  return s.toUpperCase();
}

export function normalizeProjectId(param) {
  if (!param) return 'DEMO-PRJ-P001';
  const s = String(param).trim().toLowerCase();
  if (/^p00[1-8]$/i.test(s)) {
    return `DEMO-PRJ-${s.toUpperCase()}`;
  }
  return s.toUpperCase();
}

/**
 * Resolves unified author profile contract for mock demonstration roles
 * Used across ComposeModal, FeedPage comments, and author badge rendering
 */
export function resolveAuthorProfile(roleId, locale = 'zh') {
  const entity = canonicalEntity(typeof roleId === 'string' ? roleId : roleId?.id);
  if (entity) return {
    roleId: entity.id, authorId: entity.id, authorName: entity.name,
    authorTitle: entity.title || entity.role, authorType: ORGANIZATIONS[entity.id] ? 'org' : 'person',
    isGuest: false, entityRoute: `/${ORGANIZATIONS[entity.id] ? 'companies' : 'people'}/${entity.id.toLowerCase()}`,
  };
  return { roleId: 'GUEST', authorId: 'GUEST', authorName: 'Local Visitor (Mock)', authorTitle: 'Public Observer (Mock)', authorType: 'guest', isGuest: true, entityRoute: null };
}

// Reconcile identity projections. Participation roles remain relation attributes.
function reconcileIdentity(value) {
 if (!value || typeof value !== 'object') return;
 if (Array.isArray(value)) { value.forEach(reconcileIdentity); return; }
 const identity = canonicalEntity(value.id);
 if (identity) {
  Object.assign(value, identity);
  const primary = (ORGANIZATIONS[identity.id] ? COMPANIES_LIST : PEOPLE_LIST).find(item => item.id === identity.id);
  for (const field of ['licenseNo', 'regNumber', 'registeredCapital']) if (primary?.[field]) value[field] = primary[field];
 }
 if (value.authorId) {
  const author = canonicalEntity(value.authorId);
  if (author) { value.authorId = author.id; value.authorName = author.name; value.authorTitle = author.title || author.role; }
 }
 if (value.orgId && ORGANIZATIONS[value.orgId] && 'orgName' in value) value.orgName = ORGANIZATIONS[value.orgId].name;
 Object.values(value).forEach(reconcileIdentity);
}
reconcileIdentity(PROJECT_DATA);
