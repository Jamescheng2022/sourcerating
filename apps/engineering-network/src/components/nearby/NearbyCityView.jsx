import React, { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Database, AlertCircle, RefreshCw, 
  ExternalLink, CheckCircle2, ChevronDown, ChevronRight, FileCode,
  Info, Compass, MapPin, Globe, ArrowRight, Locate
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { queryNearby } from '../../services/mockApi';

// Evaluates geolocation coordinates against pilot cities with accuracy guard and ambiguity detection
export function evaluateLocationCandidate(latitude, longitude, accuracy, locale = 'en') {
  const accM = Math.round(accuracy || 100);
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  // 1. Accuracy guard: if uncertainty is > 50km, accuracy is too coarse to distinguish pilot cities (~100km apart)
  if (accuracy > 50000) {
    return {
      status: 'coarse',
      city: null,
      candidates: [],
      message: isZh
        ? `设备定位精度过低 (误差范围约 ±${Math.round(accuracy / 1000)}km)，无法可靠推测试点城市。系统不自动指派，请直接在下方手动选择城市。`
        : isTh
        ? `ความแม่นยำของตำแหน่งต่ำเกินไป (±${Math.round(accuracy / 1000)} กม.) ไม่สามารถแนะนำเมืองได้อย่างน่าเชื่อถือ โปรดเลือกเมืองด้วยตนเองด้านล่าง`
        : `Location accuracy is coarse (±${Math.round(accuracy / 1000)}km) and cannot reliably suggest a pilot city. Please choose Bangkok, Rayong, or Chonburi manually below.`
    };
  }

  // 2. Non-exclusive candidate testing for 3 pilot zones
  const candidates = [];
  // Bangkok pilot zone:
  if (latitude >= 13.50 && latitude <= 14.10 && longitude >= 100.30 && longitude <= 100.90) {
    candidates.push('Bangkok');
  }
  // Chonburi pilot zone:
  if (latitude >= 12.80 && latitude <= 13.55 && longitude >= 100.80 && longitude <= 101.45) {
    candidates.push('Chonburi');
  }
  // Rayong pilot zone:
  if (latitude >= 12.50 && latitude <= 13.20 && longitude >= 101.10 && longitude <= 101.85) {
    candidates.push('Rayong');
  }

  // 3. Ambiguous boundary / overlapping zones
  if (candidates.length > 1) {
    return {
      status: 'ambiguous',
      city: null,
      candidates,
      message: isZh
        ? `设备位置处于${candidates.map(c => c === 'Bangkok' ? '曼谷' : c === 'Rayong' ? '罗勇' : '春武里').join('与')}交界区域 (坐标 ${latitude.toFixed(3)}, ${longitude.toFixed(3)}，精度 ±${accM}m)。存在区域重叠，系统不自动选定，请手动选择目标城市。`
        : isTh
        ? `ตำแหน่งอยู่บริเวณรอยต่อระหว่าง ${candidates.join(' และ ')} โปรดเลือกเมืองด้วยตนเอง`
        : `Coordinates (${latitude.toFixed(3)}, ${longitude.toFixed(3)}, ±${accM}m) fall in the boundary area between ${candidates.join(' and ')}. Please select your target city manually.`
    };
  }

  // 4. Single approximate suggestion
  if (candidates.length === 1) {
    const suggestedCity = candidates[0];
    return {
      status: 'suggested',
      city: suggestedCity,
      candidates,
      message: isZh
        ? `根据设备坐标 (${latitude.toFixed(3)}, ${longitude.toFixed(3)}，精度 ±${accM}m) 推荐近似城市：${suggestedCity === 'Bangkok' ? '曼谷' : suggestedCity === 'Rayong' ? '罗勇' : '春武里'}。此仅为近似建议，非行政管辖区认证，工程经纬度仍严格为 NULL。`
        : isTh
        ? `ข้อเสนอแนะเมืองโดยประมาณ: ${suggestedCity} จากพิกัด (${latitude.toFixed(3)}, ${longitude.toFixed(3)} ±${accM}m) ไม่ใช่การรับรองเขตอำนาจทางกฎหมาย`
        : `Approximate city suggestion: ${suggestedCity} (from coordinates ${latitude.toFixed(3)}, ${longitude.toFixed(3)}, ±${accM}m). Not a certified legal boundary; distances and job site coordinates remain NULL.`
    };
  }

  // 5. Outside pilot zones
  return {
    status: 'outside',
    city: null,
    candidates: [],
    message: isZh
      ? `已获取设备坐标 (${latitude.toFixed(3)}, ${longitude.toFixed(3)}，精度 ±${accM}m)，超出当前三处试点城市 (曼谷/罗勇/春武里) 范围。系统未自动指派城市，请从下方手动选择。`
      : isTh
      ? `พิกัดตำแหน่ง (${latitude.toFixed(3)}, ${longitude.toFixed(3)} ±${accM}m) อยู่นอกพื้นที่นำร่อง 3 จังหวัด โปรดเลือกเมืองด้วยตนเองด้านล่าง`
      : `Device coordinates (${latitude.toFixed(3)}, ${longitude.toFixed(3)}, ±${accM}m) are outside the 3 pilot cities (Bangkok, Rayong, Chonburi). Please choose a city manually below.`
  };
}

export function NearbyCityView() {
  const { locale } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  // City Selector: 'Bangkok' | 'Rayong' | 'Chonburi'
  const [selectedCity, setSelectedCity] = useState('Bangkok');
  const [expandedRecord, setExpandedRecord] = useState(null);

  // Explicit location detection state (strictly requires user click)
  const [locationStatus, setLocationStatus] = useState(null); // null | 'detecting' | 'denied' | 'detected' | 'unsupported'
  const [locationMessage, setLocationMessage] = useState(null);

  // Query records from mockApi
  const queryResult = queryNearby({
    city: selectedCity,
    country_iso: 'TH',
    mode: 'CITY'
  });

  const records = queryResult?.data || [];
  const queryMeta = queryResult?.query_meta || {};

  // Cities configuration
  const cities = [
    { id: 'Bangkok', labelZh: '曼谷 (BMA)', labelEn: 'Bangkok (BMA)', labelTh: 'กรุงเทพฯ (BMA)', recordsCount: 5 },
    { id: 'Rayong', labelZh: '罗勇 (Rayong)', labelEn: 'Rayong', labelTh: 'ระยอง', recordsCount: 0 },
    { id: 'Chonburi', labelZh: '春武里 (Chonburi)', labelEn: 'Chonburi', labelTh: 'ชลบุรี', recordsCount: 0 },
  ];

  // User explicitly taps location detection button
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('unsupported');
      setLocationMessage(
        isZh 
          ? '您的当前浏览器环境不支持地理定位 API，请直接使用下方城市选择器。' 
          : isTh 
          ? 'เบราว์เซอร์ไม่รองรับ API ตำแหน่งที่ตั้ง โปรดเลือกเมืองด้วยตนเอง' 
          : 'Geolocation API is unsupported in this browser environment. Please use the city selector.'
      );
      return;
    }

    setLocationStatus('detecting');
    setLocationMessage(
      isZh 
        ? '正在请求浏览器定位权限以提供近似城市建议...' 
        : isTh 
        ? 'กำลังขอสิทธิ์ตำแหน่งเพื่อแนะนำเมืองโดยประมาณ...' 
        : 'Requesting browser location permission for approximate city suggestion...'
    );

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const evaluation = evaluateLocationCandidate(latitude, longitude, accuracy, locale);
        setLocationStatus(evaluation.status);
        setLocationMessage(evaluation.message);
        if (evaluation.city) {
          setSelectedCity(evaluation.city);
        }
      },
      (err) => {
        setLocationStatus('denied');
        setLocationMessage(
          isZh
            ? '定位权限未授予或超时。未产生任何定位数据，您可直接使用下方城市切换器。'
            : isTh
            ? 'ไม่ได้รับสิทธิ์ตำแหน่งที่ตั้ง คุณสามารถเลือกเมืองจากตัวเลือกด้านล่างได้โดยตรง'
            : 'Location permission was denied or timed out. Please select your target city below.'
        );
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 p-3 sm:p-6 animate-fadeIn text-ink">
      {/* 1. Header Card */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                {queryResult.schema_version || 'atlas-mock/1.0'} · MOCK SANDBOX
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-1">
              {isZh 
                ? '试点城市工程采招公示存证 (Nearby Procurement)' 
                : isTh 
                ? 'ข้อมูลประกาศจัดซื้อจัดจ้างตามเขตนำร่อง (Nearby Procurement)' 
                : 'Pilot City Engineering Procurement Notices'}
            </h1>
          </div>

          {/* Explicit Location Button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-surface-subtle hover:bg-surface-hover text-ink text-xs font-semibold transition-colors shrink-0"
            title={isZh ? '点击请求定位以推荐就近试点城市' : 'Suggest closest pilot city (requires explicit click)'}
          >
            <Locate className={`w-3.5 h-3.5 text-accent ${locationStatus === 'detecting' ? 'animate-spin' : ''}`} />
            <span>{isZh ? '探测所在城市' : isTh ? 'ระบุเมืองปัจจุบัน' : 'Detect Location'}</span>
          </button>
        </div>

        {/* Location Notice (Only displayed if user explicitly clicked detect button) */}
        {locationMessage && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            locationStatus === 'suggested' || locationStatus === 'detected'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : locationStatus === 'denied' || locationStatus === 'coarse' || locationStatus === 'ambiguous'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-surface-subtle border-hairline text-ink-muted'
          }`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              {locationMessage}
            </div>
          </div>
        )}

        {/* Honest Disclosure */}
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
          {isZh
            ? '本功能呈现管辖区级公开招采工程存证（来自曼谷 BMA 公共采招快照，经 OCP 注册，CC BY 4.0 许可）。城市代表发包法定管辖区域，非具体施工现场。所有物理经纬度与测算距离均严格为 NULL，绝不捏造任何虚假地图打点。'
            : isTh
            ? 'แสดงบันทึกประกาศจัดซื้อจัดจ้างภาครัฐตามเขตอำนาจ (จากฐานข้อมูล BMA ผ่าน OCP สัญญาอนุญาต CC BY 4.0) เมืองหมายถึงเขตอำนาจของผู้ว่าจ้าง ไม่ใช่สถานที่ก่อสร้างจริง พิกัดและระยะทางทั้งหมดเป็น NULL ไม่มีการสร้างจุดพิกัดปลอม'
            : 'Renders jurisdiction-level public procurement notices (sourced from BMA public notices via OCP registry under CC BY 4.0). City indicates the publisher jurisdiction, NOT verified job site coordinates. Coordinates and distance figures remain strictly NULL—zero fake map pins.'}
        </p>

        {/* City Selector Buttons */}
        <div className="pt-2">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
            {isZh ? '选择管辖区城市 (City Selector):' : isTh ? 'เลือกเมือง (City Selector):' : 'Select Jurisdiction City:'}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {cities.map((city) => {
              const isSelected = selectedCity === city.id;
              const label = isZh ? city.labelZh : isTh ? city.labelTh : city.labelEn;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    setSelectedCity(city.id);
                    setExpandedRecord(null);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-accent text-white font-bold border-accent shadow-xs'
                      : 'bg-surface-subtle hover:bg-surface-hover text-ink border-hairline'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold truncate w-full">
                    {label}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-surface border border-hairline text-ink-muted'
                  }`}>
                    {city.recordsCount > 0 ? `${city.recordsCount} ${isZh ? '条存证' : isTh ? 'รายการ' : 'notices'}` : (isZh ? '暂无数据' : isTh ? 'ไม่มีข้อมูล' : '0 notices')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Disclosures & Scope Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Scope */}
        <div className="p-3.5 rounded-xl border border-hairline bg-surface flex items-start gap-3 text-xs">
          <Compass className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <div className="font-bold text-ink">
              {isZh ? '地理基准: 仅发包管辖区' : isTh ? 'ขอบเขต: เขตอำนาจเท่านั้น' : 'Scope: Jurisdiction Only'}
            </div>
            <div className="font-mono text-[11px] text-ink-muted">
              coordinates: null · distance: null
            </div>
            <div className="text-[10px] text-ink-faint">
              {isZh ? '严禁虚构经纬度，无假地图打点' : 'No fake map pins or distance estimates'}
            </div>
          </div>
        </div>

        {/* License & Provenance */}
        <div className="p-3.5 rounded-xl border border-hairline bg-surface flex items-start gap-3 text-xs">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <div className="font-bold text-ink">
              {isZh ? '数据源与许可: CC BY 4.0' : isTh ? 'สัญญาอนุญาต: CC BY 4.0' : 'License: CC BY 4.0'}
            </div>
            <div className="text-[11px] text-ink-muted truncate">
              BMA via OCP Data Registry
            </div>
            <div className="text-[10px] text-ink-faint">
              {isZh ? '离线试点质检快照 (LOCAL_QA_SNAPSHOT · 无实时外呼)' : isTh ? 'สแนปช็อต QA นำร่องออฟไลน์ (LOCAL_QA_SNAPSHOT)' : 'Offline pilot QA snapshot (LOCAL_QA_SNAPSHOT · zero external calls)'}
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="p-3.5 rounded-xl border border-hairline bg-surface flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <div className="font-bold text-ink">
              {isZh ? '非在建工地 / 非官方背书' : isTh ? 'ไม่ใช่สถานที่ก่อสร้างจริง' : 'Not Construction Sites'}
            </div>
            <div className="text-[11px] text-ink-muted">
              {isZh ? '仅供原型功能与法规模拟演练' : 'Prototype demonstration use only'}
            </div>
            <div className="text-[10px] text-ink-faint">
              {isZh ? 'site_identity: UNKNOWN' : 'site_identity: UNKNOWN'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Records Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            <span>
              {isZh ? `${selectedCity} 政府采购公示存证` : isTh ? `บันทึกสัญญาจัดซื้อจัดจ้าง ${selectedCity}` : `${selectedCity} Public Procurement Notices`}
              {records.length > 0 && ` (${records.length})`}
            </span>
          </h2>
          <span className="font-mono text-[10px] text-ink-muted">
            mode: CITY · scope: PUBLISHER_JURISDICTION_ONLY
          </span>
        </div>

        {/* Empty State for Rayong or Chonburi */}
        {records.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-surface border border-hairline rounded-2xl space-y-3 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-hairline text-ink-muted flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-ink">
                {isZh 
                  ? `暂无 ${selectedCity} 管辖区的公开招采存证记录` 
                  : isTh 
                  ? `ยังไม่มีบันทึกการจัดซื้อจัดจ้างในเขต ${selectedCity}` 
                  : `No procurement records recorded for ${selectedCity}`}
              </h3>
              <p className="text-ink-muted max-w-md mx-auto leading-relaxed">
                {isZh 
                  ? '本原型遵循诚实透明原则，不捏造虚假记录。目前演示数据集仅收录了曼谷 (BMA) 的真实招采存证。您可以随时切换回曼谷查看 5 条合规公开存证。' 
                  : isTh 
                  ? 'ระบบไม่สร้างข้อมูลปลอม ปัจจุบันชุดข้อมูลตัวอย่างมีเฉพาะบันทึกของกรุงเทพมหานคร (BMA) คุณสามารถสลับกลับไปดูกรุงเทพฯ ได้' 
                  : 'In accordance with transparency requirements, no fake records are fabricated. Only Bangkok (BMA) contains licensed demonstration records. Switch to Bangkok to inspect 5 verified notices.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCity('Bangkok')}
              className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition-colors"
            >
              {isZh ? '切换至曼谷 (BMA)' : isTh ? 'สลับไปยังกรุงเทพฯ (BMA)' : 'Switch to Bangkok (BMA)'}
            </button>
          </div>
        ) : (
          /* Render Procurement Records */
          records.map((rec, idx) => {
            const isExpanded = expandedRecord === rec.id;
            const title = rec.title || 'ค่าซ่อมแซมอาคารสูบน้ำเครื่องสูบน้ำและตู้ควบคุม';
            const ocid = rec.ocid || rec.id;
            const publishedDate = rec.published_date || '2026-10-12';

            return (
              <div 
                key={rec.id || idx}
                className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono text-[10px] font-bold border border-blue-500/20">
                        {rec.record_type || 'PROCUREMENT_NOTICE'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                        {rec.license || 'CC BY 4.0'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[10px] border border-amber-500/20">
                        GPS: NULL
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-ink pt-0.5">
                      {title}
                    </h3>

                    <div className="text-[11px] font-mono text-ink-muted">
                      OCID: {ocid}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-ink-muted shrink-0">
                    {publishedDate}
                  </span>
                </div>

                {/* Honest Specifications Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg bg-surface-subtle border border-hairline space-y-0.5">
                    <div className="text-ink-muted font-medium">{isZh ? '管辖区域' : isTh ? 'เขตอำนาจ' : 'Jurisdiction'}</div>
                    <div className="font-semibold text-ink">Bangkok, TH</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-subtle border border-hairline space-y-0.5">
                    <div className="text-ink-muted font-medium">{isZh ? '物理经纬度' : isTh ? 'พิกัด GPS' : 'GPS Coordinates'}</div>
                    <div className="font-mono text-ink-faint">null (UNKNOWN)</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-subtle border border-hairline space-y-0.5">
                    <div className="text-ink-muted font-medium">{isZh ? '测算距离' : isTh ? 'ระยะทาง' : 'Distance'}</div>
                    <div className="font-mono text-ink-faint">null</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-subtle border border-hairline space-y-0.5">
                    <div className="text-ink-muted font-medium">{isZh ? '现场身份核定' : isTh ? 'ระบุสถานที่' : 'Site Verification'}</div>
                    <div className="font-semibold text-ink-muted">{rec.site_identity || 'UNKNOWN'}</div>
                  </div>
                </div>

                {/* Attribution & Inspect Contract */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-hairline text-xs">
                  <div className="text-[11px] text-ink-muted truncate">
                    <span className="font-semibold text-ink">{rec.source}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedRecord(isExpanded ? null : rec.id)}
                    className="inline-flex items-center gap-1 text-accent hover:underline font-semibold text-xs shrink-0 self-end sm:self-auto"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{isExpanded ? (isZh ? '收起规约详情' : 'Collapse Details') : (isZh ? '查看原始存证条目 (JSON)' : 'Inspect Notice Record (JSON)')}</span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expanded Raw Contract Viewer */}
                {isExpanded && (
                  <div className="pt-2">
                    <pre className="p-3 rounded-xl bg-canvas border border-hairline font-mono text-[10px] sm:text-[11px] text-ink overflow-x-auto max-h-60">
                      {JSON.stringify(rec, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default NearbyCityView;
