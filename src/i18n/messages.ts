import type { LocaleCode } from './locale';

type PhaseKey = 'focus' | 'shortBreak' | 'longBreak';
type PeriodKey = 'daily' | 'weekly' | 'monthly';

export interface I18nMessages {
  loading: string;
  tabs: {
    timer: string;
    settings: string;
    insights: string;
  };
  timer: {
    phaseLabels: Record<PhaseKey, string>;
    completedFocus: (count: number) => string;
    longBreakEvery: (value: number) => string;
    progress: (completed: number, target: number) => string;
    dailyGoalProgress: (completed: number, target: number) => string;
    dailyGoalPercent: (value: number) => string;
    infoButtonLabel: string;
    actions: {
      start: string;
      resume: string;
      abandon: string;
    };
  };
  settings: {
    generalTitle: string;
    focusMinutes: string;
    shortBreakMinutes: string;
    longBreakMinutes: string;
    longBreakEvery: string;
    language: string;
    notifyEnabled: string;
    soundEnabled: string;
    save: string;
    saveAll: string;
    languageOptions: Record<LocaleCode, string>;
    goalsTitle: string;
    goalsLoading: string;
    dailyPomodoroTarget: string;
    goalPeriods: Record<PeriodKey, string>;
    focusTarget: string;
    longCycleTarget: string;
    saveGoals: string;
  };
  insights: {
    triggerLabel: string;
    openButtonLabel: string;
    drawerTitle: string;
    closeButtonLabel: string;
    loading: string;
    statsTitle: string;
    heatmapTitle: string;
    heatmapLegendLess: string;
    heatmapLegendMore: string;
    weekStart: string;
    periods: Record<PeriodKey, string>;
    dimension: Record<PeriodKey, string>;
    focusCompleted: string;
    longCycleCompleted: string;
    focusTarget: string;
    longCycleTarget: string;
    focusRate: string;
    longCycleRate: string;
    goalCompleted: string;
    goalInProgress: string;
    chartTitle: string;
    chartEmpty: string;
    chartHint: string;
    chartTooltip: (
      label: string,
      focusCompleted: number,
      longCycleCompleted: number,
    ) => string;
    series: {
      focus: string;
      longCycle: string;
    };
    goalsTitle: string;
    saveGoals: string;
  };
}

