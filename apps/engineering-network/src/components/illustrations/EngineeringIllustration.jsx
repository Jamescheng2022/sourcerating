import React, { useState } from 'react';
import { ILLUSTRATION_TEMPLATES, getTemplateById } from '../../data/illustrationTemplates';
import { Maximize2, ShieldCheck, Info, Sparkles, X } from 'lucide-react';
import { useDialogA11y } from '../../utils/useDialogA11y';
import { useI18n } from '../../i18n/I18nContext';
import { getLocalizedTemplate } from '../../i18n/illustrationsEn';

/**
 * High-precision parametric SVG rendering components for 36 engineering illustration templates.
 * Provides blueprint lines, grid coordinates, dimensions, stress diagrams, and engineering schematics.
 */

// 1. PROJECT SCHEMATICS
function SvgProject01({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  // 空间网架大跨度液压同步顶升立面剖面图 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid-prj-01" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="lift-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#090d16" />
      <rect width="100%" height="100%" fill="url(#grid-prj-01)" />
      
      {/* Ground Line */}
      <line x1="40" y1="380" x2="760" y2="380" stroke="#475569" strokeWidth="3" />
      <line x1="40" y1="385" x2="760" y2="385" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
      <text x="50" y="405" fill="#64748b" fontSize="12" fontFamily="monospace">{isZh ? "±0.000 施工基准面 (MOCK BASELINE)" : "±0.000 Baseline (MOCK BASELINE)"}</text>

      {/* Main Structural Columns */}
      <rect x="120" y="80" width="36" height="300" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <rect x="644" y="80" width="36" height="300" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      {/* Column Foundation */}
      <rect x="100" y="370" width="76" height="20" fill="#334155" />
      <rect x="624" y="370" width="76" height="20" fill="#334155" />

      {/* Jacking Towers */}
      <line x1="138" y1="100" x2="138" y2="370" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="6 3" />
      <line x1="662" y1="100" x2="662" y2="370" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="6 3" />
      
      {/* Lifting Hydraulic Jacks */}
      <rect x="126" y="140" width="24" height="35" rx="3" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" />
      <rect x="650" y="140" width="24" height="35" rx="3" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" />
      <text x="160" y="155" fill="#fbbf24" fontSize="11" fontFamily="monospace">{isZh ? "#1 液压千斤顶 (350t)" : "#1 Hydraulic Jack (350t)"}</text>
      <text x="530" y="155" fill="#fbbf24" fontSize="11" fontFamily="monospace">{isZh ? "#2 液压千斤顶 (350t)" : "#2 Hydraulic Jack (350t)"}</text>

      {/* Space Truss Grid (Lifting Unit) */}
      <g transform="translate(0, -20)">
        {/* Truss glow area */}
        <path d="M 156 160 L 644 160 L 620 220 L 180 220 Z" fill="url(#lift-glow)" />
        {/* Top Chord */}
        <line x1="140" y1="160" x2="660" y2="160" stroke="#0284c7" strokeWidth="3" />
        {/* Bottom Chord */}
        <line x1="170" y1="220" x2="630" y2="220" stroke="#0284c7" strokeWidth="3" />
        {/* Web Members */}
        {[180, 220, 260, 300, 340, 380, 420, 460, 500, 540, 580, 620].map((x, i) => (
          <g key={i}>
            <line x1={x} y1="160" x2={x + 20} y2="220" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1={x + 20} y1="220" x2={x + 40} y2="160" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx={x} cy="160" r="3.5" fill="#e0f2fe" />
            <circle cx={x + 20} cy="220" r="3.5" fill="#e0f2fe" />
          </g>
        ))}
      </g>

      {/* Elevation Callout */}
      <line x1="710" y1="140" x2="710" y2="380" stroke="#ef4444" strokeWidth="1.5" />
      <polygon points="710,136 706,146 714,146" fill="#ef4444" />
      <polygon points="710,384 706,374 714,374" fill="#ef4444" />
      <text x="720" y="260" fill="#ef4444" fontSize="12" fontFamily="monospace" fontWeight="bold">H = +28.500m</text>
      <text x="720" y="278" fill="#94a3b8" fontSize="10" fontFamily="monospace">{isZh ? "设计顶升标高" : "Design Lifting Elev."}</text>

      {/* Sensor Annotations */}
      <rect x="340" y="170" width="120" height="24" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#10b981" strokeWidth="1.5" />
      <text x="350" y="186" fill="#34d399" fontSize="11" fontFamily="monospace">{isZh ? "● 光纤应变实时监测" : "● Fiber-Optic Strain Monitor"}</text>
    </svg>
  );
}

function SvgProject02({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 超深基坑多道智能伺服钢支撑受力剖面 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      {/* Ground lines and soil hatching */}
      <rect x="0" y="0" width="120" height="450" fill="#131b2e" />
      <rect x="480" y="0" width="120" height="450" fill="#131b2e" />
      <line x1="0" y1="80" x2="120" y2="80" stroke="#64748b" strokeWidth="2" />
      <line x1="480" y1="80" x2="600" y2="80" stroke="#64748b" strokeWidth="2" />
      <text x="15" y="65" fill="#94a3b8" fontSize="11" fontFamily="monospace">{isZh ? "地表标高 ±0.000" : (isTh ? "ระดับผิวดิน ±0.000" : "Ground Elev. ±0.000")}</text>
      <text x="485" y="65" fill="#94a3b8" fontSize="11" fontFamily="monospace">{isZh ? "临地铁沉降监测线" : (isTh ? "แนวตรวจวัดการทรุดตัว" : "Metro Settlement Line")}</text>

      {/* Diaphragm Walls (地连墙) */}
      <rect x="120" y="70" width="30" height="360" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <rect x="450" y="70" width="30" height="360" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <text x="128" y="420" fill="#38bdf8" fontSize="10" transform="rotate(-90 128,420)" fontFamily="monospace">{isZh ? "800mm 地下连续墙" : (isTh ? "ผนังไดอะแฟรม 800 มม." : "800mm Diaphragm Wall")}</text>

      {/* Excavation Base */}
      <path d="M 150 380 L 450 380" stroke="#475569" strokeWidth="3" />
      <text x="240" y="370" fill="#e2e8f0" fontSize="12" fontFamily="monospace">{isZh ? "坑底标高 -32.000m" : (isTh ? "ระดับก้นหลุม -32.000 ม." : "Base Elev. -32.000m")}</text>

      {/* 4 Levels of Servo Struts */}
      {[
        { y: 130, f: '2800 kN', label: isZh ? '第一道砼支撑' : (isTh ? 'ค้ำยันคอนกรีตระดับ 1' : '1st Concrete Strut') },
        { y: 200, f: '4200 kN', label: isZh ? '第二道伺服钢支撑' : (isTh ? 'ค้ำยันเหล็กเซอร์โวระดับ 2' : '2nd Servo Steel Strut') },
        { y: 270, f: '5100 kN', label: isZh ? '第三道伺服钢支撑' : (isTh ? 'ค้ำยันเหล็กเซอร์โวระดับ 3' : '3rd Servo Steel Strut') },
        { y: 340, f: '4600 kN', label: isZh ? '第四道伺服钢支撑' : (isTh ? 'ค้ำยันเหล็กเซอร์โวระดับ 4' : '4th Servo Steel Strut') },
      ].map((strut, idx) => (
        <g key={idx}>
          <line x1="150" y1={strut.y} x2="450" y2={strut.y} stroke="#f59e0b" strokeWidth="5" />
          <rect x="270" y={strut.y - 10} width="60" height="20" rx="3" fill="var(--illustration-bg, #151E2E)" stroke="#fbbf24" strokeWidth="1.5" />
          <text x="278" y={strut.y + 4} fill="#fbbf24" fontSize="10" fontFamily="monospace">{strut.f}</text>
          <text x="160" y={strut.y - 6} fill="#94a3b8" fontSize="9" fontFamily="monospace">{strut.label}</text>
        </g>
      ))}

      {/* Soil Pressure Curve */}
      <path d="M 90 80 Q 50 250 85 430" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" />
      <text x="10" y="240" fill="#f87171" fontSize="10" fontFamily="monospace">{isZh ? "土压力分布 E_a" : "Earth Pressure E_a"}</text>
    </svg>
  );
}

function SvgProject03({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 模块化重型装配式梁柱节点构造详图 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0b1120" />
      {/* Box Column */}
      <rect x="180" y="40" width="140" height="420" fill="#1e293b" stroke="#0ea5e9" strokeWidth="3" />
      <line x1="250" y1="40" x2="250" y2="460" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 4" />
      {/* Heavy Beams on Left and Right */}
      <rect x="40" y="190" width="140" height="100" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <rect x="320" y="190" width="140" height="100" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      {/* Stiffening Ribs */}
      <line x1="180" y1="190" x2="320" y2="190" stroke="#f59e0b" strokeWidth="3" />
      <line x1="180" y1="290" x2="320" y2="290" stroke="#f59e0b" strokeWidth="3" />
      <text x="200" y="245" fill="#f59e0b" fontSize="11" fontFamily="monospace">{isZh ? "内部水平加劲肋" : (isTh ? "แผ่นเสริมความแข็งแนวนอนภายใน" : "Internal Horizontal Stiffener")}</text>

      {/* High-strength Bolts Matrix */}
      {[210, 235, 260].map(y => (
        <g key={y}>
          <circle cx="150" cy={y} r="5" fill="#f87171" stroke="#fff" strokeWidth="1" />
          <circle cx="120" cy={y} r="5" fill="#f87171" stroke="#fff" strokeWidth="1" />
          <circle cx="350" cy={y} r="5" fill="#f87171" stroke="#fff" strokeWidth="1" />
          <circle cx="380" cy={y} r="5" fill="#f87171" stroke="#fff" strokeWidth="1" />
        </g>
      ))}
      {/* Annotation */}
      <rect x="60" y="320" width="180" height="35" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#64748b" strokeWidth="1" />
      <text x="70" y="342" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "10.9级 M24 高强螺栓群" : (isTh ? "สลักเกลียวกำลังสูง 10.9 M24" : "Gr 10.9 M24 High-Strength Bolts")}</text>
      <line x1="140" y1="270" x2="140" y2="320" stroke="#64748b" strokeWidth="1" />
    </svg>
  );
}

