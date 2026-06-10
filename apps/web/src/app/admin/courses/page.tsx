'use client';

import { FormEvent, ReactNode, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { PageDescription, PageHeader, PageTitle } from '@/components/ui/PageHeader';
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';
import { CourseAccessLevel, LessonType, formatAccessLevel, formatDuration } from '@/lib/courses/types';

type AdminLesson = {
  id: string;
  title: string;
  type: LessonType;
  content?: string | null;
  videoProvider?: string | null;
  videoFileId?: string | null;
  videoUrl?: string | null;
  attachmentUrl?: string | null;
  duration?: number | null;
  isPreview: boolean;
  accessLevel: CourseAccessLevel;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};
type AdminChapter = {
  id: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  lessons: AdminLesson[];
};
type AdminCourse = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  coverImage?: string | null;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  chapters: AdminChapter[];
};
type CourseForm = {
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};
type LessonForm = {
  title: string;
  type: LessonType;
  content: string;
  videoFileId: string;
  attachmentUrl: string;
  duration: number;
  accessLevel: CourseAccessLevel;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};
type EditorTarget = 'course' | 'lesson';
type DeleteTarget =
  | { type: 'course'; row: AdminCourse }
  | { type: 'lesson'; row: AdminLesson };
type UploadedCourseAsset = {
  url: string;
  kind: 'image' | 'pdf';
  mimeType: string;
  originalName: string;
  size: number;
};

const emptyCourse: CourseForm = { title: '', subtitle: '', description: '', coverImage: '', sortOrder: 0, status: 'DRAFT' };
const emptyLesson: LessonForm = {
  title: '',
  type: 'MIXED',
  content: '',
  videoFileId: '',
  attachmentUrl: '',
  duration: 0,
  accessLevel: 'FULL',
  sortOrder: 0,
  status: 'DRAFT',
};

function statusBadge(status: string) {
  if (status === 'PUBLISHED') return <Badge tone="success">已上架</Badge>;
  if (status === 'ARCHIVED') return <Badge tone="default">已归档</Badge>;
  return <Badge tone="warning">草稿</Badge>;
}

function lessonTypeLabel(type: LessonType) {
  if (type === 'VIDEO') return '视频';
  if (type === 'ARTICLE') return '图文';
  if (type === 'PDF') return 'PDF';
  return '混合';
}

function courseLessonCount(course: AdminCourse) {
  return course.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
}

function adminStats(courses: AdminCourse[]) {
  const lessonCount = courses.reduce((sum, course) => sum + courseLessonCount(course), 0);
  const publishedLessonCount = courses.reduce(
    (sum, course) => sum + course.chapters.reduce((inner, chapter) => inner + chapter.lessons.filter((lesson) => lesson.status === 'PUBLISHED').length, 0),
    0,
  );
  const previewLessonCount = courses.reduce(
    (sum, course) => sum + course.chapters.reduce((inner, chapter) => inner + chapter.lessons.filter((lesson) => lesson.isPreview).length, 0),
    0,
  );
  return { lessonCount, publishedLessonCount, previewLessonCount };
}

function resolveUploadedAssetUrl(url: string) {
  if (!url.startsWith('/uploads/')) return url;
  const baseURL = api.defaults.baseURL || '';
  if (baseURL.startsWith('http')) return `${baseURL.replace(/\/$/, '')}${url}`;
  if (baseURL.startsWith('/api')) return `/api${url}`;
  return url;
}

function deleteTargetTitle(target: DeleteTarget | null) {
  if (!target) return '';
  if (target.type === 'course') return `删除课程「${target.row.title}」`;
  return `删除课时「${target.row.title}」`;
}

