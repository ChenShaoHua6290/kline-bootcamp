export type UserLearningTier = 'trial' | 'paid_training' | 'paid_full' | 'internal' | 'admin';
export type CourseAccessLevel = 'PREVIEW' | 'TRAINING' | 'FULL' | 'INTERNAL';
export type LessonType = 'VIDEO' | 'ARTICLE' | 'PDF' | 'MIXED';

export type LessonSummary = {
  id: string;
  title: string;
  type: LessonType;
  duration?: number | null;
  isPreview: boolean;
  accessLevel: CourseAccessLevel;
  sortOrder: number;
  locked: boolean;
  lockReason?: string | null;
};

export type CourseChapter = {
  id: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  status: string;
  lessons: LessonSummary[];
};

export type CourseItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverImage?: string | null;
  sortOrder: number;
  status: string;
  chapters: CourseChapter[];
  userAccessLevel?: CourseAccessLevel | null;
};

export type CoursesResponse = {
  userTier: UserLearningTier;
  learningPath: Array<{ key: string; title: string; description: string }>;
  courses: CourseItem[];
};

export type LessonPlayback = {
  id: string;
  chapterId: string;
  courseId: string;
  courseTitle: string;
  chapterTitle: string;
  title: string;
  type: LessonType;
  content?: string | null;
  videoProvider?: string | null;
  videoFileId?: string | null;
  videoUrl?: string | null;
  videoAppId?: string | number | null;
  videoPsign?: string | null;
  videoLicenseUrl?: string | null;
  attachmentUrl?: string | null;
  duration?: number | null;
  isPreview: boolean;
  accessLevel: CourseAccessLevel;
  prevLessonId?: string | null;
  nextLessonId?: string | null;
};

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '--';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min <= 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export function formatTier(tier?: UserLearningTier) {
  if (tier === 'admin') return '管理员';
  if (tier === 'internal') return '内部';
  if (tier === 'paid_full' || tier === 'paid_training') return '付费用户';
  return '试看';
}

export function formatAccessLevel(level?: CourseAccessLevel) {
  if (level === 'PREVIEW') return '试看';
  if (level === 'TRAINING') return '训练权限';
  if (level === 'INTERNAL') return '内部';
  return '完整课程';
}

export function effectiveAccessLevel(level?: CourseAccessLevel, isPreview?: boolean): CourseAccessLevel {
  if (isPreview || level === 'PREVIEW') return 'PREVIEW';
  return level ?? 'FULL';
}
