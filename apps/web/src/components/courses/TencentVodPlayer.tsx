'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const TCPLAYER_CSS = 'https://web.sdk.qcloud.com/player/tcplayer/release/v4.5.4/tcplayer.min.css';
const TCPLAYER_SCRIPT = 'https://web.sdk.qcloud.com/player/tcplayer/release/v4.5.4/tcplayer.v4.5.4.min.js';

type TCPlayerInstance = {
  dispose?: () => void;
  width?: (value?: string | number) => unknown;
  height?: (value?: string | number) => unknown;
};

declare global {
  interface Window {
    TCPlayer?: (id: string, options: Record<string, unknown>) => TCPlayerInstance;
  }
}

let tcPlayerScriptPromise: Promise<void> | null = null;

function ensureStylesheet(href: string) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string) {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.TCPlayer) return Promise.resolve();
  if (tcPlayerScriptPromise) return tcPlayerScriptPromise;

  tcPlayerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('TCPlayer SDK 加载失败')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TCPlayer SDK 加载失败'));
    document.body.appendChild(script);
  });

  return tcPlayerScriptPromise;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function TencentVodPlayer({
  fileId,
  appId,
  psign,
  licenseUrl,
}: {
  fileId: string;
  appId?: number | string | null;
  psign?: string | null;
  licenseUrl?: string | null;
}) {
  const playerId = useMemo(() => `tcplayer-${safeId(fileId)}-${Math.random().toString(36).slice(2)}`, [fileId]);
  const playerRef = useRef<TCPlayerInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function setupPlayer() {
      if (!appId) {
        setLoading(false);
        setError('腾讯云点播 AppID 未配置，fileId 暂时无法播放。');
        return;
      }
      if (!psign) {
        setLoading(false);
        setError('腾讯云点播播放器签名未配置，请在 API 环境变量中配置 TENCENT_VOD_PLAYER_SIGN_KEY 后重启服务。');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        ensureStylesheet(TCPLAYER_CSS);
        await loadScript(TCPLAYER_SCRIPT);
        if (cancelled) return;

        const TCPlayer = window.TCPlayer;
        if (!TCPlayer) throw new Error('TCPlayer SDK 未就绪');

        playerRef.current?.dispose?.();
        playerRef.current = TCPlayer(playerId, {
          appID: String(appId),
          fileID: fileId,
          ...(psign ? { psign } : {}),
          ...(licenseUrl ? { licenseUrl } : {}),
          controls: true,
          preload: 'metadata',
          width: '100%',
          height: '100%',
          fill: true,
          aspectRatio: '16:9',
        });

        const video = document.getElementById(playerId) as HTMLVideoElement | null;
        video?.setAttribute('controlsList', 'nodownload noremoteplayback');
        video?.setAttribute('disablePictureInPicture', 'true');
        playerRef.current?.width?.('100%');
        playerRef.current?.height?.('100%');
        window.dispatchEvent(new Event('resize'));
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : '腾讯云播放器初始化失败');
      }
    }

    setupPlayer();

    return () => {
      cancelled = true;
      playerRef.current?.dispose?.();
      playerRef.current = null;
    };
  }, [appId, fileId, licenseUrl, playerId, psign]);

  return (
    <div className="tencent-vod-player relative aspect-video w-full overflow-hidden bg-black">
      <video
        id={playerId}
        className="h-full w-full bg-black"
        preload="metadata"
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
      />
      <style jsx>{`
        .tencent-vod-player > :global(div:not(.vod-overlay)),
        .tencent-vod-player :global(.tcp-skin),
        .tencent-vod-player :global(.tcplayer),
        .tencent-vod-player :global(.video-js),
        .tencent-vod-player :global(.vjs-tech),
        .tencent-vod-player :global(video) {
          width: 100% !important;
          height: 100% !important;
        }
        .tencent-vod-player :global(video) {
          object-fit: cover;
          object-position: center center;
        }
      `}</style>
      {loading || error ? (
        <div className="vod-overlay absolute inset-0 grid place-items-center bg-slate-950/88 p-6 text-center">
          <div>
            <div className="text-sm font-semibold text-slate-100">{error ? '视频暂时无法播放' : '视频加载中...'}</div>
            {error ? <div className="mt-2 text-xs leading-5 text-slate-400">{error}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
