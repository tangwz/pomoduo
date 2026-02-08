import type { LocaleCode } from './locale';

type PhaseKey = 'focus' | 'shortBreak' | 'longBreak';

export interface I18nMessages {
  loading: string;
  tabs: {
    timer: string;
    settings: string;
  };
  timer: {
    phaseLabels: Record<PhaseKey, string>;
    completedFocus: (count: number) => string;
    longBreakEvery: (value: number) => string;
    progress: (completed: number, target: number) => string;
    infoButtonLabel: string;
    actions: {
      start: string;
      resume: string;
      abandon: string;
    };
  };
  settings: {
    focusMinutes: string;
    shortBreakMinutes: string;
    longBreakMinutes: string;
    longBreakEvery: string;
    language: string;
    notifyEnabled: string;
    soundEnabled: string;
    save: string;
    languageOptions: Record<LocaleCode, string>;
  };
}

export const MESSAGES: Record<LocaleCode, I18nMessages> = {
  'en-US': {
    loading: 'Loading...',
    tabs: {
      timer: 'Timer',
      settings: 'Settings',
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
      infoButtonLabel: 'Show timer progress',
      actions: {
        start: 'Start',
        resume: 'Resume',
        abandon: 'Abandon',
      },
    },
    settings: {
      focusMinutes: 'Focus (minutes)',
      shortBreakMinutes: 'Short Break (minutes)',
      longBreakMinutes: 'Long Break (minutes)',
      longBreakEvery: 'Long Break Every',
      language: 'Language',
      notifyEnabled: 'Enable Notifications',
      soundEnabled: 'Enable Sound',
      save: 'Save Settings',
      languageOptions: {
        'en-US': 'English',
        'zh-CN': '\u7B80\u4F53\u4E2D\u6587',
      },
    },
  },
  'zh-CN': {
    loading: '\u52A0\u8F7D\u4E2D...',
    tabs: {
      timer: '\u8BA1\u65F6',
      settings: '\u8BBE\u7F6E',
    },
    timer: {
      phaseLabels: {
        focus: '\u4E13\u6CE8',
        shortBreak: '\u77ED\u4F11\u606F',
        longBreak: '\u957F\u4F11\u606F',
      },
      completedFocus: (count: number) => `\u5DF2\u5B8C\u6210\u4E13\u6CE8\uFF1A${count}`,
      longBreakEvery: (value: number) => `\u957F\u4F11\u606F\u95F4\u9694\uFF1A${value}`,
      progress: (completed: number, target: number) =>
        `\u8DDD\u79BB\u957F\u4F11\u606F\u8FDB\u5EA6\uFF1A${completed}/${target}`,
      infoButtonLabel: '\u67E5\u770B\u8BA1\u65F6\u8FDB\u5EA6',
      actions: {
        start: '\u5F00\u59CB',
        resume: '\u7EE7\u7EED',
        abandon: '\u653E\u5F03',
      },
    },
    settings: {
      focusMinutes: '\u4E13\u6CE8\uFF08\u5206\u949F\uFF09',
      shortBreakMinutes: '\u77ED\u4F11\u606F\uFF08\u5206\u949F\uFF09',
      longBreakMinutes: '\u957F\u4F11\u606F\uFF08\u5206\u949F\uFF09',
      longBreakEvery: '\u957F\u4F11\u606F\u95F4\u9694',
      language: '\u8BED\u8A00',
      notifyEnabled: '\u542F\u7528\u7CFB\u7EDF\u901A\u77E5',
      soundEnabled: '\u542F\u7528\u63D0\u793A\u97F3',
      save: '\u4FDD\u5B58\u8BBE\u7F6E',
      languageOptions: {
        'en-US': 'English',
        'zh-CN': '\u7B80\u4F53\u4E2D\u6587',
      },
    },
  },
};
