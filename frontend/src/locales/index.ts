import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enValidation from './en/validation.json';
import enHome from './en/home.json';
import enCourses from './en/courses.json';
import enResources from './en/resources.json';
import enTasks from './en/tasks.json';
import enQuizzes from './en/quizzes.json';
import enSettings from './en/settings.json';
import enCalendar from './en/calendar.json';
import enAi from './en/ai.json';
import enNotifications from './en/notifications.json';

import deCommon from './de/common.json';
import deAuth from './de/auth.json';
import deValidation from './de/validation.json';
import deHome from './de/home.json';
import deCourses from './de/courses.json';
import deResources from './de/resources.json';
import deTasks from './de/tasks.json';
import deQuizzes from './de/quizzes.json';
import deSettings from './de/settings.json';
import deCalendar from './de/calendar.json';
import deAi from './de/ai.json';
import deNotifications from './de/notifications.json';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const enTranslation = {
  common: enCommon,
  auth: enAuth,
  validation: enValidation,
  home: enHome,
  courses: enCourses,
  resources: enResources,
  tasks: enTasks,
  quizzes: enQuizzes,
  settings: enSettings,
  calendar: enCalendar,
  ai: enAi,
  notifications: enNotifications,
};

const deTranslation = {
  common: deCommon,
  auth: deAuth,
  validation: deValidation,
  home: deHome,
  courses: deCourses,
  resources: deResources,
  tasks: deTasks,
  quizzes: deQuizzes,
  settings: deSettings,
  calendar: deCalendar,
  ai: deAi,
  notifications: deNotifications,
};

export const resources = {
  en: { translation: enTranslation },
  de: { translation: deTranslation },
} as const;