function SvgProject04({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 微电子洁净厂房百级微振动基台空间结构 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#070c18" />
      {/* Waffle Slab */}
      <rect x="80" y="160" width="640" height="40" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      {[120, 180, 240, 300, 360, 420, 480, 540, 600, 660].map(x => (
        <rect key={x} x={x} y="165" width="30" height="30" fill="#070c18" stroke="#0ea5e9" strokeWidth="1" />
      ))}
      <text x="320" y="145" fill="#38bdf8" fontSize="13" fontFamily="monospace">
        {isZh ? "华夫板多孔结构 (Waffle Slab)" : (isTh ? "โครงสร้างพื้นรังผึ้ง (Waffle Slab)" : "Waffle Slab Aperture Matrix (Waffle Slab)")}
      </text>

      {/* Independent Floating Plinth */}
      <rect x="220" y="230" width="360" height="60" fill="var(--illustration-bg, #151E2E)" stroke="#10b981" strokeWidth="3" />
      <text x="300" y="265" fill="#34d399" fontSize="14" fontFamily="monospace" fontWeight="bold">
        {isZh ? "独立精密防微振基台 (VC-E 级)" : (isTh ? "ฐานรากลดแรงสั่นสะเทือน (ระดับ VC-E)" : "Isolated Floating Base Plinth (VC-E Level)")}
      </text>

      {/* Air Springs */}
      {[260, 350, 440, 530].map((x, i) => (
        <g key={i}>
          <rect x={x - 20} y="290" width="40" height="45" rx="5" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
          <line x1={x - 15} y1="305" x2={x + 15} y2="305" stroke="#fbbf24" strokeWidth="2" />
          <line x1={x - 15} y1="320" x2={x + 15} y2="320" stroke="#fbbf24" strokeWidth="2" />
        </g>
      ))}
      <text x="250" y="360" fill="#fbbf24" fontSize="11" fontFamily="monospace">
        {isZh ? "主动气压伺服隔振器 (Natural Freq < 1.2Hz)" : (isTh ? "สปริงลมลดแรงสั่นสะเทือนแบบแอกทีฟ (< 1.2Hz)" : "Active Pneumatic Servo Isolators (Natural Freq < 1.2Hz)")}
      </text>

      {/* Bedrock Foundation */}
      <rect x="180" y="380" width="440" height="30" fill="#1e293b" />
      <line x1="80" y1="380" x2="720" y2="380" stroke="#64748b" strokeWidth="2" />
      <text x="85" y="405" fill="#64748b" fontSize="11" fontFamily="monospace">
        {isZh ? "下层深桩承台岩石锚固面" : (isTh ? "ฐานรากเสาเข็มลึกยึดชั้นหิน" : "Deep Pile Cap Bedrock Anchor Interface")}
      </text>
    </svg>
  );
}

function SvgProject05({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 跨海斜拉桥超深水中双壁钢围堰与沉井基础 (4:5)
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#080f1e" />
      {/* Water layer */}
      <rect x="0" y="100" width="400" height="220" fill="#0c2340" opacity="0.6" />
      <path d="M 0 100 Q 100 95 200 100 T 400 100" fill="none" stroke="#0284c7" strokeWidth="2" />
      <text x="20" y="85" fill="#38bdf8" fontSize="11" fontFamily="monospace">
        {isZh ? "海面水标高 +3.20m" : (isTh ? "ระดับน้ำทะเล +3.20 ม." : "Sea Level Elev. +3.20m")}
      </text>
      <text x="20" y="315" fill="#64748b" fontSize="11" fontFamily="monospace">
        {isZh ? "冲刷海底面 -42.00m" : (isTh ? "ระดับก้นทะเลถูกกัดเซาะ -42.00 ม." : "Scour Seabed Level -42.00m")}
      </text>

      {/* Double-wall Steel Cofferdam */}
      <rect x="80" y="60" width="30" height="320" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
      <rect x="290" y="60" width="30" height="320" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
      <line x1="80" y1="120" x2="110" y2="120" stroke="#f59e0b" strokeWidth="1" />
      <line x1="290" y1="120" x2="320" y2="120" stroke="#f59e0b" strokeWidth="1" />

      {/* Main Bridge Tower Pier Base */}
      <rect x="130" y="20" width="140" height="240" fill="var(--illustration-bg, #151E2E)" stroke="#38bdf8" strokeWidth="2" />
      <text x="145" y="140" fill="#e2e8f0" fontSize="12" fontFamily="monospace">
        {isZh ? "索塔主承台" : (isTh ? "ฐานรากเสาหลักสะพานขึง" : "Cable Tower Main Pile Cap")}
      </text>

      {/* Bored Piles Group in Seabed */}
      {[105, 150, 195, 240, 285].map((x, i) => (
        <rect key={i} x={x} y="340" width="16" height="140" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
      ))}
      <text x="120" y="470" fill="#94a3b8" fontSize="11" fontFamily="monospace">
        {isZh ? "Φ2.8m 超深钻孔灌注桩群" : (isTh ? "กลุ่มเสาเข็มเจาะลึกพิเศษ Φ2.8 ม." : "Φ2.8m Ultra-Deep Bored Pile Group")}
      </text>
    </svg>
  );
}

function SvgProject06({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 重型工业厂房箱型钢管混凝土柱轴测三维剖透 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1a" />
      {/* 3D Box column axonometric */}
      <polygon points="200,80 380,50 440,110 260,140" fill="#1e293b" stroke="#0ea5e9" strokeWidth="2" />
      <polygon points="200,80 260,140 260,380 200,320" fill="var(--illustration-bg, #151E2E)" stroke="#0ea5e9" strokeWidth="2" />
      <polygon points="260,140 440,110 440,350 260,380" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />

      {/* Cutout showing internal concrete and shear studs */}
      <polygon points="280,180 400,160 400,310 280,330" fill="#334155" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="290" y="250" fill="#fbbf24" fontSize="12" fontFamily="monospace">
        {isZh ? "C60 自密实混凝土核心" : (isTh ? "แกนคอนกรีตไหลตัวแน่นเอง C60" : "C60 Self-Compacting Concrete Core")}
      </text>

      {/* Internal Shear Studs */}
      {[200, 230, 260, 290].map(y => (
        <g key={y}>
          <circle cx="310" cy={y} r="4" fill="#ef4444" />
          <circle cx="350" cy={y - 5} r="4" fill="#ef4444" />
          <circle cx="380" cy={y - 10} r="4" fill="#ef4444" />
        </g>
      ))}
      <text x="80" y="240" fill="#38bdf8" fontSize="12" fontFamily="monospace">□1200×1200×40mm</text>
      <text x="80" y="260" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "Q355NH 特厚钢板外壁" : (isTh ? "แผ่นเหล็กหนาพิเศษทนสภาพอากาศ Q355NH" : "Q355NH Heavy Steel Plate Wall")}
      </text>
    </svg>
  );
}

function SvgProject07({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 工业厂房光伏建筑一体化(BIPV)金属屋面断面 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#090f1d" />
      {/* PV Panels on Top */}
      <rect x="120" y="100" width="240" height="20" rx="3" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
      <rect x="420" y="100" width="240" height="20" rx="3" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
      <text x="180" y="115" fill="#e0f2fe" fontSize="12" fontFamily="monospace">
        {isZh ? "高效单晶 N 型光伏组件" : (isTh ? "แผงโซลาร์เซลล์ N-Type ประสิทธิภาพสูง" : "High-Efficiency N-Type Mono PV Module")}
      </text>
      <text x="480" y="115" fill="#e0f2fe" fontSize="12" fontFamily="monospace">
        {isZh ? "高效单晶 N 型光伏组件" : (isTh ? "แผงโซลาร์เซลล์ N-Type ประสิทธิภาพสูง" : "High-Efficiency N-Type Mono PV Module")}
      </text>

      {/* Clamps without Roof Penetration */}
      <rect x="230" y="120" width="20" height="30" fill="#f59e0b" />
      <rect x="530" y="120" width="20" height="30" fill="#f59e0b" />
      <text x="260" y="138" fill="#fbbf24" fontSize="11" fontFamily="monospace">
        {isZh ? "360°咬合专用抗风夹具" : (isTh ? "แคลมป์ยึดตะเข็บกันลม 360°" : "360° Seam Wind-Resistant Clamp")}
      </text>

      {/* Standing Seam Metal Roof */}
      <path d="M 60 170 L 230 150 L 240 170 L 530 150 L 540 170 L 740 150" fill="none" stroke="#94a3b8" strokeWidth="4" />
      {/* Thermal Insulation Layer */}
      <rect x="60" y="174" width="680" height="40" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <text x="320" y="200" fill="#94a3b8" fontSize="12" fontFamily="monospace">
        {isZh ? "100mm 离心玻璃丝绵保温芯材" : (isTh ? "ฉนวนใยแก้วกันความร้อน 100 มม." : "100mm Centrifugal Glass Wool Core")}
      </text>

      {/* Bottom Purlin */}
      <rect x="160" y="220" width="60" height="60" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      <rect x="560" y="220" width="60" height="60" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
      <text x="230" y="255" fill="#cbd5e1" fontSize="12" fontFamily="monospace">
        {isZh ? "C 型冷弯高频连续檩条" : (isTh ? "แปเหล็กขึ้นรูปเย็นหน้าตัด C" : "C-Section Cold-Formed Continuous Purlin")}
      </text>
    </svg>
  );
}

