/**
 * Automated Verification Suite for Privacy, Confidentiality, Localization, and Identity Fixes
 * 
 * Verifies:
 * 1. templateSuggester returns 0 photos when imageCount === 0 (no false detection).
 * 2. EVD-EDGE-02 has no bank name ('建设银行') and no guarantee number ('FAKE-GTEE').
 * 3. EVD-P001-B01 has no '6.8亿元' or '6.8 亿' contract value.
 * 4. All canonical identities (ORG-D = Foundation, ORG-E = MEP, ORG-G = Supervision) align across entitiesEn.js and NetworkPage.jsx.
 * 5. I18nContext.jsx synchronizes searchParams with state/storage.
 */

const fs = require('fs');
const path = require('path');

async function run() {
  console.log('===========================================================');
  console.log('  Testing Owner Confidentiality & Identity Regression Fixes  ');
  console.log('===========================================================');

  let passed = true;

  // 1. Test templateSuggester with 0 images
  console.log('\n--- 1. Testing Zero-Image Detection in templateSuggester ---');
  const { suggestTemplateLocally } = await import('../src/utils/templateSuggester.js');
  const suggestion = suggestTemplateLocally({
    imageCount: 0,
    textLength: 120,
    category: 'on_site',
    locale: 'en'
  });

  const zeroDetected = suggestion.reason.includes('0 photos') || suggestion.reason.includes('0 张照片') || suggestion.reason.includes('0 รูป');
  const isTextBrief = suggestion.templateName.includes('Text Brief') || suggestion.templateName.includes('纯文字');
  console.log(`  ${zeroDetected ? '✓' : '✗'} Detected 0 photos reason: "${suggestion.reason}"`);
  console.log(`  ${isTextBrief ? '✓' : '✗'} Recommended template is text-first: "${suggestion.templateName}"`);
  if (!zeroDetected || !isTextBrief) passed = false;

  // 2. Test projectData EVD-EDGE-02 confidentiality
  console.log('\n--- 2. Testing EVD-EDGE-02 Confidentiality Sanitization ---');
  const { PROJECT_DATA } = await import('../src/data/projectData.js');
  const evdEdge02 = PROJECT_DATA.evidenceDb['EVD-EDGE-02'];
  const evdP001B01 = PROJECT_DATA.evidenceDb['EVD-P001-B01'];

  const noBankName = !JSON.stringify(evdEdge02).includes('建设银行');
  const noGuaranteeNumber = !JSON.stringify(evdEdge02).includes('FAKE-GTEE');
  const noPublicKeySignature = !JSON.stringify(evdEdge02).includes('公钥共同签名');
  console.log(`  ${noBankName ? '✓' : '✗'} No bank name in EVD-EDGE-02: ${noBankName}`);
  console.log(`  ${noGuaranteeNumber ? '✓' : '✗'} No guarantee bond policy number in EVD-EDGE-02: ${noGuaranteeNumber}`);
  console.log(`  ${noPublicKeySignature ? '✓' : '✗'} No public key signature in EVD-EDGE-02: ${noPublicKeySignature}`);
  if (!noBankName || !noGuaranteeNumber || !noPublicKeySignature) passed = false;

  // 3. Test projectData EVD-P001-B01 confidentiality
  console.log('\n--- 3. Testing EVD-P001-B01 Contract Amount Sanitization ---');
  const no68Contract = !JSON.stringify(evdP001B01).includes('6.8') && !JSON.stringify(evdP001B01).includes('6.8亿');
  const noMutualCert = !JSON.stringify(evdP001B01).includes('双方数字证书互认');
  console.log(`  ${no68Contract ? '✓' : '✗'} No 6.8亿元 mock contract amount in EVD-P001-B01: ${no68Contract}`);
  console.log(`  ${noMutualCert ? '✓' : '✗'} No digital certificate mutual recognition claims: ${noMutualCert}`);
  if (!no68Contract || !noMutualCert) passed = false;

  // 4. Test Canonical Identity Alignment
  console.log('\n--- 4. Testing Canonical Entity ID Alignment (ORG-D, ORG-E, ORG-G) ---');
  const { COMPANIES_EN } = await import('../src/i18n/entitiesEn.js');
  const orgD = COMPANIES_EN['ORG-D'];
  const orgE = COMPANIES_EN['ORG-E'];
  const orgG = COMPANIES_EN['ORG-G'];

  const orgDOk = orgD && orgD.name.toLowerCase().includes('foundation');
  const orgEOk = orgE && orgE.name.toLowerCase().includes('mep');
  const orgGOk = orgG && orgG.name.toLowerCase().includes('supervision');

  console.log(`  ${orgDOk ? '✓' : '✗'} ORG-D is Foundation Subcontractor: "${orgD?.name}"`);
  console.log(`  ${orgEOk ? '✓' : '✗'} ORG-E is Cleanroom MEP Subcontractor: "${orgE?.name}"`);
  console.log(`  ${orgGOk ? '✓' : '✗'} ORG-G is Engineering Supervision: "${orgG?.name}"`);
  if (!orgDOk || !orgEOk || !orgGOk) passed = false;

  // 5. Test NetworkPage source code for ORG-D/E/G mapping
  console.log('\n--- 5. Testing NetworkPage.jsx Entity Alignment ---');
  const networkPageSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/NetworkPage.jsx'), 'utf-8');
  const hasEng03Mep = networkPageSrc.includes("ORG-E") && networkPageSrc.includes("ENG-03");
  const hasEng04Sup = networkPageSrc.includes("ORG-G") && networkPageSrc.includes("ENG-04");
  const hasEng05Fdn = networkPageSrc.includes("ORG-D") && networkPageSrc.includes("ENG-05");
  console.log(`  ${hasEng03Mep ? '✓' : '✗'} ENG-03 mapped to ORG-E (MEP): ${hasEng03Mep}`);
  console.log(`  ${hasEng04Sup ? '✓' : '✗'} ENG-04 mapped to ORG-G (Supervision): ${hasEng04Sup}`);
  console.log(`  ${hasEng05Fdn ? '✓' : '✗'} ENG-05 mapped to ORG-D (Foundation): ${hasEng05Fdn}`);
  if (!hasEng03Mep || !hasEng04Sup || !hasEng05Fdn) passed = false;

  // 6. Test I18nContext URL Sync
  console.log('\n--- 6. Testing I18nContext URL Parameter Synchronization ---');
  const i18nContextSrc = fs.readFileSync(path.resolve(__dirname, '../src/i18n/I18nContext.jsx'), 'utf-8');
  const hasUrlSync = i18nContextSrc.includes('history.replaceState') && i18nContextSrc.includes('searchParams.set');
  console.log(`  ${hasUrlSync ? '✓' : '✗'} URL searchParams synced on locale change: ${hasUrlSync}`);
  if (!hasUrlSync) passed = false;

  // 7. Test PersonPage Field Log illustration vs expired blob logic
  console.log('\n--- 7. Testing PersonPage Seeded Illustration Distinction ---');
  const personPageSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/PersonPage.jsx'), 'utf-8');
  const hasTemplateCheck = personPageSrc.includes('post.illustrationTemplateId') && personPageSrc.includes('<EngineeringIllustration');
  console.log(`  ${hasTemplateCheck ? '✓' : '✗'} Seeded post renders EngineeringIllustration instead of expired blob: ${hasTemplateCheck}`);
  if (!hasTemplateCheck) passed = false;

  // 8. Test P003 Deliverables and Public Guarantee Semantics
  console.log('\n--- 8. Testing P003 Deliverables (No Bond / Contract Signing Claims) ---');
  const projectWikiSrc = fs.readFileSync(path.resolve(__dirname, '../src/pages/ProjectWikiPage.jsx'), 'utf-8');
  const partP003 = PROJECT_DATA.participations.find(p => p.id === 'PART-P003-01');
  const noBondDeliverable = partP003 && !partP003.deliverable.includes('履约担保') && !partP003.deliverable.includes('施工合同');
  const noPrototypeBondEn = !projectWikiSrc.includes('prototype bond');
  console.log(`  ${noBondDeliverable ? '✓' : '✗'} P003 deliverable has no contract/bond claims: ${noBondDeliverable}`);
  console.log(`  ${noPrototypeBondEn ? '✓' : '✗'} No "prototype bond" in English deliverables mapping: ${noPrototypeBondEn}`);
  if (!noBondDeliverable || !noPrototypeBondEn) passed = false;

  // 9. Test Chinese Internal Document Category (EVD-P001-E01)
  console.log('\n--- 9. Testing EVD-P001-E01 Source Category (No Internal Work Order) ---');
  const evdP001E01 = PROJECT_DATA.evidenceDb['EVD-P001-E01'];
  const noInternalWorkOrder = evdP001E01 && !evdP001E01.sourceType.includes('内部施工工单');
  const hasPublicBrief = evdP001E01 && evdP001E01.sourceType.includes('现场工作简报');
  console.log(`  ${noInternalWorkOrder ? '✓' : '✗'} EVD-P001-E01 has no "内部施工工单": ${noInternalWorkOrder}`);
  console.log(`  ${hasPublicBrief ? '✓' : '✗'} EVD-P001-E01 categorized as public field brief: ${hasPublicBrief}`);
  if (!noInternalWorkOrder || !hasPublicBrief) passed = false;

  // 10. Test English Roles & Titles Localization
  console.log('\n--- 10. Testing English Roles & Engineer Titles Localization ---');
  const hasPersonTitleHelper = projectWikiSrc.includes('getLocalizedPersonTitle');
  const hasDictRoles = projectWikiSrc.includes('dict.roles?.[part.role]');
  const claimModalSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/modals/ClaimModal.jsx'), 'utf-8');
  const hasClaimLocalization = claimModalSrc.includes('getLocalizedCompany') && claimModalSrc.includes('activeCompany.fullName');
  console.log(`  ${hasPersonTitleHelper ? '✓' : '✗'} ProjectWikiPage uses getLocalizedPersonTitle: ${hasPersonTitleHelper}`);
  console.log(`  ${hasDictRoles ? '✓' : '✗'} ProjectWikiPage localizes part.role via dict.roles: ${hasDictRoles}`);
  console.log(`  ${hasClaimLocalization ? '✓' : '✗'} ClaimModal localizes company name and sector: ${hasClaimLocalization}`);
  if (!hasPersonTitleHelper || !hasDictRoles || !hasClaimLocalization) passed = false;

  // 11. Test Startup Commands in NearbyCityView
  console.log('\n--- 11. Testing NearbyCityView Startup Instructions ---');
  const nearbySrc = fs.readFileSync(path.resolve(__dirname, '../src/components/nearby/NearbyCityView.jsx'), 'utf-8');
  const hasAccurateVite = nearbySrc.includes('npm run dev -- --host localhost --port 5173 --strictPort');
  const hasCodexRunbook = nearbySrc.includes('npm run atlas:trial:start');
  console.log(`  ${hasAccurateVite ? '✓' : '✗'} Accurate Vite frontend startup instruction present: ${hasAccurateVite}`);
  console.log(`  ${hasCodexRunbook ? '✓' : '✗'} Accurate Codex backend runbook command present: ${hasCodexRunbook}`);
  if (!hasAccurateVite || !hasCodexRunbook) passed = false;

  // 12. Test Overview Tab WBS & Method Illustrations Localization
  console.log('\n--- 12. Testing Overview Tab WBS & Schematic Localization ---');
  const projectWikiUpdated = fs.readFileSync(path.resolve(__dirname, '../src/pages/ProjectWikiPage.jsx'), 'utf-8');
  const hasOverviewWbsLocalization = projectWikiUpdated.includes('getLocalizedWorkPackage(part.workPackageName)') &&
    projectWikiUpdated.includes('getLocalizedOrgName(part.orgId, part.orgName)');
  console.log(`  ${hasOverviewWbsLocalization ? '✓' : '✗'} Overview WBS rows use getLocalizedWorkPackage and getLocalizedOrgName: ${hasOverviewWbsLocalization}`);
  if (!hasOverviewWbsLocalization) passed = false;

  const engIllSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/illustrations/EngineeringIllustration.jsx'), 'utf-8');
  const svgsToCheck = ['SvgProject01', 'SvgProject02', 'SvgProject03', 'SvgProject04', 'SvgProject05', 'SvgProject06', 'SvgProject07', 'SvgProject08', 'SvgTech01', 'SvgTech02', 'SvgTech03', 'SvgTech04', 'SvgTech05', 'SvgTech06'];
  const hanRegex = /[\u4e00-\u9fff]/;
  let allSvgsClean = true;

  svgsToCheck.forEach(fn => {
    const startIdx = engIllSrc.indexOf('function ' + fn);
    if (startIdx === -1) {
      allSvgsClean = false;
      return;
    }
    const nextFnIdx = engIllSrc.indexOf('function Svg', startIdx + 12);
    const block = engIllSrc.substring(startIdx, nextFnIdx > 0 ? nextFnIdx : startIdx + 3000);
    const firstLine = block.split('\n')[0];
    if (!firstLine.includes('locale')) {
      console.log(`    ✗ ${fn} signature missing locale prop`);
      allSvgsClean = false;
    }
    const textMatches = block.match(/<text[\s\S]*?<\/text>/g) || [];
    textMatches.forEach(t => {
      if (hanRegex.test(t) && !t.includes('isZh')) {
        console.log(`    ✗ ${fn} has un-guarded Han: ${t}`);
        allSvgsClean = false;
      }
    });
  });
  console.log(`  ${allSvgsClean ? '✓' : '✗'} All 14 Project & Tech SVGs accept locale and guard Han text with isZh: ${allSvgsClean}`);
  if (!allSvgsClean) passed = false;

  const { WORK_PACKAGES_EN: wpEn } = await import('../src/i18n/entitiesEn.js');
  const missingWp = PROJECT_DATA.participations.map(p => p.workPackageName).filter(n => !wpEn[n]);
  const allWpCovered = missingWp.length === 0;
  console.log(`  ${allWpCovered ? '✓' : '✗'} All ${PROJECT_DATA.participations.length} project participations covered in WORK_PACKAGES_EN: ${allWpCovered}`);
  if (!allWpCovered) passed = false;

  // 13. Test Synthetic 1px Image Detection and Non-Field Photo Labeling
  console.log('\n--- 13. Testing Synthetic 1px Image Detection & Non-Field Photo Labeling ---');
  const { isSyntheticOrLowResImage, getImageProvenanceLabel, MIN_FIELD_PHOTO_DIMENSION } = await import('../src/utils/imageProvenance.js');
  
  // 13a. Dimension and threshold detection
  const pixel1x1 = isSyntheticOrLowResImage({ width: 1, height: 1, fileName: '1px.png' });
  const pixel63x63 = isSyntheticOrLowResImage({ width: 63, height: 63 });
  const validPhoto = !isSyntheticOrLowResImage({ width: 1920, height: 1080, fileName: 'crane-erection.jpg' });
  const lowSize = isSyntheticOrLowResImage({ size: 68, fileName: 'unknown.png' });
  const syntheticFlag = isSyntheticOrLowResImage({ isSynthetic: true });
  const naturalDimsCheck = isSyntheticOrLowResImage({ url: 'blob:http://localhost/abc' }, { w: 1, h: 1 });

  console.log(`  ${pixel1x1 ? '✓' : '✗'} 1×1 pixel image detected as synthetic/micro: ${pixel1x1}`);
  console.log(`  ${pixel63x63 ? '✓' : '✗'} 63×63 image under ${MIN_FIELD_PHOTO_DIMENSION}px detected as low-res: ${pixel63x63}`);
  console.log(`  ${validPhoto ? '✓' : '✗'} 1920×1080 site photo correctly recognized as normal photo: ${validPhoto}`);
  console.log(`  ${lowSize ? '✓' : '✗'} Micro 68-byte file detected as synthetic: ${lowSize}`);
  console.log(`  ${syntheticFlag ? '✓' : '✗'} Explicit isSynthetic flag honored: ${syntheticFlag}`);
  console.log(`  ${naturalDimsCheck ? '✓' : '✗'} Natural dimensions {w:1, h:1} detected on load: ${naturalDimsCheck}`);

  if (!pixel1x1 || !pixel63x63 || !validPhoto || !lowSize || !syntheticFlag || !naturalDimsCheck) passed = false;

  // 13b. Provenance labeling
  const labelEn = getImageProvenanceLabel({ width: 1, height: 1, fileName: '1px.png' }, { w: 1, h: 1 }, 'en');
  const labelZh = getImageProvenanceLabel({ width: 1, height: 1, fileName: '1px.png' }, { w: 1, h: 1 }, 'zh');
  
  const isLabeledNonFieldEn = labelEn.captionBadge.includes('Non-Field Photo') && labelEn.categoryBadge.includes('Test Image');
  const isLabeledNonFieldZh = labelZh.captionBadge.includes('非现场照片') && labelZh.categoryBadge.includes('测试图像');
  const noFalseFieldEn = !labelEn.captionBadge.replace('Non-Field Photo', '').includes('Field Photo') && 
                         !labelEn.categoryBadge.replace('Non-Field Photo', '').includes('Field Photo');

  console.log(`  ${isLabeledNonFieldEn ? '✓' : '✗'} English label explicitly badges "Non-Field Photo": "${labelEn.captionBadge}"`);
  console.log(`  ${isLabeledNonFieldZh ? '✓' : '✗'} Chinese label explicitly badges "非现场照片": "${labelZh.captionBadge}"`);
  console.log(`  ${noFalseFieldEn ? '✓' : '✗'} 1px synthetic image never receives unverified "Field Photo" badge: ${noFalseFieldEn}`);

  if (!isLabeledNonFieldEn || !isLabeledNonFieldZh || !noFalseFieldEn) passed = false;

  // 13c. Template suggester non-field recommendation
  const syntheticSuggestion = suggestTemplateLocally({
    imageCount: 1,
    textLength: 50,
    locale: 'en',
    hasSyntheticOnly: true
  });
  const suggIsSyntheticLayout = syntheticSuggestion.templateName.includes('Test Image');
  const suggMentionsNonField = syntheticSuggestion.reason.includes('Non-Field Photo');

  console.log(`  ${suggIsSyntheticLayout ? '✓' : '✗'} Suggester recommends Test Image Layout for synthetic upload: "${syntheticSuggestion.templateName}"`);
  console.log(`  ${suggMentionsNonField ? '✓' : '✗'} Suggester reason explicitly disclaims field photo evidence: "${syntheticSuggestion.reason}"`);

  if (!suggIsSyntheticLayout || !suggMentionsNonField) passed = false;

  console.log('\n===========================================================');
  if (passed) {
    console.log('🎉 ALL CONFIDENTIALITY & IDENTITY FIXES VERIFIED SUCCESSFULLY!');
    setTimeout(() => process.exit(0), 50);
  } else {
    console.error('❌ SOME CHECKS FAILED');
    setTimeout(() => process.exit(1), 50);
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  setTimeout(() => process.exit(1), 50);
});
