/**
 * 36 PARAMETRIZED ENGINEERING ILLUSTRATION TEMPLATES
 * 
 * Category distribution (per brief):
 * - Project: 8 (tpl-prj-01 ~ tpl-prj-08)
 * - Company: 6 (tpl-com-01 ~ tpl-com-06)
 * - People: 5 (tpl-peo-01 ~ tpl-peo-05)
 * - News: 7 (tpl-new-01 ~ tpl-new-07)
 * - Technical: 6 (tpl-tec-01 ~ tpl-tec-06)
 * - Relationship: 4 (tpl-rel-01 ~ tpl-rel-04)
 * Total = 36 templates
 * 
 * Supported ratios: 16:9, 4:3, 1:1, 4:5
 * Every media object strictly satisfies: source, rights, usage, alt, isFictional
 */

export const ILLUSTRATION_CATEGORIES = [
  { id: 'all', label: '全部图解' },
  { id: 'project', label: '项目工程 (8)' },
  { id: 'company', label: '参建企业 (6)' },
  { id: 'people', label: '工程人员 (5)' },
  { id: 'news', label: '行业要闻 (7)' },
  { id: 'technical', label: '技术工法 (6)' },
  { id: 'relationship', label: '履约关系 (4)' },
];

export const ILLUSTRATION_TEMPLATES = {
  // ================= 1. PROJECT (8) =================
  'tpl-prj-01': {
    id: 'tpl-prj-01',
    category: 'project',
    ratio: '16:9',
    title: '空间网架大跨度液压同步顶升立面剖面图',
    subtitle: 'DEMO Project P001 · 680t 桁架 + 24 组行程微控千斤顶',
    tag: '工法剖面',
    aspectLabel: '16:9 横屏剖面',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '大跨度空间网架液压同步顶升三维剖面图示，标注提升吊点、行程传感器与反力支架',
      isFictional: true
    }
  },
  'tpl-prj-02': {
    id: 'tpl-prj-02',
    category: 'project',
    ratio: '4:3',
    title: '超深基坑多道智能伺服钢支撑受力剖面',
    subtitle: 'DEMO Project P002 · 32m 临地铁深基坑三维支护体',
    tag: '深基坑工程',
    aspectLabel: '4:3 标准立面',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '32米深基坑地连墙与四道预应力伺服钢支撑受力平衡剖面',
      isFictional: true
    }
  },
  'tpl-prj-03': {
    id: 'tpl-prj-03',
    category: 'project',
    ratio: '1:1',
    title: '模块化重型装配式梁柱节点构造详图',
    subtitle: 'DEMO Project P003 · 高强螺栓与全熔透角焊缝节点',
    tag: '节点详图',
    aspectLabel: '1:1 方形大图',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '箱型截面刚接柱梁连接节点局部轴测三维详图',
      isFictional: true
    }
  },
  'tpl-prj-04': {
    id: 'tpl-prj-04',
    category: 'project',
    ratio: '16:9',
    title: '微电子洁净厂房百级微振动基台空间结构',
    subtitle: 'DEMO Project P004 · 独立华夫板与气垫主动隔振系统',
    tag: '微振控制',
    aspectLabel: '16:9 宽画幅',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '百级洁净区独立空气弹簧微振隔离基台与华夫板孔洞剖面图',
      isFictional: true
    }
  },
  'tpl-prj-05': {
    id: 'tpl-prj-05',
    category: 'project',
    ratio: '4:5',
    title: '跨海斜拉桥超深水中双壁钢围堰与沉井基础',
    subtitle: 'DEMO Project P005 · 水深 45m · 冲刷防护与群桩承台',
    tag: '特种桥隧',
    aspectLabel: '4:5 纵深立面',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '深水桥梁基础双壁钢套箱围堰与水下封底混凝土剖面示意',
      isFictional: true
    }
  },
  'tpl-prj-06': {
    id: 'tpl-prj-06',
    category: 'project',
    ratio: '4:3',
    title: '重型工业厂房箱型钢管混凝土柱轴测三维剖透',
    subtitle: 'DEMO Project P001 · 内部加劲肋与灌注自密实混凝土',
    tag: '三维模型',
    aspectLabel: '4:3 轴测透视',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '钢管混凝土重型柱内部栓钉、透气孔及自密实混凝土剖开模型图',
      isFictional: true
    }
  },
  'tpl-prj-07': {
    id: 'tpl-prj-07',
    category: 'project',
    ratio: '16:9',
    title: '工业厂房光伏建筑一体化(BIPV)金属屋面断面',
    subtitle: 'DEMO Project P006 · 360°直立锁边与抗风揭夹具系统',
    tag: '新能源屋面',
    aspectLabel: '16:9 节点大样',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '双层金属保温彩钢板与光伏无穿透夹具构造层剖面图',
      isFictional: true
    }
  },
  'tpl-prj-08': {
    id: 'tpl-prj-08',
    category: 'project',
    ratio: '1:1',
    title: '四舱室城市地下综合管廊标准横断面配置',
    subtitle: 'DEMO Project P007 · 电力/给水/燃气/雨污水综合管网',
    tag: '地下管廊',
    aspectLabel: '1:1 剖面图解',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '标准预制地下四舱综合管廊支架与管线净距断面尺寸图',
      isFictional: true
    }
  },

  // ================= 2. COMPANY (6) =================
  'tpl-com-01': {
    id: 'tpl-com-01',
    category: 'company',
    ratio: '16:9',
    title: '大型 EPC 工程总承包数字化协同交付网络拓扑',
    subtitle: 'Demo Organization B · 集团协同管理与供应链数字中枢',
    tag: '企业履约链',
    aspectLabel: '16:9 网络拓扑',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '总包企业数字大脑链接设计院、专业分包商、供应链与业主的网络拓扑',
      isFictional: true
    }
  },
  'tpl-com-02': {
    id: 'tpl-com-02',
    category: 'company',
    ratio: '4:3',
    title: '勘察设计院全专业正向 BIM 数字化协同流水线',
    subtitle: 'Demo Organization C · 结构/机电/建筑多源冲突提前消解',
    tag: '设计协同',
    aspectLabel: '4:3 协同架构',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '设计院正向BIM模型集成与三维碰撞检测矩阵图',
      isFictional: true
    }
  },
  'tpl-com-03': {
    id: 'tpl-com-03',
    category: 'company',
    ratio: '1:1',
    title: '特种地基与地下空间施工企业装备与业绩矩阵',
    subtitle: 'Demo Organization D · 液压抓斗/双轮铣槽机施工能力认证',
    tag: '特种施工',
    aspectLabel: '1:1 能力矩阵',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '专业地基公司重型连续墙施工装备参数与可履约深基坑地质分布',
      isFictional: true
    }
  },
  'tpl-com-04': {
    id: 'tpl-com-04',
    category: 'company',
    ratio: '16:9',
    title: '洁净动力与恒温恒湿机电模块装配加工基地全景',
    subtitle: 'Demo Organization E · 管道预制数字化流水线与无尘组装',
    tag: '机电深化',
    aspectLabel: '16:9 智造车间',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '通风与工艺管道数控等离子切割、全自动轨道焊数字化车间流程',
      isFictional: true
    }
  },
  'tpl-com-05': {
    id: 'tpl-com-05',
    category: 'company',
    ratio: '4:5',
    title: '高精重型钢结构智能焊接与超声探伤质保体系',
    subtitle: 'Demo Organization B · 焊缝一级探伤 100% 合格存证流',
    tag: '质量控制',
    aspectLabel: '4:5 质保闭环',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '机器人坡口焊接、相控阵超声无损探伤与存证归档闭环质量图',
      isFictional: true
    }
  },
  'tpl-com-06': {
    id: 'tpl-com-06',
    category: 'company',
    ratio: '4:3',
    title: '全过程工程咨询与质量安全第三方监理管控中枢',
    subtitle: 'Demo Organization G · 旁站见证/实测实量/材料抽检全覆盖',
    tag: '监理质检',
    aspectLabel: '4:3 监理体系',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '第三方工程监理数字化巡检、隐蔽工程签章与材料进场复试流向图',
      isFictional: true
    }
  },

  // ================= 3. PEOPLE (5) =================
  'tpl-peo-01': {
    id: 'tpl-peo-01',
    category: 'people',
    ratio: '1:1',
    title: '执业一级建造师工程履约技能与业绩雷达图',
    subtitle: 'Demo Engineer 01 · 22 年超大体量工业厂房现场指挥经验',
    tag: '能力雷达',
    aspectLabel: '1:1 技能雷达',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '六维工程师能力雷达图：危大工况控制、工期索赔、BIM指挥、安全零事故、造价优化、质量创优',
      isFictional: true
    }
  },
  'tpl-peo-02': {
    id: 'tpl-peo-02',
    category: 'people',
    ratio: '4:3',
    title: '结构总工复杂大跨度钢结构有限元验算手记卡',
    subtitle: 'Demo Engineer 02 · 瞬态风洞荷载与节点局部屈曲分析',
    tag: '总工验算',
    aspectLabel: '4:3 计算书',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '结构工程师有限元应力云图与网架提升屈曲模态验算手记卡片',
      isFictional: true
    }
  },
  'tpl-peo-03': {
    id: 'tpl-peo-03',
    category: 'people',
    ratio: '16:9',
    title: '数字化总监施工现场 4D 数字孪生指挥舱操作流',
    subtitle: 'Demo Engineer 06 · 物联网传感器与无人机巡检融合看板',
    tag: '数字孪生',
    aspectLabel: '16:9 孪生看板',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: 'BIM 数字化总监操作工程指挥大屏的交互信息流与实时点云对比',
      isFictional: true
    }
  },
  'tpl-peo-04': {
    id: 'tpl-peo-04',
    category: 'people',
    ratio: '4:5',
    title: '总监理工程师现场巡检与关键工序旁站签证轨迹',
    subtitle: 'Demo Engineer 04 · 32 个分部分项工程隐蔽验评无死角',
    tag: '现场见证',
    aspectLabel: '4:5 签证轨迹',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '总监工程师现场巡检路线热力图与激光测距仪实测数据签章记录',
      isFictional: true
    }
  },
  'tpl-peo-05': {
    id: 'tpl-peo-05',
    category: 'people',
    ratio: '1:1',
    title: '高级洁净机电调试工程师恒温恒湿风平衡拓扑图',
    subtitle: 'Demo Engineer 03 · 洁净度 Class 100 压差梯度调试法',
    tag: '机电调试',
    aspectLabel: '1:1 压差图解',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '微正压梯度控制风量平衡计算图与各工艺区压差监测点拓扑',
      isFictional: true
    }
  },

  // ================= 4. NEWS (7) =================
  'tpl-new-01': {
    id: 'tpl-new-01',
    category: 'news',
    ratio: '16:9',
    title: '重大产业政策：大型工业厂房绿色建造与智能制造补贴细则解读',
    subtitle: '国家高新区装配率超 65% 项目开辟绿色审批通道',
    tag: '行业头条',
    aspectLabel: '16:9 头条图',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '绿色建造星级评价指标与碳达峰实施路线图解析图示',
      isFictional: true
    }
  },
  'tpl-new-02': {
    id: 'tpl-new-02',
    category: 'news',
    ratio: '4:3',
    title: '现场快讯：1600吨履带起重机完成 P001 跨间重型设备就位',
    subtitle: '主臂工况 96m · 超重型起重索具安全系数大于 6.0',
    tag: '现场快讯',
    aspectLabel: '4:3 快讯画幅',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '重型履带吊作业回转半径与起重荷载特性曲线图',
      isFictional: true
    }
  },
  'tpl-new-03': {
    id: 'tpl-new-03',
    category: 'news',
    ratio: '16:9',
    title: '钢结构供应链指数：Q4 特厚结构钢板出厂均价与交货周期走势',
    subtitle: 'Q355NH耐候钢与Z向抗层状撕裂钢供应平衡分析',
    tag: '大宗指数',
    aspectLabel: '16:9 趋势图',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '特种工程钢材季度价格指数与钢厂轧制订单交付周期走势折线图',
      isFictional: true
    }
  },
  'tpl-new-04': {
    id: 'tpl-new-04',
    category: 'news',
    ratio: '1:1',
    title: '近零能耗园区示范：超净厂房全生命周期隐含碳足迹核算模型',
    subtitle: '水泥/钢材/围护结构/运行能耗四维碳足迹实测评估',
    tag: '低碳科技',
    aspectLabel: '1:1 碳平衡',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '工业厂房建造阶段碳足迹排放来源环形分解与减碳成效图',
      isFictional: true
    }
  },
  'tpl-new-05': {
    id: 'tpl-new-05',
    category: 'news',
    ratio: '4:5',
    title: '三维移动激光雷达(LiDAR)施工实景逆向扫描实测比对通报',
    subtitle: '全场 5 亿激光点云与施工图设计 BIM 精度偏差热力图',
    tag: '实景逆向',
    aspectLabel: '4:5 偏差热图',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '工程现场实测点云与设计理论模型空间对齐偏差色谱图',
      isFictional: true
    }
  },
  'tpl-new-06': {
    id: 'tpl-new-06',
    category: 'news',
    ratio: '16:9',
    title: '全国先进制造业园区重点标段 EPC 招投标成交规模周度盘点',
    subtitle: '机电安装与高跨钢结构标段占比提升至总投资 43%',
    tag: '标讯周报',
    aspectLabel: '16:9 招采全景',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '先进制造工业建筑中标标段类别分布与造价平米单价区间',
      isFictional: true
    }
  },
  'tpl-new-07': {
    id: 'tpl-new-07',
    category: 'news',
    ratio: '4:3',
    title: '海外工程纵深：中国工程总承包企业高标准无尘车间出海交付案例',
    subtitle: '东盟高端微纳产业园一期圆满通过国际 SEMI 规范验收',
    tag: '全球视野',
    aspectLabel: '4:3 国际工程',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '跨境多国工业项目联合交付网络与海外供应链港口节点流向',
      isFictional: true
    }
  },

  // ================= 5. TECHNICAL (6) =================
  'tpl-tec-01': {
    id: 'tpl-tec-01',
    category: 'technical',
    ratio: '16:9',
    title: '多吊点大吨位液压同步顶升动态反力平衡原理图解',
    subtitle: '微米级光栅尺位置传感闭环与 PLC 自动纠偏逻辑',
    tag: '液压控制',
    aspectLabel: '16:9 逻辑图',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '液压千斤顶多油路主从跟随控制原理与顶升行程误差动态补偿框图',
      isFictional: true
    }
  },
  'tpl-tec-02': {
    id: 'tpl-tec-02',
    category: 'technical',
    ratio: '4:3',
    title: '深基坑预应力伺服钢支撑轴力主动补偿控制曲线图',
    subtitle: '随外界温度与基坑土方开挖阶段的轴力自适应增减',
    tag: '伺服补偿',
    aspectLabel: '4:3 测控曲线',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '基坑开挖全过程伺服钢支撑设计轴力、报警界限与实测补偿曲线图',
      isFictional: true
    }
  },
  'tpl-tec-03': {
    id: 'tpl-tec-03',
    category: 'technical',
    ratio: '1:1',
    title: '高精光刻洁净区复合弹簧微振动隔振器内部构造图',
    subtitle: '低固有频率双腔空气弹簧配合黏滞流体阻尼器剖面',
    tag: '隔振器构造',
    aspectLabel: '1:1 剖面大样',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '精密微振动阻尼弹簧隔振器内部腔体密封、进气调节阀与活塞剖面图',
      isFictional: true
    }
  },
  'tpl-tec-04': {
    id: 'tpl-tec-04',
    category: 'technical',
    ratio: '16:9',
    title: '重型厚板全熔透一级焊缝相控阵超声(PAUT)波形与成像图解',
    subtitle: '64阵元探头扇形扫查无死角检视内部气孔与未熔合缺陷',
    tag: '相控阵探伤',
    aspectLabel: '16:9 声束成像',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '超声相控阵扇形扫查在坡口焊缝内的声束折射与缺陷回波定位图',
      isFictional: true
    }
  },
  'tpl-tec-05': {
    id: 'tpl-tec-05',
    category: 'technical',
    ratio: '4:5',
    title: '地下连续墙锁口管接头工字钢防渗与清底抓斗工法图',
    subtitle: '高压泥浆护壁下水下混凝土浇筑防止夹泥的工序分解',
    tag: '地连墙工法',
    aspectLabel: '4:5 工序图解',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '地连墙成槽、沉渣抓取、端头刷壁与导管法浇筑水下混凝土四步流程剖面',
      isFictional: true
    }
  },
  'tpl-tec-06': {
    id: 'tpl-tec-06',
    category: 'technical',
    ratio: '1:1',
    title: '重型厂房吊车梁变幅疲劳应力谱与疲劳寿命验算模型',
    subtitle: '50t 双梁桥式起重机频繁启制动应力集中处 S-N 曲线',
    tag: '疲劳验算',
    aspectLabel: '1:1 疲劳曲线',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '吊车梁下翼缘与腹板突变处变幅交变应力循环计数与 S-N 疲劳曲线图',
      isFictional: true
    }
  },

  // ================= 6. RELATIONSHIP (4) =================
  'tpl-rel-01': {
    id: 'tpl-rel-01',
    category: 'relationship',
    ratio: '16:9',
    title: '工程建设“业主-总包-分包-监理”四方法律与存证履约拓扑',
    subtitle: 'DEMO Project P001 权责合同关系与数字公报双向签名链',
    tag: '四方法律图谱',
    aspectLabel: '16:9 履约拓扑',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '业主、总包、专业分包与第三方监理四方签约合同链与存证公报双向拓扑图',
      isFictional: true
    }
  },
  'tpl-rel-02': {
    id: 'tpl-rel-02',
    category: 'relationship',
    ratio: '4:3',
    title: '执业注册工程师-所属法人企业-工程标段全链路归属图谱',
    subtitle: '真实社保与实名制执业印章防挂靠多源比对映射',
    tag: '执业归属',
    aspectLabel: '4:3 归属图谱',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '执业建造师、结构师执业印章与受聘企业、所承接工程标段对应图',
      isFictional: true
    }
  },
  'tpl-rel-03': {
    id: 'tpl-rel-03',
    category: 'relationship',
    ratio: '1:1',
    title: '关键工程材料供应商生产-出厂-复试-就位全流程溯源链条',
    subtitle: '耐火电缆/特厚钢板/自密实混凝土试块数字条码跟踪',
    tag: '材料溯源',
    aspectLabel: '1:1 溯源闭环',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '原材料钢厂出厂质保书、进场见证取样复试报告与构件就位条码关联图',
      isFictional: true
    }
  },
  'tpl-rel-04': {
    id: 'tpl-rel-04',
    category: 'relationship',
    ratio: '16:9',
    title: '工程重大里程碑数字存证多方联合签章与存证哈希固化流',
    subtitle: '激光扫描数据+监理旁站纪要+总监电子签章时间戳',
    tag: '存证哈希流',
    aspectLabel: '16:9 存证闭环',
    media: {
      source: 'Project Atlas 独立工程图学模型库 (Parametric SVG Engine v2)',
      rights: 'CC BY-NC 4.0 (示意模型与演示数据)',
      usage: '非商用原型演示 / 原创矢量工程插画',
      alt: '现场激光扫描实测数据通过国密算法哈希上链并获得三方联合时间戳示意',
      isFictional: true
    }
  }
};

/**
 * Helper to get template by ID with safe fallback
 */
export function getTemplateById(templateId) {
  if (templateId && ILLUSTRATION_TEMPLATES[templateId]) {
    return ILLUSTRATION_TEMPLATES[templateId];
  }
  return ILLUSTRATION_TEMPLATES['tpl-prj-01'];
}

/**
 * Get templates list filtered by category
 */
export function getTemplatesByCategory(catId = 'all') {
  const all = Object.values(ILLUSTRATION_TEMPLATES);
  if (catId === 'all') return all;
  return all.filter(t => t.category === catId);
}