function SvgProject08({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 四舱室城市地下综合管廊标准横断面配置 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      {/* Outer Concrete Box */}
      <rect x="40" y="60" width="420" height="380" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
      {/* Chamber Dividers */}
      <line x1="250" y1="60" x2="250" y2="440" stroke="#38bdf8" strokeWidth="3" />
      <line x1="40" y1="250" x2="460" y2="250" stroke="#38bdf8" strokeWidth="3" />

      {/* 4 Chambers */}
      {/* Chamber 1: Power Cable */}
      <rect x="55" y="75" width="180" height="160" fill="var(--illustration-bg, #151E2E)" />
      <text x="75" y="105" fill="#f59e0b" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {isZh ? "① 高压电力舱" : (isTh ? "① ช่องอุโมงค์สายไฟแรงสูง" : "① High-Voltage Power Chamber")}
      </text>
      <circle cx="90" cy="140" r="12" fill="#b45309" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="130" cy="140" r="12" fill="#b45309" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="170" cy="140" r="12" fill="#b45309" stroke="#fbbf24" strokeWidth="1.5" />
      <text x="85" y="180" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "110kV 电力电缆架" : (isTh ? "รางสายไฟฟ้า 110kV" : "110kV Power Cable Tray")}
      </text>

      {/* Chamber 2: Water Supply */}
      <rect x="265" y="75" width="180" height="160" fill="var(--illustration-bg, #151E2E)" />
      <text x="285" y="105" fill="#0ea5e9" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {isZh ? "② 给水与再生水舱" : (isTh ? "② ช่องอุโมงค์ท่อประปาและน้ำรีไซเคิล" : "② Water Supply & Reclaimed Water Chamber")}
      </text>
      <circle cx="340" cy="155" r="26" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
      <text x="315" y="205" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "DN1000 供水主管" : (isTh ? "ท่อส่งน้ำหลัก DN1000" : "DN1000 Water Supply Main")}
      </text>

      {/* Chamber 3: Gas Chamber */}
      <rect x="55" y="265" width="180" height="160" fill="var(--illustration-bg, #151E2E)" />
      <text x="75" y="295" fill="#ef4444" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {isZh ? "③ 独立燃气天然气舱" : (isTh ? "③ ช่องอุโมงค์ก๊าซธรรมชาติแยกอิสระ" : "③ Dedicated Natural Gas Chamber")}
      </text>
      <circle cx="135" cy="350" r="22" fill="#991b1b" stroke="#f87171" strokeWidth="2" />
      <text x="80" y="400" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "防爆强排风与泄压口" : (isTh ? "ช่องระบายอากาศและระบายแรงดันกันระเบิด" : "Explosion-Proof Exhaust & Relief Vent")}
      </text>

      {/* Chamber 4: Telecommunication & Drainage */}
      <rect x="265" y="265" width="180" height="160" fill="var(--illustration-bg, #151E2E)" />
      <text x="285" y="295" fill="#10b981" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {isZh ? "④ 弱电通信综合舱" : (isTh ? "④ ช่องอุโมงค์โทรคมนาคมและสัญญาณ" : "④ Telecom & Communication Chamber")}
      </text>
      <line x1="285" y1="340" x2="425" y2="340" stroke="#34d399" strokeWidth="2" />
      <line x1="285" y1="360" x2="425" y2="360" stroke="#34d399" strokeWidth="2" />
      <text x="300" y="400" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "多网光纤综合桥架" : (isTh ? "รางสายเคเบิลใยแก้วนำแสงรวมโครงข่าย" : "Multi-Network Fiber Optical Cable Tray")}
      </text>
    </svg>
  );
}

// 2. COMPANY BLUEPRINTS
function SvgCompany01({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  // EPC 协同网络拓扑 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1c" />
      {/* Central Hub */}
      <circle cx="400" cy="225" r="70" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
      <text x="350" y="220" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">{isZh ? "EPC 总包中枢" : "EPC Prime Hub"}</text>
      <text x="360" y="240" fill="#94a3b8" fontSize="11" fontFamily="monospace">Demo Org B</text>

      {/* Surrounding Nodes */}
      {[
        { x: 180, y: 120, label: isZh ? '设计院 Org C' : 'Design Inst. Org C', sub: isZh ? '正向 BIM 交付' : 'BIM Forward Detailing' },
        { x: 620, y: 120, label: isZh ? '地基工程 Org D' : 'Foundations Org D', sub: isZh ? '深基坑支撑' : 'Deep Pit Shoring' },
        { x: 620, y: 330, label: isZh ? '机电安装 Org E' : 'MEP Org E', sub: isZh ? '洁净动力深化' : 'Cleanroom Piping' },
        { x: 180, y: 330, label: isZh ? '全过程监理 Org G' : 'Supervision Org G', sub: isZh ? '第三方旁站签证' : 'Third-Party Witness' },
        { x: 400, y: 70, label: isZh ? '业主发包方 Org A' : 'Owner Client Org A', sub: isZh ? '投资管理看板' : 'Capex Dashboard' },
      ].map((n, i) => (
        <g key={i}>
          <line x1="400" y1="225" x2={n.x} y2={n.y} stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx={n.x} cy={n.y} r="45" fill="var(--illustration-bg, #151E2E)" stroke="#f59e0b" strokeWidth="2" />
          <text x={n.x - 40} y={n.y - 5} fill="#fbbf24" fontSize="11" fontFamily="monospace">{n.label}</text>
          <text x={n.x - 40} y={n.y + 12} fill="#94a3b8" fontSize="9" fontFamily="monospace">{n.sub}</text>
        </g>
      ))}
    </svg>
  );
}

function SvgCompany02() {
  // 设计院正向 BIM 协同流水线 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#090d18" />
      <text x="40" y="50" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">BIM 全专业协同矩阵 (Demo Org C)</text>
      {/* 3 Pipeline stages */}
      {[
        { x: 60, title: '建筑与结构建模', items: ['轴网对齐', '空间网架验算', '钢管柱碰撞消解'] },
        { x: 230, title: '机电动力综合管线', items: ['HVAC管道排布', '桥架与喷淋净高', '阀门检修空间'] },
        { x: 400, title: '联合图审与预制出图', items: ['1240处碰撞归零', '数控加工构件图', '数字化签章存证'] },
      ].map((col, idx) => (
        <g key={idx}>
          <rect x={col.x} y="80" width="150" height="300" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x={col.x + 12} y="115" fill="#fbbf24" fontSize="12" fontFamily="monospace">{col.title}</text>
          {col.items.map((it, i) => (
            <g key={i}>
              <rect x={col.x + 10} y={150 + i * 65} width="130" height="45" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#64748b" strokeWidth="1" />
              <text x={col.x + 20} y={178 + i * 65} fill="#e2e8f0" fontSize="11" fontFamily="monospace">✓ {it}</text>
            </g>
          ))}
          {idx < 2 && (
            <polygon points={`${col.x + 155},230 ${col.x + 165},220 ${col.x + 165},240`} fill="#0ea5e9" />
          )}
        </g>
      ))}
    </svg>
  );
}

function SvgCompany03() {
  // 特种地基工程装备矩阵 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="30" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">特种地下施工能力 (Demo Org D)</text>
      {/* 4 Quadrants */}
      {[
        { x: 30, y: 70, title: '双轮铣槽机', spec: '成槽深度 65m / 硬岩切削', status: '持证在册' },
        { x: 260, y: 70, title: '液压抓斗机组', spec: '垂直度偏差 &lt; 1/500', status: '持证在册' },
        { x: 30, y: 260, title: '伺服补压监控台', spec: '24路液压自适应响应', status: '自研技术' },
        { x: 260, y: 260, title: '旋喷桩加固系统', spec: '三重管高压摆喷止水帷幕', status: '国家示范' },
      ].map((q, i) => (
        <g key={i}>
          <rect x={q.x} y={q.y} width="210" height="170" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
          <text x={q.x + 15} y={q.y + 35} fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">{q.title}</text>
          <text x={q.x + 15} y={q.y + 70} fill="#cbd5e1" fontSize="11" fontFamily="monospace">{q.spec}</text>
          <rect x={q.x + 15} y={q.y + 110} width="80" height="24" rx="3" fill="var(--illustration-bg, #151E2E)" stroke="#10b981" strokeWidth="1" />
          <text x={q.x + 25} y={q.y + 126} fill="#34d399" fontSize="10" fontFamily="monospace">● {q.status}</text>
        </g>
      ))}
    </svg>
  );
}

function SvgCompany04() {
  // 机电模块装配加工全景 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#070c18" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">洁净机电数字化装配流水线 (Demo Org E)</text>
      {/* Conveyor line */}
      <line x1="60" y1="230" x2="740" y2="230" stroke="#0284c7" strokeWidth="6" />
      {[120, 280, 440, 600].map((x, i) => (
        <g key={i}>
          <rect x={x} y="150" width="100" height="140" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
          <text x={x + 15} y="180" fill="#fbbf24" fontSize="12" fontFamily="monospace">模块单元 #{i + 1}</text>
          <line x1={x + 10} y1="210" x2={x + 90} y2="210" stroke="#38bdf8" strokeWidth="3" />
          <line x1={x + 10} y1="240" x2={x + 90} y2="240" stroke="#10b981" strokeWidth="3" />
          <text x={x + 15} y="270" fill="#94a3b8" fontSize="10" fontFamily="monospace">管线一体预装</text>
        </g>
      ))}
      <text x="80" y="360" fill="#cbd5e1" fontSize="12" fontFamily="monospace">全自动数控轨道焊 ➔ 氮气保压试验 ➔ 无尘包装装箱 ➔ 准时制(JIT)物流进场</text>
    </svg>
  );
}

function SvgCompany05() {
  // 钢结构智能焊接探伤质保体系 (4:5)
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1c" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">重型钢构质保体系 (Demo Org B)</text>
      {/* 5-step flow */}
      {[
        '1. 母材复验与理化试验',
        '2. 坡口数控倒角与除锈',
        '3. 机器人全位置气体保护焊',
        '4. 焊缝相控阵超声探伤 100%',
        '5. 质检工程师数字电子签章'
      ].map((s, idx) => (
        <g key={idx}>
          <rect x="40" y={70 + idx * 75} width="320" height="50" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="60" y={102 + idx * 75} fill="#e2e8f0" fontSize="12" fontFamily="monospace">{s}</text>
          {idx < 4 && (
            <line x1="200" y1={120 + idx * 75} x2="200" y2={145 + idx * 75} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 2" />
          )}
        </g>
      ))}
    </svg>
  );
}

function SvgCompany06() {
  // 全过程工程监理质检中枢 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">全过程监理质控体系 (Demo Org G)</text>
      {/* 3 Core pillars */}
      <rect x="50" y="80" width="140" height="280" rx="6" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
      <text x="70" y="115" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">事前控制</text>
      <text x="70" y="150" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 专项方案专家论证</text>
      <text x="70" y="180" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 特种作业持证审核</text>
      <text x="70" y="210" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 原材料进场见证取样</text>

      <rect x="230" y="80" width="140" height="280" rx="6" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
      <text x="250" y="115" fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">事中控制</text>
      <text x="250" y="150" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 关键工序 100% 旁站</text>
      <text x="250" y="180" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 激光三维实测实量</text>
      <text x="250" y="210" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 隐蔽工程联合验收</text>

      <rect x="410" y="80" width="140" height="280" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <text x="430" y="115" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">事后控制</text>
      <text x="430" y="150" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 分部工程质量验评</text>
      <text x="430" y="180" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 竣工存证哈希归档</text>
      <text x="430" y="210" fill="#cbd5e1" fontSize="10" fontFamily="monospace">• 缺陷责任期跟踪</text>
    </svg>
  );
}

