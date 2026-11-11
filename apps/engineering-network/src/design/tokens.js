/**
 * Project Atlas / Engineering Network V4 Design Tokens
 * 统一设计令牌：专业工程杂志感，信息密度可控、统一色彩系统与核验语义。
 */

export const TOKENS = {
  colors: {
    // 品牌色：工程翡翠绿（明亮与深色适配）
    brand: {
      primary: 'var(--accent, #0E8F6B)',
      primaryDark: '#0B7356',
      primaryLight: '#10B981',
      accent: '#0284C7',
    },
    surface: {
      background: 'var(--bg-canvas, #FAFAF8)',
      card: 'var(--bg-surface, #FFFFFF)',
      cardSubtle: 'var(--bg-surface-subtle, #F6F7F8)',
      border: 'var(--border-hairline, #E6E7E9)',
      borderSubtle: 'var(--border-subtle, #D6D9DE)',
    },
    ink: {
      primary: 'var(--ink-primary, #1C1F23)',
      muted: 'var(--ink-muted, #5B6168)',
      faint: 'var(--ink-faint, #8C939D)',
    },
    // 三态核验等级语义色 - 明确使用“模拟核验”，绝不暗示现实资质真实核验
    verification: {
      VERIFIED: {
        text: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/80',
        border: 'border-emerald-200 dark:border-emerald-700/60',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/80',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        badgeBorder: 'border-emerald-300 dark:border-emerald-700/60',
        dot: 'bg-emerald-600 dark:bg-emerald-400',
        label: '模拟核验 (Mock Verified)',
        shortLabel: '模拟核验',
      },
      SELF_CLAIMED: {
        text: 'text-sky-700 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-950/80',
        border: 'border-sky-200 dark:border-sky-700/60',
        badgeBg: 'bg-sky-50 dark:bg-sky-950/80',
        badgeText: 'text-sky-700 dark:text-sky-300',
        badgeBorder: 'border-sky-300 dark:border-sky-700/60',
        dot: 'bg-sky-600 dark:bg-sky-400',
        label: '机构自述 (Self-Reported)',
        shortLabel: '自述',
      },
      AI_CANDIDATE: {
        text: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/80',
        border: 'border-amber-200 dark:border-amber-700/60',
        badgeBg: 'bg-amber-50 dark:bg-amber-950/80',
        badgeText: 'text-amber-700 dark:text-amber-300',
        badgeBorder: 'border-amber-300 dark:border-amber-700/60',
        dot: 'bg-amber-600 dark:bg-amber-400',
        label: 'AI 候选抓取 (AI Candidate - MOCK)',
        shortLabel: 'AI候选',
      },
      PLANNED: {
        text: 'text-ink-muted',
        bg: 'bg-surface-subtle',
        border: 'border-hairline',
        badgeBg: 'bg-surface-subtle',
        badgeText: 'text-ink-muted',
        badgeBorder: 'border-hairline',
        dot: 'bg-slate-400',
        label: '计划预设 (Planned)',
        shortLabel: '计划预设',
      }
    },
    // 工程参与角色 (bidding / awarding / performance / delivery / acceptance)
    roles: {
      bidding: {
        label: '投标阶段',
        tag: '投标 (Bidding)',
        color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-800/60',
      },
      awarding: {
        label: '授标阶段',
        tag: '授标 (Awarded)',
        color: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800/60',
      },
      performance: {
        label: '履约实施',
        tag: '履约 (In-Performance)',
        color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800/60',
      },
      delivery: {
        label: '交付阶段',
        tag: '交付 (Delivered)',
        color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 border-cyan-200 dark:border-cyan-800/60',
      },
      acceptance: {
        label: '验收阶段',
        tag: '验收 (Accepted)',
        color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800/60',
      }
    }
  },
  typography: {
    fontSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWiki: 'Charter, Georgia, Cambria, "Times New Roman", serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontQuote: '"Songti SC", SimSun, STSong, Charter, Georgia, serif',
  }
};