export const MESSAGES: Record<LocaleCode, I18nMessages> = {
  'en-US': {
    loading: 'Loading...',
    tabs: {
      timer: 'Timer',
      settings: 'Settings',
      insights: 'Insights',
    },
    timer: {
      phaseLabels: {
        focus: 'Focus',
        shortBreak: 'Short Break',
        longBreak: 'Long Break',
      },
      completedFocus: (count: number) => `Completed Focus: ${count}`,
      longBreakEvery: (value: number) => `Long Break Every: ${value}`,
      progress: (completed: number, target: number) =>
        `Progress to Long Break: ${completed}/${target}`,
      dailyGoalProgress: (completed: number, target: number) =>
        `Daily Goal: ${completed}/${target}`,
      dailyGoalPercent: (value: number) => `Completion: ${value}%`,
      infoButtonLabel: 'Show timer progress',
      actions: {
        start: 'Start',
        resume: 'Resume',
        abandon: 'Abandon',
      },
    },
    settings: {
      generalTitle: 'Timer Settings',
      focusMinutes: 'Focus (minutes)',
      shortBreakMinutes: 'Short Break (minutes)',
      longBreakMinutes: 'Long Break (minutes)',
      longBreakEvery: 'Long Break Every',
      language: 'Language',
      notifyEnabled: 'Enable Notifications',
      soundEnabled: 'Enable Sound',
      save: 'Save Settings',
      saveAll: 'Save Changes',
      languageOptions: {
        'en-US': 'English',
        'zh-CN': '简体中文',
      },
      goalsTitle: 'Goal',
      goalsLoading: 'Loading goals...',
      dailyPomodoroTarget: 'Daily Pomodoro Target',
      goalPeriods: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
      },
      focusTarget: 'Focus Target',
      longCycleTarget: 'Long Cycle Target',
      saveGoals: 'Save Goals',
    },
    insights: {
      triggerLabel: 'Insights',
      openButtonLabel: 'Open productivity stats',
      drawerTitle: 'Productivity Stats',
      closeButtonLabel: 'Close stats drawer',
      loading: 'Loading insights...',
      statsTitle: 'Stats',
      heatmapTitle: 'Last 53 Weeks',
      heatmapLegendLess: 'Less',
      heatmapLegendMore: 'More',
      weekStart: 'Week starts on Sunday.',
      periods: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
      },
      dimension: {
        daily: 'Daily',
        weekly: 'Weekly',
        monthly: 'Monthly',
      },
      focusCompleted: 'Focus Completed',
      longCycleCompleted: 'Long Cycles Completed',
      focusTarget: 'Focus Target',
      longCycleTarget: 'Long Cycle Target',
      focusRate: 'Focus Completion',
      longCycleRate: 'Long Cycle Completion',
      goalCompleted: 'Goal Completed',
      goalInProgress: 'In Progress',
      chartTitle: 'Trend Chart',
      chartEmpty: 'No chart data',
      chartHint: 'Hover points to view values.',
      chartTooltip: (
        label: string,
        focusCompleted: number,
        longCycleCompleted: number,
      ) => `${label} | Focus: ${focusCompleted}, Long-cycle: ${longCycleCompleted}`,
      series: {
        focus: 'Focus',
        longCycle: 'Long-cycle',
      },
      goalsTitle: 'Goals',
      saveGoals: 'Save Goals',
    },
  },
  'zh-CN': {
    loading: '加载中...',
    tabs: {
      timer: '计时',
      settings: '设置',
      insights: '统计',
    },
    timer: {
      phaseLabels: {
        focus: '专注',
        shortBreak: '短休息',
        longBreak: '长休息',
      },
      completedFocus: (count: number) => `已完成专注：${count}`,
      longBreakEvery: (value: number) => `长休息间隔：${value}`,
      progress: (completed: number, target: number) =>
        `距离长休息进度：${completed}/${target}`,
      dailyGoalProgress: (completed: number, target: number) =>
        `每日目标：${completed}/${target}`,
      dailyGoalPercent: (value: number) => `完成度：${value}%`,
      infoButtonLabel: '查看计时进度',
      actions: {
        start: '开始',
        resume: '继续',
        abandon: '放弃',
      },
    },
    settings: {
      generalTitle: '计时设置',
      focusMinutes: '专注（分钟）',
      shortBreakMinutes: '短休息（分钟）',
      longBreakMinutes: '长休息（分钟）',
      longBreakEvery: '长休息间隔',
      language: '语言',
      notifyEnabled: '启用系统通知',
      soundEnabled: '启用提示音',
      save: '保存设置',
      saveAll: '保存更改',
      languageOptions: {
        'en-US': 'English',
        'zh-CN': '简体中文',
      },
      goalsTitle: '目标',
      goalsLoading: '正在加载目标...',
      dailyPomodoroTarget: '每日番茄目标',
      goalPeriods: {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
      },
      focusTarget: '专注目标',
      longCycleTarget: '长循环目标',
      saveGoals: '保存目标',
    },
    insights: {
      triggerLabel: '统计',
      openButtonLabel: '打开统计',
      drawerTitle: '统计',
      closeButtonLabel: '关闭统计抽屉',
      loading: '正在加载统计数据...',
      statsTitle: '统计',
      heatmapTitle: '最近 53 周',
      heatmapLegendLess: '少',
      heatmapLegendMore: '多',
      weekStart: '每周从周一开始。',
      periods: {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
      },
      dimension: {
        daily: '每日',
        weekly: '每周',
        monthly: '每月',
      },
      focusCompleted: '已完成专注',
      longCycleCompleted: '已完成长循环',
      focusTarget: '专注目标',
      longCycleTarget: '长循环目标',
      focusRate: '专注完成率',
      longCycleRate: '长循环完成率',
      goalCompleted: '已达成',
      goalInProgress: '进行中',
      chartTitle: '趋势图',
      chartEmpty: '暂无图表数据',
      chartHint: '悬停数据点可查看数值。',
      chartTooltip: (
        label: string,
        focusCompleted: number,
        longCycleCompleted: number,
      ) => `${label} | 专注: ${focusCompleted}，长循环: ${longCycleCompleted}`,
      series: {
        focus: '专注',
        longCycle: '长循环',
      },
      goalsTitle: '目标',
      saveGoals: '保存目标',
    },
  },
};