// 3. PEOPLE BLUEPRINTS
function SvgPeople01({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  // 一级建造师履约技能雷达 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">{isZh ? "项目总监履约雷达 (Demo Engineer 01)" : "Project Director Radar (Demo Engineer 01)"}</text>
      {/* Radar grid web */}
      <polygon points="250,90 380,170 380,330 250,410 120,330 120,170" fill="none" stroke="#334155" strokeWidth="1" />
      <polygon points="250,130 340,190 340,300 250,360 160,300 160,190" fill="none" stroke="#334155" strokeWidth="1" />
      <polygon points="250,170 300,210 300,270 250,310 200,270 200,210" fill="none" stroke="#334155" strokeWidth="1" />
      {/* Axes */}
      <line x1="250" y1="250" x2="250" y2="90" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="250" y1="250" x2="380" y2="170" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="250" y1="250" x2="380" y2="330" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="250" y1="250" x2="250" y2="410" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="250" y1="250" x2="120" y2="330" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="250" y1="250" x2="120" y2="170" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />

      {/* Actual Skill Polygon */}
      <polygon points="250,110 365,180 350,320 250,390 140,315 135,185" fill="#0284c7" fillOpacity="0.35" stroke="#38bdf8" strokeWidth="2.5" />
      
      {/* Vertex Labels */}
      <text x="215" y="80" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "危大工程把控 95%" : "Critical Risk Control 95%"}</text>
      <text x="390" y="175" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "现场快速索赔 88%" : "Claims Management 88%"}</text>
      <text x="390" y="335" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "BIM数字化调度 82%" : "BIM Digital Dispatch 82%"}</text>
      <text x="215" y="435" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "安全零事故考核 96%" : "Zero-Accident Safety 96%"}</text>
      <text x="30" y="335" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "施工造价优化 85%" : "Cost Optimization 85%"}</text>
      <text x="40" y="175" fill="#38bdf8" fontSize="11" fontFamily="monospace">{isZh ? "技术交底穿透 92%" : "Technical Briefing 92%"}</text>
    </svg>
  );
}

function SvgPeople02() {
  // 结构总工有限元验算卡 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1c" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">有限元应力验算手记 (Demo Engineer 02)</text>
      {/* FEA Stress Cloud Diagram */}
      <rect x="50" y="65" width="500" height="260" rx="6" fill="var(--illustration-bg, #151E2E)" stroke="#334155" strokeWidth="1.5" />
      {/* Gradient Stress Wave */}
      <path d="M 70 200 Q 180 90 280 210 T 520 180" fill="none" stroke="#ef4444" strokeWidth="4" />
      <path d="M 70 220 Q 180 120 280 230 T 520 200" fill="none" stroke="#f59e0b" strokeWidth="3" />
      <path d="M 70 240 Q 180 150 280 250 T 520 220" fill="none" stroke="#3b82f6" strokeWidth="2" />
      <text x="70" y="100" fill="#ef4444" fontSize="11" fontFamily="monospace">最大应力峰值 σ_max = 248.5 MPa &lt; [σ]=295 MPa (Q355)</text>
      <text x="70" y="125" fill="#34d399" fontSize="11" fontFamily="monospace">一阶屈曲安全系数 λ_1 = 4.82 &gt; 规范限值 3.0 (满足)</text>

      {/* Engineer Sign Stamp */}
      <rect x="360" y="340" width="190" height="80" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="375" y="365" fill="#fbbf24" fontSize="11" fontFamily="monospace">一级注册结构工程师</text>
      <text x="375" y="388" fill="#e2e8f0" fontSize="12" fontFamily="monospace">签章: Demo Engineer 02</text>
      <text x="375" y="408" fill="#94a3b8" fontSize="10" fontFamily="monospace">执业印章号: MOCK-REG-ST-02</text>
    </svg>
  );
}

function SvgPeople03() {
  // 数字化总监 4D 孪生看板 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#070c18" />
      <text x="40" y="40" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">4D 现场数字孪生指挥舱 (Demo Engineer 06)</text>
      {/* 3 Split screens */}
      <rect x="40" y="65" width="220" height="280" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#0ea5e9" strokeWidth="1.5" />
      <text x="55" y="95" fill="#38bdf8" fontSize="12" fontFamily="monospace">无人机航测点云</text>
      <rect x="55" y="115" width="190" height="150" fill="#1e293b" />
      <text x="75" y="200" fill="#94a3b8" fontSize="11" fontFamily="monospace">点云密度 2500 pts/m²</text>

      <rect x="290" y="65" width="220" height="280" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#10b981" strokeWidth="1.5" />
      <text x="305" y="95" fill="#34d399" fontSize="12" fontFamily="monospace">4D BIM 施工进度模拟</text>
      <rect x="305" y="115" width="190" height="150" fill="#1e293b" />
      <text x="325" y="200" fill="#94a3b8" fontSize="11" fontFamily="monospace">阶段比对: 提前 4 天</text>

      <rect x="540" y="65" width="220" height="280" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="555" y="95" fill="#fbbf24" fontSize="12" fontFamily="monospace">现场 IoT 传感器流</text>
      <rect x="555" y="115" width="190" height="150" fill="#1e293b" />
      <text x="575" y="200" fill="#94a3b8" fontSize="11" fontFamily="monospace">32 处温湿度/振动在线</text>

      <text x="40" y="390" fill="#64748b" fontSize="11" fontFamily="monospace">全场时空基准对齐 · 精度误差 &lt; 3mm · 自动生成每日数字化监理日志</text>
    </svg>
  );
}

function SvgPeople04() {
  // 总监理工程师现场旁站轨迹 (4:5)
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">旁站巡检轨迹图 (Demo Engineer 04)</text>
      {/* Site map outline */}
      <rect x="40" y="70" width="320" height="360" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
      {/* Route lines */}
      <path d="M 80 120 L 220 120 L 220 240 L 300 240 L 300 360 L 140 360 Z" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" />
      {/* Checkpoints */}
      {[
        { x: 80, y: 120, label: 'CP1 桩基进场' },
        { x: 220, y: 120, label: 'CP2 钢柱吊装' },
        { x: 220, y: 240, label: 'CP3 顶升液压站' },
        { x: 300, y: 240, label: 'CP4 焊缝探伤' },
        { x: 300, y: 360, label: 'CP5 洁净管廊' },
        { x: 140, y: 360, label: 'CP6 试块标养室' }
      ].map((cp, idx) => (
        <g key={idx}>
          <circle cx={cp.x} cy={cp.y} r="8" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
          <text x={cp.x + 12} y={cp.y + 4} fill="#e2e8f0" fontSize="10" fontFamily="monospace">{cp.label}</text>
        </g>
      ))}
      <text x="50" y="460" fill="#34d399" fontSize="11" fontFamily="monospace">✓ 6 个旁站点 100% 录入存证链条 (EVD-P001-089)</text>
    </svg>
  );
}

function SvgPeople05() {
  // 机电调试工程师风平衡拓扑 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1a" />
      <text x="30" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">百级洁净室风压平衡 (Demo Engineer 03)</text>
      {/* Pressure zones */}
      <rect x="40" y="80" width="120" height="340" fill="#065f46" stroke="#34d399" strokeWidth="2" />
      <text x="60" y="115" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">光刻主区</text>
      <text x="60" y="145" fill="#e2e8f0" fontSize="12" fontFamily="monospace">+35 Pa</text>
      <text x="60" y="170" fill="#a7f3d0" fontSize="10" fontFamily="monospace">Class 100</text>

      <polygon points="160,250 190,240 190,260" fill="#38bdf8" />

      <rect x="190" y="80" width="120" height="340" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
      <text x="210" y="115" fill="#60a5fa" fontSize="13" fontFamily="monospace" fontWeight="bold">辅助工艺区</text>
      <text x="210" y="145" fill="#e2e8f0" fontSize="12" fontFamily="monospace">+25 Pa</text>
      <text x="210" y="170" fill="#bfdbfe" fontSize="10" fontFamily="monospace">Class 1000</text>

      <polygon points="310,250 340,240 340,260" fill="#38bdf8" />

      <rect x="340" y="80" width="120" height="340" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
      <text x="360" y="115" fill="#94a3b8" fontSize="13" fontFamily="monospace" fontWeight="bold">气锁缓冲更衣</text>
      <text x="360" y="145" fill="#e2e8f0" fontSize="12" fontFamily="monospace">+15 Pa</text>
      <text x="360" y="170" fill="#cbd5e1" fontSize="10" fontFamily="monospace">Class 10000</text>

      <text x="50" y="460" fill="#fbbf24" fontSize="11" fontFamily="monospace">压差梯度控制避免外界空气逆流倒灌 · 换气次数 65 次/h</text>
    </svg>
  );
}

// 4. NEWS SCHEMATICS
function SvgNews01() {
  // 绿色建造政策解析图 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#07121e" />
      <text x="40" y="50" fill="#38bdf8" fontSize="15" fontFamily="monospace" fontWeight="bold">绿色建造与工业装配式补贴政策实施路径</text>
      {/* 3 Big blocks */}
      {[
        { x: 50, title: '装配率标准 ≥65%', desc: '工业厂房预制构件纳入绿色建材目录', rate: '最高返税 15%' },
        { x: 300, title: '屋顶光伏覆盖 ≥50%', desc: 'BIPV金属屋面一体化并网直供车间', rate: '度电补贴 0.08元' },
        { x: 550, title: '数字化存证审计', desc: '全过程碳排放模型核查与第三方认证', rate: '国家示范授牌' }
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y="85" width="200" height="260" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
          <text x={b.x + 15} y={130} fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">{b.title}</text>
          <text x={b.x + 15} y={180} fill="#cbd5e1" fontSize="11" fontFamily="monospace">{b.desc}</text>
          <rect x={b.x + 15} y="260" width="170" height="40" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#fbbf24" strokeWidth="1" />
          <text x={b.x + 30} y="285" fill="#fbbf24" fontSize="12" fontFamily="monospace" fontWeight="bold">{b.rate}</text>
        </g>
      ))}
      <text x="50" y="390" fill="#64748b" fontSize="11" fontFamily="monospace">来源: 重点产业园区低碳工业工程技术公报 (MOCK-NEWS-01)</text>
    </svg>
  );
}

