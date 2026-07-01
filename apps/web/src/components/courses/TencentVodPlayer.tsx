'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';

const TCPLAYER_CSS = 'https://web.sdk.qcloud.com/player/tcplayer/release/v4.5.4/tcplayer.min.css';
const TCPLAYER_SCRIPT = 'https://web.sdk.qcloud.com/player/tcplayer/release/v4.5.4/tcplayer.v4.5.4.min.js';

type TCPlayerInstance = {
  unload?: () => void;
  dispose?: () => void;
  ready?: (callback: () => void) => void;
  on?: (type: string, listener: (...args: unknown[]) => void) => void;
  one?: (type: string, listener: (...args: unknown[]) => void) => void;
  off?: (type: string, listener: (...args: unknown[]) => void) => void;
  width?: (value?: string | number) => unknown;
  height?: (value?: string | number) => unknown;
  currentTime?: (value?: number) => number;
  paused?: () => boolean;
  pause?: () => void;
  play?: () => Promise<void> | void;
};

type PlaybackSnapshot = {
  currentTime: number;
  shouldResume: boolean;
};

declare global {
  interface Window {
    TCPlayer?: (id: string, options: Record<string, unknown>) => TCPlayerInstance;
  }
}

let tcPlayerScriptPromise: Promise<void> | null = null;

function progressStorageKey(fileId: string) {
  return `tencent-vod-progress:${fileId}`;
}

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
      if (window.TCPlayer || existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener(
        'load',
        () => {
          existing.dataset.loaded = 'true';
          resolve();
        },
        { once: true },
      );
      existing.addEventListener('error', () => reject(new Error('TCPlayer SDK 加载失败')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('TCPlayer SDK 加载失败'));
    document.body.appendChild(script);
  });

  return tcPlayerScriptPromise;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function getVideoElement(id: string) {
  return document.getElementById(id) as HTMLVideoElement | null;
}

function getCurrentTime(player: TCPlayerInstance | null, video: HTMLVideoElement | null) {
  const currentTime = player?.currentTime?.();
  if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
    return Math.max(0, currentTime);
  }

  if (video && Number.isFinite(video.currentTime)) {
    return Math.max(0, video.currentTime);
  }

  return 0;
}

function isPlaying(player: TCPlayerInstance | null, video: HTMLVideoElement | null) {
  if (typeof player?.paused === 'function') {
    return !player.paused();
  }

  return video ? !video.paused : false;
}

function readStoredProgress(fileId: string): PlaybackSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(progressStorageKey(fileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlaybackSnapshot>;
    if (typeof parsed.currentTime !== 'number' || !Number.isFinite(parsed.currentTime)) return null;
    return {
      currentTime: Math.max(0, parsed.currentTime),
      shouldResume: Boolean(parsed.shouldResume),
    };
  } catch {
    return null;
  }
}

function storeProgress(fileId: string, snapshot: PlaybackSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(progressStorageKey(fileId), JSON.stringify(snapshot));
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

function createPlayerWithoutPageLifecycleHooks(playerId: string, options: Record<string, unknown>) {
  const documentTarget = document as typeof document & {
    addEventListener: typeof document.addEventListener;
  };
  const windowTarget = window as typeof window & {
    addEventListener: typeof window.addEventListener;
  };
  const originalDocumentAddEventListener = documentTarget.addEventListener.bind(documentTarget);
  const originalWindowAddEventListener = windowTarget.addEventListener.bind(windowTarget);

  const block = (type: string) => type === 'visibilitychange' || type === 'pagehide';

  documentTarget.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (block(type)) return;
    return originalDocumentAddEventListener(type, listener, options);
  }) as typeof document.addEventListener;

  windowTarget.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (block(type)) return;
    return originalWindowAddEventListener(type, listener, options);
  }) as typeof window.addEventListener;

  try {
    const TCPlayer = window.TCPlayer;
    if (!TCPlayer) throw new Error('TCPlayer SDK 未就绪');
    return TCPlayer(playerId, options);
  } finally {
    documentTarget.addEventListener = originalDocumentAddEventListener;
    windowTarget.addEventListener = originalWindowAddEventListener;
  }
}

function restorePlaybackSnapshot(
  player: TCPlayerInstance,
  video: HTMLVideoElement | null,
  snapshot: PlaybackSnapshot,
) {
  const seekTo = Math.max(0, snapshot.currentTime);

  try {
    if (typeof player.currentTime === 'function') {
      player.currentTime(seekTo);
    } else if (video) {
      video.currentTime = seekTo;
    }
  } catch {
    return false;
  }

  if (snapshot.shouldResume) {
    const maybePlay = player.play?.() ?? video?.play();
    if (maybePlay && typeof (maybePlay as Promise<void>).catch === 'function') {
      (maybePlay as Promise<void>).catch(() => {
        // Ignore autoplay-style rejections; the progress is still restored.
      });
    }
  }

  return true;
}

function isPlayerReady(player: TCPlayerInstance | null, video: HTMLVideoElement | null) {
  if (!player || !video) return false;
  return video.readyState >= 2 || video.networkState === 2;
}

