'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dispose, getSupportedIndicators, getSupportedOverlays, init, type Chart, type IndicatorCreate, type KLineData, type Overlay, type OverlayCreate } from 'klinecharts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { isTransientIndicatorEmpty } from './klineIndicatorSync';

type Action = {
  id: string;
  actionType: string;
  timePointer?: number;
  timestamp?: number;
  price: number;
  positionPercent?: number | null;
  pnl?: number | null;
  closeReason?: string | null;
  displayTime?: string;
};
type RiseFallMode = 'red-up' | 'green-up';
type CandleRenderType = 'solid' | 'stroke' | 'up-stroke' | 'down-stroke';
type PriceAxisType = 'linear' | 'log';
type ChartSettings = {
  riseFallMode: RiseFallMode;
  candleType: CandleRenderType;
  showLatestPrice: boolean;
  showHighPrice: boolean;
  showLowPrice: boolean;
  showIndicatorLatestValue: boolean;
  reverseYAxis: boolean;
  showGrid: boolean;
  priceAxisType: PriceAxisType;
};

const DEFAULT_CHART_SETTINGS: ChartSettings = {
  riseFallMode: 'green-up',
  candleType: 'solid',
  showLatestPrice: true,
  showHighPrice: true,
  showLowPrice: true,
  showIndicatorLatestValue: true,
  reverseYAxis: false,
  showGrid: true,
  priceAxisType: 'linear',
};

function buildChartStyles(settings: ChartSettings, hideTimeAxisLabels = false) {
  const isRedUp = settings.riseFallMode === 'red-up';
  const upColor = isRedUp ? '#ef4444' : '#22c55e';
  const downColor = isRedUp ? '#22c55e' : '#f43f5e';
  const upBorderColor = isRedUp ? '#f87171' : '#34d399';
  const downBorderColor = isRedUp ? '#34d399' : '#fb7185';
  const upWickColor = isRedUp ? '#f43f5e' : '#10b981';
  const downWickColor = isRedUp ? '#10b981' : '#f43f5e';
  const candleTypeMap: Record<CandleRenderType, string> = {
    solid: 'candle_solid',
    stroke: 'candle_stroke',
    'up-stroke': 'candle_up_stroke',
    'down-stroke': 'candle_down_stroke',
  };

  const showLatestPriceMark = settings.showLatestPrice;

  return {
    grid: {
      horizontal: { show: settings.showGrid, style: 'dashed', size: 1, color: '#1c2740', dashedValue: [2, 4] },
      vertical: { show: settings.showGrid, style: 'dashed', size: 1, color: '#1c2740', dashedValue: [2, 4] },
    },
    candle: {
      type: candleTypeMap[settings.candleType],
      bar: {
        compareRule: 'previous_close',
        upColor,
        downColor,
        noChangeColor: '#94a3b8',
        upBorderColor,
        downBorderColor,
        noChangeBorderColor: '#94a3b8',
        upWickColor,
        downWickColor,
        noChangeWickColor: '#94a3b8',
      },
      priceMark: {
        high: { show: settings.showHighPrice, color: '#94a3b8' },
        low: { show: settings.showLowPrice, color: '#94a3b8' },
        last: {
          show: showLatestPriceMark,
          upColor,
          downColor,
          noChangeColor: '#94a3b8',
          line: { show: showLatestPriceMark, size: 1, style: 'dashed', dashedValue: [4, 4] },
          text: {
            show: showLatestPriceMark,
            color: '#ffffff',
            size: 12,
            family: 'ui-sans-serif',
            weight: '600',
            borderSize: 0,
            borderRadius: 4,
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
          },
        },
      },
      tooltip: {
        showRule: 'none',
        showType: 'rect',
        title: { color: '#e2e8f0', size: 12, family: 'ui-sans-serif', weight: '500' },
        legend: { color: '#cbd5e1', size: 12, family: 'ui-sans-serif', weight: '500' },
        rect: { borderColor: '#334155', borderSize: 1, color: 'rgba(15,23,42,0.92)', borderRadius: 8 },
      },
    },
    indicator: {
      bars: [{ upColor: 'rgba(34,197,94,0.65)', downColor: 'rgba(244,63,94,0.65)', noChangeColor: 'rgba(148,163,184,0.65)' }],
      lines: [
        { color: '#f59e0b', size: 1.5, smooth: true, style: 'solid' },
        { color: '#3b82f6', size: 1.3, smooth: true, style: 'solid' },
        { color: '#ec4899', size: 1.3, smooth: true, style: 'solid' },
        { color: '#a78bfa', size: 1.2, smooth: true, style: 'solid' },
      ],
      tooltip: {
        showRule: settings.showIndicatorLatestValue ? 'always' : 'none',
        showType: 'standard',
        title: { color: '#e2e8f0', size: 12, family: 'ui-sans-serif', weight: '500' },
        legend: { color: '#cbd5e1', size: 12, family: 'ui-sans-serif', weight: '500' },
      },
    },
    xAxis: {
      axisLine: { show: true, color: '#334155', size: 1 },
      tickLine: { show: true, color: '#334155', size: 1, length: 3 },
      tickText: { show: !hideTimeAxisLabels, color: '#94a3b8', size: 12, family: 'ui-sans-serif', weight: '500' },
    },
    yAxis: {
      axisLine: { show: true, color: '#334155', size: 1 },
      tickLine: { show: true, color: '#334155', size: 1, length: 3 },
      tickText: { show: true, color: '#94a3b8', size: 12, family: 'ui-sans-serif', weight: '500' },
    },
    crosshair: {
      show: true,
      horizontal: {
        line: { show: true, style: 'dashed', color: 'rgba(148,163,184,0.35)', size: 1, dashedValue: [3, 3] },
        text: {
          show: true,
          color: '#ffffff',
          size: 12,
          family: 'ui-sans-serif',
          weight: '600',
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderSize: 1,
          borderRadius: 4,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3,
        },
        features: [],
      },
      vertical: {
        line: { show: true, style: 'dashed', color: 'rgba(148,163,184,0.35)', size: 1, dashedValue: [3, 3] },
        text: {
          show: !hideTimeAxisLabels,
          color: '#ffffff',
          size: 12,
          family: 'ui-sans-serif',
          weight: '600',
          backgroundColor: '#0f172a',
          borderColor: '#334155',
          borderSize: 1,
          borderRadius: 4,
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 3,
          paddingBottom: 3,
        },
      },
    },
    separator: { color: '#2f3a56', size: 1, fill: true, activeBackgroundColor: 'rgba(30,41,59,0.35)' },
    overlay: {
      line: { style: 'solid', size: 1.5, color: '#60a5fa', dashedValue: [2, 2], smooth: false },
      point: {
        color: '#60a5fa',
        borderColor: '#ffffff',
        radius: 4,
        borderSize: 1.5,
        activeColor: '#93c5fd',
        activeBorderColor: '#ffffff',
        activeRadius: 5,
        activeBorderSize: 2,
      },
      text: {
        style: 'fill',
        color: '#ffffff',
        size: 12,
        family: 'ui-sans-serif',
        weight: '600',
        backgroundColor: '#2563eb',
        borderColor: '#1d4ed8',
        borderSize: 1,
        borderRadius: 4,
        borderStyle: 'solid',
        borderDashedValue: [2, 2],
        paddingLeft: 6,
        paddingRight: 6,
        paddingTop: 3,
        paddingBottom: 3,
      },
    },
  } as const;
}

function decimalPlacesOf(value: number) {
  if (!Number.isFinite(value)) return 0;
  const s = value.toString().toLowerCase();
  if (s.includes('e-')) {
    const exp = Number(s.split('e-')[1]);
    return Number.isFinite(exp) ? exp : 0;
  }
  const dot = s.indexOf('.');
  return dot >= 0 ? s.length - dot - 1 : 0;
}

function toManualOverlaySnapshot(overlay: Overlay, groupId: string): OverlayCreate {
  return {
    name: overlay.name,
    groupId,
    paneId: overlay.paneId,
    lock: overlay.lock,
    visible: overlay.visible,
    zLevel: overlay.zLevel,
    mode: overlay.mode,
    modeSensitivity: overlay.modeSensitivity,
    points: Array.isArray(overlay.points)
      ? overlay.points.map((p) => ({
          dataIndex: typeof p.dataIndex === 'number' ? p.dataIndex : undefined,
          timestamp: typeof p.timestamp === 'number' ? p.timestamp : undefined,
          value: typeof p.value === 'number' ? p.value : undefined,
        }))
      : [],
    extendData: overlay.extendData,
    styles: overlay.styles ?? undefined,
  };
}