function SvgNews02() {
  // 1600t 履带吊现场就位快讯 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">现场快讯: 1600t 履带起重机就位工况图</text>
      {/* Crane Crane boom diagram */}
      <line x1="120" y1="360" x2="480" y2="100" stroke="#f59e0b" strokeWidth="6" />
      <line x1="120" y1="360" x2="280" y2="80" stroke="#fbbf24" strokeWidth="3" />
      <line x1="280" y1="80" x2="480" y2="100" stroke="#fbbf24" strokeWidth="2" />
      {/* Crane body */}
      <rect x="60" y="340" width="120" height="45" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="80" cy="395" r="10" fill="#475569" />
      <circle cx="110" cy="395" r="10" fill="#475569" />
      <circle cx="140" cy="395" r="10" fill="#475569" />
      <circle cx="170" cy="395" r="10" fill="#475569" />
      {/* Hoist cable and hook */}
      <line x1="480" y1="100" x2="480" y2="280" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
      <rect x="440" y="280" width="80" height="40" fill="#1e293b" stroke="#ef4444" strokeWidth="2" />
      <text x="445" y="305" fill="#f87171" fontSize="11" fontFamily="monospace">680t 网架单元</text>
      <text x="180" y="240" fill="#fbbf24" fontSize="11" fontFamily="monospace">主臂 96m · 作业半径 32m</text>
    </svg>
  );
}

function SvgNews03() {
  // 特厚钢板价格与交期趋势 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1c" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">Q4 结构特厚钢板价格走势与钢厂轧制交期</text>
      {/* Graph Area */}
      <line x1="80" y1="360" x2="720" y2="360" stroke="#475569" strokeWidth="2" />
      <line x1="80" y1="100" x2="80" y2="360" stroke="#475569" strokeWidth="2" />
      {/* Price curve */}
      <path d="M 80 300 Q 240 220 400 240 T 720 150" fill="none" stroke="#ef4444" strokeWidth="3" />
      <text x="640" y="140" fill="#ef4444" fontSize="11" fontFamily="monospace">特厚板现货均价 (元/t)</text>
      {/* Delivery cycle bar */}
      {[
        { x: 120, h: 140, label: '7月 (25天)' },
        { x: 260, h: 180, label: '8月 (32天)' },
        { x: 400, h: 160, label: '9月 (28天)' },
        { x: 540, h: 220, label: '10月 (40天)' },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={360 - b.h} width="60" height={b.h} fill="#0369a1" opacity="0.4" stroke="#38bdf8" strokeWidth="1" />
          <text x={b.x - 5} y={350 - b.h} fill="#38bdf8" fontSize="10" fontFamily="monospace">{b.label}</text>
        </g>
      ))}
      <text x="80" y="400" fill="#94a3b8" fontSize="11" fontFamily="monospace">数据监测: 工业建筑工程供应链智库 (MOCK INDEX)</text>
    </svg>
  );
}

function SvgNews04() {
  // 工业厂房碳排放环形分解 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#08101e" />
      <text x="30" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">超净厂房全生命周期碳排放结构</text>
      {/* Donut chart */}
      <circle cx="250" cy="240" r="140" fill="none" stroke="#1e293b" strokeWidth="50" />
      <circle cx="250" cy="240" r="140" fill="none" stroke="#0ea5e9" strokeWidth="50" strokeDasharray="260 880" />
      <circle cx="250" cy="240" r="140" fill="none" stroke="#10b981" strokeWidth="50" strokeDasharray="180 880" strokeDashoffset="-260" />
      <circle cx="250" cy="240" r="140" fill="none" stroke="#f59e0b" strokeWidth="50" strokeDasharray="140 880" strokeDashoffset="-440" />
      <circle cx="250" cy="240" r="140" fill="none" stroke="#ef4444" strokeWidth="50" strokeDasharray="120 880" strokeDashoffset="-580" />

      {/* Legend inside */}
      <text x="205" y="235" fill="#e2e8f0" fontSize="16" fontFamily="monospace" fontWeight="bold">近零能耗</text>
      <text x="180" y="260" fill="#34d399" fontSize="12" fontFamily="monospace">减碳目标 -42%</text>

      {/* Bottom explanation */}
      <text x="40" y="430" fill="#38bdf8" fontSize="11" fontFamily="monospace">■ 钢结构构件 38%</text>
      <text x="170" y="430" fill="#34d399" fontSize="11" fontFamily="monospace">■ 暖通机电 26%</text>
      <text x="290" y="430" fill="#fbbf24" fontSize="11" fontFamily="monospace">■ 混凝土基坑 20%</text>
      <text x="400" y="430" fill="#f87171" fontSize="11" fontFamily="monospace">■ 施工 16%</text>
    </svg>
  );
}

function SvgNews05() {
  // 3D 激光雷达实景逆向扫描偏差图 (4:5)
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">LiDAR 实测点云偏差色谱 (P001)</text>
      {/* 3D Wireframe Mesh */}
      <polygon points="60,100 340,70 340,350 60,390" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      {[130, 200, 270].map(y => (
        <line key={y} x1="60" y1={y + 30} x2="340" y2={y} stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
      ))}
      {[130, 200, 270].map(x => (
        <line key={x} x1={x} y1="90" x2={x} y2="370" stroke="#64748b" strokeWidth="1" strokeDasharray="2 2" />
      ))}
      {/* Color Heatspots */}
      <circle cx="180" cy="210" r="30" fill="#10b981" opacity="0.6" />
      <circle cx="280" cy="180" r="22" fill="#fbbf24" opacity="0.6" />
      <circle cx="100" cy="270" r="16" fill="#ef4444" opacity="0.6" />

      {/* Color Scale Bar */}
      <rect x="50" y="430" width="300" height="15" rx="3" fill="#334155" />
      <text x="40" y="465" fill="#34d399" fontSize="10" fontFamily="monospace">-2mm (优)</text>
      <text x="175" y="465" fill="#fbbf24" fontSize="10" fontFamily="monospace">0mm</text>
      <text x="310" y="465" fill="#f87171" fontSize="10" fontFamily="monospace">+3mm (警)</text>
    </svg>
  );
}

function SvgNews06() {
  // EPC 招标中标盘点 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1c" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">重点产业园区 EPC 标段中标金额分类盘点</text>
      {/* Bar Chart */}
      {[
        { name: '重型结构工程', amount: '128.5 亿', w: 460, color: '#38bdf8' },
        { name: '特种机电安装', amount: '84.2 亿', w: 320, color: '#34d399' },
        { name: '深基坑与地基', amount: '56.0 亿', w: 220, color: '#fbbf24' },
        { name: '全过程监理咨询', amount: '12.4 亿', w: 90, color: '#f87171' },
      ].map((row, i) => (
        <g key={i}>
          <text x="50" y={115 + i * 65} fill="#cbd5e1" fontSize="12" fontFamily="monospace">{row.name}</text>
          <rect x="170" y={95 + i * 65} width={row.w} height="30" rx="4" fill={row.color} opacity="0.85" />
          <text x={185 + row.w} y={115 + i * 65} fill="#fff" fontSize="12" fontFamily="monospace">{row.amount}</text>
        </g>
      ))}
      <text x="50" y="380" fill="#64748b" fontSize="11" fontFamily="monospace">周度招采数据库统计 · 覆盖 42 个在建工业智造示范园区 (MOCK)</text>
    </svg>
  );
}

function SvgNews07() {
  // 跨国工业工厂海外交付案例 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#070c18" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">中国 EPC 智造车间出海交付网络</text>
      {/* Route map lines */}
      <circle cx="180" cy="220" r="10" fill="#ef4444" stroke="#fff" strokeWidth="2" />
      <text x="140" y="245" fill="#f87171" fontSize="11" fontFamily="monospace">中国总包基地</text>

      <path d="M 180 220 Q 300 140 420 260" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 3" />
      
      <circle cx="420" cy="260" r="10" fill="#10b981" stroke="#fff" strokeWidth="2" />
      <text x="380" y="290" fill="#34d399" fontSize="11" fontFamily="monospace">海外项目现场 (东盟)</text>

      {/* Cargo vessel icon or milestone */}
      <rect x="250" y="160" width="100" height="35" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="260" y="182" fill="#fbbf24" fontSize="11" fontFamily="monospace">特种构件远洋航运</text>
      <text x="40" y="380" fill="#94a3b8" fontSize="11" fontFamily="monospace">遵循国际 SEMI 及 FM 认证标准 · 100% 模块化正向深化装配</text>
    </svg>
  );
}

// 5. TECHNICAL PRINCIPLE SCHEMATICS
function SvgTech01({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  // 液压同步顶升动态反力平衡 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">{isZh ? "液压多吊点主从跟随闭环控制框图" : "Hydraulic Multi-Point Closed-Loop Control Diagram"}</text>
      {/* Control loops */}
      <rect x="60" y="100" width="140" height="70" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <text x="80" y="130" fill="#38bdf8" fontSize="12" fontFamily="monospace">{isZh ? "主控 PLC 系统" : "Master PLC System"}</text>
      <text x="80" y="150" fill="#94a3b8" fontSize="10" fontFamily="monospace">{isZh ? "位移/压力目标" : "Displacement / Pressure Target"}</text>

      <line x1="200" y1="135" x2="270" y2="135" stroke="#f59e0b" strokeWidth="3" />
      <polygon points="270,130 280,135 270,140" fill="#f59e0b" />

      <rect x="280" y="100" width="160" height="70" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
      <text x="300" y="130" fill="#fbbf24" fontSize="12" fontFamily="monospace">{isZh ? "比例伺服阀组" : "Proportional Servo Valves"}</text>
      <text x="300" y="150" fill="#94a3b8" fontSize="10" fontFamily="monospace">{isZh ? "流量无级微调" : "Stepless Flow Trim"}</text>

      <line x1="440" y1="135" x2="510" y2="135" stroke="#34d399" strokeWidth="3" />
      <polygon points="510,130 520,135 510,140" fill="#34d399" />

      <rect x="520" y="100" width="160" height="70" rx="6" fill="#1e293b" stroke="#34d399" strokeWidth="2" />
      <text x="540" y="130" fill="#34d399" fontSize="12" fontFamily="monospace">{isZh ? "液压提升千斤顶" : "Hydraulic Lifting Jacks"}</text>
      <text x="540" y="150" fill="#94a3b8" fontSize="10" fontFamily="monospace">{isZh ? "光栅尺微米位移" : "Grating Ruler Micron Sensor"}</text>

      {/* Feedback loop */}
      <path d="M 600 170 L 600 260 L 130 260 L 130 170" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
      <polygon points="125,180 130,170 135,180" fill="#ef4444" />
      <text x="290" y="285" fill="#f87171" fontSize="11" fontFamily="monospace">{isZh ? "反馈实时位移偏差 Δh ≤ 1.5mm (自适应脉冲纠偏)" : "Feedback Real-time Dev Δh ≤ 1.5mm (Adaptive Pulse Rectification)"}</text>
    </svg>
  );
}