function deleteTargetDescription(target: DeleteTarget | null) {
  if (!target) return '';
  if (target.type === 'course') {
    return `这会同时删除 ${courseLessonCount(target.row)} 个课时，以及这些课时对应的用户学习进度。`;
  }
  return '这会同时删除该课时对应的用户学习进度。';
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function EditorTab({
  active,
  disabled,
  children,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-9 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
        active ? 'border-cyan-400/55 bg-cyan-500/14 text-cyan-100' : 'border-slate-700/80 bg-slate-950/35 text-slate-300 hover:border-slate-500'
      }`}
    >
      {children}
    </button>
  );
}

function IconSvg({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

function EditIcon() {
  return (
    <IconSvg>
      <path d="M4 20h4l11-11a2.2 2.2 0 0 0-3.1-3.1L5 17v3Z" />
      <path d="m14 7 3 3" />
    </IconSvg>
  );
}

function TrashIcon() {
  return (
    <IconSvg>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </IconSvg>
  );
}

function ActionIconButton({
  label,
  tone = 'default',
  disabled,
  children,
  onClick,
}: {
  label: string;
  tone?: 'default' | 'danger' | 'success';
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-400/35 bg-rose-500/12 text-rose-100 hover:border-rose-300/70 hover:bg-rose-500/22'
      : tone === 'success'
        ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100 hover:border-emerald-300/70 hover:bg-emerald-500/22'
        : 'border-slate-600/70 bg-slate-950/35 text-slate-300 hover:border-cyan-400/50 hover:bg-cyan-500/12 hover:text-cyan-100';

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}
    >
      {children}
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-950 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-xl group-hover:block group-focus-visible:block">
        {label}
      </span>
    </button>
  );
}

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseForm>(emptyCourse);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonForm>(emptyLesson);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<EditorTarget>('course');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: 'success' | 'error' | 'info' }>({ open: false, message: '', tone: 'info' });

  const coursesQuery = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => (await api.get<AdminCourse[]>('/admin/courses')).data,
  });

  const courses = coursesQuery.data ?? [];
  const selectedCourse = useMemo(() => courses.find((c) => c.id === selectedCourseId) ?? courses[0] ?? null, [courses, selectedCourseId]);
  const stats = useMemo(() => adminStats(courses), [courses]);
  const selectedCourseLessons = useMemo(() => selectedCourse?.chapters.flatMap((chapter) => chapter.lessons) ?? [], [selectedCourse]);
  const allLessons = useMemo(() => courses.flatMap((course) => course.chapters.flatMap((chapter) => chapter.lessons)), [courses]);
  const editingCourseRow = useMemo(() => courses.find((course) => course.id === editingCourseId) ?? null, [courses, editingCourseId]);
  const editingLessonRow = useMemo(() => allLessons.find((lesson) => lesson.id === editingLessonId) ?? null, [allLessons, editingLessonId]);

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };
  const showError = (fallback: string, err: unknown) => {
    const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    setToast({ open: true, message: Array.isArray(msg) ? msg.join('，') : msg || fallback, tone: 'error' });
  };
  const uploadCourseAsset = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await api.post<UploadedCourseAsset>('/admin/course-assets', formData);
    return { ...resp.data, url: resolveUploadedAssetUrl(resp.data.url) };
  };
  const uploadCourseCoverImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setToast({ open: true, message: '请选择图片文件', tone: 'error' });
      return;
    }
    setUploadingCover(true);
    try {
      const asset = await uploadCourseAsset(file);
      if (asset.kind !== 'image') throw new Error('请选择图片文件');
      setEditingCourse((p) => ({ ...p, coverImage: asset.url }));
      setToast({ open: true, message: '课程封面已上传并填入 URL', tone: 'success' });
    } catch (err) {
      showError('课程封面上传失败', err);
    } finally {
      setUploadingCover(false);
    }
  };
  const uploadLessonImage = async (file: File) => {
    const asset = await uploadCourseAsset(file);
    if (asset.kind !== 'image') throw new Error('请选择图片文件');
    setToast({ open: true, message: '图片已上传并插入正文', tone: 'success' });
    return asset.url;
  };
  const uploadLessonPdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setToast({ open: true, message: '请选择 PDF 文件', tone: 'error' });
      return;
    }
    setUploadingPdf(true);
    try {
      const asset = await uploadCourseAsset(file);
      if (asset.kind !== 'pdf') throw new Error('请选择 PDF 文件');
      setEditingLesson((p) => ({ ...p, attachmentUrl: asset.url }));
      setToast({ open: true, message: 'PDF 已上传并填入 URL', tone: 'success' });
    } catch (err) {
      showError('PDF 上传失败', err);
    } finally {
      setUploadingPdf(false);
    }
  };

  const saveCourseMutation = useMutation({
    mutationFn: async () => {
      const body = { ...editingCourse, sortOrder: Number(editingCourse.sortOrder) || 0 };
      if (editingCourseId) return (await api.patch(`/admin/courses/${editingCourseId}`, body)).data;
      return (await api.post('/admin/courses', body)).data;
    },
    onSuccess: () => {
      setToast({ open: true, message: editingCourseId ? '课程已更新' : '课程已创建', tone: 'success' });
      setEditingCourse(emptyCourse);
      setEditingCourseId(null);
      setActiveEditor('course');
      reload();
    },
    onError: (err) => showError('课程保存失败', err),
  });

  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) throw new Error('请选择课程');
      const isVideoLesson = editingLesson.type === 'VIDEO' || editingLesson.type === 'MIXED';
      const body = {
        ...editingLesson,
        videoProvider: isVideoLesson && editingLesson.videoFileId ? 'tencent-vod' : '',
        videoFileId: isVideoLesson ? editingLesson.videoFileId : '',
        videoUrl: '',
        attachmentUrl: editingLesson.attachmentUrl,
        duration: Number(editingLesson.duration) || 0,
        isPreview: editingLesson.accessLevel === 'PREVIEW',
        sortOrder: Number(editingLesson.sortOrder) || 0,
      };
      if (editingLessonId) return (await api.patch(`/admin/lessons/${editingLessonId}`, body)).data;
      return (await api.post(`/admin/courses/${selectedCourse.id}/lessons`, body)).data;
    },
    onSuccess: () => {
      setToast({ open: true, message: editingLessonId ? '课时已更新' : '课时已创建', tone: 'success' });
      setEditingLesson(emptyLesson);
      setEditingLessonId(null);
      setActiveEditor('lesson');
      reload();
    },
    onError: (err) => showError('课时保存失败', err),
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.type === 'course') return (await api.delete(`/admin/courses/${target.row.id}`)).data;
      return (await api.delete(`/admin/lessons/${target.row.id}`)).data;
    },
    onSuccess: (_data, target) => {
      if (target.type === 'course') {
        if (selectedCourseId === target.row.id) {
          setSelectedCourseId(null);
        }
        if (editingCourseId === target.row.id) {
          setEditingCourse(emptyCourse);
          setEditingCourseId(null);
        }
        setEditingLesson(emptyLesson);
        setEditingLessonId(null);
        setActiveEditor('course');
        setToast({ open: true, message: '课程已删除，关联课时和学习进度已同步删除', tone: 'success' });
      } else {
        if (editingLessonId === target.row.id) {
          setEditingLesson(emptyLesson);
          setEditingLessonId(null);
        }
        setActiveEditor('lesson');
        setToast({ open: true, message: '课时已删除，相关学习进度已同步删除', tone: 'success' });
      }
      setDeleteTarget(null);
      reload();
      queryClient.invalidateQueries({ queryKey: ['course-detail'] });
      queryClient.invalidateQueries({ queryKey: ['lesson'] });
    },
    onError: (err) => showError('删除失败', err),
  });

  const startEditCourse = (course: AdminCourse) => {
    setSelectedCourseId(course.id);
    setActiveEditor('course');
    setEditingCourseId(course.id);
    setEditingCourse({
      title: course.title,
      subtitle: course.subtitle ?? '',
      description: course.description ?? '',
      coverImage: course.coverImage ?? '',
      sortOrder: course.sortOrder,
      status: course.status as CourseForm['status'],
    });
  };
  const startEditLesson = (lesson: AdminLesson) => {
    setActiveEditor('lesson');
    setEditingLessonId(lesson.id);
    setEditingLesson({
      title: lesson.title,
      type: lesson.type,
      content: lesson.content ?? '',
      videoFileId: lesson.videoFileId ?? '',
      attachmentUrl: lesson.attachmentUrl ?? '',
      duration: lesson.duration ?? 0,
      accessLevel: lesson.accessLevel,
      sortOrder: lesson.sortOrder,
      status: lesson.status,
    });
  };

  const startCreateCourse = () => {
    setEditingCourse(emptyCourse);
    setEditingCourseId(null);
    setActiveEditor('course');
  };
  const startCreateLesson = () => {
    setEditingLesson(emptyLesson);
    setEditingLessonId(null);
    setActiveEditor('lesson');
  };

  const submitCourse = (e: FormEvent) => {
    e.preventDefault();
    saveCourseMutation.mutate();
  };
  const submitLesson = (e: FormEvent) => {
    e.preventDefault();
    saveLessonMutation.mutate();
  };
  const isVideoLessonForm = editingLesson.type === 'VIDEO' || editingLesson.type === 'MIXED';

  return (
    <AdminLayout title="课程管理">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) uploadCourseCoverImage(file);
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) uploadLessonPdf(file);
        }}
      />
      <PageHeader>
        <div>
          <PageTitle>课程管理</PageTitle>
          <PageDescription>维护课程、课时、视频fileId、PDF课件，以及课时访问权限。</PageDescription>
        </div>
      </PageHeader>

      {coursesQuery.isLoading ? <LoadingState message="课程数据加载中..." /> : null}
      {coursesQuery.isError ? <ErrorState message="课程数据加载失败，请重试。" /> : null}

      {!coursesQuery.isLoading && !coursesQuery.isError ? (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/65 px-3 py-2.5">
              <div className="text-xl font-semibold text-slate-100">{courses.length}</div>
              <div className="mt-0.5 text-xs text-slate-500">课程</div>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/65 px-3 py-2.5">
              <div className="text-xl font-semibold text-slate-100">{stats.lessonCount}</div>
              <div className="mt-0.5 text-xs text-slate-500">课时</div>
            </div>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5">
              <div className="text-xl font-semibold text-cyan-100">{stats.publishedLessonCount}</div>
              <div className="mt-0.5 text-xs text-cyan-100/70">已上架课时 · {stats.previewLessonCount} 试看</div>
            </div>
          </div>

          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(620px,760px)]">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-800/90 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">内容结构</div>
                    <div className="mt-0.5 text-xs text-slate-500">课程 → 课时，先选择左侧课程，再在右侧编辑。</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={startCreateCourse}>新建课程</Button>
                    <Button size="sm" variant="ghost" disabled={!selectedCourse} onClick={() => startCreateLesson()}>新建课时</Button>
                  </div>
                </div>
              </div>

              <div className="grid min-h-[500px] divide-y divide-slate-800/90 lg:grid-cols-[280px_minmax(300px,1fr)] lg:divide-x lg:divide-y-0 2xl:grid-cols-[300px_minmax(360px,1fr)]">
                <section className="min-w-0 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Level 1</div>
                      <div className="mt-1 text-sm font-semibold text-slate-100">课程</div>
                    </div>
                    <Badge>{courses.length}</Badge>
                  </div>
                  <div className="space-y-2 xl:max-h-[calc(100vh-300px)] xl:overflow-y-auto xl:pr-1">
                    {courses.map((course) => {
                      const active = selectedCourse?.id === course.id;
                      return (
                        <div key={course.id} className={`rounded-xl border px-3 py-2.5 transition ${active ? 'border-cyan-400/55 bg-cyan-500/12' : 'border-slate-700/75 bg-slate-900/55 hover:border-slate-500'}`}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setSelectedCourseId(course.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-100">{course.title}</div>
                                {course.subtitle ? <div className="mt-0.5 truncate text-xs text-slate-400">{course.subtitle}</div> : null}
                              </div>
                              <div className="shrink-0">{statusBadge(course.status)}</div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge>{courseLessonCount(course)} 课时</Badge>
                              <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-500">排序 {course.sortOrder}</span>
                            </div>
                          </button>
                          <div className="mt-2 flex justify-end gap-1.5">
                            <ActionIconButton label="编辑课程" onClick={() => startEditCourse(course)}>
                              <EditIcon />
                            </ActionIconButton>
                            <ActionIconButton label="删除课程" tone="danger" onClick={() => setDeleteTarget({ type: 'course', row: course })}>
                              <TrashIcon />
                            </ActionIconButton>
                          </div>
                        </div>
                      );
                    })}
                    {courses.length === 0 ? <EmptyState title="暂无课程" description="先在右侧创建第一门课程。" /> : null}
                  </div>
                </section>

                <section className="min-w-0 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Level 2</div>
                      <div className="mt-1 text-sm font-semibold text-slate-100">课时</div>
                    </div>
                    <Badge>{selectedCourseLessons.length}</Badge>
                  </div>
                  {selectedCourse ? (
                    <div className="space-y-2 xl:max-h-[calc(100vh-300px)] xl:overflow-y-auto xl:pr-1">
                      <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-xs text-slate-400">
                        所属课程：<span className="text-slate-200">{selectedCourse.title}</span>
                      </div>
                      {selectedCourseLessons.map((lesson) => (
                        <div key={lesson.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-slate-700/75 bg-slate-900/55 px-3 py-2.5 transition hover:border-slate-500">
                          <button type="button" className="min-w-0 text-left" onClick={() => startEditLesson(lesson)}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-slate-100">{lesson.title}</span>
                              <Badge>{lessonTypeLabel(lesson.type)}</Badge>
                              {lesson.isPreview ? <Badge tone="success">试看</Badge> : null}
                              {lesson.status !== 'PUBLISHED' ? statusBadge(lesson.status) : null}
                            </div>
                            <div className="mt-1.5 text-xs text-slate-500">{formatAccessLevel(lesson.accessLevel)} · {formatDuration(lesson.duration)} · 排序 {lesson.sortOrder}</div>
                            <div className="mt-1 text-xs text-slate-600">
                              {lesson.videoFileId ? `fileId: ${lesson.videoFileId}` : lesson.videoUrl ? '已填写 videoUrl' : lesson.attachmentUrl ? '已填写附件' : '未绑定媒体'}
                            </div>
                          </button>
                          <div className="flex items-center">
                            <ActionIconButton label="删除课时" tone="danger" onClick={() => setDeleteTarget({ type: 'lesson', row: lesson })}>
                              <TrashIcon />
                            </ActionIconButton>
                          </div>
                        </div>
                      ))}
                      {selectedCourseLessons.length === 0 ? <EmptyState title="暂无课时" description="为当前课程创建第一节课。" /> : null}
                    </div>
                  ) : (
                    <EmptyState title="未选择课程" description="先选择或创建课程。" />
                  )}
                </section>
              </div>
            </Card>

            <Card className="p-4 2xl:sticky 2xl:top-3 2xl:max-h-[calc(100vh-96px)] 2xl:self-start 2xl:overflow-y-auto">
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-100">编辑器</div>
                <div className="mt-1 truncate text-xs leading-5 text-slate-500">
                  当前：{selectedCourse?.title ?? '未选择课程'}
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <EditorTab active={activeEditor === 'course'} onClick={() => setActiveEditor('course')}>课程</EditorTab>
                <EditorTab active={activeEditor === 'lesson'} disabled={!selectedCourse} onClick={() => setActiveEditor('lesson')}>课时</EditorTab>
              </div>

              {activeEditor === 'course' ? (
                <form className="space-y-3" onSubmit={submitCourse}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-100">{editingCourseId ? '编辑课程' : '创建课程'}</div>
                    {editingCourseId ? <Badge tone="info">{editingCourseId}</Badge> : <Badge tone="warning">新课程</Badge>}
                  </div>
                  <Field label="课程标题"><Input value={editingCourse.title} onChange={(e) => setEditingCourse((p) => ({ ...p, title: e.target.value }))} placeholder="例如：系统课件" required /></Field>
                  <Field label="副标题"><Input value={editingCourse.subtitle} onChange={(e) => setEditingCourse((p) => ({ ...p, subtitle: e.target.value }))} placeholder="用于前台展示的短说明" /></Field>
                  <Field label="课程封面图 URL" hint="支持本地上传图片">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input value={editingCourse.coverImage} onChange={(e) => setEditingCourse((p) => ({ ...p, coverImage: e.target.value }))} placeholder="课程封面图片 URL" />
                      <Button size="sm" variant="ghost" disabled={uploadingCover} onClick={() => coverInputRef.current?.click()}>
                        {uploadingCover ? '上传中...' : '上传封面'}
                      </Button>
                    </div>
                    {editingCourse.coverImage ? (
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/45">
                        <img src={editingCourse.coverImage} alt="课程封面预览" className="h-28 w-full object-cover" />
                      </div>
                    ) : null}
                  </Field>
                  <Field label="课程简介"><textarea className="app-input min-h-[86px] w-full rounded-xl px-3 py-2 text-sm" value={editingCourse.description} onChange={(e) => setEditingCourse((p) => ({ ...p, description: e.target.value }))} placeholder="课程简介" /></Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="排序"><Input type="number" value={editingCourse.sortOrder} onChange={(e) => setEditingCourse((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))} /></Field>
                    <Field label="状态">
                      <Select value={editingCourse.status} onChange={(e) => setEditingCourse((p) => ({ ...p, status: e.target.value as CourseForm['status'] }))}>
                        <option value="DRAFT">草稿</option>
                        <option value="PUBLISHED">上架</option>
                        <option value="ARCHIVED">归档</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {editingCourseRow ? <Button variant="danger" onClick={() => setDeleteTarget({ type: 'course', row: editingCourseRow })}>删除课程</Button> : null}
                    {editingCourseId ? <Button variant="ghost" onClick={startCreateCourse}>取消编辑</Button> : null}
                    <Button variant="primary" type="submit" disabled={saveCourseMutation.isPending}>{saveCourseMutation.isPending ? '保存中...' : '保存课程'}</Button>
                  </div>
                </form>
              ) : null}

              {activeEditor === 'lesson' ? (
                <form className="space-y-3" onSubmit={submitLesson}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-100">{editingLessonId ? '编辑课时' : '创建课时'}</div>
                    <Badge tone={selectedCourse ? 'info' : 'warning'}>{selectedCourse ? selectedCourse.title : '未选择课程'}</Badge>
                  </div>
                  <Field label="课时标题"><Input value={editingLesson.title} onChange={(e) => setEditingLesson((p) => ({ ...p, title: e.target.value }))} placeholder="例如：固定模式" required /></Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="课时类型">
                      <Select value={editingLesson.type} onChange={(e) => setEditingLesson((p) => ({ ...p, type: e.target.value as LessonType }))}>
                        <option value="VIDEO">video 视频</option>
                        <option value="ARTICLE">article 图文</option>
                        <option value="PDF">pdf 课件</option>
                        <option value="MIXED">mixed 混合</option>
                      </Select>
                    </Field>
                    <Field label="访问权限">
                      <Select value={editingLesson.accessLevel} onChange={(e) => setEditingLesson((p) => ({ ...p, accessLevel: e.target.value as CourseAccessLevel }))}>
                        <option value="PREVIEW">试看</option>
                        <option value="TRAINING">训练权限</option>
                        <option value="FULL">完整课程</option>
                        <option value="INTERNAL">内部</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="课时内容 / Markdown" hint="支持标题、列表、引用、链接和图片">
                    <MarkdownEditor
                      value={editingLesson.content}
                      onChange={(content) => setEditingLesson((p) => ({ ...p, content }))}
                      splitPreview={false}
                      uploadImage={uploadLessonImage}
                      placeholder={[
                        '## 本课重点',
                        '',
                        '- 写下核心规则',
                        '- 插入图片：![K线案例](https://example.com/chart.png)',
                        '',
                        '> 指标只是执行辅助，不是预测工具。',
                      ].join('\n')}
                    />
                  </Field>
                  {isVideoLessonForm ? (
                    <Field label="云点播 fileId">
                      <Input value={editingLesson.videoFileId} onChange={(e) => setEditingLesson((p) => ({ ...p, videoFileId: e.target.value }))} placeholder="腾讯云点播 fileId" />
                    </Field>
                  ) : null}
                  <Field label="PDF 附件 URL" hint="可选，任何课时类型都可绑定">
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <Input value={editingLesson.attachmentUrl} onChange={(e) => setEditingLesson((p) => ({ ...p, attachmentUrl: e.target.value }))} placeholder="PDF课件URL" />
                      <Button size="sm" variant="ghost" disabled={uploadingPdf} onClick={() => pdfInputRef.current?.click()}>
                        {uploadingPdf ? '上传中...' : '上传PDF'}
                      </Button>
                    </div>
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Field label="时长秒"><Input type="number" value={editingLesson.duration} onChange={(e) => setEditingLesson((p) => ({ ...p, duration: Number(e.target.value) || 0 }))} /></Field>
                    <Field label="排序"><Input type="number" value={editingLesson.sortOrder} onChange={(e) => setEditingLesson((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))} /></Field>
                    <Field label="状态">
                      <Select value={editingLesson.status} onChange={(e) => setEditingLesson((p) => ({ ...p, status: e.target.value as LessonForm['status'] }))}>
                        <option value="DRAFT">草稿</option>
                        <option value="PUBLISHED">上架</option>
                        <option value="ARCHIVED">归档</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    {editingLessonRow ? <Button variant="danger" onClick={() => setDeleteTarget({ type: 'lesson', row: editingLessonRow })}>删除课时</Button> : null}
                    {editingLessonId ? <Button variant="ghost" onClick={() => startCreateLesson()}>取消编辑</Button> : null}
                    <Button variant="primary" type="submit" disabled={!selectedCourse || saveLessonMutation.isPending}>{saveLessonMutation.isPending ? '保存中...' : '保存课时'}</Button>
                  </div>
                </form>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} className="max-w-lg p-0">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-base font-semibold text-slate-100">{deleteTargetTitle(deleteTarget)}</div>
          <div className="mt-1 text-sm leading-6 text-slate-400">删除后用户端将不再展示该内容，已打开的详情页会显示内容已下架或已删除。</div>
        </div>
        <div className="px-5 py-4">
          <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
            {deleteTargetDescription(deleteTarget)}
          </div>
          <div className="mt-4 text-xs leading-5 text-slate-500">该操作不可撤销。确认前请检查是否只是需要改为草稿或归档。</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>取消</Button>
          <Button
            variant="danger"
            disabled={!deleteTarget || deleteMutation.isPending}
            onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget);
            }}
          >
            {deleteMutation.isPending ? '删除中...' : '确认删除'}
          </Button>
        </div>
      </Modal>

      <Toast open={toast.open} message={toast.message} tone={toast.tone} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </AdminLayout>
  );
}
