/**
 * English localization data for the 36 engineering illustration templates
 * Translates CAD diagram metadata: titles, subtitles, tags, and aspect labels
 */

export const TAGS_EN = {
  '工法剖面': 'Method Section',
  '深基坑工程': 'Deep Excavation',
  '装配节点': 'Prefab Joint',
  '节点详图': 'Connection Detail',
  '微振控制': 'Micro-Vibration',
  '特种桥隧': 'Bridge & Tunnel',
  '三维模型': '3D BIM Model',
  '新能源屋面': 'BIPV Roof System',
  '地下管廊': 'Utility Tunnel',
  '企业履约链': 'Contracting Topology',
  '设计协同': 'Design Collaboration',
  '特种施工': 'Specialist Works',
  '机电深化': 'MEP Fabrication',
  '质量控制': 'Quality Assurance',
  '监理质检': 'Supervision Audit',
  '能力雷达': 'Capability Radar',
  '总工验算': 'Chief Eng Verification',
  '数字孪生': 'Digital Twin Cockpit',
  '现场见证': 'Site Witnessing',
  '机电调试': 'MEP Commissioning',
  '行业头条': 'Industry Headline',
  '现场快讯': 'Field Dispatch',
  '大宗指数': 'Commodity Index',
  '低碳科技': 'Low-Carbon Tech',
  '实景逆向': 'LiDAR Reality Capture',
  '标讯周报': 'Tendering Weekly',
  '全球视野': 'Global Projects',
  '液压控制': 'Hydraulic Lift Control',
  '伺服补偿': 'Servo Strut Control',
  '隔振器构造': 'Vibration Isolator',
  '相控阵探伤': 'PAUT Weld Testing',
  '地连墙工法': 'Diaphragm Wall Method',
  '疲劳验算': 'Fatigue Analysis',
  '四方法律图谱': 'Quad-Party Legal Matrix',
  '执业归属': 'Practitioner Credential',
  '材料溯源': 'Material Traceability',
  '存证哈希流': 'Evidence Hash Stream',
};

export const ASPECT_LABELS_EN = {
  '16:9 横屏剖面': '16:9 Elevation Section',
  '4:3 标准立面': '4:3 Standard Elevation',
  '1:1 结构节点': '1:1 Structural Detail',
  '16:9 网络拓扑': '16:9 Network Topology',
  '4:3 协同流水': '4:3 Pipeline Workflow',
  '1:1 矩阵分布': '1:1 Matrix Distribution',
  '16:9 车间总成': '16:9 Assembly Layout',
  '4:3 质检流水': '4:3 QA Process Flow',
  '1:1 质检雷达': '1:1 Audit Radar',
  '1:1 技能雷达': '1:1 Skill Radar',
  '4:5 结构验算': '4:5 Structural Calculation',
  '16:9 现场孪生': '16:9 Site Digital Twin',
  '4:5 见证轨迹': '4:5 Witness Log',
  '1:1 调试拓扑': '1:1 Commissioning Map',
  '16:9 政策图解': '16:9 Policy Diagram',
  '4:3 现场快讯': '4:3 Field Dispatch',
  '1:1 行情走势': '1:1 Market Trend',
  '16:9 碳足迹流': '16:9 Carbon Footprint',
  '4:3 偏差热力': '4:3 Deviation Heatmap',
  '1:1 标段占比': '1:1 Package Distribution',
  '16:9 出海交付': '16:9 Global Delivery',
  '16:9 逻辑图': '16:9 Logic Diagram',
  '4:3 补偿曲线': '4:3 Compensation Curve',
  '1:1 剖面图': '1:1 Detail Section',
  '16:9 扫查成像': '16:9 Scan Imaging',
  '4:3 工法图': '4:3 Construction Method',
  '1:1 验算模型': '1:1 Verification Model',
  '16:9 四方拓扑': '16:9 Quad-Party Topology',
  '4:3 归属图谱': '4:3 Credential Mapping',
  '1:1 溯源链条': '1:1 Traceability Chain',
  '16:9 存证固化': '16:9 Cryptographic Hash Flow',
};