function SvgTech02({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 伺服钢支撑轴力补偿控制曲线 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1a" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {isZh ? "深基坑伺服支撑轴力实测自适应补偿" : (isTh ? "การชดเชยแรงแนวแกนค้ำยันเซอร์โวหลุมขุดลึก" : "Deep Pit Servo Strut Axial Force Adaptive Compensation")}
      </text>
      <line x1="60" y1="360" x2="540" y2="360" stroke="#475569" strokeWidth="2" />
      <line x1="60" y1="80" x2="60" y2="360" stroke="#475569" strokeWidth="2" />
      {/* Design limit and warning lines */}
      <line x1="60" y1="120" x2="540" y2="120" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
      <text x="440" y="112" fill="#ef4444" fontSize="10" fontFamily="monospace">
        {isZh ? "设计上限 5500 kN" : (isTh ? "ขีดจำกัดการออกแบบ 5500 kN" : "Design Limit 5500 kN")}
      </text>
      {/* Actual force curve */}
      <path d="M 60 300 Q 180 200 300 220 T 520 160" fill="none" stroke="#38bdf8" strokeWidth="3" />
      <text x="340" y="210" fill="#38bdf8" fontSize="11" fontFamily="monospace">
        {isZh ? "实测补偿轴力 (伺服维持)" : (isTh ? "แรงแนวแกนชดเชยที่วัดได้ (ควบคุมด้วยเซอร์โว)" : "Measured Comp. Axial Force (Servo Sustained)")}
      </text>
      <text x="60" y="390" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "开挖土方阶段 (天数) ➔ 实时补偿消除邻近地铁沉降" : (isTh ? "ขั้นตอนขุดดิน (วัน) ➔ ชดเชยแบบเรียลไทม์ลดการทรุดตัวรถไฟฟ้า" : "Excavation Stage (Days) ➔ Real-time Compensation Eliminates Metro Settlement")}
      </text>
    </svg>
  );
}

function SvgTech03({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 微振动阻尼弹簧隔振器构造 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#080e1b" />
      <text x="30" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">
        {isZh ? "空气弹簧阻尼隔振器剖面大样" : (isTh ? "รูปตัดตัวแยกการสั่นสะเทือนสปริงลม" : "Air Spring Damper Vibration Isolator Section Detail")}
      </text>
      {/* Outer Casing */}
      <rect x="120" y="90" width="260" height="320" rx="12" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
      {/* Air Chamber */}
      <ellipse cx="250" cy="190" rx="90" ry="60" fill="#0369a1" opacity="0.4" stroke="#0ea5e9" strokeWidth="2" />
      <text x="200" y="195" fill="#e0f2fe" fontSize="12" fontFamily="monospace">
        {isZh ? "双气室空气弹簧" : (isTh ? "สปริงลมแบบสองห้อง" : "Dual-Chamber Air Spring")}
      </text>
      {/* Piston & Damper Fluid */}
      <rect x="235" y="250" width="30" height="90" fill="#f59e0b" />
      <rect x="180" y="330" width="140" height="50" fill="#334155" stroke="#fbbf24" strokeWidth="1.5" />
      <text x="195" y="360" fill="#fbbf24" fontSize="11" fontFamily="monospace">
        {isZh ? "黏滞流体阻尼腔" : (isTh ? "ห้องตัวหน่วงของเหลวหนืด" : "Viscous Fluid Damper Chamber")}
      </text>
      <text x="40" y="450" fill="#64748b" fontSize="11" fontFamily="monospace">
        {isZh ? "隔振效率: 垂直方向 > 96% · 截止频率 1.1 Hz" : (isTh ? "ประสิทธิภาพการแยกการสั่น: แนวตั้ง > 96% · คัตออฟ 1.1 Hz" : "Isolation Efficiency: Vertical > 96% · Cutoff Freq 1.1 Hz")}
      </text>
    </svg>
  );
}

function SvgTech04({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 相控阵超声波形与成像 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#070c18" />
      <text x="40" y="40" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">
        {isZh ? "焊缝相控阵超声 (PAUT) 声束扫查与回波成像" : (isTh ? "การกวาดลำคลื่นอัลตราโซนิก PAUT และภาพสะท้อนรอยเชื่อม" : "Phased Array Ultrasonic (PAUT) Beam Scan & Echo Imaging")}
      </text>
      {/* Probe and weld groove */}
      <polygon points="120,120 180,120 200,160 100,160" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
      <text x="110" y="145" fill="var(--illustration-bg, #151E2E)" fontSize="11" fontFamily="monospace" fontWeight="bold">
        {isZh ? "64阵元探头" : (isTh ? "หัวตรวจจับ 64 องค์ประกอบ" : "64-Element Array Probe")}
      </text>
      {/* Sound beam sector scan */}
      <path d="M 150 160 L 80 320 L 320 320 Z" fill="#0284c7" opacity="0.25" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
      {/* Weld Plate */}
      <rect x="40" y="280" width="340" height="60" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
      <polygon points="190,280 230,280 220,340 200,340" fill="#334155" stroke="#ef4444" strokeWidth="1.5" />
      <circle cx="210" cy="305" r="4" fill="#f87171" />
      <text x="225" y="310" fill="#f87171" fontSize="10" fontFamily="monospace">
        {isZh ? "未熔合缺陷回波" : (isTh ? "สัญญาณสะท้อนรอยต่อไม่หลอมละลาย" : "Lack of Fusion Defect Echo")}
      </text>

      {/* S-Scan Sector Image Monitor */}
      <rect x="440" y="70" width="320" height="280" rx="6" fill="var(--illustration-bg, #151E2E)" stroke="#0ea5e9" strokeWidth="2" />
      <text x="460" y="105" fill="#38bdf8" fontSize="12" fontFamily="monospace">
        {isZh ? "扇形 S-Scan 实时成像视图" : (isTh ? "มุมมองภาพเรียลไทม์เซกเตอร์ S-Scan" : "Sector S-Scan Real-time Imaging View")}
      </text>
      <circle cx="600" cy="220" r="12" fill="#ef4444" />
      <text x="560" y="255" fill="#fbbf24" fontSize="11" fontFamily="monospace">
        {isZh ? "缺陷深度: 18.4mm (合规评定)" : (isTh ? "ความลึกจุดบกพร่อง: 18.4 มม. (ประเมินผ่านเกณฑ์)" : "Defect Depth: 18.4mm (Acceptable)")}
      </text>
    </svg>
  );
}

function SvgTech05({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 地连墙锁口管防渗与水下浇筑 (4:5)
  return (
    <svg viewBox="0 0 400 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
        {isZh ? "地连墙接头水下浇筑工法" : (isTh ? "วิธีก่อสร้างเทคอนกรีตรอยต่อผนังไดอะแฟรมใต้น้ำ" : "Diaphragm Wall Joint Underwater Pouring Method")}
      </text>
      {/* Trench wall */}
      <rect x="60" y="70" width="280" height="360" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      {/* Tremie pipe */}
      <rect x="185" y="50" width="30" height="330" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
      {/* Concrete pouring bulb */}
      <ellipse cx="200" cy="370" rx="90" ry="40" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
      <text x="145" y="375" fill="#fff" fontSize="11" fontFamily="monospace">
        {isZh ? "水下自密实混凝土" : (isTh ? "คอนกรีตเทใต้น้ำแบบไหลตัวแน่นเอง" : "Underwater Self-Compacting Concrete")}
      </text>
      <text x="130" y="200" fill="#38bdf8" fontSize="11" fontFamily="monospace">
        {isZh ? "泥浆护壁比重 1.15" : (isTh ? "ความถ่วงจำเพาะสารละลายเบนโทไนต์ 1.15" : "Slurry Wall Specific Gravity 1.15")}
      </text>
      <text x="40" y="465" fill="#64748b" fontSize="10" fontFamily="monospace">
        {isZh ? "导管埋深保持 2-6m · 拔管由全站仪精准监控" : (isTh ? "ความลึกท่อเทคอนกรีต 2-6 ม. · ควบคุมด้วยกล้องโททัลสเตชัน" : "Tremie Depth 2-6m · Monitored via Total Station")}
      </text>
    </svg>
  );
}

function SvgTech06({ locale = "zh" } = {}) {
  const isZh = locale === "zh";
  const isTh = locale === "th";
  // 吊车梁疲劳应力谱与 S-N 曲线 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0e1a" />
      <text x="30" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">
        {isZh ? "重型吊车梁疲劳循环 S-N 验算" : (isTh ? "การตรวจสอบความล้า S-N ของคานเครนขนาดหนัก" : "Heavy Crane Girder Fatigue S-N Verification")}
      </text>
      <line x1="60" y1="380" x2="440" y2="380" stroke="#475569" strokeWidth="2" />
      <line x1="60" y1="80" x2="60" y2="380" stroke="#475569" strokeWidth="2" />
      <text x="40" y="75" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "应力幅 Δσ" : (isTh ? "ช่วงความเค้น Δσ" : "Stress Range Δσ")}
      </text>
      <text x="380" y="405" fill="#94a3b8" fontSize="10" fontFamily="monospace">
        {isZh ? "循环次数 N (2×10⁶)" : (isTh ? "จำนวนรอบ N (2×10⁶)" : "Cycle Count N (2×10⁶)")}
      </text>

      {/* S-N Line */}
      <line x1="90" y1="120" x2="380" y2="330" stroke="#ef4444" strokeWidth="3" />
      <line x1="380" y1="330" x2="440" y2="330" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" />
      <text x="260" y="200" fill="#f87171" fontSize="11" fontFamily="monospace">
        {isZh ? "常幅疲劳容许限值" : (isTh ? "ขีดจำกัดความล้าแอมพลิจูดคงที่" : "Constant Amplitude Fatigue Limit")}
      </text>

      {/* Working Point */}
      <circle cx="280" cy="260" r="7" fill="#10b981" stroke="#fff" strokeWidth="2" />
      <text x="300" y="265" fill="#34d399" fontSize="11" fontFamily="monospace">
        {isZh ? "P001 现场实测工况点 (安全储备 28%)" : (isTh ? "จุดสภาวะใช้งานจริงหน้างาน P001 (ความปลอดภัยสำรอง 28%)" : "P001 Site Operating Point (28% Margin)")}
      </text>
    </svg>
  );
}