function teardownPlayer(player: TCPlayerInstance | null) {
  if (!player) return;
  try {
    player.unload?.();
  } catch {
    // Best-effort cleanup.
  }
  try {
    player.dispose?.();
  } catch {
    // Best-effort cleanup.
  }
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
  const [instanceKey, setInstanceKey] = useState(0);
  const playerId = useMemo(
    () => `tcplayer-${safeId(fileId)}-${instanceKey}`,
    [fileId, instanceKey],
  );
  const playerRef = useRef<TCPlayerInstance | null>(null);
  const playerIdRef = useRef(playerId);
  const playbackSnapshotRef = useRef<PlaybackSnapshot | null>(readStoredProgress(fileId));
  const psignRef = useRef(psign);
  const licenseUrlRef = useRef(licenseUrl);
  const loadingRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  playerIdRef.current = playerId;
  psignRef.current = psign;
  licenseUrlRef.current = licenseUrl;
  loadingRef.current = loading;

  useLayoutEffect(() => {
    playbackSnapshotRef.current = readStoredProgress(fileId);
    loadingRef.current = true;
    setInstanceKey(0);
    setError(null);
    setLoading(true);
  }, [fileId]);

  function capturePlaybackSnapshot(shouldResume: boolean) {
    const player = playerRef.current;
    const video = getVideoElement(playerIdRef.current);
    const snapshot: PlaybackSnapshot = {
      currentTime: getCurrentTime(player, video),
      shouldResume,
    };
    playbackSnapshotRef.current = snapshot;
    storeProgress(fileId, snapshot);
  }

  function restoreCurrentPlayback(player: TCPlayerInstance) {
    const snapshot = playbackSnapshotRef.current ?? readStoredProgress(fileId);
    if (!snapshot) return;

    const video = getVideoElement(playerIdRef.current);
    if (restorePlaybackSnapshot(player, video, snapshot)) {
      playbackSnapshotRef.current = null;
    }
  }

  function requestPlayerRebuild() {
    capturePlaybackSnapshot(false);
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setInstanceKey((value) => value + 1);
  }

  function schedulePlayerHealthCheck() {
    window.setTimeout(() => {
      if (loadingRef.current) return;
      const video = getVideoElement(playerIdRef.current);
      if (!isPlayerReady(playerRef.current, video)) {
        requestPlayerRebuild();
      }
    }, 800);
  }

  useLayoutEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        capturePlaybackSnapshot(isPlaying(playerRef.current, getVideoElement(playerIdRef.current)));
        playerRef.current?.pause?.();
        return;
      }

      const player = playerRef.current;
      if (!player) return;

      restoreCurrentPlayback(player);
      schedulePlayerHealthCheck();
    };

    const handlePageHide = () => {
      capturePlaybackSnapshot(isPlaying(playerRef.current, getVideoElement(playerIdRef.current)));
      playerRef.current?.pause?.();
    };

    const handlePageShow = () => {
      const player = playerRef.current;
      if (!player) return;

      restoreCurrentPlayback(player);
      schedulePlayerHealthCheck();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [fileId]);

  useLayoutEffect(() => {
    let cancelled = false;
    let loadTimeout: number | undefined;

    async function setupPlayer() {
      const activePsign = psignRef.current;
      const activeLicenseUrl = licenseUrlRef.current;

      if (!appId) {
        loadingRef.current = false;
        setLoading(false);
        setError('腾讯云点播 AppID 未配置，fileId 暂时无法播放。');
        return;
      }
      if (!activePsign) {
        loadingRef.current = false;
        setLoading(false);
        setError('腾讯云点播播放器签名未配置，请在 API 环境变量中配置 TENCENT_VOD_PLAYER_SIGN_KEY 后重启服务。');
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);
        ensureStylesheet(TCPLAYER_CSS);
        await loadScript(TCPLAYER_SCRIPT);
        if (cancelled) return;

        const player = createPlayerWithoutPageLifecycleHooks(playerId, {
          appID: String(appId),
          fileID: fileId,
          psign: activePsign,
          ...(activeLicenseUrl ? { licenseUrl: activeLicenseUrl } : {}),
          controls: true,
          preload: 'metadata',
          width: '100%',
          height: '100%',
          fill: true,
          aspectRatio: '16:9',
        });
        playerRef.current = player;

        loadTimeout = window.setTimeout(() => {
          if (cancelled || playerRef.current !== player) return;
          loadingRef.current = false;
          setLoading(false);
        }, 12_000);

        player.one?.('loadedmetadata', () => {
          if (cancelled || playerRef.current !== player) return;
          if (loadTimeout) window.clearTimeout(loadTimeout);

          const video = getVideoElement(playerId);
          video?.setAttribute('controlsList', 'nodownload noremoteplayback');
          video?.setAttribute('disablePictureInPicture', 'true');
          restoreCurrentPlayback(player);
          loadingRef.current = false;
          setLoading(false);
        });
        player.one?.('error', () => {
          if (cancelled || playerRef.current !== player) return;
          if (loadTimeout) window.clearTimeout(loadTimeout);
          loadingRef.current = false;
          setLoading(false);
          setError('视频播放失败，请稍后重试。');
        });
      } catch (err) {
        if (cancelled) return;
        if (loadTimeout) window.clearTimeout(loadTimeout);
        loadingRef.current = false;
        setLoading(false);
        setError(err instanceof Error ? err.message : '腾讯云播放器初始化失败');
      }
    }

    setupPlayer();

    return () => {
      cancelled = true;
      if (loadTimeout) window.clearTimeout(loadTimeout);
      capturePlaybackSnapshot(false);
      const player = playerRef.current;
      playerRef.current = null;
      if (!player) return;
      teardownPlayer(player);
    };
  }, [appId, fileId, playerId]);

  return (
    <div className="tencent-vod-player relative aspect-video w-full overflow-hidden bg-black">
      <video
        key={playerId}
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
