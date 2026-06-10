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
import { MarkdownRenderer, MarkdownToc, getMarkdownHeadings } from '@/components/markdown/MarkdownRenderer';
import { TencentVodPlayer } from '@/components/courses/TencentVodPlayer';
import { LessonPlayback, formatAccessLevel, formatDuration } from '@/lib/courses/types';

function responseStatus(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status;
}

export default function LessonPage() {
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
    queryKey: ['lesson', params.id],
    enabled: ready && authed && Boolean(params.id),
    queryFn: async () => (await api.get<LessonPlayback>(`/lessons/${params.id}`)).data,
  });

  const lesson = query.data;
  const headings = useMemo(() => getMarkdownHeadings(lesson?.content), [lesson?.content]);

  if (!ready) return <main className="min-h-screen p-5"><LoadingState message="正在检查登录状态..." /></main>;
  if (query.isLoading) return <main className="min-h-screen p-5"><LoadingState message="课时加载中..." /></main>;
  if (query.isError || !lesson) {
    const status = responseStatus(query.error);
    const message = status === 404 ? '该课时已删除或下架，请返回课程中心选择其他内容。' : status === 403 ? '当前权限不可查看该课时。' : '课时加载失败，可能是权限不足或内容未上架。';
    return (
      <main className="min-h-screen bg-[#020617] p-5 text-slate-100">
        <ErrorState
          message={message}
          action={<Link href="/courses"><Button size="sm" variant="ghost">返回课程中心</Button></Link>}
        />
      </main>
    );
  }

  const isVideoLike = lesson.type === 'VIDEO' || lesson.type === 'MIXED';
  const shouldShowMediaCard = isVideoLike || lesson.type === 'PDF';

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),#020617] text-slate-100">
      <header className="border-b border-slate-800/90 bg-slate-950/75 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400">{lesson.courseTitle} / {lesson.chapterTitle}</div>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">{lesson.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={lesson.isPreview ? 'success' : 'info'}>{lesson.isPreview ? '试看' : formatAccessLevel(lesson.accessLevel)}</Badge>
            <Badge>{formatDuration(lesson.duration)}</Badge>
            <Link href={`/courses/${lesson.courseId}`}><Button size="sm" variant="ghost">返回课程</Button></Link>
          </div>
        </div>
      </header>

      <section className={`mx-auto grid max-w-[1180px] gap-4 px-4 py-5 ${headings.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <div className="space-y-4">
          {shouldShowMediaCard ? (
            <Card className="overflow-hidden border-slate-700/80 bg-slate-950/70">
              {isVideoLike ? (
                lesson.videoFileId ? (
                  <TencentVodPlayer
                    fileId={lesson.videoFileId}
                    appId={lesson.videoAppId}
                    psign={lesson.videoPsign}
                    licenseUrl={lesson.videoLicenseUrl}
                  />
                ) : lesson.videoUrl ? (
                  <video
                    className="aspect-video w-full bg-black"
                    src={lesson.videoUrl}
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(event) => event.preventDefault()}
                    preload="metadata"
                  />
                ) : (
                  <div className="grid aspect-video place-items-center bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(8,47,73,0.5))] p-8 text-center">
                    <div>
                      <div className="text-lg font-semibold text-slate-100">视频待绑定</div>
                      {lesson.videoFileId ? <div className="mt-3 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">fileId: {lesson.videoFileId}</div> : null}
                    </div>
                  </div>
                )
              ) : (
                <div className="grid min-h-[220px] place-items-center bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(8,47,73,0.36))] p-8 text-center">
                  <div>
                    <div className="text-lg font-semibold text-slate-100">PDF课件</div>
                    <p className="mt-2 text-sm text-slate-400">可在正文区域打开或查看绑定的PDF课件。</p>
                  </div>
                </div>
              )}
            </Card>
          ) : null}

          <Card className="border-slate-700/80 bg-slate-900/70 p-5">
            {lesson.attachmentUrl ? (
              <div className="mb-4 flex justify-end">
                <a href={lesson.attachmentUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost">打开PDF课件</Button>
                </a>
              </div>
            ) : null}
            <MarkdownRenderer content={lesson.content} emptyText="课时图文内容待后台补充。" />
          </Card>
        </div>

        {headings.length > 0 ? (
          <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
            <MarkdownToc headings={headings} className="hidden lg:block" />
          </aside>
        ) : null}
      </section>
    </main>
  );
}