// 6. RELATIONSHIP & EVIDENCE SCHEMATICS
function SvgRel01() {
  // 四方法律存证拓扑 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#080e1b" />
      <text x="40" y="45" fill="#38bdf8" fontSize="15" fontFamily="monospace" fontWeight="bold">工程四方履约合同与数字存证公报图谱 (DEMO-PRJ-P001)</text>
      {/* 4 Cards */}
      <rect x="60" y="90" width="220" height="120" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <text x="80" y="125" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">建设单位 Org A</text>
      <text x="80" y="150" fill="#94a3b8" fontSize="11" fontFamily="monospace">业主出资与发包</text>
      <text x="80" y="180" fill="#34d399" fontSize="10" fontFamily="monospace">已核验 · 签章 EVD-001</text>

      <rect x="520" y="90" width="220" height="120" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
      <text x="540" y="125" fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">EPC 总包 Org B</text>
      <text x="540" y="150" fill="#94a3b8" fontSize="11" fontFamily="monospace">施工与供应链组织</text>
      <text x="540" y="180" fill="#34d399" fontSize="10" fontFamily="monospace">已核验 · 签章 EVD-089</text>

      <rect x="60" y="270" width="220" height="120" rx="8" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
      <text x="80" y="305" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">全过程监理 Org G</text>
      <text x="80" y="330" fill="#94a3b8" fontSize="11" fontFamily="monospace">独立旁站与质量验评</text>
      <text x="80" y="360" fill="#34d399" fontSize="10" fontFamily="monospace">已核验 · 签章 EVD-042</text>

      <rect x="520" y="270" width="220" height="120" rx="8" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
      <text x="540" y="305" fill="#c084fc" fontSize="13" fontFamily="monospace" fontWeight="bold">设计勘察 Org C</text>
      <text x="540" y="330" fill="#94a3b8" fontSize="11" fontFamily="monospace">正向 BIM 施工图图审</text>
      <text x="540" y="360" fill="#34d399" fontSize="10" fontFamily="monospace">已核验 · 签章 EVD-C01</text>

      {/* Cross link lines */}
      <line x1="280" y1="150" x2="520" y2="150" stroke="#38bdf8" strokeWidth="2" />
      <line x1="280" y1="330" x2="520" y2="330" stroke="#a855f7" strokeWidth="2" />
      <line x1="170" y1="210" x2="170" y2="270" stroke="#10b981" strokeWidth="2" />
      <line x1="630" y1="210" x2="630" y2="270" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  );
}

function SvgRel02() {
  // 工程师-企业-标段映射图 (4:3)
  return (
    <svg viewBox="0 0 600 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0f1d" />
      <text x="30" y="40" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">执业注册防挂靠实名多源映射</text>
      {/* 3 levels */}
      <rect x="40" y="70" width="150" height="320" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
      <text x="60" y="100" fill="#38bdf8" fontSize="12" fontFamily="monospace">执业工程师</text>
      {['Demo Eng 01', 'Demo Eng 02', 'Demo Eng 04'].map((p, i) => (
        <rect key={i} x="55" y={130 + i * 80} width="120" height="50" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#64748b" strokeWidth="1" />
      ))}

      <rect x="230" y="70" width="150" height="320" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="250" y="100" fill="#fbbf24" fontSize="12" fontFamily="monospace">受聘法人企业</text>
      {['Demo Org B', 'Demo Org C', 'Demo Org G'].map((c, i) => (
        <rect key={i} x="245" y={130 + i * 80} width="120" height="50" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#64748b" strokeWidth="1" />
      ))}

      <rect x="420" y="70" width="150" height="320" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
      <text x="440" y="100" fill="#34d399" fontSize="12" fontFamily="monospace">中标履约标段</text>
      {['PKG-ST-02', 'PKG-DS-01', 'PKG-SV-01'].map((b, i) => (
        <rect key={i} x="435" y={130 + i * 80} width="120" height="50" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#64748b" strokeWidth="1" />
      ))}

      {/* Connecting lines */}
      <line x1="175" y1="155" x2="245" y2="155" stroke="#38bdf8" strokeWidth="2" />
      <line x1="365" y1="155" x2="435" y2="155" stroke="#38bdf8" strokeWidth="2" />
      <text x="40" y="420" fill="#64748b" fontSize="10" fontFamily="monospace">社保实名制连续缴费核验 · 住建执业电子印章实时防伪</text>
    </svg>
  );
}

function SvgRel03() {
  // 原材料供应商溯源链 (1:1)
  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#090e1a" />
      <text x="30" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">特种工程构件全生命周期溯源</text>
      {/* 4 Stages */}
      {[
        { y: 80, title: '1. 钢厂出厂质保书', code: 'BATCH-2026-Q355-8841', status: '国标理化合格' },
        { y: 175, title: '2. 数字化加工车间', code: 'CNC-CUT-PASS-092', status: '尺寸公差 ±0.5mm' },
        { y: 270, title: '3. 进场见证取样复试', code: 'LAB-RETEST-100%', status: '第三方监理签章' },
        { y: 365, title: '4. 高空原位吊装就位', code: 'GRID-POS-LV4-E28', status: '全息激光对齐' }
      ].map((st, i) => (
        <g key={i}>
          <rect x="50" y={st.y} width="400" height="65" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="70" y={st.y + 28} fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">{st.title}</text>
          <text x="70" y={st.y + 50} fill="#94a3b8" fontSize="11" fontFamily="monospace">条码: {st.code}</text>
          <rect x="310" y={st.y + 18} width="120" height="28" rx="4" fill="var(--illustration-bg, #151E2E)" stroke="#10b981" strokeWidth="1" />
          <text x="325" y={st.y + 36} fill="#34d399" fontSize="10" fontFamily="monospace">{st.status}</text>
        </g>
      ))}
    </svg>
  );
}

function SvgRel04() {
  // 数字存证哈希固化流 (16:9)
  return (
    <svg viewBox="0 0 800 450" className="w-full h-full select-none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#070c18" />
      <text x="40" y="45" fill="#38bdf8" fontSize="14" fontFamily="monospace" fontWeight="bold">重大里程碑多方签章与 SHA-256 存证固化</text>
      {/* Hash stream boxes */}
      <rect x="50" y="90" width="200" height="180" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
      <text x="70" y="125" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">原始工程证据包</text>
      <text x="70" y="155" fill="#cbd5e1" fontSize="11" fontFamily="monospace">• 焊缝探伤报告 PDF</text>
      <text x="70" y="180" fill="#cbd5e1" fontSize="11" fontFamily="monospace">• 顶升激光点云 LAS</text>
      <text x="70" y="205" fill="#cbd5e1" fontSize="11" fontFamily="monospace">• 监理旁站签证记录</text>

      <line x1="250" y1="180" x2="310" y2="180" stroke="#f59e0b" strokeWidth="3" />
      <polygon points="310,175 320,180 310,185" fill="#f59e0b" />

      <rect x="320" y="90" width="180" height="180" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
      <text x="340" y="125" fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">国密哈希计算</text>
      <text x="340" y="160" fill="#e2e8f0" fontSize="10" fontFamily="monospace">SHA-256 Hash:</text>
      <text x="340" y="185" fill="#38bdf8" fontSize="9" fontFamily="monospace">9a8f4c...7e21</text>
      <text x="340" y="215" fill="#34d399" fontSize="10" fontFamily="monospace">不可篡改时间戳</text>

      <line x1="500" y1="180" x2="560" y2="180" stroke="#10b981" strokeWidth="3" />
      <polygon points="560,175 570,180 560,185" fill="#10b981" />

      <rect x="570" y="90" width="180" height="180" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
      <text x="590" y="125" fill="#34d399" fontSize="13" fontFamily="monospace" fontWeight="bold">多方数字签名</text>
      <text x="590" y="155" fill="#cbd5e1" fontSize="10" fontFamily="monospace">✓ 业主授权签章</text>
      <text x="590" y="180" fill="#cbd5e1" fontSize="10" fontFamily="monospace">✓ 总监工程师签章</text>
      <text x="590" y="205" fill="#cbd5e1" fontSize="10" fontFamily="monospace">✓ 施工总包签章</text>

      <text x="50" y="380" fill="#64748b" fontSize="11" fontFamily="monospace">存证链代码: EVD-P001-089 · 原型系统哈希已验证 · 真实存证防伪 (MOCK LEDGER)</text>
    </svg>
  );
}

// Master component mapping
const SVG_COMPONENT_MAP = {
  // Project (8)
  'tpl-prj-01': SvgProject01,
  'tpl-prj-02': SvgProject02,
  'tpl-prj-03': SvgProject03,
  'tpl-prj-04': SvgProject04,
  'tpl-prj-05': SvgProject05,
  'tpl-prj-06': SvgProject06,
  'tpl-prj-07': SvgProject07,
  'tpl-prj-08': SvgProject08,
  // Company (6)
  'tpl-com-01': SvgCompany01,
  'tpl-com-02': SvgCompany02,
  'tpl-com-03': SvgCompany03,
  'tpl-com-04': SvgCompany04,
  'tpl-com-05': SvgCompany05,
  'tpl-com-06': SvgCompany06,
  // People (5)
  'tpl-peo-01': SvgPeople01,
  'tpl-peo-02': SvgPeople02,
  'tpl-peo-03': SvgPeople03,
  'tpl-peo-04': SvgPeople04,
  'tpl-peo-05': SvgPeople05,
  // News (7)
  'tpl-new-01': SvgNews01,
  'tpl-new-02': SvgNews02,
  'tpl-new-03': SvgNews03,
  'tpl-new-04': SvgNews04,
  'tpl-new-05': SvgNews05,
  'tpl-new-06': SvgNews06,
  'tpl-new-07': SvgNews07,
  // Technical (6)
  'tpl-tec-01': SvgTech01,
  'tpl-tec-02': SvgTech02,
  'tpl-tec-03': SvgTech03,
  'tpl-tec-04': SvgTech04,
  'tpl-tec-05': SvgTech05,
  'tpl-tec-06': SvgTech06,
  // Relationship (4)
  'tpl-rel-01': SvgRel01,
  'tpl-rel-02': SvgRel02,
  'tpl-rel-03': SvgRel03,
  'tpl-rel-04': SvgRel04,
};