export const TEMPLATES_EN = {
  'tpl-prj-01': {
    title: 'Long-Span Space Truss Hydraulic Synchronized Lifting Elevation Section',
    subtitle: 'DEMO Project P001 · 680t Space Truss + 24 Micro-Stroke Hydraulic Jacks',
    tag: 'Method Section',
    aspectLabel: '16:9 Elevation Section'
  },
  'tpl-prj-02': {
    title: 'Deep Excavation Multi-Tier Intelligent Servo Strut Stress Profile',
    subtitle: 'DEMO Project P002 · 32m Deep Excavation Enclosure Adjacent to Metro Transit',
    tag: 'Deep Excavation',
    aspectLabel: '4:3 Standard Elevation'
  },
  'tpl-prj-03': {
    title: 'Modular Heavy Prefabricated Beam-Column Connection Construction Detail',
    subtitle: 'DEMO Project P003 · High-Strength Bolts & Full-Penetration Fillet Welds',
    tag: 'Connection Detail',
    aspectLabel: '1:1 Structural Detail'
  },
  'tpl-prj-04': {
    title: 'Microelectronics Cleanroom Class-100 Micro-Vibration Plinth Spatial Structure',
    subtitle: 'DEMO Project P004 · Independent Waffle Slab & Active Air Spring Isolation',
    tag: 'Micro-Vibration',
    aspectLabel: '16:9 Elevation Section'
  },
  'tpl-prj-05': {
    title: 'Cross-Sea Cable Bridge Deep-Water Double-Wall Steel Cofferdam & Caisson Foundation',
    subtitle: 'DEMO Project P005 · 45m Water Depth · Scour Protection & Pile Group Cap',
    tag: 'Bridge & Tunnel',
    aspectLabel: '4:3 Standard Elevation'
  },
  'tpl-prj-06': {
    title: 'Heavy Industrial Plant Box Concrete-Filled Steel Tube Column 3D Isometric View',
    subtitle: 'DEMO Project P001 · Internal Stiffeners & Self-Compacting Concrete Pour',
    tag: '3D BIM Model',
    aspectLabel: '1:1 Structural Detail'
  },
  'tpl-prj-07': {
    title: 'Industrial Plant Building Integrated Photovoltaics (BIPV) Metal Roof Cross Section',
    subtitle: 'DEMO Project P006 · 360° Standing Seam & Wind-Resistant Clamp System',
    tag: 'BIPV Roof System',
    aspectLabel: '16:9 Elevation Section'
  },
  'tpl-prj-08': {
    title: 'Four-Compartment Urban Underground Utility Tunnel Standard Cross-Section',
    subtitle: 'DEMO Project P007 · Power, Water, Gas & Storm/Sewer Network Infrastructure',
    tag: 'Utility Tunnel',
    aspectLabel: '4:3 Standard Elevation'
  },
  'tpl-com-01': {
    title: 'Major EPC General Contractor Digital Collaborative Delivery Network Topology',
    subtitle: 'Demo Organization B · Group Collaborative Management & Supply Chain Digital Hub',
    tag: 'Contracting Topology',
    aspectLabel: '16:9 Network Topology'
  },
  'tpl-com-02': {
    title: 'Architectural Design & Research Institute Multi-Disciplinary Forward BIM Pipeline',
    subtitle: 'Demo Organization C · Upstream Spatial Clash Elimination for Structural & MEP',
    tag: 'Design Collaboration',
    aspectLabel: '4:3 Pipeline Workflow'
  },
  'tpl-com-03': {
    title: 'Specialized Deep Geotechnical & Underground Engineering Equipment & Track Record Matrix',
    subtitle: 'Demo Organization D · Hydraulic Grab & Hydromill Trench Cutter Certification',
    tag: 'Specialist Works',
    aspectLabel: '1:1 Matrix Distribution'
  },
  'tpl-com-04': {
    title: 'Cleanroom Power & HVAC Modular Fabrication Assembly Plant Panorama',
    subtitle: 'Demo Organization E · Automated Orbital Pipe Spool Pre-Assembly Clean Workshop',
    tag: 'MEP Fabrication',
    aspectLabel: '16:9 Assembly Layout'
  },
  'tpl-com-05': {
    title: 'High-Precision Heavy Steel Structure Intelligent Welding & Ultrasonic NDT QA System',
    subtitle: 'Demo Organization B · 100% Class-1 Weld Testing Verifiable QA Workflow',
    tag: 'Quality Assurance',
    aspectLabel: '4:3 QA Process Flow'
  },
  'tpl-com-06': {
    title: 'Whole-Process Engineering Consulting & Third-Party Quality & Safety Supervision Hub',
    subtitle: 'Demo Organization G · Station Witnessing, Field Measurements & Material Re-Testing',
    tag: 'Supervision Audit',
    aspectLabel: '1:1 Audit Radar'
  },
  'tpl-peo-01': {
    title: 'Licensed Master Builder Construction Performance & Skill Capability Radar',
    subtitle: 'Demo Engineer 01 · 22 Years Flagship Industrial Plant Construction Leadership',
    tag: 'Capability Radar',
    aspectLabel: '1:1 Skill Radar'
  },
  'tpl-peo-02': {
    title: 'Principal Structural Engineer Complex Long-Span Steel Finite Element Verification Card',
    subtitle: 'Demo Engineer 02 · Transient Wind Tunnel Loading & Local Buckling FEA Analysis',
    tag: 'Chief Eng Verification',
    aspectLabel: '4:5 Structural Calculation'
  },
  'tpl-peo-03': {
    title: 'Digital Engineering Director 4D Construction Digital Twin Command Center Workflow',
    subtitle: 'Demo Engineer 06 · IoT Strain Sensors & Autonomous Drone Inspection Cockpit',
    tag: 'Digital Twin Cockpit',
    aspectLabel: '16:9 Site Digital Twin'
  },
  'tpl-peo-04': {
    title: 'Chief Supervision Engineer Field Inspection & Critical Operation Witness Sign-Off Log',
    subtitle: 'Demo Engineer 04 · Zero-Blind-Spot Inspection of 32 Sub-Grade Engineering Divisions',
    tag: 'Site Witnessing',
    aspectLabel: '4:5 Witness Log'
  },
  'tpl-peo-05': {
    title: 'Senior Cleanroom MEP Commissioning Engineer HVAC Air Balance Schematic Topology',
    subtitle: 'Demo Engineer 03 · Class 100 Cleanliness Differential Pressure Cascade Commissioning',
    tag: 'MEP Commissioning',
    aspectLabel: '1:1 Commissioning Map'
  },
  'tpl-new-01': {
    title: 'Major Industrial Policy: Green Construction & Smart Manufacturing Subsidy Guidelines',
    subtitle: 'Fast-Track Statutory Approvals for High-Tech Zone Projects with >65% Prefabrication',
    tag: 'Industry Headline',
    aspectLabel: '16:9 Policy Diagram'
  },
  'tpl-new-02': {
    title: 'Field Flash: 1,600-Ton Crawler Crane Positions Heavy Process Equipment at P001',
    subtitle: '96m Main Boom Configuration · Heavy-Lift Rigging Safety Factor Exceeds 6.0',
    tag: 'Field Dispatch',
    aspectLabel: '4:3 Field Dispatch'
  },
  'tpl-new-03': {
    title: 'Steel Supply Chain Index: Q4 Extra-Heavy Plate Mill Pricing & Lead-Time Trends',
    subtitle: 'Market Supply Balance Analysis for Q355NH Weathering & Z-Direction Heavy Steels',
    tag: 'Commodity Index',
    aspectLabel: '1:1 Market Trend'
  },
  'tpl-new-04': {
    title: 'Near-Zero Energy Campus Pilot: Ultra-Clean Plant Lifecycle Embodied Carbon Model',
    subtitle: 'Empirical 4D Carbon Accounting for Cement, Structural Steel, Cladding & HVAC',
    tag: 'Low-Carbon Tech',
    aspectLabel: '16:9 Carbon Footprint'
  },
  'tpl-new-05': {
    title: 'Mobile 3D LiDAR Reality Capture Scan vs. BIM As-Designed Variance Deviation Report',
    subtitle: 'Heatmap Comparison of 500M Point Cloud Survey Against Design BIM Tolerances',
    tag: 'LiDAR Reality Capture',
    aspectLabel: '4:3 Deviation Heatmap'
  },
  'tpl-new-06': {
    title: 'National Advanced Manufacturing Park Flagship EPC Contract Award Weekly Review',
    subtitle: 'MEP & Heavy Steel Packages Climb to 43% of Total Capital Expenditure',
    tag: 'Tendering Weekly',
    aspectLabel: '1:1 Package Distribution'
  },
  'tpl-new-07': {
    title: 'Global Engineering Horizon: Chinese EPC Contractors Deliver Overseas Cleanroom Plants',
    subtitle: 'ASEAN High-Tech Micro-Nano Facility Phase-1 Achieves International SEMI Compliance',
    tag: 'Global Projects',
    aspectLabel: '16:9 Global Delivery'
  },
  'tpl-tec-01': {
    title: 'Multi-Point Heavy-Tonnage Hydraulic Lift Dynamic Reaction Force Balance Principles',
    subtitle: 'Micron-Precision Optical Linear Encoder Closed-Loop & Automated PLC Correction',
    tag: 'Hydraulic Lift Control',
    aspectLabel: '16:9 Logic Diagram'
  },
  'tpl-tec-02': {
    title: 'Deep Excavation Pre-Stressed Servo Strut Axial Force Active Compensation Curves',
    subtitle: 'Adaptive Real-Time Axial Force Tuning Across Ambient Temp & Soil Bulk Excavation',
    tag: 'Servo Strut Control',
    aspectLabel: '4:3 Compensation Curve'
  },
  'tpl-tec-03': {
    title: 'High-Precision Photolithography Cleanroom Compound Spring Vibration Isolator Detail',
    subtitle: 'Low Natural Frequency Dual-Chamber Air Spring Combined with Viscous Fluid Dampers',
    tag: 'Vibration Isolator',
    aspectLabel: '1:1 Detail Section'
  },
  'tpl-tec-04': {
    title: 'Heavy Thick-Plate Full-Penetration Class-1 Welds Phased Array Ultrasonic Testing (PAUT)',
    subtitle: '64-Element Sectorial S-Scan Coverage for Internal Porosity & Lack-of-Fusion Inspection',
    tag: 'PAUT Weld Testing',
    aspectLabel: '16:9 Scan Imaging'
  },
  'tpl-tec-05': {
    title: 'Diaphragm Wall Steel I-Beam Waterstop Joint & Trench Desanding Grab Method',
    subtitle: 'Step-by-Step Underwater Concrete Tremie Pouring Sequence under High Bentonite Slurry',
    tag: 'Diaphragm Wall Method',
    aspectLabel: '4:3 Construction Method'
  },
  'tpl-tec-06': {
    title: 'Heavy Industrial Crane Runway Beam Variable Amplitude Stress Spectrum & Fatigue Life',
    subtitle: 'S-N Fatigue Curve Analysis for High-Frequency 50t Bridge Crane Support Brackets',
    tag: 'Fatigue Analysis',
    aspectLabel: '1:1 Verification Model'
  },
  'tpl-rel-01': {
    title: 'Project Delivery Quad-Party Legal Matrix & Verifiable Contracting Topology',
    subtitle: 'DEMO Project P001 Owner-EPC-Sub-Supervisor Contractual & Dual-Seal Signature Chain',
    tag: 'Quad-Party Legal Matrix',
    aspectLabel: '16:9 Quad-Party Topology'
  },
  'tpl-rel-02': {
    title: 'Licensed Engineer to Corporate Legal Entity to Work Package Traceability Mapping',
    subtitle: 'Statutory Social Security & Real-Name Seal Multi-Source Verification Matching',
    tag: 'Practitioner Credential',
    aspectLabel: '4:3 Credential Mapping'
  },
  'tpl-rel-03': {
    title: 'Critical Engineering Materials Source-to-Site Lifecycle Traceability Verification',
    subtitle: 'Digital Barcode Tracking for Fire-Rated Cabling, Heavy Plates & Self-Compacting Grout',
    tag: 'Material Traceability',
    aspectLabel: '1:1 Traceability Chain'
  },
  'tpl-rel-04': {
    title: 'Major Project Milestone Multi-Party Joint Digital Seal & Cryptographic Hash Flow',
    subtitle: '3D Laser Cloud Scans + Full-Time Supervision Sign-Off + Master Builder Timestamps',
    tag: 'Evidence Hash Stream',
    aspectLabel: '16:9 Cryptographic Hash Flow'
  }
};

/**
 * Returns localized illustration template object
 * Falls back to English for Thai and unsupported non-zh locales
 */
export function getLocalizedTemplate(template, locale) {
  if (!template) return template;
  if (locale === 'zh') return template;

  const en = TEMPLATES_EN[template.id];
  const tagEn = TAGS_EN[template.tag] || (en && en.tag) || template.tag;
  const aspectEn = ASPECT_LABELS_EN[template.aspectLabel] || (en && en.aspectLabel) || template.aspectLabel;

  if (!en) {
    return {
      ...template,
      tag: tagEn,
      aspectLabel: aspectEn,
    };
  }

  return {
    ...template,
    title: en.title || template.title,
    subtitle: en.subtitle || template.subtitle,
    tag: tagEn,
    aspectLabel: aspectEn,
  };
}