export function KLineChart({
  data,
  actions = [],
  timeframe = '1H',
  onTimeframeChange,
  stopLossPrice,
  takeProfitPrice,
  hasMoreOlder = false,
  loadingOlder = false,
  onReachLeftEdge,
  highlightedActionId,
  focusedTimestamp,
  fitContainerHeight = false,
  disableScrollZoom = false,
  showTradeLegend = true,
  showActionSummary = true,
  hideTimeAxisLabels = false,
  hideHeaderTime = false,
}: {
  data: Array<{ open: number; high: number; low: number; close: number; time: string; volume?: number | null; isPartial?: boolean }>;
  actions?: Action[];
  timeframe?: string;
  onTimeframeChange?: (v: string) => void;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
  onReachLeftEdge?: () => void;
  highlightedActionId?: string | null;
  focusedTimestamp?: number;
  fitContainerHeight?: boolean;
  disableScrollZoom?: boolean;
  showTradeLegend?: boolean;
  showActionSummary?: boolean;
  hideTimeAxisLabels?: boolean;
  hideHeaderTime?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartPaneRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const rowsRef = useRef<KLineData[]>([]);
  const chartRowsRef = useRef<KLineData[]>([]);
  const drawToolbarRef = useRef<HTMLDivElement | null>(null);
  const settingsModalRef = useRef<HTMLDivElement | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [settingsModalScale, setSettingsModalScale] = useState(1);
  const [chartSettings, setChartSettings] = useState<ChartSettings>(DEFAULT_CHART_SETTINGS);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['EMA', 'MACD', 'VOL']);
  const [indicatorParams, setIndicatorParams] = useState<Record<string, number[]>>({});
  const [indicatorPrefsReady, setIndicatorPrefsReady] = useState(false);
  const [paramModal, setParamModal] = useState<{ name: string; values: string[] } | null>(null);
  const [paramToast, setParamToast] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(null);
  const [drawLocked, setDrawLocked] = useState(false);
  const [showTradeOverlays, setShowTradeOverlays] = useState(true);
  const [openDrawMenu, setOpenDrawMenu] = useState<string | null>(null);
  const [focusDataIndex, setFocusDataIndex] = useState<number | null>(null);
  const [, setMainIndicatorLegend] = useState<Array<{ name: string; values: string[] }>>([]);
  const [focusedAction, setFocusedAction] = useState<Action | null>(null);
  const leftEdgeLockRef = useRef(false);
  const userInteractedRef = useRef(false);
  const viewportInitRef = useRef(false);
  const prevViewTimeframeRef = useRef<string | null>(null);
  const viewportSyncRafRef = useRef<number | null>(null);
  const viewportGuardPendingRef = useRef(false);
  const indicatorRecoverTimerRef = useRef<number | null>(null);
  const indicatorRecoverAttemptsRef = useRef(0);
  const manualOverlaySnapshotRef = useRef<OverlayCreate[]>([]);
  const lastAxisDebugLogAtRef = useRef(0);
  const TRAINING_RIGHT_WHITESPACE_BARS = 0;
  const DEFAULT_VISIBLE_BARS = 120;
  const PRICE_PADDING_RATIO = 0.15;
  const MIN_PRICE_RANGE_RATIO = 0.00015;
  const TRAINING_PRICE_WINDOW_BARS = 50;
  const toolBtn = 'rounded-lg border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-[12px] font-medium text-slate-100 transition hover:border-slate-400 hover:bg-slate-700/90';
  const activeToolBtn = 'rounded-lg border border-blue-300/60 bg-blue-600/90 px-2.5 py-1 text-[12px] font-semibold text-white shadow shadow-blue-900/50 transition hover:bg-blue-500';
  const sideBtn = 'h-8 w-8 rounded-lg border border-slate-600/70 bg-slate-800/80 text-xs text-slate-100 transition hover:border-slate-400 hover:bg-slate-700/90';
  const sideBtnActive = 'h-8 w-8 rounded-lg border border-blue-300/60 bg-blue-600/90 text-xs font-semibold text-white transition hover:bg-blue-500';
  const periods = ['15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'];
  const MANUAL_OVERLAY_GROUP_ID = 'manual-draw';
  const MAIN_INDICATORS = useMemo(() => new Set(['MA', 'EMA', 'SMA', 'BOLL', 'BBI']), []);
  const SUB_INDICATOR_WHITELIST = useMemo(() => new Set(['VOL', 'MACD', 'RSI', 'KDJ']), []);
  const INDICATOR_PREFS_STORAGE_KEY = 'kline_indicator_prefs_v1';
  const pricePrecision = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return 2;
    let maxDp = 0;
    const start = Math.max(0, rows.length - 800);
    for (let i = start; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row) continue;
      maxDp = Math.max(maxDp, decimalPlacesOf(row.open), decimalPlacesOf(row.high), decimalPlacesOf(row.low), decimalPlacesOf(row.close));
    }
    return Math.max(2, Math.min(8, maxDp));
  }, [data]);
  const isAxisDebugEnabled = () => {
    if (typeof window === 'undefined') return false;
    const localFlag = window.localStorage.getItem('kline_debug_axis');
    if (localFlag === '1' || localFlag === 'true') return true;
    const globalFlag = (window as unknown as { __KLINE_DEBUG_AXIS?: boolean }).__KLINE_DEBUG_AXIS;
    return Boolean(globalFlag);
  };

  const logAxisDebug = (source: string) => {
    if (!isAxisDebugEnabled()) return;
    const now = Date.now();
    if (now - lastAxisDebugLogAtRef.current < 220) return;
    lastAxisDebugLogAtRef.current = now;
    const chart = chartRef.current as unknown as {
      getVisibleRange?: () => { from?: number; to?: number; realFrom?: number; realTo?: number };
    } | null;
    if (!chart?.getVisibleRange || rowsRef.current.length === 0) return;
    const vr = chart.getVisibleRange();
    const fromRaw = typeof vr.realFrom === 'number' ? vr.realFrom : vr.from;
    const toRaw = typeof vr.realTo === 'number' ? vr.realTo : vr.to;
    if (!Number.isFinite(fromRaw) || !Number.isFinite(toRaw)) return;
    const from = Math.max(0, Math.floor(fromRaw as number));
    const to = Math.max(from, Math.min(rowsRef.current.length - 1, Math.ceil(toRaw as number)));
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = Number.NEGATIVE_INFINITY;
    for (let i = from; i <= to; i += 1) {
      const row = rowsRef.current[i];
      if (!row) continue;
      minPrice = Math.min(minPrice, row.low, row.open, row.close);
      maxPrice = Math.max(maxPrice, row.high, row.open, row.close);
    }
    const payload = {
      source,
      timeframe,
      visibleRange: vr,
      clamped: { from, to, count: to - from + 1 },
      visiblePrice: {
        min: Number.isFinite(minPrice) ? minPrice : null,
        max: Number.isFinite(maxPrice) ? maxPrice : null,
        spread: Number.isFinite(minPrice) && Number.isFinite(maxPrice) ? maxPrice - minPrice : null,
      },
      focusedBar: typeof focusDataIndex === 'number' ? rowsRef.current[focusDataIndex] ?? null : null,
    };
    console.info('[kline-axis-debug]', payload);
    console.info('[kline-axis-debug-json]', JSON.stringify(payload));
  };
  const INDICATOR_LABELS = useMemo<Record<string, string>>(
    () => ({
      MA: 'MA(移动平均线)',
      EMA: 'EMA(指数平滑移动平均线)',
      SMA: 'SMA',
      BOLL: 'BOLL(布林线)',
      // SAR: 'SAR(停损点指标)',
      BBI: 'BBI(多空指数)',
      VOL: 'VOL(成交量)',
    }),
    [],
  );
  const DEFAULT_INDICATOR_PARAMS = useMemo<Record<string, number[]>>(
    () => ({
      MA: [5, 10, 30, 60],
      EMA: [5, 10, 20, 60, 120],
      SMA: [12, 2],
      BOLL: [20, 2],
      // SAR: [2, 2, 20],
      BBI: [3, 6, 12, 24],
      VOL: [5, 10, 20],
      MACD: [12, 26, 9],
      RSI: [6, 12, 24],
      KDJ: [9, 3, 3],
    }),
    [],
  );
  const PARAM_LABELS = useMemo<Record<string, string[]>>(
    () => ({
      BOLL: ['周期', '标准差'],
      EMA: ['EMA1', 'EMA2', 'EMA3', 'EMA4', 'EMA5'],
      MACD: ['短期', '长期', '信号'],
      KDJ: ['周期', 'K平滑', 'D平滑'],
      RSI: ['周期1', '周期2', '周期3'],
      // SAR: ['最小步长', '步长', '最大步长'],
    }),
    [],
  );
  const supportedIndicators = useMemo(() => Array.from(new Set(getSupportedIndicators())), []);
  const supportedOverlays = useMemo(() => new Set(getSupportedOverlays()), []);
  const mainIndicators = useMemo(() => supportedIndicators.filter((name) => MAIN_INDICATORS.has(name)), [supportedIndicators, MAIN_INDICATORS]);
  const subIndicators = useMemo(
    () => supportedIndicators.filter((name) => !MAIN_INDICATORS.has(name) && SUB_INDICATOR_WHITELIST.has(name)),
    [supportedIndicators, MAIN_INDICATORS, SUB_INDICATOR_WHITELIST],
  );
  const drawMenus = useMemo(
    () => [
      {
        key: 'line',
        icon: '⟷',
        title: '线工具',
        items: [
          { label: '价格通道线', overlay: 'priceChannelLine' },
          { label: '平行直线', overlay: 'parallelStraightLine' },
          { label: '直线', overlay: 'straightLine' },
          { label: '水平线', overlay: 'horizontalStraightLine' },
        ],
      },
      {
        key: 'trend',
        icon: '✎',
        title: '趋势工具',
        items: [
          { label: '趋势线', overlay: 'rayLine' },
          { label: '线段', overlay: 'segment' },
          { label: '价格线', overlay: 'priceLine' },
          { label: '标注', overlay: 'simpleAnnotation' },
        ],
      },
      {
        key: 'shape',
        icon: '◯',
        title: '形状工具',
        items: [
          { label: '矩形', overlay: 'rect' },
          { label: '圆', overlay: 'circle' },
          { label: '三角形', overlay: 'triangle' },
        ],
      },
      {
        key: 'fibo',
        icon: 'Φ',
        title: '斐波那契',
        items: [
          { label: '斐波那契回撤', overlay: 'fibonacciLine' },
          { label: '斐波那契扩展', overlay: 'fibonacciExtension' },
          { label: '斐波那契扇形', overlay: 'fibonacciFanLine' },
        ],
      },
      {
        key: 'wave',
        icon: '〰',
        title: '波浪工具',
        items: [
          { label: '五浪标注', overlay: 'elliottWave' },
          { label: '三浪标注', overlay: 'abcWave' },
          { label: '波段折线', overlay: 'polyline' },
        ],
      },
    ]
      .map((menu) => ({ ...menu, items: menu.items.filter((item) => supportedOverlays.has(item.overlay)) }))
      .filter((menu) => menu.items.length > 0),
    [supportedOverlays],
  );

  const getActionMeta = (actionType: string) => {
    if (actionType === 'OPEN_LONG') return { label: '开多', tone: 'buy' as const };
    if (actionType === 'OPEN_SHORT') return { label: '开空', tone: 'sell' as const };
    if (actionType === 'ADD_LONG') return { label: '加多', tone: 'buy' as const };
    if (actionType === 'ADD_SHORT') return { label: '加空', tone: 'sell' as const };
    if (actionType === 'CLOSE') return { label: '平仓', tone: 'close' as const };
    if (actionType === 'PARTIAL_CLOSE') return { label: '减仓', tone: 'close' as const };
    if (actionType === 'FULL_CLOSE') return { label: '全平', tone: 'close' as const };
    if (actionType === 'TP') return { label: 'TP', tone: 'tp' as const };
    if (actionType === 'SL') return { label: 'SL', tone: 'sl' as const };
    if (actionType === 'LIQUIDATED') return { label: '爆仓', tone: 'liquidated' as const };
    return null;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('kline_chart_settings_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ChartSettings>;
      setChartSettings((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore invalid local settings
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(INDICATOR_PREFS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        selectedIndicators?: string[];
        indicatorParams?: Record<string, number[]>;
      };
      if (Array.isArray(parsed.selectedIndicators)) {
        const deduped = Array.from(new Set(parsed.selectedIndicators))
          .filter((name) => supportedIndicators.includes(name));
        if (deduped.length > 0) setSelectedIndicators(deduped);
      }
      if (parsed.indicatorParams && typeof parsed.indicatorParams === 'object') {
        const cleaned: Record<string, number[]> = {};
        Object.entries(parsed.indicatorParams).forEach(([name, values]) => {
          if (!supportedIndicators.includes(name) || !Array.isArray(values)) return;
          const safeVals = values
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v) && v > 0)
            .slice(0, 8);
          if (safeVals.length > 0) cleaned[name] = safeVals;
        });
        setIndicatorParams(cleaned);
      }
    } catch {
      // ignore invalid local indicator prefs
    } finally {
      setIndicatorPrefsReady(true);
    }
    if (!window.localStorage.getItem(INDICATOR_PREFS_STORAGE_KEY)) {
      setIndicatorPrefsReady(true);
    }
  }, [INDICATOR_PREFS_STORAGE_KEY, supportedIndicators]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('kline_chart_settings_v1', JSON.stringify(chartSettings));
  }, [chartSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!indicatorPrefsReady) return;
    const payload = {
      selectedIndicators,
      indicatorParams,
    };
    window.localStorage.setItem(INDICATOR_PREFS_STORAGE_KEY, JSON.stringify(payload));
  }, [INDICATOR_PREFS_STORAGE_KEY, selectedIndicators, indicatorParams, indicatorPrefsReady]);

  const formatNumber = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
    return value.toFixed(pricePrecision);
  };

  const getTimeframeMs = (tf: string) => {
    const map: Record<string, number> = {
      '15m': 15 * 60_000,
      '30m': 30 * 60_000,
      '1H': 60 * 60_000,
      '2H': 2 * 60 * 60_000,
      '4H': 4 * 60 * 60_000,
      D: 24 * 60 * 60_000,
      W: 7 * 24 * 60 * 60_000,
      M: 30 * 24 * 60 * 60_000,
    };
    return map[tf] ?? 60 * 60_000;
  };

  const appendRightWhitespaceBars = (visibleRows: KLineData[], timeframeMs: number): KLineData[] => {
    if (visibleRows.length === 0) return [];
    const result: KLineData[] = [...visibleRows];
    const last = visibleRows[visibleRows.length - 1];
    const lastTs = Number(last?.timestamp);
    const lastClose = Number(last?.close);
    if (!Number.isFinite(lastTs)) return result;
    if (!Number.isFinite(lastClose)) return result;
    for (let i = 1; i <= TRAINING_RIGHT_WHITESPACE_BARS; i += 1) {
      result.push({
        timestamp: lastTs + timeframeMs * i,
        open: lastClose,
        high: lastClose,
        low: lastClose,
        close: lastClose,
        volume: 0,
        __spacer: true,
      } as KLineData);
    }
    return result;
  };

  const formatTime = (timestamp?: number) => {
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return '--';
    return new Date(timestamp).toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const syncTrainingViewport = (
    chart: Chart,
    visibleRows: KLineData[],
    _mode: 'init' | 'switch' | 'advance',
    force = false,
  ) => {
    if (visibleRows.length === 0) return;
    if (!force && userInteractedRef.current) return;
    const anyChart = chart as unknown as {
      setVisibleRange?: (range: { from: number; to: number }) => void;
    };
    const latestVisibleIndex = visibleRows.length - 1;
    const from = Math.max(0, latestVisibleIndex - DEFAULT_VISIBLE_BARS + 1);
    const to = latestVisibleIndex + TRAINING_RIGHT_WHITESPACE_BARS;
    if (typeof anyChart.setVisibleRange === 'function') {
      anyChart.setVisibleRange({ from, to });
    }
  };

  const syncTrainingViewportWithFallback = (
    chart: Chart,
    visibleRows: KLineData[],
    mode: 'init' | 'switch' | 'advance',
    force = false,
    withVisibilityGuard = false,
  ) => {
    syncTrainingViewport(chart, visibleRows, mode, force);
    if (withVisibilityGuard) {
      viewportGuardPendingRef.current = true;
    }
    if (viewportSyncRafRef.current != null) {
      cancelAnimationFrame(viewportSyncRafRef.current);
      viewportSyncRafRef.current = null;
    }
    const shouldReleaseGuard = viewportGuardPendingRef.current;
    viewportSyncRafRef.current = requestAnimationFrame(() => {
      viewportSyncRafRef.current = null;
      syncTrainingViewport(chart, visibleRows, mode, force);
      if (shouldReleaseGuard) {
        viewportGuardPendingRef.current = false;
      }
    });
  };

  const refreshIndicatorLegend = (index: number | null) => {
    const chart = chartRef.current;
    if (!chart) return;
    const indicators = chart.getIndicators().filter((i) => MAIN_INDICATORS.has(i.name));
    const rows = indicators.map((indicator) => {
      const startIndex = typeof index === 'number' && index >= 0 ? index : Math.max(0, indicator.result.length - 1);
      let values: string[] = [];
      for (let i = startIndex; i >= 0; i -= 1) {
        const point = indicator.result[i] as unknown;
        if (typeof point === 'number' && Number.isFinite(point)) {
          values = [`${indicator.shortName || indicator.name}: ${formatNumber(point)}`];
          break;
        }
        if (Array.isArray(point)) {
          const nums = point
            .map((v) => Number(v))
            .filter((v) => Number.isFinite(v))
            .slice(0, 8)
            .map((v, idx) => `${indicator.shortName || indicator.name}${idx + 1}: ${formatNumber(v)}`);
          if (nums.length > 0) {
            values = nums;
            break;
          }
        }
        if (point && typeof point === 'object') {
          const nums = Object.entries(point as Record<string, unknown>)
            .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
            .slice(0, 8)
            .map(([key, value]) => `${key.toUpperCase()}: ${formatNumber(value)}`);
          if (nums.length > 0) {
            values = nums;
            break;
          }
        }
      }
      const params = Array.isArray(indicator.calcParams) && indicator.calcParams.length > 0 ? `(${indicator.calcParams.join(',')})` : '';
      return { name: `${indicator.name}${params}`, values };
    });
    setMainIndicatorLegend(rows);
  };

  const syncIndicatorParamsFromChart = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const nextParams: Record<string, number[]> = {};
    chart.getIndicators().forEach((indicator) => {
      const params = Array.isArray(indicator.calcParams) ? indicator.calcParams.map((v) => Number(v)).filter((v) => Number.isFinite(v)) : [];
      if (params.length > 0) nextParams[indicator.name] = params;
    });
    setIndicatorParams((prev) => {
      const merged: Record<string, number[]> = { ...prev };
      let changed = false;
      Object.entries(nextParams).forEach(([name, params]) => {
        const old = prev[name];
        if (!old || old.join(',') !== params.join(',')) {
          merged[name] = params;
          changed = true;
        }
      });
      return changed ? merged : prev;
    });
  };

  useEffect(() => {
    if (!ref.current) return;
    // Dev (StrictMode) may mount effects twice; ensure we never keep stale chart instances.
    if (chartRef.current) {
      dispose(chartRef.current);
      chartRef.current = null;
    }
    ref.current.innerHTML = '';

    const chart = init(ref.current);
    if (!chart) return;
    chartRef.current = chart;

    chart.setStyles(buildChartStyles(DEFAULT_CHART_SETTINGS) as never);

    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(chartRowsRef.current, false);
      },
    });
    chart.setSymbol({ ticker: 'TRAIN', pricePrecision, volumePrecision: 2 });
    chart.setPeriod({ type: 'minute', span: 1 });
    chart.setScrollEnabled(!disableScrollZoom);
    chart.setZoomEnabled(!disableScrollZoom);

    // Main pane y-axis: autoscale by current visible candles only (with padding),
    // so small local fluctuations stay readable and are not flattened by global history.
    const axisCapableChart = chart as unknown as {
      overrideYAxis?: (axis: {
        paneId?: string;
        id?: string;
        createRange?: (params: {
          defaultRange: {
            from: number;
            to: number;
            realFrom: number;
            realTo: number;
            range: number;
            realRange: number;
            displayFrom: number;
            displayTo: number;
            displayRange: number;
          };
        }) => {
          from: number;
          to: number;
          realFrom: number;
          realTo: number;
          range: number;
          realRange: number;
          displayFrom: number;
          displayTo: number;
          displayRange: number;
        };
      }) => void;
      getVisibleRange?: () => { from?: number; to?: number; realFrom?: number; realTo?: number };
    };
    if (hideTimeAxisLabels) {
      axisCapableChart.overrideYAxis?.({
      paneId: 'candle_pane',
      id: 'candle_pane',
      createRange: ({ defaultRange }) => {
        const vr = axisCapableChart.getVisibleRange?.();
        const fromIdxRaw = typeof vr?.realFrom === 'number' ? vr.realFrom : vr?.from;
        const toIdxRaw = typeof vr?.realTo === 'number' ? vr.realTo : vr?.to;
        if (rowsRef.current.length === 0) return defaultRange;
        const fallbackToIdx = rowsRef.current.length - 1;
        const fallbackFromIdx = Math.max(0, fallbackToIdx - DEFAULT_VISIBLE_BARS + 1);
        const fromIdx = Number.isFinite(fromIdxRaw) ? Math.max(0, Math.floor(fromIdxRaw as number)) : fallbackFromIdx;
        const toIdx = Number.isFinite(toIdxRaw)
          ? Math.max(fromIdx, Math.min(rowsRef.current.length - 1, Math.ceil(toIdxRaw as number)))
          : fallbackToIdx;
        const trainingToIdx = rowsRef.current.length - 1;
        const trainingFromIdx = Math.max(0, trainingToIdx - TRAINING_PRICE_WINDOW_BARS);
        const effectiveFromIdx = hideTimeAxisLabels ? trainingFromIdx : fromIdx;
        const effectiveToIdx = hideTimeAxisLabels ? trainingToIdx : toIdx;
        let minPrice = Number.POSITIVE_INFINITY;
        let maxPrice = Number.NEGATIVE_INFINITY;
        let maxDecimals = 0;
        for (let i = effectiveFromIdx; i <= effectiveToIdx; i += 1) {
          const row = rowsRef.current[i];
          if (!row) continue;
          if (Number.isFinite(row.low)) minPrice = Math.min(minPrice, row.low);
          if (Number.isFinite(row.high)) maxPrice = Math.max(maxPrice, row.high);
          if (Number.isFinite(row.open)) {
            minPrice = Math.min(minPrice, row.open);
            maxPrice = Math.max(maxPrice, row.open);
          }
          if (Number.isFinite(row.close)) {
            minPrice = Math.min(minPrice, row.close);
            maxPrice = Math.max(maxPrice, row.close);
          }
          if (Number.isFinite(row.close)) maxDecimals = Math.max(maxDecimals, decimalPlacesOf(row.close));
        }
        const low = minPrice;
        const high = maxPrice;
        if (!Number.isFinite(low) || !Number.isFinite(high)) return defaultRange;
        const mid = (high + low) / 2;
        const rawRange = Math.max(0, high - low);
        const minRangeByPrice = Math.max(5e-8, Math.abs(mid) * MIN_PRICE_RANGE_RATIO);
        const fallbackTick = Math.pow(10, -Math.min(10, maxDecimals));
        let inferredTick = Number.POSITIVE_INFINITY;
        for (let i = effectiveFromIdx; i <= effectiveToIdx; i += 1) {
          const row = rowsRef.current[i];
          if (!row) continue;
          const span = Math.abs(row.high - row.low);
          if (Number.isFinite(span) && span > 0) inferredTick = Math.min(inferredTick, span);
          if (i > effectiveFromIdx) {
            const prev = rowsRef.current[i - 1];
            if (prev) {
              const closeStep = Math.abs(row.close - prev.close);
              if (Number.isFinite(closeStep) && closeStep > 0) inferredTick = Math.min(inferredTick, closeStep);
            }
          }
        }
        const tick = Number.isFinite(inferredTick) ? inferredTick : fallbackTick;
        const minRangeByTick = Math.max(5e-8, tick * 2);
        const hasMeaningfulMove = rawRange > minRangeByTick * 1.2;
        const finalRange = hasMeaningfulMove
          ? Math.max(rawRange, minRangeByTick)
          : Math.max(rawRange, minRangeByPrice, minRangeByTick);
        const pad = hasMeaningfulMove ? finalRange * PRICE_PADDING_RATIO : finalRange * 0.08;
        const minValue = mid - finalRange / 2 - pad;
        const maxValue = mid + finalRange / 2 + pad;
        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue <= minValue) return defaultRange;
        return {
          ...defaultRange,
          from: minValue,
          to: maxValue,
          realFrom: minValue,
          realTo: maxValue,
          range: maxValue - minValue,
          realRange: maxValue - minValue,
          displayFrom: minValue,
          displayTo: maxValue,
          displayRange: maxValue - minValue,
        };
      },
      });
    }
    const initChartWithApply = chart as unknown as { applyNewData?: (rows: KLineData[], more?: boolean) => void };
    if (typeof initChartWithApply.applyNewData === 'function') {
      initChartWithApply.applyNewData(chartRowsRef.current, false);
    } else {
      chart.resetData();
    }
    const maybeTriggerLoadOlder = () => {
      userInteractedRef.current = true;
      if (!hasMoreOlder || loadingOlder || leftEdgeLockRef.current) return;
      const anyChart = chart as unknown as {
        getVisibleRange?: () => { from?: number; realFrom?: number };
      };
      const range = anyChart.getVisibleRange?.();
      const fromIdx = typeof range?.realFrom === 'number' ? range.realFrom : range?.from;
      if (typeof fromIdx === 'number' && Number.isFinite(fromIdx) && fromIdx <= 2) {
        leftEdgeLockRef.current = true;
        onReachLeftEdge?.();
      }
    };
    const onCrosshairChange = (payload?: unknown) => {
      const crosshair = (payload ?? {}) as { dataIndex?: number; realDataIndex?: number; timestamp?: number; x?: number; y?: number; paneId?: string };
      let idx = typeof crosshair.realDataIndex === 'number' ? crosshair.realDataIndex : crosshair.dataIndex;

      if (!(typeof idx === 'number' && Number.isFinite(idx))) {
        if (typeof crosshair.timestamp === 'number' && Number.isFinite(crosshair.timestamp) && rowsRef.current.length > 0) {
          let nearest = 0;
          let diff = Math.abs(rowsRef.current[0].timestamp - crosshair.timestamp);
          for (let i = 1; i < rowsRef.current.length; i += 1) {
            const d = Math.abs(rowsRef.current[i].timestamp - crosshair.timestamp);
            if (d < diff) {
              diff = d;
              nearest = i;
            }
          }
          idx = nearest;
        } else if (typeof crosshair.x === 'number' && Number.isFinite(crosshair.x)) {
          const converted = chart.convertFromPixel(
            [{ x: crosshair.x, y: typeof crosshair.y === 'number' ? crosshair.y : 0 }],
            { paneId: crosshair.paneId || 'candle_pane' },
          ) as Array<{ dataIndex?: number }> | { dataIndex?: number };
          const point = Array.isArray(converted) ? converted[0] : converted;
          idx = point?.dataIndex;
        }
      }

      if (typeof idx === 'number' && Number.isFinite(idx) && rowsRef.current.length > 0) {
        const clamped = Math.max(0, Math.min(rowsRef.current.length - 1, Math.round(idx)));
        setFocusDataIndex(clamped);
      }
    };
    chart.subscribeAction('onCrosshairChange', onCrosshairChange);
    if (!disableScrollZoom) {
      chart.subscribeAction('onScroll', maybeTriggerLoadOlder);
      chart.subscribeAction('onZoom', maybeTriggerLoadOlder);
    }
    const debugOnScroll = () => logAxisDebug('scroll');
    const debugOnZoom = () => logAxisDebug('zoom');
    const debugOnCrosshair = () => logAxisDebug('crosshair');
    chart.subscribeAction('onScroll', debugOnScroll);
    chart.subscribeAction('onZoom', debugOnZoom);
    chart.subscribeAction('onCrosshairChange', debugOnCrosshair);
    setChartReady(true);

    const paneEl = chartPaneRef.current;
    let resizeObserver: ResizeObserver | null = null;
    const handleResize = () => {
      chart.resize();
    };
    if (paneEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(paneEl);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeAction('onCrosshairChange', onCrosshairChange);
      if (!disableScrollZoom) {
        chart.unsubscribeAction('onScroll', maybeTriggerLoadOlder);
        chart.unsubscribeAction('onZoom', maybeTriggerLoadOlder);
      }
      chart.unsubscribeAction('onScroll', debugOnScroll);
      chart.unsubscribeAction('onZoom', debugOnZoom);
      chart.unsubscribeAction('onCrosshairChange', debugOnCrosshair);
      dispose(chart);
      chartRef.current = null;
      setChartReady(false);
    };
  }, [disableScrollZoom, pricePrecision]);

  useEffect(() => {
    if (!loadingOlder) leftEdgeLockRef.current = false;
  }, [loadingOlder, data.length]);

  useEffect(() => {
    return () => {
      if (indicatorRecoverTimerRef.current != null) {
        window.clearTimeout(indicatorRecoverTimerRef.current);
        indicatorRecoverTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartReady) return;
    chart.setStyles(buildChartStyles(chartSettings, hideTimeAxisLabels) as never);
    chart.setPaneOptions({
      id: 'candle_pane',
      axis: {
        name: chartSettings.priceAxisType === 'log' ? 'logarithm' : 'normal',
        reverse: chartSettings.reverseYAxis,
      },
    } as never);
    chart.resize();
  }, [chartReady, chartSettings, hideTimeAxisLabels]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartReady || !indicatorPrefsReady) return;
    if (indicatorRecoverTimerRef.current != null) {
      window.clearTimeout(indicatorRecoverTimerRef.current);
      indicatorRecoverTimerRef.current = null;
    }
    indicatorRecoverAttemptsRef.current = 0;
    const applyIndicators = () => {
      chart.removeIndicator();
      selectedIndicators.forEach((name) => {
        const params = indicatorParams[name] ?? DEFAULT_INDICATOR_PARAMS[name];
        const value: string | IndicatorCreate =
          Array.isArray(params) && params.length > 0 ? { name, calcParams: params } : name;
        if (MAIN_INDICATORS.has(name)) {
          chart.createIndicator(value, { isStack: true, pane: { id: 'candle_pane' } });
        } else {
          chart.createIndicator(value, { isStack: true });
        }
      });
    };
    applyIndicators();
    const actual = Array.from(new Set(chart.getIndicators().map((i) => i.name)));
    const want = Array.from(new Set(selectedIndicators));
    if (isTransientIndicatorEmpty(want, actual)) {
      const retry = () => {
        indicatorRecoverAttemptsRef.current += 1;
        applyIndicators();
        const retried = Array.from(new Set(chart.getIndicators().map((i) => i.name)));
        if (!isTransientIndicatorEmpty(want, retried)) {
          if (retried.length > 0 && retried.slice().sort().join('|') !== want.slice().sort().join('|')) {
            setSelectedIndicators(retried);
          }
          syncIndicatorParamsFromChart();
          refreshIndicatorLegend(focusDataIndex);
          return;
        }
        if (indicatorRecoverAttemptsRef.current < 8) {
          indicatorRecoverTimerRef.current = window.setTimeout(retry, 80);
        }
      };
      indicatorRecoverTimerRef.current = window.setTimeout(retry, 80);
      return;
    }
    if (actual.length > 0 && actual.slice().sort().join('|') !== want.slice().sort().join('|')) {
      setSelectedIndicators(actual);
    }
    syncIndicatorParamsFromChart();
    refreshIndicatorLegend(focusDataIndex);
  }, [chartReady, selectedIndicators, indicatorParams, MAIN_INDICATORS, DEFAULT_INDICATOR_PARAMS, indicatorPrefsReady, timeframe, data]);

  useLayoutEffect(() => {
    const prevRows = rowsRef.current;
    const isTrainingMode = hideTimeAxisLabels;
    const rows = Array.isArray(data) ? data : [];
    rowsRef.current = rows.map((d, idx) => {
      const parsed = Date.parse(d.time);
      const timestamp = Number.isFinite(parsed) ? parsed : Date.now() + idx * 60_000;
      return { timestamp, open: d.open, high: d.high, low: d.low, close: d.close, volume: Number(d.volume ?? 0) };
    });
    chartRowsRef.current = hideTimeAxisLabels ? appendRightWhitespaceBars(rowsRef.current, getTimeframeMs(timeframe)) : rowsRef.current;
    setFocusDataIndex((prev) => {
      if (typeof prev === 'number' && prev >= 0 && prev < rowsRef.current.length) return prev;
      return rowsRef.current.length > 0 ? rowsRef.current.length - 1 : null;
    });
    const chart = chartRef.current;
    if (!chart) return;
    const currentLastTs = rowsRef.current[rowsRef.current.length - 1]?.timestamp ?? null;
    const prevLastTs = prevRows[prevRows.length - 1]?.timestamp ?? null;
    const currentFirstTs = rowsRef.current[0]?.timestamp ?? null;
    const prevFirstTs = prevRows[0]?.timestamp ?? null;
    const timeframeChanged = prevViewTimeframeRef.current !== timeframe;
    const rowsShapeChanged =
      rowsRef.current.length !== prevRows.length || currentFirstTs !== prevFirstTs || currentLastTs !== prevLastTs;
    const skipDataApplyOnly = timeframeChanged && !rowsShapeChanged;
    const shouldInitViewport = !viewportInitRef.current || timeframeChanged;
    if (!skipDataApplyOnly) {
      const chartWithApply = chart as unknown as { applyNewData?: (rows: KLineData[], more?: boolean) => void };
      if (typeof chartWithApply.applyNewData === 'function') {
        chartWithApply.applyNewData(chartRowsRef.current, false);
      } else {
        chart.resetData();
      }
    }
    chart.removeOverlay({ groupId: 'trade-actions' });
    chart.removeOverlay({ groupId: 'risk-lines' });
    chart.removeOverlay({ groupId: 'partial-candle-hint' });

    if (showTradeOverlays) {
      const actionRows = Array.isArray(actions) ? actions : [];
      let sideContext: 'LONG' | 'SHORT' | null = null;
      const getPlacement = (actionType: string): 'above' | 'below' => {
        if (actionType === 'OPEN_LONG' || actionType === 'ADD_LONG') {
          sideContext = 'LONG';
          return 'below';
        }
        if (actionType === 'OPEN_SHORT' || actionType === 'ADD_SHORT') {
          sideContext = 'SHORT';
          return 'above';
        }
        if (actionType === 'PARTIAL_CLOSE' || actionType === 'FULL_CLOSE' || actionType === 'CLOSE' || actionType === 'TP' || actionType === 'SL') {
          const placement = sideContext === 'SHORT' ? 'below' : 'above';
          if (actionType === 'FULL_CLOSE' || actionType === 'CLOSE' || actionType === 'TP' || actionType === 'SL') sideContext = null;
          return placement;
        }
        if (actionType === 'LIQUIDATED') {
          sideContext = null;
          return 'above';
        }
        return 'above';
      };
      const timestampToCandle = new Map<number, KLineData>();
      for (const row of rowsRef.current) timestampToCandle.set(row.timestamp, row);
      actionRows.forEach((a) => {
      const timestamp = typeof a.timestamp === 'number' ? a.timestamp : typeof a.timePointer === 'number' ? rowsRef.current[a.timePointer]?.timestamp : undefined;
      if (typeof timestamp !== 'number') return;
      const meta = getActionMeta(a.actionType);
      if (!meta) return;
      const emphasized = highlightedActionId === a.id;
      const candle = timestampToCandle.get(timestamp);
      const anchorPlacement = getPlacement(a.actionType);
      const baseValue = candle ? (anchorPlacement === 'above' ? candle.high : candle.low) : a.price;
      const span = candle ? Math.max(0.000001, candle.high - candle.low) : Math.max(0.000001, Math.abs(a.price) * 0.006);
      const minAbsGap = Math.max(0.000001, Math.abs(a.price) * 0.003);
      const gap = Math.max(span * 1.6, minAbsGap);
      const labelValue = anchorPlacement === 'above' ? baseValue + gap : baseValue - gap;
      const palette =
        meta.tone === 'buy'
          ? { bg: '#059669', border: '#047857', line: '#34d399' }
          : meta.tone === 'sell'
            ? { bg: '#e11d48', border: '#be123c', line: '#fb7185' }
            : meta.tone === 'close'
              ? { bg: '#ca8a04', border: '#a16207', line: '#facc15' }
              : meta.tone === 'tp'
                ? { bg: '#0369a1', border: '#075985', line: '#38bdf8' }
                : meta.tone === 'sl'
                  ? { bg: '#c2410c', border: '#9a3412', line: '#fb923c' }
                  : { bg: '#b91c1c', border: '#991b1b', line: '#f87171' };
      chart.createOverlay({
        name: 'simpleAnnotation',
        groupId: 'trade-actions',
        points: [
          { timestamp, value: baseValue },
          { timestamp, value: labelValue },
        ],
        extendData: `${meta.label} ${a.price.toFixed(pricePrecision)}`,
        styles: {
          line: { color: palette.line, size: emphasized ? 2 : 1 },
          polygon: { color: palette.line, borderColor: palette.line },
          text: {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            color: '#ffffff',
            paddingLeft: emphasized ? 7 : 6,
            paddingRight: emphasized ? 7 : 6,
            paddingTop: emphasized ? 4 : 3,
            paddingBottom: emphasized ? 4 : 3,
          },
        },
      });
      });

      const lastTimestamp = rowsRef.current[rowsRef.current.length - 1]?.timestamp;
      const lastInput = rows[rows.length - 1];
      if (typeof lastTimestamp === 'number') {
        if (!hideTimeAxisLabels && lastInput?.isPartial) {
          chart.createOverlay({
            name: 'horizontalStraightLine',
            groupId: 'partial-candle-hint',
            points: [{ timestamp: lastTimestamp, value: lastInput.close }],
            styles: {
              line: { color: 'rgba(148,163,184,0.55)', size: 1, style: 'dashed', dashedValue: [4, 4] },
            },
          });
          chart.createOverlay({
            name: 'simpleAnnotation',
            groupId: 'partial-candle-hint',
            points: [{ timestamp: lastTimestamp, value: lastInput.high }],
            extendData: '进行中',
            styles: {
              text: {
                backgroundColor: 'rgba(51,65,85,0.75)',
                borderColor: 'rgba(148,163,184,0.6)',
                color: '#e2e8f0',
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 2,
                paddingBottom: 2,
              },
              line: { color: 'rgba(148,163,184,0.5)', size: 1 },
              polygon: { color: 'rgba(148,163,184,0.55)', borderColor: 'rgba(148,163,184,0.55)' },
            },
          });
        }
        if (typeof stopLossPrice === 'number' && Number.isFinite(stopLossPrice)) {
        chart.createOverlay({
          name: 'horizontalStraightLine',
          groupId: 'risk-lines',
          points: [{ timestamp: lastTimestamp, value: stopLossPrice }],
          styles: {
            line: { color: '#ef4444', size: 1.2, style: 'dashed', dashedValue: [5, 4] },
          },
        });
        chart.createOverlay({
          name: 'simpleAnnotation',
          groupId: 'risk-lines',
          points: [{ timestamp: lastTimestamp, value: stopLossPrice }],
          extendData: `止损 ${stopLossPrice.toFixed(pricePrecision)}`,
          styles: {
            text: { backgroundColor: '#7f1d1d', borderColor: '#b91c1c', color: '#fecaca' },
            line: { color: '#ef4444' },
            polygon: { color: '#ef4444', borderColor: '#ef4444' },
          },
        });
        }
        if (typeof takeProfitPrice === 'number' && Number.isFinite(takeProfitPrice)) {
        chart.createOverlay({
          name: 'horizontalStraightLine',
          groupId: 'risk-lines',
          points: [{ timestamp: lastTimestamp, value: takeProfitPrice }],
          styles: {
            line: { color: '#10b981', size: 1.2, style: 'dashed', dashedValue: [5, 4] },
          },
        });
        chart.createOverlay({
          name: 'simpleAnnotation',
          groupId: 'risk-lines',
          points: [{ timestamp: lastTimestamp, value: takeProfitPrice }],
          extendData: `止盈 ${takeProfitPrice.toFixed(pricePrecision)}`,
          styles: {
            text: { backgroundColor: '#064e3b', borderColor: '#059669', color: '#a7f3d0' },
            line: { color: '#10b981' },
            polygon: { color: '#10b981', borderColor: '#10b981' },
          },
        });
        }
      }
    }
    if (isTrainingMode && shouldInitViewport) {
      syncTrainingViewportWithFallback(chart, rowsRef.current, timeframeChanged ? 'switch' : 'init', true, true);
      viewportInitRef.current = true;
      userInteractedRef.current = false;
    } else if (isTrainingMode && currentLastTs != null && prevLastTs != null && currentLastTs !== prevLastTs) {
      syncTrainingViewportWithFallback(chart, rowsRef.current, 'advance');
    }
    prevViewTimeframeRef.current = timeframe;
    refreshIndicatorLegend(rowsRef.current.length > 0 ? rowsRef.current.length - 1 : null);
  }, [chartReady, data, actions, stopLossPrice, takeProfitPrice, highlightedActionId, showTradeOverlays, hideTimeAxisLabels, timeframe]);

  useEffect(() => {
    refreshIndicatorLegend(focusDataIndex);
  }, [focusDataIndex]);

  useEffect(() => {
    return () => {
      if (viewportSyncRafRef.current != null) {
        cancelAnimationFrame(viewportSyncRafRef.current);
        viewportSyncRafRef.current = null;
      }
      viewportGuardPendingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(actions) || actions.length === 0) {
      setFocusedAction(null);
      return;
    }
    if (typeof focusDataIndex !== 'number' || focusDataIndex < 0 || focusDataIndex >= rowsRef.current.length) return;
    const ts = rowsRef.current[focusDataIndex]?.timestamp;
    if (typeof ts !== 'number') return;

    const actionRows = Array.isArray(actions) ? actions : [];
    const actionWithTs = actionRows
      .map((a) => ({
        action: a,
        ts: typeof a.timestamp === 'number' ? a.timestamp : typeof a.timePointer === 'number' ? rowsRef.current[a.timePointer]?.timestamp : undefined,
      }))
      .filter((x): x is { action: Action; ts: number } => typeof x.ts === 'number' && Number.isFinite(x.ts));
    if (actionWithTs.length === 0) return;

    let nearest = actionWithTs[0];
    let nearestDiff = Math.abs(actionWithTs[0].ts - ts);
    for (let i = 1; i < actionWithTs.length; i += 1) {
      const diff = Math.abs(actionWithTs[i].ts - ts);
      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearest = actionWithTs[i];
      }
    }

    const barGap = rowsRef.current.length > 1 ? Math.abs(rowsRef.current[Math.min(focusDataIndex + 1, rowsRef.current.length - 1)].timestamp - rowsRef.current[Math.max(focusDataIndex - 1, 0)].timestamp) : 0;
    const threshold = Math.max(10 * 60_000, barGap * 2);
    if (nearestDiff <= threshold) {
      setFocusedAction(nearest.action);
    }
  }, [focusDataIndex, actions]);

  useEffect(() => {
    if (hideTimeAxisLabels) return;
    if (typeof focusedTimestamp !== 'number' || !Number.isFinite(focusedTimestamp)) return;
    if (rowsRef.current.length === 0) return;
    let nearestIndex = 0;
    let nearestDiff = Math.abs(rowsRef.current[0].timestamp - focusedTimestamp);
    for (let i = 1; i < rowsRef.current.length; i += 1) {
      const diff = Math.abs(rowsRef.current[i].timestamp - focusedTimestamp);
      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearestIndex = i;
      }
    }
    setFocusDataIndex(nearestIndex);
    const chart = chartRef.current as unknown as { scrollToTimestamp?: (v: number) => void; scrollToDataIndex?: (v: number) => void } | null;
    if (!chart) return;
    if (typeof chart.scrollToTimestamp === 'function') chart.scrollToTimestamp(rowsRef.current[nearestIndex].timestamp);
    else if (typeof chart.scrollToDataIndex === 'function') chart.scrollToDataIndex(nearestIndex);
  }, [focusedTimestamp, hideTimeAxisLabels]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = drawToolbarRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpenDrawMenu(null);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    if (!paramToast) return;
    const timer = window.setTimeout(() => setParamToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [paramToast]);

  useLayoutEffect(() => {
    if (!showSettingsModal) return;
    const fitModal = () => {
      const el = settingsModalRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (!width || !height) return;
      const widthScale = (window.innerWidth - 24) / width;
      const heightScale = (window.innerHeight - 28) / height;
      const next = Math.min(1, widthScale, heightScale) * 0.9;
      setSettingsModalScale(Math.max(0.54, next));
    };
    const raf = requestAnimationFrame(fitModal);
    const observer = new ResizeObserver(fitModal);
    if (settingsModalRef.current) observer.observe(settingsModalRef.current);
    window.addEventListener('resize', fitModal);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', fitModal);
    };
  }, [showSettingsModal]);

  useEffect(() => {
    if (showSettingsModal) return;
    setSettingsNotice(null);
  }, [showSettingsModal]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // 同步手动画线可见性，确保“眼睛”按钮有即时可见反馈
    chart.overrideOverlay({ groupId: MANUAL_OVERLAY_GROUP_ID, visible: showTradeOverlays });
  }, [showTradeOverlays]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chartReady) return;
    const manualOverlays = chart.getOverlays({ groupId: MANUAL_OVERLAY_GROUP_ID }) ?? [];
    const completed = manualOverlays.filter((overlay) => overlay.currentStep >= overlay.totalStep);
    if (completed.length > 0) {
      manualOverlaySnapshotRef.current = completed.map((overlay) => toManualOverlaySnapshot(overlay, MANUAL_OVERLAY_GROUP_ID));
      return;
    }
    if (manualOverlaySnapshotRef.current.length === 0) return;
    manualOverlaySnapshotRef.current.forEach((overlay) => {
      chart.createOverlay(overlay);
    });
    chart.overrideOverlay({ groupId: MANUAL_OVERLAY_GROUP_ID, visible: showTradeOverlays });
  }, [chartReady, timeframe, data, showTradeOverlays]);

  const addDraw = (name: string) => {
    if (drawLocked) return;
    const chart = chartRef.current;
    if (!chart) return;
    if (!supportedOverlays.has(name)) {
      setParamToast('当前图表库不支持该画图工具');
      return;
    }
    const created = chart.createOverlay({ name, groupId: MANUAL_OVERLAY_GROUP_ID });
    if (created) {
      setActiveDrawTool(name);
      return;
    }
    setParamToast('创建画图失败，请尝试其他工具');
  };

  const toggleIndicator = (name: string) => {
    setSelectedIndicators((prev) => (prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]));
  };

  const openParamEditor = (name: string) => {
    const base = indicatorParams[name] ?? DEFAULT_INDICATOR_PARAMS[name] ?? [14];
    setParamModal({ name, values: base.map((v) => String(v)) });
  };

  const saveChartSettings = async () => {
    setSettingsSaving(true);
    setSettingsNotice(null);
    try {
      window.localStorage.setItem('kline_chart_settings_v1', JSON.stringify(chartSettings));
      await new Promise((resolve) => setTimeout(resolve, 180));
      setSettingsNotice({ tone: 'success', message: '设置已保存' });
    } catch {
      setSettingsNotice({ tone: 'error', message: '保存失败，请重试' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveParamEditor = () => {
    if (!paramModal) return;
    const parsed = paramModal.values.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    if (parsed.length === 0) {
      setParamToast('参数无效，请输入大于 0 的数字');
      return;
    }
    setIndicatorParams((prev) => ({ ...prev, [paramModal.name]: parsed }));
    setParamModal(null);
    setParamToast(`${paramModal.name} 参数已更新`);
  };

  const resetIndicatorParamsToDefault = () => {
    const next: Record<string, number[]> = {};
    selectedIndicators.forEach((name) => {
      const params = DEFAULT_INDICATOR_PARAMS[name];
      if (Array.isArray(params) && params.length > 0) next[name] = [...params];
    });
    setIndicatorParams(next);
    setParamModal(null);
    setParamToast('已恢复默认指标参数');
  };

  const priceInfo = useMemo(() => {
    const focusBar = typeof focusDataIndex === 'number' && focusDataIndex >= 0 && focusDataIndex < rowsRef.current.length ? rowsRef.current[focusDataIndex] : null;
    if (!focusBar) {
      return { open: 'n/a', high: 'n/a', low: 'n/a', close: 'n/a', change: 'n/a', changePct: 'n/a', rise: false };
    }
    const open = focusBar.open;
    const close = focusBar.close;
    const change = close - open;
    const pct = open !== 0 ? (change / open) * 100 : 0;
    return {
      open: formatNumber(open),
      high: formatNumber(focusBar.high),
      low: formatNumber(focusBar.low),
      close: formatNumber(close),
      change: `${change >= 0 ? '+' : ''}${formatNumber(change)}`,
      changePct: `${change >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      rise: change >= 0,
    };
  }, [focusDataIndex, data]);

  const focusTimestamp = useMemo(() => {
    if (typeof focusDataIndex === 'number' && focusDataIndex >= 0 && focusDataIndex < rowsRef.current.length) {
      return rowsRef.current[focusDataIndex].timestamp;
    }
    return undefined;
  }, [focusDataIndex, data]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/65 p-1.5 text-xs">
        <span className="mr-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[11px] font-semibold text-slate-900">TRAIN</span>
        {periods.map((p) => (
          <button key={p} className={timeframe === p ? activeToolBtn : toolBtn} onClick={() => onTimeframeChange?.(p)}>
            {p}
          </button>
        ))}
        <div className="mx-1 h-4 w-px bg-slate-600/70" />
        <button className={selectedIndicators.length > 0 ? activeToolBtn : toolBtn} onClick={() => setShowIndicatorModal(true)}>
          指标 {selectedIndicators.length > 0 ? `(${selectedIndicators.length})` : ''}
        </button>
        <button className={showSettingsModal ? activeToolBtn : toolBtn} onClick={() => setShowSettingsModal(true)}>
          设置
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-1.5">
        <div ref={drawToolbarRef} className="relative flex w-[44px] flex-col rounded-xl border border-slate-700/50 bg-slate-900/80">
          {drawMenus.map((menu) => (
            <div key={menu.key} className="relative border-b border-slate-700/70 last:border-b-0">
              <button
                className={openDrawMenu === menu.key ? `${sideBtnActive} m-1` : `${sideBtn} m-1`}
                onClick={() => setOpenDrawMenu((prev) => (prev === menu.key ? null : menu.key))}
                title={menu.title}
              >
                {menu.icon}
              </button>
              {openDrawMenu === menu.key ? (
                <div className="absolute left-[46px] top-1 z-20 min-w-[160px] rounded-xl border border-slate-700/80 bg-slate-900/95 p-1 shadow-2xl">
                  {menu.items.map((item) => (
                    <button
                      key={item.overlay}
                      className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-100 hover:bg-slate-700/80 ${activeDrawTool === item.overlay ? 'bg-blue-600/70' : ''}`}
                      onClick={() => {
                        addDraw(item.overlay);
                        setOpenDrawMenu(null);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <div className="my-1 border-t border-slate-700/70" />
          <button
            className={`${drawLocked ? sideBtnActive : sideBtn} m-1`}
            title={drawLocked ? '已锁定画线' : '解锁后可画线'}
            onClick={() => {
              setDrawLocked((prev) => !prev);
              setOpenDrawMenu(null);
            }}
          >
            🔒
          </button>
          <button
            className={`${showTradeOverlays ? sideBtnActive : sideBtn} m-1`}
            title={showTradeOverlays ? '隐藏标注与画线' : '显示标注与画线'}
            onClick={() => setShowTradeOverlays((prev) => !prev)}
          >
            👁
          </button>
          <button
            className={`${sideBtn} m-1`}
            onClick={() => {
              if (drawLocked) return;
              chartRef.current?.removeOverlay({ groupId: MANUAL_OVERLAY_GROUP_ID });
              manualOverlaySnapshotRef.current = [];
              setActiveDrawTool(null);
              setOpenDrawMenu(null);
            }}
            title="清空划线"
          >
            🗑
          </button>
        </div>
        <div ref={chartPaneRef} className="flex min-h-0 flex-1 flex-col gap-1">
          <div className="rounded-xl border border-slate-700/50 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {!hideHeaderTime ? <span className="text-slate-400">时间: {formatTime(focusTimestamp)}</span> : null}
              <span>开: {priceInfo.open}</span>
              <span>高: {priceInfo.high}</span>
              <span>低: {priceInfo.low}</span>
              <span>收: {priceInfo.close}</span>
              <span className={priceInfo.rise ? 'text-emerald-400' : 'text-rose-400'}>
                涨跌: {priceInfo.change} ({priceInfo.changePct})
              </span>
            </div>
            
          </div>
          <div
            ref={ref}
            className={`h-full w-full rounded-xl border border-slate-700/90 bg-slate-950/70 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.06)] ${
              fitContainerHeight ? 'min-h-0' : 'min-h-[420px] sm:min-h-[460px] xl:min-h-[560px] 2xl:min-h-[640px]'
            }`}
          />
        </div>
      </div>

      {showIndicatorModal && canPortal
        ? createPortal((
        <div className="fixed inset-0 z-[420] overflow-y-auto bg-black/55 px-3 py-5 backdrop-blur-[1px] sm:px-4 sm:py-8" onClick={() => setShowIndicatorModal(false)}>
          <div
            className="mx-auto my-2 flex max-h-[calc(100vh-112px)] w-[470px] max-w-[88vw] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl sm:my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between border-b border-slate-700 px-3.5 py-3">
              <div>
                <h3 className="text-[15px] font-semibold tracking-[0.01em] text-slate-100">指标设置</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">选择要显示的指标，并按需调整参数。</p>
              </div>
              <Button variant="ghost" size="sm" className="!px-2 !py-1.5 text-slate-400 hover:!text-slate-100" onClick={() => setShowIndicatorModal(false)}>
                ✕
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5 text-sm">
              {paramToast ? (
                <div className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{paramToast}</div>
              ) : null}
              <section className="rounded-xl border border-slate-700/70 bg-slate-900/55 p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[12px] font-semibold tracking-[0.02em] text-cyan-300">主图指标</span>
                <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">主图叠加</span>
              </div>
              <div className="mb-2 text-[11px] text-slate-500">用于趋势与结构分析，叠加在主图 K 线上展示。</div>
              <div className="space-y-1.5">
                {mainIndicators.map((name) => (
                  <div
                    key={name}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 transition ${
                      selectedIndicators.includes(name) ? 'border-cyan-400/45 bg-cyan-500/10' : 'border-slate-700/70 bg-slate-900/35 hover:border-slate-500/80'
                    }`}
                  >
                    <div
                      className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-left"
                      onClick={() => toggleIndicator(name)}
                    >
                      <span className={selectedIndicators.includes(name) ? 'text-[13px] font-semibold text-cyan-200' : 'text-[13px] font-medium text-slate-300'}>
                        {INDICATOR_LABELS[name] ?? name}
                      </span>
                      <Switch
                        checked={selectedIndicators.includes(name)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleIndicator(name)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`!ml-2 !px-1.5 !py-1 text-[13px] ${selectedIndicators.includes(name) ? 'text-cyan-300 hover:!text-cyan-100' : 'text-slate-500 hover:!text-slate-200'}`}
                      onClick={() => openParamEditor(name)}
                      title="参数设置"
                    >
                      ⚙
                    </Button>
                  </div>
                ))}
              </div>
              </section>
              <section className="mt-3 rounded-xl border border-slate-700/70 bg-slate-900/55 p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[12px] font-semibold tracking-[0.02em] text-cyan-300">副图指标</span>
                <span className="rounded-full border border-indigo-400/35 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-200">副图振荡</span>
              </div>
              <div className="mb-2 text-[11px] text-slate-500">用于动量与成交量观察，显示在副图区域。</div>
              <div className="space-y-1.5">
                {subIndicators.map((name) => (
                  <div
                    key={name}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 transition ${
                      selectedIndicators.includes(name) ? 'border-cyan-400/45 bg-cyan-500/10' : 'border-slate-700/70 bg-slate-900/35 hover:border-slate-500/80'
                    }`}
                  >
                    <div
                      className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-left"
                      onClick={() => toggleIndicator(name)}
                    >
                      <span className={selectedIndicators.includes(name) ? 'text-[13px] font-semibold text-cyan-200' : 'text-[13px] font-medium text-slate-300'}>
                        {INDICATOR_LABELS[name] ?? name}
                      </span>
                      <Switch
                        checked={selectedIndicators.includes(name)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleIndicator(name)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`!ml-2 !px-1.5 !py-1 text-[13px] ${selectedIndicators.includes(name) ? 'text-cyan-300 hover:!text-cyan-100' : 'text-slate-500 hover:!text-slate-200'}`}
                      onClick={() => openParamEditor(name)}
                      title="参数设置"
                    >
                      ⚙
                    </Button>
                  </div>
                ))}
              </div>
              </section>
            </div>
            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-700 px-3.5 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                className="!px-3 !py-1.5 text-[12px]"
                onClick={resetIndicatorParamsToDefault}
              >
                恢复默认指标参数
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="!px-3 !py-1.5 text-[12px]"
                onClick={() => setShowIndicatorModal(false)}
              >
                完成
              </Button>
            </div>
            {paramModal ? (
              <div className="fixed inset-0 z-[430] flex items-center justify-center bg-black/45 px-3" onClick={() => setParamModal(null)}>
                <div className="w-full max-w-[360px] rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3.5">
                    <div>
                      <div className="text-[15px] font-semibold tracking-[0.01em] text-slate-100">{paramModal.name} 参数设置</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">调整后将立即作用于图表指标。</div>
                    </div>
                    <Button variant="ghost" size="sm" className="!px-2 !py-1.5 text-slate-400 hover:!text-slate-100" onClick={() => setParamModal(null)}>
                      ✕
                    </Button>
                  </div>
                  <div className="px-4 py-3">
                    <div className="rounded-xl border border-slate-700/70 bg-slate-900/55 p-2.5">
                      <div className="mb-2 text-[12px] font-semibold tracking-[0.02em] text-cyan-300">参数列表</div>
                      <div className="space-y-2">
                        {paramModal.values.map((v, idx) => (
                          <div key={`${paramModal.name}-${idx}`} className="grid grid-cols-[78px_1fr] items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/35 px-2 py-2">
                            <label className="text-[13px] font-medium text-slate-300">{PARAM_LABELS[paramModal.name]?.[idx] ?? `参数${idx + 1}`}</label>
                            <Input
                              className="h-8 rounded-lg bg-slate-800 px-2 text-[12px]"
                              value={v}
                              onChange={(e) =>
                                setParamModal((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        values: prev.values.map((item, i) => (i === idx ? e.target.value : item)),
                                      }
                                    : prev,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-700 px-4 py-3">
                    <Button variant="ghost" size="sm" className="!px-3 !py-1.5 text-[12px]" onClick={() => setParamModal(null)}>
                      取消
                    </Button>
                    <Button variant="primary" size="sm" className="!px-3 !py-1.5 text-[12px]" onClick={saveParamEditor}>
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ), document.body) : null}

      {showSettingsModal && canPortal
        ? createPortal(
        <div className="fixed inset-0 z-[400] flex items-start justify-center bg-black/55 pt-16 backdrop-blur-[1px] sm:pt-20" onClick={() => setShowSettingsModal(false)}>
          <div
            ref={settingsModalRef}
            className="w-[560px] max-h-[calc(100vh-112px)] max-w-[95vw] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
            style={{ transform: `scale(${settingsModalScale})`, transformOrigin: 'center top', willChange: 'transform' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3.5 sm:px-6 sm:py-4">
              <div>
                <h4 className="text-[20px] font-semibold tracking-[0.01em] text-slate-100">设置</h4>
                <p className="mt-0.5 text-[15px] text-slate-500">调整图表显示与交互偏好。</p>
              </div>
              <Button variant="ghost" size="sm" className="!px-2 !py-1.5 text-slate-400 hover:!text-slate-100" onClick={() => setShowSettingsModal(false)}>
                ×
              </Button>
            </div>
            <div className="max-h-[calc(100vh-294px)] space-y-3 overflow-y-auto px-5 py-4 text-sm sm:px-6 sm:py-4">
              <section className="rounded-xl border border-slate-700/80 bg-slate-900/35 p-3">
                <div className="mb-2 text-[15px] font-semibold tracking-[0.02em] text-cyan-300">图表显示</div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-200">涨跌颜色</label>
                <Select
                  className="text-[13px]"
                  value={chartSettings.riseFallMode}
                  onChange={(e) => setChartSettings((prev) => ({ ...prev, riseFallMode: e.target.value as RiseFallMode }))}
                >
                  <option value="red-up">红涨绿跌</option>
                  <option value="green-up">绿涨红跌</option>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-200">蜡烛图类型</label>
                <Select
                  className="text-[13px]"
                  value={chartSettings.candleType}
                  onChange={(e) => setChartSettings((prev) => ({ ...prev, candleType: e.target.value as CandleRenderType }))}
                >
                  <option value="solid">全实心</option>
                  <option value="stroke">空心</option>
                  <option value="up-stroke">涨空心</option>
                  <option value="down-stroke">跌空心</option>
                </Select>
              </div>
              <div
                className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-500"
                onClick={() => setChartSettings((prev) => ({ ...prev, showLatestPrice: !prev.showLatestPrice }))}
              >
                <div>
                  <div className="text-[13px] font-medium">最新价显示</div>
                </div>
                <Switch
                  checked={chartSettings.showLatestPrice}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChartSettings((prev) => ({ ...prev, showLatestPrice: !prev.showLatestPrice }))}
                />
              </div>
              <div
                className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-500"
                onClick={() => setChartSettings((prev) => ({ ...prev, showHighPrice: !prev.showHighPrice }))}
              >
                <div>
                  <div className="text-[13px] font-medium">最高价显示</div>
                </div>
                <Switch
                  checked={chartSettings.showHighPrice}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChartSettings((prev) => ({ ...prev, showHighPrice: !prev.showHighPrice }))}
                />
              </div>
              <div
                className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-500"
                onClick={() => setChartSettings((prev) => ({ ...prev, showLowPrice: !prev.showLowPrice }))}
              >
                <div>
                  <div className="text-[13px] font-medium">最低价显示</div>
                </div>
                <Switch
                  checked={chartSettings.showLowPrice}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChartSettings((prev) => ({ ...prev, showLowPrice: !prev.showLowPrice }))}
                />
              </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-700/80 bg-slate-900/35 p-3">
                <div className="mb-2 text-[15px] font-semibold tracking-[0.02em] text-cyan-300">辅助工具</div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div
                className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-500"
                onClick={() => setChartSettings((prev) => ({ ...prev, showIndicatorLatestValue: !prev.showIndicatorLatestValue }))}
              >
                <div>
                  <div className="text-[13px] font-medium">指标最新值显示</div>
                </div>
                <Switch
                  checked={chartSettings.showIndicatorLatestValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChartSettings((prev) => ({ ...prev, showIndicatorLatestValue: !prev.showIndicatorLatestValue }))}
                />
              </div>
              <div
                className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-500"
                onClick={() => setChartSettings((prev) => ({ ...prev, reverseYAxis: !prev.reverseYAxis }))}
              >
                <div>
                  <div className="text-[13px] font-medium">倒置坐标</div>
                </div>
                <Switch
                  checked={chartSettings.reverseYAxis}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChartSettings((prev) => ({ ...prev, reverseYAxis: !prev.reverseYAxis }))}
                />
              </div>
              <div
                className="flex h-[46px] cursor-pointer items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-500 sm:col-span-2"
                onClick={() => setChartSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
              >
                <div>
                  <div className="text-[13px] font-medium">网格线显示</div>
                </div>
                <Switch
                  checked={chartSettings.showGrid}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => setChartSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
                />
              </div>
                </div>
              </section>

              {settingsNotice ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    settingsNotice.tone === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                      : 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                  }`}
                >
                  {settingsNotice.message}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-700/70 px-5 pb-4 pt-3 sm:px-6 sm:pb-4">
              <Button
                variant="default"
                className="px-4 py-2 text-[clamp(13px,1.8vw,15px)]"
                onClick={saveChartSettings}
                disabled={settingsSaving}
              >
                {settingsSaving ? '保存中...' : '保存设置'}
              </Button>
              <Button
                variant="primary"
                className="px-4 py-2 text-[clamp(13px,1.8vw,15px)]"
                onClick={() => setChartSettings(DEFAULT_CHART_SETTINGS)}
                disabled={settingsSaving}
              >
                恢复默认
              </Button>
            </div>
          </div>
        </div>
        , document.body)
        : null}
    </div>
  );
}