/**
 * Main EngineeringIllustration Component
 * 
 * Props:
 * - templateId: string (e.g. 'tpl-prj-01')
 * - className: custom styling string
 * - showBadge: boolean (prominent "示意图 / Illustration" badge)
 * - showMetaBar: boolean (bottom source/rights bar)
 * - onInspect: callback function to open detail lightbox
 */
export function EngineeringIllustration({
  templateId = 'tpl-prj-01',
  className = '',
  showBadge = true,
  showMetaBar = false,
  showAnnotations = true,
  onInspect,
  aspectRatio
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMetaPopover, setShowMetaPopover] = useState(false);
  const { locale } = useI18n();

  const rawTemplate = getTemplateById(templateId);
  const template = getLocalizedTemplate(rawTemplate, locale);
  const SvgComponent = SVG_COMPONENT_MAP[template.id] || SvgProject01;

  // Determine ratio class
  const ratio = aspectRatio || template.ratio || '16:9';
  const ratioClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]'
  }[ratio] || 'aspect-video';

  return (
    <div
      className={`relative group overflow-hidden rounded-lg border border-hairline bg-surface-subtle transition-all duration-200 hover:border-sky-500/50 ${ratioClass} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMetaPopover(false);
      }}
    >
      {/* 1. Underlying SVG Vector Drawing with Accessible Metadata */}
      <div 
        className={`absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none ${!showAnnotations ? 'hide-svg-annotations [&_text]:hidden' : ''}`}
        role="img"
        aria-label={locale === 'zh' ? (template.media?.alt || `${template.title} (工程矢量示意图)`) : (locale === 'th' ? `${template.title} (ภาพเวกเตอร์จำลองวิศวกรรม)` : `${template.title} (Engineering Vector Schematic)`)}
      >
        <SvgComponent locale={locale} />
      </div>

      {/* 2. Top-Left Prominent Mandatory "示意图 / Illustration" Watermark Badge */}
      {showBadge && (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-subtle backdrop-blur-md border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-mono font-medium shadow-sm pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{locale === 'zh' ? '示意图 / Illustration' : locale === 'th' ? 'ภาพจำลอง / Illustration' : 'Illustration / Schematic'}</span>
          {template.tag && (
            <span className="hidden sm:inline text-ink-muted dark:text-slate-400 border-l border-hairline dark:border-slate-700 pl-1.5 text-[10px]">
              {template.tag}
            </span>
          )}
        </div>
      )}

      {/* 3. Top-Right Inspect & Rights Actions */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMetaPopover(!showMetaPopover);
          }}
          title={locale === 'zh' ? '查看版权与出处元数据' : locale === 'th' ? 'ดูข้อมูลลิขสิทธิ์และที่มา' : 'View rights & provenance metadata'}
          className="p-1.5 rounded-md bg-surface hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-700/60 backdrop-blur-sm transition-colors text-xs"
          aria-label={locale === 'zh' ? '查看图片版权' : locale === 'th' ? 'ดูลิขสิทธิ์ภาพ' : 'View image copyright'}
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {onInspect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(template);
            }}
            title={locale === 'zh' ? '放大查看高清图学模型' : locale === 'th' ? 'ขยายดูภาพจำลองความละเอียดสูง' : 'Expand high-resolution schematic model'}
            className="p-1.5 rounded-md bg-surface hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-700/60 backdrop-blur-sm transition-colors text-xs"
            aria-label={locale === 'zh' ? '放大图解' : locale === 'th' ? 'ขยายภาพจำลอง' : 'Expand schematic'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4. Popover Meta Info Overlay */}
      {showMetaPopover && (
        <div 
          className="absolute top-11 right-2.5 z-20 w-72 max-w-[calc(100%-20px)] p-3 rounded-lg bg-surface backdrop-blur-lg border border-slate-700 text-slate-200 text-xs shadow-2xl space-y-1.5 font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-semibold text-sky-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{locale === 'zh' ? '素材来源与权利声明' : locale === 'th' ? 'ที่มาของภาพและคำชี้แจงสิทธิ์' : 'Asset Provenance & Rights Declaration'}</span>
          </div>
          <div className="text-[11px] text-slate-300">
            <span className="text-slate-400">{locale === 'zh' ? '来源: ' : locale === 'th' ? 'ที่มา: ' : 'Source: '}</span>
            {template.media.source}
          </div>
          <div className="text-[11px] text-slate-300">
            <span className="text-slate-400">{locale === 'zh' ? '许可: ' : locale === 'th' ? 'สิทธิ์: ' : 'Licensing: '}</span>
            {template.media.rights}
          </div>
          <div className="text-[11px] text-slate-300">
            <span className="text-slate-400">{locale === 'zh' ? '用途: ' : locale === 'th' ? 'การใช้งาน: ' : 'Usage: '}</span>
            {template.media.usage}
          </div>
          <div className="text-[10px] text-amber-300/90 pt-1 border-t border-hairline flex items-center gap-1">
            <span>{locale === 'zh' ? '● 演示数据标注: 严格禁止冒充具体真实工程现场' : locale === 'th' ? '● หมายเหตุข้อมูลจำลอง: ห้ามแอบอ้างเป็นสถานที่ก่อสร้างจริง' : '● Demo Annotation: Strict prohibition against impersonating actual physical job sites.'}</span>
          </div>
        </div>
      )}

      {/* 5. Optional Bottom Meta Bar */}
      {showMetaBar && (
        <div className="absolute bottom-0 inset-x-0 z-10 px-3 py-2 bg-gradient-to-t from-black/80 via-black/60 to-transparent flex items-center justify-between text-[11px] text-slate-300">
          <span className="line-clamp-2 pr-2 text-slate-300 font-sans font-medium">{template.title}</span>
          <span className="text-slate-300 font-mono text-[10px] shrink-0 self-end">{template.aspectLabel}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Accessible Lightbox Dialog Modal for Engineering Illustrations
 * Implements WAI-ARIA dialog semantics, focus trapping, Escape dismissal, and dark engineering styling.
 */
export function IllustrationLightboxModal({ template, onClose }) {
  const dialogRef = useDialogA11y(onClose, !!template);
  const { locale } = useI18n();

  if (!template) return null;
  const locTemplate = getLocalizedTemplate(template, locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-fadeIn"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.36)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        aria-describedby="lightbox-subtitle"
        tabIndex={-1}
        className="w-full max-w-4xl bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-ink focus:outline-none"
      >
        <div className="flex items-center justify-between pb-3 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-semibold text-xs">{template.id}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {locale === 'zh' ? '示意图 / Illustration' : locale === 'th' ? 'ภาพจำลอง / Illustration' : 'Illustration / Schematic'}
              </span>
            </div>
            <h2 id="lightbox-title" className="text-base sm:text-lg font-bold text-ink mt-1">
              {locTemplate.title}
            </h2>
            <p id="lightbox-subtitle" className="text-xs text-ink-muted mt-0.5">
              {locTemplate.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={locale === 'zh' ? '关闭图解预览' : locale === 'th' ? 'ปิดการแสดงภาพ' : 'Close schematic preview'}
            className="p-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-ink border border-hairline transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-full rounded-xl overflow-hidden border border-hairline bg-surface-subtle">
          <EngineeringIllustration
            templateId={template.id}
            showBadge={false}
            showMetaBar={false}
            showAnnotations={true}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-subtle border border-hairline rounded-xl p-3.5">
          <div>
            <span className="text-ink-muted block mb-0.5">{locale === 'zh' ? '素材与模型来源:' : locale === 'th' ? 'ที่มาของสื่อและโมเดล:' : 'Asset & Model Provenance:'}</span>
            <span className="text-ink font-medium">{template.media.source}</span>
          </div>
          <div>
            <span className="text-ink-muted block mb-0.5">{locale === 'zh' ? '权利许可 (Licensing):' : locale === 'th' ? 'สิทธิ์การใช้งาน (Licensing):' : 'Rights & Licensing:'}</span>
            <span className="text-ink font-medium">{template.media.rights}</span>
          </div>
          <div>
            <span className="text-ink-muted block mb-0.5">{locale === 'zh' ? '授权用途:' : locale === 'th' ? 'การใช้งานที่อนุญาต:' : 'Authorized Usage:'}</span>
            <span className="text-ink font-medium">{template.media.usage}</span>
          </div>
          <div>
            <span className="text-ink-muted block mb-0.5">{locale === 'zh' ? '无障碍替代文本 (Alt):' : locale === 'th' ? 'ข้อความแทนภาพ (Alt):' : 'Accessible Alt Text (Alt):'}</span>
            <span className="text-ink-muted text-[11px]">{locale === 'zh' ? template.media.alt : (locale === 'th' ? (template.media.alt_th || template.media.alt) : `${template.title} (Engineering Vector Schematic)`)}</span>
          </div>
        </div>

        <div className="text-[11px] text-amber-300/80 bg-amber-950/30 border border-amber-900/40 rounded-lg p-2.5">
          {locale === 'zh' ? '● 严格声明：本项目所有工程图示均为原创矢量示意图，禁止冒充真实具体现场。演示数据均用于 UX Spike 原型验证。' : locale === 'th' ? '● ข้อกำหนดเคร่งครัด: ภาพวิศวกรรมทั้งหมดเป็นภาพเวกเตอร์ต้นฉบับ ห้ามแอบอ้างเป็นสถานที่จริง ใช้สำหรับการทดสอบ UX Spike เท่านั้น' : '● Strict Notice: All engineering schematics are original vector drawings for UX spike validation. Strictly prohibited from impersonating real-world job sites.'}
        </div>
      </div>
    </div>
  );
}

export default EngineeringIllustration;
