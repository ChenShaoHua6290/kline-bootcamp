'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getAuthUser, getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { CourseItem, CoursesResponse, formatTier } from '@/lib/courses/types';

function getCourseMeta(course: CourseItem) {
  const lessonCount = course.chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
  const unlockedLessonCount = course.chapters.reduce((sum, chapter) => sum + chapter.lessons.filter((lesson) => !lesson.locked).length, 0);
  return { lessonCount, unlockedLessonCount };
}

function getProgramMeta(courses?: CourseItem[]) {
  const rows = courses ?? [];
  const courseCount = rows.length;
  const lessonCount = rows.reduce((sum, course) => sum + course.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.lessons.length, 0), 0);
  const unlockedLessonCount = rows.reduce(
    (sum, course) => sum + course.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.lessons.filter((lesson) => !lesson.locked).length, 0),
    0,
  );
  return { courseCount, unlockedLessonCount, lessonCount };
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
    </div>
  );
}

const loopSteps = [
  { key: '学', title: '建立规则' },
  { key: '用', title: '理解工具' },
  { key: '练', title: '进入训练' },
  { key: '复盘', title: '修正偏差' },
];

function CourseModuleCard({ course, index }: { course: CourseItem; index: number }) {
  const meta = getCourseMeta(course);

  return (
    <article className="flex min-h-[210px] flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/70 shadow-[0_12px_26px_rgba(0,0,0,0.22)] transition hover:border-slate-500/80">
      {course.coverImage ? (
        <div className="h-28 border-b border-slate-700/70 bg-slate-950/45">
          <img src={course.coverImage} alt={course.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{meta.unlockedLessonCount}/{meta.lessonCount || 0} 可学</Badge>
          </div>
        </div>

        <div className="mt-3 min-w-0">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-100">{course.title}</h3>
          {course.subtitle ? <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-cyan-100/75">{course.subtitle}</p> : null}
          <div className="mt-3 inline-flex rounded-full border border-slate-700/70 px-2.5 py-1 text-xs text-slate-500">{meta.lessonCount} 课时</div>
        </div>

        <div className="mt-auto pt-4">
          <Link href={`/courses/${course.id}`}>
            <Button className="w-full" size="sm" variant="ghost">详情</Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function CoursesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getAuthUser();
    const ok = Boolean(token && user);
    setAuthed(ok);
    setReady(true);
    if (!ok) router.replace('/auth');
  }, [router]);

  const query = useQuery({
    queryKey: ['courses'],
    enabled: ready && authed,
    queryFn: async () => (await api.get<CoursesResponse>('/courses')).data,
  });

  const programMeta = useMemo(() => getProgramMeta(query.data?.courses), [query.data]);

  if (!ready) return <main className="min-h-screen p-5"><LoadingState message="正在检查登录状态..." /></main>;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_32%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_28%),#020617] text-slate-100">
      <header className="app-nav flex flex-wrap items-center justify-between gap-2 sm:gap-2">
        <h1 className="app-title">课程中心</h1>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {query.data?.userTier ? <Badge tone="info">{formatTier(query.data.userTier)}</Badge> : null}
          <Link href="/">
            <Button size="sm" variant="ghost" className="h-8 sm:px-3 sm:text-[15px]">返回首页</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1240px] px-4 py-4">
        {query.isLoading ? <LoadingState message="正在加载课程体系..." /> : null}
        {query.isError ? <ErrorState message="课程中心加载失败，请稍后重试。" /> : null}
        {query.data ? (
          <div className="space-y-5">
            <section className="rounded-xl border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(8,47,73,0.28),rgba(15,23,42,0.82))] px-4 py-3 shadow-[0_14px_30px_rgba(0,0,0,0.22)] sm:px-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">只做一种模式完整学习闭环</h2>
                    {query.data.userTier ? <Badge tone="info">{formatTier(query.data.userTier)}</Badge> : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">
                    按 学、用、练、复盘 推进，把规则认知、工具边界、训练执行和复盘修正连起来。
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                  <div className="rounded-lg border border-slate-700/75 bg-slate-950/35 px-3 py-2">
                    <div className="text-lg font-semibold text-slate-100">{programMeta.courseCount}</div>
                    <div className="text-[11px] text-slate-500">课程</div>
                  </div>
                  <div className="rounded-lg border border-slate-700/75 bg-slate-950/35 px-3 py-2">
                    <div className="text-lg font-semibold text-slate-100">{programMeta.lessonCount}</div>
                    <div className="text-[11px] text-slate-500">课时</div>
                  </div>
                  <div className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2">
                    <div className="text-lg font-semibold text-cyan-100">{programMeta.unlockedLessonCount}/{programMeta.lessonCount || 0}</div>
                    <div className="text-[11px] text-cyan-100/70">可学习课时</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {loopSteps.map((step) => (
                  <div key={step.key} className="rounded-lg border border-slate-700/70 bg-slate-950/28 px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-500/10 text-xs font-semibold text-cyan-100">{step.key}</div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{step.title}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionLabel title="课程模块" />
              {query.data.courses.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {query.data.courses.map((course, index) => <CourseModuleCard key={course.id} course={course} index={index} />)}
                </div>
              ) : (
                <EmptyState title="暂无课程" description="后台创建并上架课程后会显示在这里。" />
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
