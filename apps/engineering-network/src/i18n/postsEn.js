import { canonicalEntity } from '../data/canonicalEntities.js';
/**
 * English localization data for mock feed posts (POST-001 through POST-014)
 * Ensures natural, professional engineering terminology in English view
 */

export const POSTS_EN = {
  'POST-001': {
    title: '[MILESTONE] DEMO Project P001: 680t Long-Span Space Truss Lift Unit 4 Fully Completed',
    content: 'Today on-site, 24 digital hydraulic synchronized jacks completed an 8-hour lift, raising the 680-tonne space truss smoothly to its 28.5m design elevation. Laser scan joint inspection with Demo Organization G and Site Director Demo Engineer 01 confirmed alignment deviation within 2mm and 100% full-penetration weld pass rate.',
    authorName: 'Demo Organization B (General Contractor Group)',
    authorTitle: 'EPC General Contractor Lead (Mock) · Prime Project Lead',
    projectName: 'DEMO Project P001: Smart Equipment Manufacturing Base',
    timeAgo: '2h ago',
  },
  'POST-002': {
    title: '[FIELD LOG] Critical Controls in Ultra-High Hydraulic Synchronized Lifting of Industrial Trusses',
    content: 'Heavy space truss hydraulic synchronized lifting demands more than micron-level displacement sensor feedback; real-time dynamic compensation for uneven lifting point reaction forces is paramount. At P001, 3D fiber Bragg grating strain gauges stream live stress metrics into the BIM 4D digital twin command system.',
    authorName: 'Demo Engineer 01',
    authorTitle: 'Site Director / Licensed Builder (Demo Org B)',
    projectName: 'DEMO Project P001 (Smart Factory Facility)',
    timeAgo: '5h ago',
  },
  'POST-003': {
    title: '[DIGITAL PRACTICE] BIM 4D Forward Design and Multi-Discipline Coordinated Drawing Review',
    content: 'During the scheme deepening stage of DEMO Project P001, our digital engineering team eliminated 1,240 spatial clashes between MEP piping and heavy structural columns, securing first-pass approval on the statutory joint digital drawing review platform.',
    authorName: 'Demo Organization C (Engineering Design Institute)',
    authorTitle: 'Survey & Architectural Engineering (Mock) · BIM Digital Advisory',
    projectName: 'DEMO Project P001 (Smart Factory Facility)',
    timeAgo: '1d ago',
  },
  'POST-004': {
    title: '[GEOTECHNICAL] P002 Transit Hub 32m Deep Excavation Diaphragm Wall & Strut Stress Stability',
    content: 'Latest settlement and inclinometer reports show cumulative lateral displacement on the subway-adjacent diaphragm wall at 14.2mm, well below the 25mm design threshold. The pre-stressed servo hydraulic steel strut compensatory system operated smoothly.',
    authorName: 'Demo Organization D (Foundation Engineering Corp)',
    authorTitle: 'Deep Foundation Contractor (Mock)',
    projectName: 'DEMO Project P002: Underground Transit Complex Hub',
    timeAgo: '2d ago',
  },
  'POST-005': {
    title: '[MEP ENGINEERING] Micro-Vibration Mitigation and Anti-Seismic Piping Supports in Cleanrooms',
    content: 'With nano-scale microelectronics demanding strict environmental vibration thresholds (VC-E / VC-G criteria), piping water hammer and chilled water pump micro-vibration become top challenges. At DEMO Project P004, dual-chamber air spring isolation mounts kept floor vibration velocities below 3μm/s.',
    authorName: 'Demo Engineer 03',
    authorTitle: 'MEP Technical Director / Project Manager (Mock)',
    projectName: 'DEMO Project P004: Microelectronics Cleanroom & Power Center',
    timeAgo: '3d ago',
  },
  'POST-006': {
    title: '[AWARD NOTICE] Contract Awarded for DEMO Project P003 Coastal Heavy Assembly Complex',
    content: 'Grateful for client Demo Organization A\'s trust. Combining a 72m clear span assembly hall and heavy ocean ro-ro shipping berths, our group is deploying core teams with proven national landmark track records to ensure world-class delivery.',
    authorName: 'Demo Organization B (General Contractor Group)',
    authorTitle: 'EPC General Contractor Lead (Mock)',
    projectName: 'DEMO Project P003: Coastal Heavy Assembly Hall & Wharf',
    timeAgo: '4d ago',
  },
  'POST-007': {
    title: '[DISPATCH] Green Industrial Building Subsidies and BIPV Roof Verification Guidelines Issued',
    content: 'The industrial development authority officially enacted green manufacturing support guidelines today, granting up to 15% financial interest subsidies and fast-track permits for facilities achieving over 65% prefabrication and compliant BIPV photovoltaic coverage.',
    authorName: 'Demo Organization A (High-End Manufacturing Investment)',
    authorTitle: 'Owner / Project Client (Mock)',
    projectName: 'DEMO Project P006: Circular Economy Prefab Base',
    timeAgo: '5d ago',
  },
  'POST-008': {
    title: '[CALCULATIONS] Transient Dynamic Buckling Safety Margin Review of Heavy Space Trusses',
    content: 'Addressing geometrical non-linearities under synchronized lifting conditions, spatial FEA multi-eigenvalue buckling analyses confirmed the 1st mode critical load factor at 4.82, well above the 3.0 code minimum. Lifting lug stresses remained controlled at 248.5 MPa.',
    authorName: 'Demo Engineer 02',
    authorTitle: 'Principal Structural Engineer (Mock)',
    projectName: 'DEMO Project P001 (Smart Factory Facility)',
    timeAgo: '6d ago',
  },
  'POST-009': {
    title: '[ON-SITE] 1,600t Heavy Crawler Crane Completes Core Stamping Machinery Rigging at P001',
    content: 'Operating with a 96m boom, after a 3-hour test lift and steady swing, a 420-tonne heavy die-casting press host unit was positioned onto anti-vibration inertia blocks with positional accuracy within 1.2mm.',
    authorName: 'Demo Organization B (General Contractor Group)',
    authorTitle: 'EPC General Contractor Lead (Mock)',
    projectName: 'DEMO Project P001: Smart Equipment Manufacturing Base',
    timeAgo: '1w ago',
  },
  'POST-010': {
    title: '[METHODOLOGY] Active Air Spring Anti-Vibration Mount Installation & Laser Leveling in High-Tech Fab',
    content: 'Ultra-cleanrooms require extreme isolation from external vehicle traffic and HVAC fan harmonics. This method pairs dual-chamber air springs with viscous fluid dampers, achieving natural frequencies below 1.1Hz.',
    authorName: 'Demo Organization E (Industrial MEP & Cleanroom Tech)',
    authorTitle: 'MEP Installation Subcontractor (Mock)',
    projectName: 'DEMO Project P004: Microelectronics Cleanroom & Power Center',
    timeAgo: '1w ago',
  },
  'POST-011': {
    title: '[SUPERVISION] Full-Time On-Site Inspection and Digital Certificate Sign-off in Critical Works',
    content: 'During the 48-hour continuous space truss lifting and ultrasonic weld testing window, our supervision team maintained double-station presence, verifying ultrasonic A-scan wave records with certified digital credentials.',
    authorName: 'Demo Engineer 04',
    authorTitle: 'Chief Supervision Engineer (Mock)',
    projectName: 'DEMO Project P001: Smart Equipment Manufacturing Base',
    timeAgo: '1w ago',
  },
  'POST-012': {
    title: '[BULLETIN] DEMO Project P001 Four-Party Joint Digital Quality Bulletin (Issue 12)',
    content: 'The Client, EPC Contractor, Subcontractors, and Independent Inspection Engineers jointly released the 12th Quality Progress Report: 184 quality verification units inspected with 100% pass rate and zero high-risk findings.',
    authorName: 'Demo Organization G (Quality & Safety Testing Advisory)',
    authorTitle: 'Supervision & Quality Advisory (Mock)',
    projectName: 'DEMO Project P001: Smart Equipment Manufacturing Base',
    timeAgo: '2w ago',
  },
  'POST-013': {
    title: '[SUPPLY CHAIN] Heavy Industrial Structural Steel Plate Spot Market Trends & Mill Lead Times',
    content: 'With multiple coastal industrial plants breaking ground, Q355NH weathering steel and Z-axis through-thickness tear-resistant heavy plates are in high demand. Steel mill lead times have extended to 38 days.',
    authorName: 'Demo Organization B (General Contractor Group)',
    authorTitle: 'EPC General Contractor Lead (Mock)',
    projectName: 'DEMO Project P007: Renewable Equipment Park',
    timeAgo: '2w ago',
  },
  'POST-014': {
    title: '[FIELD TEST] P002 Deep Excavation Adaptive Servo Strut Axial Force Regulation Analysis',
    content: 'Following a sharp 8°C overnight temperature drop, steel struts contracted noticeably. The intelligent servo hydraulic pumping station automatically delivered pressure pulses to hold 4,600 kN pre-stress, keeping wall deformation within 0.4mm.',
    authorName: 'Demo Engineer 05',
    authorTitle: 'Geotechnical Engineering Lead (Mock)',
    projectName: 'DEMO Project P002: Underground Transit Complex Hub',
    timeAgo: '2w ago',
  }
};

/**
 * Localizes a post according to the active locale
 */
export function getLocalizedPost(post, locale) {
  if (!post) return post;
  if (locale === 'zh') return post;

  const enData = POSTS_EN[post.id];
  if (!enData) return post;

  return {
    ...post,
    title: enData.title || post.title,
    content: enData.content || post.content,
    authorName: canonicalEntity(post.authorId)?.name || post.authorName,
    authorTitle: canonicalEntity(post.authorId)?.title || canonicalEntity(post.authorId)?.role || post.authorTitle,
    projectName: enData.projectName || post.projectName,
    timeAgo: enData.timeAgo || post.timeAgo,
  };
}
