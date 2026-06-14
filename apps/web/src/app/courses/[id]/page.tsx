'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getAuthUser, getToken } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageDescription, PageTitle } from '@/components/ui/PageHeader';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { CourseItem, buildTrainingAssignmentHref } from '@/lib/courses/types';

function typeLabel(type: string) {
  if (type === 'VIDEO') return '视频';
  if (type === 'PDF') return '课件';
  if (type === 'MIXED') return '混合';
  return '图文';
}

function getCourseMeta(course?: CourseItem) {
  const lessons = course?.chapters.flatMap((chapter) => chapter.lessons) ?? [];
  return { lessons };
}

function responseStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ok = Boolean(getToken() && getAuthUser());
    setAuthed(ok);
    setReady(true);
    if (!ok) router.replace('/auth');
  }, [router]);

  const query = useQuery({
    queryKey: ['course-detail', params.id],
    enabled: ready && authed && Boolean(params.id),
    queryFn: async () => (await api.get<CourseItem>(`/courses/${params.id}`)).data,
  });

  const course = query.data;
  const courseMeta = useMemo(() => getCourseMeta(course), [course]);

  if (!ready) return <main className="min-h-screen p-5"><LoadingState message="正在检查登录状态..." /></main>;
  if (query.isLoading) return <main className="min-h-screen p-5"><LoadingState message="课程详情加载中..." /></main>;
  if (query.isError || !course) {
    const status = responseStatus(query.error);
    const message = status === 404 ? '该课程已删除或下架，请返回课程中心选择其他内容。' : '课程详情加载失败，请稍后重试。';
    return (
      <main className="min-h-screen bg-[#020617] p-5 text-slate-100">
        <ErrorState
          message={message}
          action={<Link href="/courses"><Button size="sm" variant="ghost">返回课程中心</Button></Link>}
        />
      </main>
    );
  }

  const hasCourseDescription = Boolean(course.description?.trim());
  const relatedLinks = (course.relatedLinks ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder).filter((item) => item.label.trim() && item.href.trim());

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_34%),#020617] text-slate-100">
      <header className="app-nav">
        <div className="app-nav-row max-w-[1120px]">
          <div className="app-nav-heading">
            <PageTitle className="!text-lg sm:!text-xl">{course.title}</PageTitle>
            <PageDescription className="app-nav-description">{course.subtitle || '课程详情'}</PageDescription>
          </div>
          <div className="app-nav-actions">
            <Link href="/courses"><Button size="sm" variant="ghost">返回课程中心</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1120px] gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {hasCourseDescription ? (
            <section className="rounded-xl border border-slate-700/70 bg-slate-900/45 px-4 py-3">
              <MarkdownRenderer
                content={course.description}
                className="max-w-3xl [&_li]:text-sm [&_li]:leading-6 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-slate-400"
              />
            </section>
          ) : null}

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-100">内容列表</h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/65 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
              {courseMeta.lessons.length > 0 ? (
                <div className="divide-y divide-slate-800/80">
                  {courseMeta.lessons.map((lesson, index) => (
                    <div key={lesson.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/45 text-xs text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-100">{lesson.title}</span>
                          <Badge tone={lesson.isPreview ? 'success' : lesson.locked ? 'warning' : 'default'}>{lesson.isPreview ? '试看' : lesson.locked ? '锁定' : typeLabel(lesson.type)}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{typeLabel(lesson.type)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {lesson.locked ? (
                          <Button className="w-full sm:w-auto" size="sm" variant="ghost" disabled title={lesson.lockReason ?? undefined}>权限不足</Button>
                        ) : (
                          <>
                            <Link href={`/lessons/${lesson.id}`}><Button className="w-full sm:w-auto" size="sm" variant="primary">学习</Button></Link>
                            {lesson.trainingAssignment ? (
                              <Link href={buildTrainingAssignmentHref(lesson)}>
                                <Button
                                  className="w-full border-cyan-400/55 bg-cyan-500/15 text-cyan-100 shadow-[0_10px_22px_rgba(6,182,212,0.12)] hover:border-cyan-300/80 hover:bg-cyan-500/25 hover:text-white sm:w-auto"
                                  size="sm"
                                  variant="ghost"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                                  {lesson.trainingAssignment.assignmentTitle}
                                </Button>
                              </Link>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-400">暂无课时。</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card className="border-cyan-400/20 bg-cyan-500/10 p-4">
            <div className="text-sm font-semibold text-cyan-100">学习建议</div>
            <p className="mt-2 text-sm leading-6 text-cyan-100/80">先按课时顺序理解规则，再进入训练系统验证执行。课程内容只负责建立判断框架，真正的掌握来自训练和复盘。</p>
          </Card>

          {relatedLinks.length > 0 ? (
            <Card className="border-slate-700/80 bg-slate-900/70 p-4">
              <div className="text-sm font-semibold text-slate-100">相关入口</div>
              <div className="mt-3 grid gap-2">
                {relatedLinks.map((item) => (
                  item.href.startsWith('http') ? (
                    <a key={`${item.label}-${item.href}`} href={item.href} target="_blank" rel="noreferrer">
                      <Button className="w-full justify-start" variant="ghost">{item.label}</Button>
                    </a>
                  ) : (
                    <Link key={`${item.label}-${item.href}`} href={item.href}>
                      <Button className="w-full justify-start" variant="ghost">{item.label}</Button>
                    </Link>
                  )
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
