import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import {
  ActionType,
  CloseReason,
  PositionSide,
  type ActionType as ActionTypeValue,
  type CloseReason as CloseReasonValue,
  type PositionSide as PositionSideValue,
} from '../common/domain-enums';
import { MarketDataService, type Bar } from '../market-data/market-data.service';
import { getNextBucketStart, getTimeframeBucketStart, REAL_MARKET_TIMEFRAME_SET, timeframeRank } from '../market-data/timeframes';
import { HistoryQueryDto, SaveTrainingReviewDto, StartTrainingDto, TrainingActionDto } from './dto';
import { applyExecutionPrice, calcFloatingPnl, ensureSeries, FEE_RATE } from './training.engine';

type BarsPayload = {
  version: 2;
  drivingTimeframe: string;
  bars: Bar[];
  contextStartIndex: number;
  trainStartIndex: number;
  trainEndIndex: number;
};

type FinalReason = 'completed' | 'terminated' | 'liquidated';

const CLOSED_SESSION_STATUSES = ['COMPLETED', 'TERMINATED', 'LIQUIDATED', 'ENDED'];

const MAX_BARS_BY_TF: Record<string, number> = {
  '15m': 1500,
  '30m': 1500,
  '1H': 1500,
  '2H': 1500,
  '4H': 1500,
  D: 2000,
  W: 1200,
  M: 800,
};

@Injectable()
export class TrainingService {
  private readonly recentActionGuard = new Map<string, { at: number; pointer: number; action: string }>();

  constructor(private readonly prisma: PrismaService, private readonly marketDataService: MarketDataService) {}

  async start(userId: string, dto: StartTrainingDto) {
    await this.canUserTrain(userId);
    const fixedInitialVisibleBars = 500;
    const trainingBarsRaw = dto.trainingBars ?? dto.totalBars;
    const trainingBars = Math.max(50, Math.min(500, Math.floor(trainingBarsRaw)));
    const latestSession = await this.prisma.trainingSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { finalBalance: true, initialBalance: true, isLiquidated: true },
    });
    const carriedBalance = latestSession ? (latestSession.finalBalance ?? latestSession.initialBalance) : undefined;
    if (latestSession && (latestSession.isLiquidated || (carriedBalance ?? 0) <= 0)) {
      throw new BadRequestException('Account liquidated, please reset balance first');
    }
    const initialBalance = dto.initialBalance ?? carriedBalance ?? 10000;

    const contextBars = fixedInitialVisibleBars;
    const futureBars = trainingBars;
    let series: Awaited<ReturnType<MarketDataService['pickRandomWindowSeries']>>;
    try {
      series = await this.marketDataService.pickRandomWindowSeries(dto.market, dto.drivingTimeframe, trainingBars, contextBars, futureBars);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`No real market bars available: ${msg}`);
    }
    const pointerAbs = fixedInitialVisibleBars - 1;

    const payload: BarsPayload = {
      version: 2,
      drivingTimeframe: dto.drivingTimeframe,
      bars: series.bars,
      contextStartIndex: series.contextStartIndex,
      trainStartIndex: series.trainStartIndex,
      trainEndIndex: series.trainEndIndex,
    };

    const activeExists = await this.prisma.trainingSession.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (activeExists) {
      throw new BadRequestException('Active training session already exists');
    }

    const session = await this.prisma.trainingSession.create({
      data: {
        userId,
        market: dto.market,
        symbol: series.symbol,
        drivingTimeframe: dto.drivingTimeframe,
        totalBars: trainingBars,
        initialVisibleBars: fixedInitialVisibleBars,
        initialBalance,
        finalBalance: initialBalance,
        pointer: pointerAbs,
        viewTimeframe: dto.drivingTimeframe,
        barsData: JSON.stringify(payload),
        startedAt: new Date(),
        lastActiveAt: new Date(),
        completedAt: null,
        terminatedAt: null,
        liquidatedAt: null,
      },
    });
    await this.increaseDailyTrainingUsage(userId);

    await this.snapshot(session.id, session.pointer, initialBalance, 0);
    return this.getById(userId, session.id);
  }

  async next(userId: string, sessionId: string) {
    return this.action(userId, sessionId, { action: 'HOLD' });
  }

  async action(userId: string, sessionId: string, dto: TrainingActionDto) {
    const normalizedAction = this.normalizeIncomingAction(dto);
    const current = await this.ensureOwnership(userId, sessionId);
    if (typeof dto.expectedPointer === 'number' && Number.isFinite(dto.expectedPointer) && current.pointer !== dto.expectedPointer) {
      return this.getById(userId, sessionId);
    }
    const guardKey = `${userId}:${sessionId}`;
    const now = Date.now();
    const prev = this.recentActionGuard.get(guardKey);
    if (prev && now - prev.at <= 300 && prev.pointer === current.pointer && prev.action === normalizedAction) {
      return this.getById(userId, sessionId);
    }
    this.recentActionGuard.set(guardKey, { at: now, pointer: current.pointer, action: normalizedAction });
    return this.handleAction(userId, sessionId, dto);
  }

  async end(userId: string, sessionId: string) {
    return this.finish(userId, sessionId, 'terminated');
  }

  async finish(userId: string, sessionId: string, reason: FinalReason) {
    const session = await this.ensureOwnership(userId, sessionId);
    if (session.status !== 'ACTIVE') return this.getById(userId, sessionId);
    const meta = this.parseBarsPayload(session.barsData, session.drivingTimeframe, session.totalBars);
    const bars = meta.bars;
    ensureSeries(bars as never[], session.pointer);
    const close = bars[session.pointer].close;
    let balance = session.finalBalance ?? session.initialBalance;
    const position = await this.prisma.position.findUnique({ where: { sessionId } });
    if (position) {
      const side = this.normalizePositionSide(position.side);
      const closePrice = applyExecutionPrice(close, side, 'CLOSE');
      balance = await this.closePosition(
        sessionId,
        position,
        session.pointer,
        closePrice,
        balance,
        reason === 'liquidated' ? CloseReason.LIQUIDATED : reason === 'completed' ? CloseReason.END_OF_DATA : CloseReason.USER,
      );
    }
    await this.finalizeSession(sessionId, session.pointer, balance, reason);
    return this.getById(userId, sessionId);
  }

  async getActive(userId: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!session) return { hasActive: false, sessionId: null };
    return { hasActive: true, sessionId: session.id, session: await this.getById(userId, session.id) };
  }

  async resetBalance(userId: string, sessionId: string) {
    const session = await this.ensureOwnership(userId, sessionId);
    const meta = this.parseBarsPayload(session.barsData, session.drivingTimeframe, session.totalBars);
    const restartPointer = Math.max(meta.contextStartIndex, meta.trainStartIndex - 1);
    const currentBalance = session.finalBalance ?? session.initialBalance;
    const restartBalance = session.isLiquidated || currentBalance <= 0 ? 10000 : currentBalance;

    await this.prisma.$transaction(async (tx) => {
      await tx.trainingAction.deleteMany({ where: { sessionId } });
      await tx.accountSnapshot.deleteMany({ where: { sessionId } });
      await tx.position.deleteMany({ where: { sessionId } });

      await tx.trainingSession.update({
        where: { id: sessionId },
        data: {
          pointer: restartPointer,
          initialBalance: restartBalance,
          finalBalance: restartBalance,
          resetCount: session.resetCount + 1,
          isLiquidated: false,
          status: 'ACTIVE',
          endedAt: null,
          completedAt: null,
          terminatedAt: null,
          liquidatedAt: null,
          lastActiveAt: new Date(),
        },
      });

      await tx.accountSnapshot.create({
        data: {
          sessionId,
          timePointer: restartPointer,
          balance: restartBalance,
          floatingPnl: 0,
          totalEquity: restartBalance,
        },
      });
    });

    return this.getById(userId, sessionId);
  }

  async history(userId: string, query: HistoryQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize ?? 10)));
    const skip = (page - 1) * pageSize;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const where: Prisma.TrainingSessionWhereInput = {
      userId,
      ...(query.market ? { market: query.market } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(typeof query.isLiquidated === 'boolean' ? { isLiquidated: query.isLiquidated } : {}),
      ...((from || to)
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(typeof query.hasReview === 'boolean'
        ? {
            review: query.hasReview ? { isNot: null } : { is: null },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.trainingSession.count({ where }),
      this.prisma.trainingSession.findMany({
        where,
        orderBy: [{ endedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          market: true,
          symbol: true,
          drivingTimeframe: true,
          totalBars: true,
          initialVisibleBars: true,
          initialBalance: true,
          finalBalance: true,
          isLiquidated: true,
          resetCount: true,
          status: true,
          pointer: true,
          viewTimeframe: true,
          createdAt: true,
          endedAt: true,
          review: { select: { id: true } },
        },
      }),
    ]);

    const pairs = Array.from(new Set(rows.map((s) => `${s.market}__${s.symbol}`)));
    const symbolDisplayMap = new Map<string, string>();
    if (pairs.length > 0) {
      const ors = rows.map((s) => ({ market: s.market as never, code: s.symbol }));
      const symbols = await this.prisma.symbol.findMany({
        where: { OR: ors },
        select: { market: true, code: true, displayName: true },
      });
      for (const sym of symbols) {
        if (sym.displayName) symbolDisplayMap.set(`${sym.market}__${sym.code}`, sym.displayName);
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: rows.map((s) => ({
        id: s.id,
        userId: s.userId,
        market: s.market,
        symbol: s.symbol,
        drivingTimeframe: s.drivingTimeframe,
        totalBars: s.totalBars,
        initialVisibleBars: s.initialVisibleBars,
        initialBalance: s.initialBalance,
        finalBalance: s.finalBalance,
        isLiquidated: s.isLiquidated,
        resetCount: s.resetCount,
        status: s.status,
        pointer: s.pointer,
        viewTimeframe: s.viewTimeframe,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
        hasReview: Boolean(s.review?.id),
        symbolDisplayName: symbolDisplayMap.get(`${s.market}__${s.symbol}`) ?? null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async resetAccountBalance(userId: string) {
    const latestSession = await this.prisma.trainingSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, initialVisibleBars: true, resetCount: true, barsData: true, drivingTimeframe: true, totalBars: true },
    });
    if (!latestSession) {
      return { accountBalance: 10000, liquidationCount: 0, totalResetCount: 0, needResetAfterLiquidation: false };
    }
    const meta = this.parseBarsPayload(latestSession.barsData, latestSession.drivingTimeframe, latestSession.totalBars);
    const restartPointer = Math.max(meta.contextStartIndex, meta.trainStartIndex - 1);
    const resetToBalance = 10000;
    await this.prisma.$transaction(async (tx) => {
      await tx.trainingAction.deleteMany({ where: { sessionId: latestSession.id } });
      await tx.accountSnapshot.deleteMany({ where: { sessionId: latestSession.id } });
      await tx.position.deleteMany({ where: { sessionId: latestSession.id } });

      await tx.trainingSession.update({
        where: { id: latestSession.id },
        data: {
          pointer: restartPointer,
          initialBalance: resetToBalance,
          finalBalance: resetToBalance,
          resetCount: latestSession.resetCount + 1,
          isLiquidated: false,
          status: 'ACTIVE',
          endedAt: null,
          completedAt: null,
          terminatedAt: null,
          liquidatedAt: null,
          lastActiveAt: new Date(),
        },
      });

      await tx.accountSnapshot.create({
        data: {
          sessionId: latestSession.id,
          timePointer: restartPointer,
          balance: resetToBalance,
          floatingPnl: 0,
          totalEquity: resetToBalance,
        },
      });
    });

    const session = await this.getById(userId, latestSession.id);
    const stats = await this.profileStats(userId);
    return { session, stats };
  }

  private async canUserTrain(userId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        isBanned: boolean | null;
        accessType: string | null;
        accessStatus: string | null;
        accessExpiresAt: Date | null;
        dailyTrainingLimit: number | null;
        isTrainingUnlimited: boolean | null;
      }>
    >`
      SELECT id, "isBanned", "accessType", "accessStatus", "accessExpiresAt", "dailyTrainingLimit", "isTrainingUnlimited"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) throw new NotFoundException('用户不存在');
    if (user.isBanned) throw new BadRequestException('账号已被禁用');
    if ((user.accessStatus ?? 'ACTIVE') === 'DISABLED') throw new BadRequestException('权限已被禁用');
    const accessType = (user.accessType ?? 'INTERNAL').toUpperCase();
    if (accessType !== 'INTERNAL') {
      if (!user.accessExpiresAt || user.accessExpiresAt.getTime() <= Date.now()) {
        await this.prisma.$executeRaw`
          UPDATE "User"
          SET "accessStatus" = CAST(${'EXPIRED'} AS "AccessStatus")
          WHERE id = ${userId}
        `;
        throw new BadRequestException(
          accessType === 'TRIAL'
            ? '试用期已结束。为保障服务器算力与整体服务稳定，请联系管理员升级正式版本后继续训练。'
            : '权限已过期，请续费后继续训练',
        );
      }
    }
    if (accessType === 'TRIAL' && !user.isTrainingUnlimited) {
      const todayUtc = new Date();
      todayUtc.setUTCHours(0, 0, 0, 0);
      const usageRows = await this.prisma.$queryRaw<Array<{ trainingCount: number | string }>>`
        SELECT "trainingCount"
        FROM "UserTrainingDailyUsage"
        WHERE "userId" = ${userId} AND "usageDate" = ${todayUtc}
        LIMIT 1
      `;
      const limit = Number(user.dailyTrainingLimit ?? 5);
      const used = Number(usageRows[0]?.trainingCount ?? 0);
      if (used >= limit) {
        throw new BadRequestException('今日试用训练次数已用完。为保障服务稳定与友好体验，请明日再试或联系管理员升级正式版本。');
      }
    }
  }

  private async increaseDailyTrainingUsage(userId: string) {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const id = `uuse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.$executeRaw`
      INSERT INTO "UserTrainingDailyUsage" (id, "userId", "usageDate", "trainingCount", "createdAt", "updatedAt")
      VALUES (${id}, ${userId}, ${todayUtc}, 1, ${new Date()}, ${new Date()})
      ON CONFLICT ("userId", "usageDate")
      DO UPDATE SET "trainingCount" = "UserTrainingDailyUsage"."trainingCount" + 1, "updatedAt" = ${new Date()}
    `;
  }

  async profileStats(userId: string) {
    const resetAggregate = await this.prisma.trainingSession.aggregate({
      where: { userId },
      _sum: { resetCount: true },
    });
    const liquidationCount = await this.prisma.trainingSession.count({
      where: { userId, isLiquidated: true },
    });
    const latestSession = await this.prisma.trainingSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { finalBalance: true, initialBalance: true, isLiquidated: true },
    });
    const accountBalance = latestSession ? (latestSession.finalBalance ?? latestSession.initialBalance) : 10000;
    const userRows = await this.prisma.$queryRaw<
      Array<{
        accessType: string | null;
        accessStatus: string | null;
        accessExpiresAt: Date | null;
        dailyTrainingLimit: number | null;
        isTrainingUnlimited: boolean | null;
        currentPlan: string | null;
      }>
    >`
      SELECT "accessType", "accessStatus", "accessExpiresAt", "dailyTrainingLimit", "isTrainingUnlimited", "currentPlan"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;
    const u = userRows[0];
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const usageRows = await this.prisma.$queryRaw<Array<{ trainingCount: number | string }>>`
      SELECT "trainingCount" FROM "UserTrainingDailyUsage"
      WHERE "userId" = ${userId} AND "usageDate" = ${todayUtc}
      LIMIT 1
    `;
    const usedToday = Number(usageRows[0]?.trainingCount ?? 0);
    const limit = u?.dailyTrainingLimit ?? null;
    return {
      liquidationCount,
      totalResetCount: resetAggregate._sum.resetCount ?? 0,
      accountBalance,
      needResetAfterLiquidation: Boolean(latestSession && (latestSession.isLiquidated || accountBalance <= 0)),
      access: {
        accessType: u?.accessType ?? 'INTERNAL',
        accessStatus: u?.accessStatus ?? 'ACTIVE',
        accessExpiresAt: u?.accessExpiresAt?.toISOString() ?? null,
        dailyTrainingLimit: limit,
        todayTrainingCount: usedToday,
        todayRemainingTrainingCount: limit == null ? null : Math.max(0, limit - usedToday),
        isTrainingUnlimited: Boolean(u?.isTrainingUnlimited ?? true),
        currentPlan: u?.currentPlan ?? 'NONE',
      },
    };
  }

  async dashboard(userId: string) {
    const [trainingCount, liquidationCount, latestSession, snapshots, leaderboard] = await Promise.all([
      this.prisma.trainingSession.count({
        where: { userId, status: { in: CLOSED_SESSION_STATUSES } },
      }),
      this.prisma.trainingSession.count({
        where: { userId, isLiquidated: true },
      }),
      this.prisma.trainingSession.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { finalBalance: true, initialBalance: true },
      }),
      this.prisma.accountSnapshot.findMany({
        where: { session: { userId } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, totalEquity: true },
        take: 1200,
      }),
      this.getLeaderboard(userId, 50),
    ]);

    const [closedTradeCount, winTradeCount] = await Promise.all([
      this.prisma.trainingAction.count({
        where: {
          session: { userId },
          actionType: { in: [ActionType.CLOSE, ActionType.PARTIAL_CLOSE, ActionType.FULL_CLOSE, ActionType.TP, ActionType.SL, ActionType.LIQUIDATED] },
          pnl: { not: null },
        },
      }),
      this.prisma.trainingAction.count({
        where: {
          session: { userId },
          actionType: { in: [ActionType.CLOSE, ActionType.PARTIAL_CLOSE, ActionType.FULL_CLOSE, ActionType.TP, ActionType.SL, ActionType.LIQUIDATED] },
          pnl: { gt: 0 },
        },
      }),
    ]);
    const winRate = closedTradeCount > 0 ? (winTradeCount / closedTradeCount) * 100 : 0;
    const accountScore = latestSession ? latestSession.finalBalance ?? latestSession.initialBalance : 10000;

    const sampledSnapshots = this.sampleEquityCurve(
      snapshots.map((s) => ({ time: s.createdAt.toISOString(), equity: s.totalEquity })),
      260,
    );

    return {
      summary: {
        trainingCount,
        winRate: Number(winRate.toFixed(2)),
        accountScore: Number((accountScore ?? 0).toFixed(2)),
        liquidationCount,
      },
      equityCurve: sampledSnapshots,
      leaderboard: {
        top10: leaderboard.items.map((row) => ({
          rank: row.rank,
          userId: row.userId,
          displayName: row.nickname,
          accountScore: row.points,
          trainingCount: row.trainingCount,
          winRate: row.winRate,
          liquidationCount: row.liquidationCount,
          isMe: row.isCurrentUser,
        })),
        me: leaderboard.myRank
          ? {
              rank: leaderboard.myRank.rank,
              userId: leaderboard.myRank.userId,
              displayName: leaderboard.myRank.nickname,
              accountScore: leaderboard.myRank.points,
              trainingCount: leaderboard.myRank.trainingCount,
              winRate: leaderboard.myRank.winRate,
              liquidationCount: leaderboard.myRank.liquidationCount,
              isMe: true,
            }
          : null,
      },
    };
  }

  async getLeaderboard(currentUserId: string, limit = 10) {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit || 10)));
    type RankedRow = {
      rank: number;
      userId: string;
      nickname: string | null;
      email: string;
      points: number;
      trainingCount: number;
      winRate: number;
      liquidationCount: number;
    };
    const rankedCte = Prisma.sql`
      WITH latest_session AS (
        SELECT DISTINCT ON ("userId")
          "userId",
          COALESCE("finalBalance", "initialBalance", 10000) AS points
        FROM "TrainingSession"
        ORDER BY "userId", "createdAt" DESC
      ),
      session_stats AS (
        SELECT
          ts."userId",
          COUNT(*) FILTER (WHERE ts."status" IN ('COMPLETED', 'TERMINATED', 'LIQUIDATED', 'ENDED'))::int AS "trainingCount",
          COUNT(*) FILTER (WHERE ts."isLiquidated" = true)::int AS "liquidationCount"
        FROM "TrainingSession" ts
        GROUP BY ts."userId"
      ),
      trade_stats AS (
        SELECT
          ts."userId",
          COUNT(*) FILTER (
            WHERE ta."actionType" IN ('CLOSE', 'PARTIAL_CLOSE', 'FULL_CLOSE', 'TP', 'SL', 'LIQUIDATED')
              AND ta."pnl" IS NOT NULL
          )::int AS "closedTradeCount",
          COUNT(*) FILTER (
            WHERE ta."actionType" IN ('CLOSE', 'PARTIAL_CLOSE', 'FULL_CLOSE', 'TP', 'SL', 'LIQUIDATED')
              AND ta."pnl" > 0
          )::int AS "winTradeCount"
        FROM "TrainingAction" ta
        INNER JOIN "TrainingSession" ts ON ts.id = ta."sessionId"
        GROUP BY ts."userId"
      ),
      ranked AS (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY COALESCE(ls.points, 10000) DESC, COALESCE(ss."trainingCount", 0) DESC, u."createdAt" ASC, u.id ASC
          )::int AS rank,
          u.id AS "userId",
          u.nickname,
          u.email,
          ROUND(COALESCE(ls.points, 10000)::numeric, 2)::float8 AS points,
          COALESCE(ss."trainingCount", 0)::int AS "trainingCount",
          CASE
            WHEN COALESCE(ts2."closedTradeCount", 0) = 0 THEN 0
            ELSE ROUND((ts2."winTradeCount"::numeric / ts2."closedTradeCount"::numeric) * 100, 2)::float8
          END AS "winRate",
          COALESCE(ss."liquidationCount", 0)::int AS "liquidationCount"
        FROM "User" u
        LEFT JOIN latest_session ls ON ls."userId" = u.id
        LEFT JOIN session_stats ss ON ss."userId" = u.id
        LEFT JOIN trade_stats ts2 ON ts2."userId" = u.id
      )
      SELECT rank, "userId", nickname, email, points, "trainingCount", "winRate", "liquidationCount"
      FROM ranked
    `;
    const [topRows, myRows] = await Promise.all([
      this.prisma.$queryRaw<RankedRow[]>(Prisma.sql`${rankedCte} ORDER BY rank ASC LIMIT ${safeLimit}`),
      this.prisma.$queryRaw<RankedRow[]>(Prisma.sql`${rankedCte} WHERE "userId" = ${currentUserId} LIMIT 1`),
    ]);

    const items = topRows.map((row) => ({
      rank: row.rank,
      userId: row.userId,
      nickname: this.displayName(row.nickname, row.email),
      points: row.points,
      trainingCount: row.trainingCount,
      winRate: row.winRate,
      liquidationCount: row.liquidationCount,
      isCurrentUser: row.userId === currentUserId,
    }));
    const me = myRows[0];
    return {
      items,
      myRank: me
        ? {
            rank: me.rank,
            userId: me.userId,
            nickname: this.displayName(me.nickname, me.email),
            points: me.points,
            trainingCount: me.trainingCount,
            winRate: me.winRate,
            liquidationCount: me.liquidationCount,
          }
        : null,
    };
  }

  async getById(userId: string, sessionId: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
      include: { position: true, actions: true, snapshots: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    const mapped = this.toClientSession(session);
    const symbolMeta = await this.prisma.symbol.findFirst({
      where: { market: session.market, code: session.symbol },
      select: { displayName: true },
    });
    return {
      ...mapped,
      symbolDisplayName: symbolMeta?.displayName ?? null,
    };
  }

  async getReviewDetail(userId: string, sessionId: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        actions: { orderBy: { createdAt: 'asc' } },
        snapshots: { orderBy: { timePointer: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const mapped = this.toClientSession(session);
    const symbolMeta = await this.prisma.symbol.findFirst({
      where: { market: session.market, code: session.symbol },
      select: { displayName: true },
    });
    const trades = this.buildTrades(session.actions);
    const stats = this.buildBehaviorStats(session, trades);
    let review: { id: string; content: string; problemTags: unknown; createdAt: Date; updatedAt: Date } | undefined;
    try {
      const reviewRows = await this.prisma.$queryRaw<Array<{ id: string; content: string; problemTags: unknown; createdAt: Date; updatedAt: Date }>>(
        Prisma.sql`SELECT "id","content","problemTags","createdAt","updatedAt" FROM "TrainingReview" WHERE "sessionId" = ${sessionId} LIMIT 1`,
      );
      review = reviewRows[0];
    } catch {
      review = undefined;
    }
    return {
      session: {
        ...mapped,
        symbolDisplayName: symbolMeta?.displayName ?? null,
      },
      actions: mapped.actions,
      snapshots: mapped.snapshots ?? [],
      trades,
      stats,
      review: review
        ? {
            id: review.id,
            content: review.content,
            problemTags: this.parseProblemTags(review.problemTags),
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          }
        : null,
    };
  }

  async saveReview(userId: string, sessionId: string, dto: SaveTrainingReviewDto) {
    await this.ensureOwnership(userId, sessionId);
    const content = this.sanitizeReviewContent(dto.content);
    const problemTags = this.normalizeProblemTags(dto.problemTags ?? []);
    let review:
      | {
          id: string;
          sessionId: string;
          userId: string;
          content: string;
          problemTags: unknown;
          createdAt: Date;
          updatedAt: Date;
        }
      | null = null;
    try {
      review = await this.prisma.trainingReview.upsert({
        where: { sessionId },
        update: {
          content,
          problemTags: problemTags as Prisma.InputJsonValue,
        },
        create: {
          sessionId,
          userId,
          content,
          problemTags: problemTags as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          sessionId: true,
          userId: true,
          content: true,
          problemTags: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (err: any) {
      // Table may not exist in environments that haven't applied the migration yet.
      if (err?.code === 'P2021') {
        throw new BadRequestException('复盘表未初始化，请先执行数据库同步');
      }
      throw err;
    }
    if (!review) throw new NotFoundException('Review not found');

    return {
      id: review.id,
      sessionId: review.sessionId,
      userId: review.userId,
      content: review.content,
      problemTags: this.parseProblemTags(review.problemTags),
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  async getBarsWindow(userId: string, sessionId: string, timeframe: string, from: string, to: string) {
    if (!REAL_MARKET_TIMEFRAME_SET.has(timeframe)) {
      throw new BadRequestException(`Unsupported timeframe: ${timeframe}`);
    }
    const session = await this.ensureOwnership(userId, sessionId);
    const meta = this.parseBarsPayload(session.barsData, session.drivingTimeframe, session.totalBars);
    const fromTs = Date.parse(from);
    const toTs = Date.parse(to);
    if (!Number.isFinite(fromTs) || !Number.isFinite(toTs) || fromTs >= toTs) {
      throw new BadRequestException('Invalid from/to range');
    }
    const currentTs = this.getBarTimestamp(meta.bars, session.pointer);
    const isLowerViewThanDriving = timeframeRank(timeframe) < timeframeRank(session.drivingTimeframe);
    // When driving timeframe is higher (e.g. D) and user views lower timeframe (e.g. 1H/15m),
    // expose the full child-window of current driving bar so clicking "next" visibly advances.
    const drivingBucketStart = getTimeframeBucketStart(currentTs, session.drivingTimeframe);
    const drivingBucketEnd = getNextBucketStart(drivingBucketStart, session.drivingTimeframe) - 1;
    const visibleCapTs = isLowerViewThanDriving ? drivingBucketEnd : currentTs;
    const safeTo = Math.min(toTs, visibleCapTs);
    if (safeTo <= fromTs) {
      return { timeframe, from, to, currentTimePointer: new Date(visibleCapTs).toISOString(), bars: [] };
    }
    const symbolId = await this.resolveSymbolId(session.market, session.symbol);
    const bars = await this.marketDataService.getBarsByTimeRangeForTraining({
      market: session.market as never,
      symbolId,
      timeframe,
      drivingTimeframe: session.drivingTimeframe,
      fromTs,
      toTs: safeTo,
      currentTimePointerTs: visibleCapTs,
    });
    if (bars.length === 0) {
      throw new NotFoundException(`No bars found for symbol=${session.symbol}, timeframe=${timeframe}`);
    }
    let mergedBars = bars;
    const isHigherViewThanDriving = timeframeRank(timeframe) > timeframeRank(session.drivingTimeframe);
    const targetVisibleBars = Math.max(1, Math.min(session.initialVisibleBars || 500, MAX_BARS_BY_TF[timeframe] ?? 1200));
    if (isHigherViewThanDriving && mergedBars.length < targetVisibleBars) {
      const firstTs = Date.parse(mergedBars[0]?.time ?? '');
      if (Number.isFinite(firstTs)) {
        const need = targetVisibleBars - mergedBars.length;
        const older = await this.marketDataService.getBarsBefore(
          session.market as never,
          symbolId,
          timeframe,
          firstTs - 1,
          need,
        );
        if (older.length > 0) {
          mergedBars = [...older, ...mergedBars];
        }
      }
    }

    const limited = this.limitBarsForTimeframe(timeframe, mergedBars);
    const earliestTs = this.getEarliestTimestamp(meta.bars);
    const returnedFirstTs = limited.length > 0 ? Date.parse(limited[0].time) : safeTo;
    const hasMoreOlder = Number.isFinite(returnedFirstTs) ? returnedFirstTs > earliestTs : false;
    return {
      timeframe,
      from: new Date(fromTs).toISOString(),
      to: new Date(safeTo).toISOString(),
      currentTimePointer: new Date(visibleCapTs).toISOString(),
      bars: limited,
      hasMoreOlder,
    };
  }

  private async handleAction(userId: string, sessionId: string, dto: TrainingActionDto) {
    const session = await this.ensureOwnership(userId, sessionId);
    if (session.status !== 'ACTIVE') throw new BadRequestException('Session ended');
    const meta = this.parseBarsPayload(session.barsData, session.drivingTimeframe, session.totalBars);
    const bars = meta.bars;
    ensureSeries(bars as never[], session.pointer);
    const close = bars[session.pointer].close;
    let balance = session.finalBalance ?? session.initialBalance;

    const position = await this.prisma.position.findUnique({ where: { sessionId } });

    const normalizedAction = this.normalizeIncomingAction(dto);
    if (normalizedAction === 'OPEN_LONG' || normalizedAction === 'OPEN_SHORT' || normalizedAction === 'ADD_LONG' || normalizedAction === 'ADD_SHORT') {
      const wantsLong = normalizedAction === 'OPEN_LONG' || normalizedAction === 'ADD_LONG';
      const side: PositionSideValue = wantsLong ? PositionSide.LONG : PositionSide.SHORT;
      const sideLabel = wantsLong ? 'LONG' : 'SHORT';
      const positionPct = this.normalizePercentRatio(dto.positionPercent);
      if (!positionPct) throw new BadRequestException('positionPercent required');

      if (!position) {
        if (normalizedAction === 'ADD_LONG' || normalizedAction === 'ADD_SHORT') throw new BadRequestException('No position');
        const amount = balance * positionPct;
        if (amount <= 0) throw new BadRequestException('可用资金不足');
        const openFee = amount * FEE_RATE;
        balance -= openFee;
        const entryPrice = applyExecutionPrice(close, side, 'OPEN');
        this.validateStopPrices(side, entryPrice, dto.stopLossPrice, dto.takeProfitPrice);
        await this.prisma.position.create({
          data: {
            sessionId,
            side,
            entryPrice,
            positionPercent: positionPct,
            positionAmount: amount,
            stopLossRatio: null,
            takeProfitRatio: null,
            stopLossPrice: dto.stopLossPrice ?? null,
            takeProfitPrice: dto.takeProfitPrice ?? null,
            feePaid: openFee,
            openedAtPointer: session.pointer,
          },
        });
        await this.recordAction(
          sessionId,
          side === PositionSide.LONG ? ActionType.OPEN_LONG : ActionType.OPEN_SHORT,
          session.pointer,
          entryPrice,
          positionPct,
          undefined,
          undefined,
          undefined,
          undefined,
          { direction: side, amount, fee: openFee, avgEntryPriceAfter: entryPrice, positionAmountAfter: amount },
        );
      } else {
        const existingSide = this.normalizePositionSide(position.side);
        if (existingSide !== side) throw new BadRequestException(`Cannot open opposite position while ${sideLabel === 'LONG' ? 'SHORT' : 'LONG'} position exists`);
        // Use current equity instead of cash-only balance to compute addable funds.
        // This avoids false "insufficient" when balance is mostly in position but equity has changed.
        const floatingAtCurrent = calcFloatingPnl(existingSide, position.entryPrice, close, position.positionAmount);
        const equityAtCurrent = balance + floatingAtCurrent;
        const availableBalance = Math.max(0, equityAtCurrent - position.positionAmount);
        const addAmount = availableBalance * positionPct;
        if (addAmount <= 0) throw new BadRequestException('可用资金不足，无法继续加仓');
        const addFee = addAmount * FEE_RATE;
        balance -= addFee;
        const addPrice = applyExecutionPrice(close, side, 'OPEN');
        const nextAmount = position.positionAmount + addAmount;
        const nextEntryPrice = (position.entryPrice * position.positionAmount + addPrice * addAmount) / nextAmount;
        const nextPositionPercent = Math.min(1, Math.max(0, nextAmount / Math.max(balance, 0.000001)));
        const nextStopLossPrice = dto.stopLossPrice ?? position.stopLossPrice ?? null;
        const nextTakeProfitPrice = dto.takeProfitPrice ?? position.takeProfitPrice ?? null;
        this.validateStopPrices(side, nextEntryPrice, nextStopLossPrice ?? undefined, nextTakeProfitPrice ?? undefined);
        await this.prisma.position.update({
          where: { sessionId },
          data: {
            entryPrice: nextEntryPrice,
            positionAmount: nextAmount,
            positionPercent: nextPositionPercent,
            stopLossRatio: null,
            takeProfitRatio: null,
            stopLossPrice: nextStopLossPrice,
            takeProfitPrice: nextTakeProfitPrice,
            feePaid: (position.feePaid ?? 0) + addFee,
          },
        });
        await this.recordAction(
          sessionId,
          side === PositionSide.LONG ? ActionType.ADD_LONG : ActionType.ADD_SHORT,
          session.pointer,
          addPrice,
          positionPct,
          undefined,
          undefined,
          undefined,
          undefined,
          { direction: side, amount: addAmount, fee: addFee, avgEntryPriceAfter: nextEntryPrice, positionAmountAfter: nextAmount },
        );
      }
    } else if (normalizedAction === 'PARTIAL_CLOSE' || normalizedAction === 'FULL_CLOSE') {
      if (!position) throw new BadRequestException('No position');
      const side = this.normalizePositionSide(position.side);
      const closePrice = applyExecutionPrice(close, side, 'CLOSE');
      const closePercentRaw = normalizedAction === 'FULL_CLOSE' ? 100 : dto.closePercent ?? 100;
      const closePercentRatio = this.normalizePercentRatio(closePercentRaw);
      if (!closePercentRatio) throw new BadRequestException('closePercent required');
      balance = await this.closePosition(sessionId, position, session.pointer, closePrice, balance, CloseReason.USER, closePercentRatio);
    } else if (normalizedAction === 'HOLD' && position) {
      if (dto.stopLossPrice !== undefined || dto.takeProfitPrice !== undefined) {
        const side = this.normalizePositionSide(position.side);
        const nextStopLossPrice = dto.stopLossPrice ?? position.stopLossPrice ?? null;
        const nextTakeProfitPrice = dto.takeProfitPrice ?? position.takeProfitPrice ?? null;
        this.validateStopPrices(side, position.entryPrice, nextStopLossPrice ?? undefined, nextTakeProfitPrice ?? undefined);
        await this.prisma.position.update({
          where: { sessionId },
          data: {
            stopLossRatio: null,
            takeProfitRatio: null,
            stopLossPrice: nextStopLossPrice,
            takeProfitPrice: nextTakeProfitPrice,
          },
        });
      }
    }

    const nextPointer = session.pointer + 1;
    const hasNextInTrain = nextPointer <= meta.trainEndIndex;
    const activePositionAfterAction = await this.prisma.position.findUnique({ where: { sessionId } });
    if (!hasNextInTrain) {
      if (activePositionAfterAction) {
        const side = this.normalizePositionSide(activePositionAfterAction.side);
        const closePrice = applyExecutionPrice(close, side, 'CLOSE');
        balance = await this.closePosition(sessionId, activePositionAfterAction, session.pointer, closePrice, balance, CloseReason.END_OF_DATA);
      }
      await this.finalizeSession(sessionId, session.pointer, balance, 'completed');
      return this.getById(userId, sessionId);
    }

    const nextBar = bars[nextPointer];
    const nextClose = nextBar.close;
    let floatingPnl = 0;
    let liquidated = false;
    let liquidationActionRecorded = false;
    const activePosition = activePositionAfterAction;
    if (activePosition) {
      const activeSide = this.normalizePositionSide(activePosition.side);
      floatingPnl = calcFloatingPnl(activeSide, activePosition.entryPrice, nextClose, activePosition.positionAmount);
      const sl = activePosition.stopLossPrice;
      const tp = activePosition.takeProfitPrice;
      const hitSL = sl ? (activeSide === PositionSide.LONG ? nextBar.low <= sl : nextBar.high >= sl) : false;
      const hitTP = tp ? (activeSide === PositionSide.LONG ? nextBar.high >= tp : nextBar.low <= tp) : false;
      if (hitSL || hitTP) {
        const closeReason = hitSL && hitTP ? CloseReason.STOP_LOSS : hitTP ? CloseReason.TAKE_PROFIT : CloseReason.STOP_LOSS;
        const triggerPrice = closeReason === CloseReason.TAKE_PROFIT ? tp ?? nextClose : sl ?? nextClose;
        const closePrice = applyExecutionPrice(triggerPrice, activeSide, 'CLOSE');
        balance = await this.closePosition(sessionId, activePosition, nextPointer, closePrice, balance, closeReason);
        floatingPnl = 0;
      } else {
        const equity = balance + floatingPnl;
        if (equity <= 0) {
          const closePrice = applyExecutionPrice(nextClose, activeSide, 'CLOSE');
          balance = await this.closePosition(sessionId, activePosition, nextPointer, closePrice, balance, CloseReason.LIQUIDATED);
          floatingPnl = 0;
          liquidated = true;
          liquidationActionRecorded = true;
        }
      }
    }

    liquidated = liquidated || balance <= 0;
    if (liquidated && !liquidationActionRecorded) {
      await this.recordAction(sessionId, ActionType.LIQUIDATED, nextPointer, nextClose, undefined, undefined, undefined, 0, CloseReason.LIQUIDATED);
    }
    if (liquidated) {
      await this.finalizeSession(sessionId, nextPointer, balance, 'liquidated');
      return this.getById(userId, sessionId);
    }
    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        pointer: nextPointer,
        finalBalance: balance,
        isLiquidated: false,
        status: 'ACTIVE',
        endedAt: null,
        lastActiveAt: new Date(),
      },
    });
    await this.snapshot(sessionId, nextPointer, balance, floatingPnl);
    return this.getById(userId, sessionId);
  }

  private async closePosition(
    sessionId: string,
    position: { side: string; entryPrice: number; positionAmount: number; positionPercent: number; stopLossPrice?: number | null; takeProfitPrice?: number | null },
    timePointer: number,
    price: number,
    balance: number,
    reason: CloseReasonValue,
    closePercent = 1,
  ) {
    const side = this.normalizePositionSide(position.side);
    const safeClosePercent = Math.max(0.0001, Math.min(1, closePercent));
    const closingAmount = position.positionAmount * safeClosePercent;
    const remainingAmount = Math.max(0, position.positionAmount - closingAmount);
    const pnl = calcFloatingPnl(side, position.entryPrice, price, closingAmount);
    const closeFee = closingAmount * FEE_RATE;
    const nextBalance = balance + pnl - closeFee;
    const actionType =
      reason === CloseReason.TAKE_PROFIT
        ? ActionType.TP
        : reason === CloseReason.STOP_LOSS
          ? ActionType.SL
          : reason === CloseReason.LIQUIDATED
            ? ActionType.LIQUIDATED
            : safeClosePercent >= 0.9999
              ? ActionType.FULL_CLOSE
              : ActionType.PARTIAL_CLOSE;
    await this.recordAction(sessionId, actionType, timePointer, price, safeClosePercent, undefined, undefined, pnl - closeFee, reason, {
      direction: side,
      amount: closingAmount,
      closePercent: safeClosePercent,
      realizedPnl: pnl - closeFee,
      fee: closeFee,
      avgEntryPriceAfter: position.entryPrice,
      positionAmountAfter: remainingAmount,
    });
    if (remainingAmount <= 0.000001 || reason !== CloseReason.USER || safeClosePercent >= 0.9999) {
      await this.prisma.position.delete({ where: { sessionId } });
    } else {
      const remainingPercent = Math.max(0, position.positionPercent * (1 - safeClosePercent));
      await this.prisma.position.update({
        where: { sessionId },
        data: {
          positionAmount: remainingAmount,
          positionPercent: remainingPercent,
          stopLossPrice: position.stopLossPrice ?? null,
          takeProfitPrice: position.takeProfitPrice ?? null,
        },
      });
    }
    return nextBalance;
  }

  private normalizeIncomingAction(dto: TrainingActionDto):
    | 'OPEN_LONG'
    | 'OPEN_SHORT'
    | 'ADD_LONG'
    | 'ADD_SHORT'
    | 'PARTIAL_CLOSE'
    | 'FULL_CLOSE'
    | 'HOLD' {
    if (dto.actionType) return dto.actionType;
    if (dto.action === 'BUY_LONG') return 'OPEN_LONG';
    if (dto.action === 'BUY_SHORT') return 'OPEN_SHORT';
    if (dto.action === 'CLOSE') return 'FULL_CLOSE';
    return 'HOLD';
  }

  private normalizePercentRatio(value?: number | null) {
    if (value == null || !Number.isFinite(value)) return null;
    if (value <= 0 || value > 100) return null;
    if (value > 1) return value / 100;
    return value;
  }

  private async ensureOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.trainingSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async finalizeSession(sessionId: string, pointer: number, finalBalance: number, reason: FinalReason) {
    const status = reason === 'completed' ? 'COMPLETED' : reason === 'terminated' ? 'TERMINATED' : 'LIQUIDATED';
    const now = new Date();
    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        pointer,
        finalBalance,
        endedAt: now,
        status,
        isLiquidated: reason === 'liquidated',
        completedAt: reason === 'completed' ? now : null,
        terminatedAt: reason === 'terminated' ? now : null,
        liquidatedAt: reason === 'liquidated' ? now : null,
        lastActiveAt: now,
      },
    });
    await this.snapshot(sessionId, pointer, finalBalance, 0);
  }

  private async resolveSymbolId(market: string, code: string): Promise<string> {
    const row = await this.prisma.symbol.findFirst({
      where: { market: market as never, code },
      select: { id: true },
    });
    if (!row) throw new NotFoundException(`Symbol not found for market=${market}, code=${code}`);
    return row.id;
  }

  private async snapshot(sessionId: string, pointer: number, balance: number, floatingPnl: number) {
    await this.prisma.accountSnapshot.create({
      data: { sessionId, timePointer: pointer, balance, floatingPnl, totalEquity: balance + floatingPnl },
    });
  }

  private async recordAction(
    sessionId: string,
    actionType: ActionTypeValue,
    timePointer: number,
    price: number,
    positionPercent?: number,
    stopLossRatio?: number,
    takeProfitRatio?: number,
    pnl?: number,
    reason?: CloseReasonValue,
    detail?: {
      direction?: PositionSideValue;
      amount?: number;
      closePercent?: number;
      avgEntryPriceAfter?: number;
      positionAmountAfter?: number;
      realizedPnl?: number;
      fee?: number;
    },
  ) {
    await this.prisma.trainingAction.create({
      data: {
        sessionId,
        actionType,
        timePointer,
        price,
        positionPercent,
        closePercent: detail?.closePercent,
        stopLossRatio,
        takeProfitRatio,
        pnl,
        realizedPnl: detail?.realizedPnl,
        fee: detail?.fee,
        reason,
        direction: detail?.direction,
        amount: detail?.amount,
        avgEntryPriceAfter: detail?.avgEntryPriceAfter,
        positionAmountAfter: detail?.positionAmountAfter,
      },
    });
  }

  private parseBarsPayload(raw: unknown, drivingTimeframe: string, totalBars: number): BarsPayload {
    let parsed: unknown;
    if (typeof raw === 'string') parsed = JSON.parse(raw);
    else parsed = raw;

    if (Array.isArray(parsed)) {
      const bars = parsed as Bar[];
      const trainStartIndex = 0;
      const trainEndIndex = Math.max(0, Math.min(bars.length - 1, totalBars - 1));
      return {
        version: 2,
        drivingTimeframe,
        bars,
        contextStartIndex: 0,
        trainStartIndex,
        trainEndIndex,
      };
    }

    const data = parsed as Partial<BarsPayload>;
    if (!data || !Array.isArray(data.bars)) throw new BadRequestException('Invalid barsData');
    return {
      version: 2,
      drivingTimeframe: data.drivingTimeframe || drivingTimeframe,
      bars: data.bars,
      contextStartIndex: Math.max(0, Number(data.contextStartIndex ?? 0)),
      trainStartIndex: Math.max(0, Number(data.trainStartIndex ?? 0)),
      trainEndIndex: Math.max(0, Number(data.trainEndIndex ?? data.bars.length - 1)),
    };
  }

  private toClientSession(
    session: {
      id: string;
      userId: string;
      market: string;
      symbol: string;
      drivingTimeframe: string;
      totalBars: number;
      initialVisibleBars: number;
      initialBalance: number;
      finalBalance: number | null;
      isLiquidated: boolean;
      resetCount: number;
      status: string;
      pointer: number;
      viewTimeframe: string;
      barsData: unknown;
      createdAt: Date;
      endedAt: Date | null;
      position?: unknown;
      actions?: Array<Record<string, unknown>>;
      snapshots?: Array<Record<string, unknown>>;
    },
  ) {
    const meta = this.parseBarsPayload(session.barsData, session.drivingTimeframe, session.totalBars);
    const pointerAbs = Math.max(meta.contextStartIndex, Math.min(session.pointer, meta.bars.length - 1));
    const visibleBars = meta.bars.slice(meta.contextStartIndex, pointerAbs + 1);
    const pointerVisible = Math.max(0, visibleBars.length - 1);
    const progressPointer = Math.max(0, pointerAbs - meta.trainStartIndex + 1);
    const currentTimePointerRaw = this.getBarTimestamp(meta.bars, pointerAbs);
    const currentBucketStart = getTimeframeBucketStart(currentTimePointerRaw, session.drivingTimeframe);
    const currentTimePointer = getNextBucketStart(currentBucketStart, session.drivingTimeframe) - 1;

    const mappedActions = Array.isArray(session.actions)
      ? session.actions.map((a) => ({ ...a, timePointer: Math.max(0, Number(a.timePointer ?? 0) - meta.contextStartIndex) }))
      : [];
    const mappedSnapshots = Array.isArray(session.snapshots)
      ? session.snapshots.map((s) => ({ ...s, timePointer: Math.max(0, Number(s.timePointer ?? 0) - meta.contextStartIndex) }))
      : [];

    return {
      ...session,
      pointer: pointerVisible,
      trainPointer: progressPointer,
      contextStartTime: meta.bars[meta.contextStartIndex]?.time ?? null,
      trainStartTime: meta.bars[meta.trainStartIndex]?.time ?? null,
      trainEndTime: meta.bars[Math.min(meta.trainEndIndex, meta.bars.length - 1)]?.time ?? null,
      currentTimePointer: new Date(currentTimePointer).toISOString(),
      barsData: visibleBars,
      actions: mappedActions,
      snapshots: mappedSnapshots,
    };
  }

  private getBarTimestamp(bars: Bar[], index: number) {
    const ts = Date.parse(bars[Math.max(0, Math.min(index, bars.length - 1))]?.time ?? '');
    if (!Number.isFinite(ts)) throw new BadRequestException('Invalid barsData');
    return ts;
  }

  private limitBarsForTimeframe(timeframe: string, bars: Bar[]) {
    const max = MAX_BARS_BY_TF[timeframe] ?? 1200;
    if (bars.length <= max) return bars;
    return bars.slice(bars.length - max);
  }

  private getEarliestTimestamp(bars: Bar[]) {
    for (const row of bars) {
      const ts = Date.parse(row.time);
      if (Number.isFinite(ts)) return ts;
    }
    return Date.now();
  }

  private normalizePositionSide(side: string): PositionSideValue {
    if (side === PositionSide.LONG || side === PositionSide.SHORT) return side;
    throw new BadRequestException('Invalid position side');
  }

  private validateStopPrices(side: PositionSideValue, entryPrice: number, stopLossPrice?: number, takeProfitPrice?: number) {
    if (stopLossPrice === undefined && takeProfitPrice === undefined) return;
    if (stopLossPrice !== undefined) {
      if (side === PositionSide.LONG && stopLossPrice >= entryPrice) {
        throw new BadRequestException('Long position stop loss must be lower than entry price');
      }
      if (side === PositionSide.SHORT && stopLossPrice <= entryPrice) {
        throw new BadRequestException('Short position stop loss must be higher than entry price');
      }
    }
    if (takeProfitPrice !== undefined) {
      if (side === PositionSide.LONG && takeProfitPrice <= entryPrice) {
        throw new BadRequestException('Long position take profit must be higher than entry price');
      }
      if (side === PositionSide.SHORT && takeProfitPrice >= entryPrice) {
        throw new BadRequestException('Short position take profit must be lower than entry price');
      }
    }
  }

  private sampleEquityCurve(rows: Array<{ time: string; equity: number }>, maxPoints: number) {
    if (rows.length <= maxPoints) return rows;
    const step = Math.ceil(rows.length / maxPoints);
    const sampled: Array<{ time: string; equity: number }> = [];
    for (let i = 0; i < rows.length; i += step) {
      sampled.push(rows[i]);
    }
    if (sampled[sampled.length - 1]?.time !== rows[rows.length - 1]?.time) sampled.push(rows[rows.length - 1]);
    return sampled;
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 2) return `${name[0] ?? '*'}*@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  }

  private displayName(nickname: string | null | undefined, email: string) {
    const trimmed = (nickname ?? '').trim();
    if (trimmed) return trimmed;
    const [name] = email.split('@');
    return name || this.maskEmail(email);
  }

  private sanitizeReviewContent(content: string) {
    const normalized = (content ?? '').trim().slice(0, 5000);
    return normalized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizeProblemTags(tags: string[]) {
    const cleaned = tags
      .map((t) => (t ?? '').trim())
      .filter(Boolean)
      .slice(0, 20);
    return Array.from(new Set(cleaned));
  }

  private stringifyProblemTags(tags: string[]) {
    return JSON.stringify(tags);
  }

  private parseProblemTags(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private buildTrades(actions: Array<{ id: string; actionType: string; timePointer: number; price: number; positionPercent: number | null; pnl: number | null; reason: string | null; createdAt: Date }>) {
    type OpenLeg = {
      id: string;
      direction: 'LONG' | 'SHORT';
      avgOpenPrice: number;
      positionAmountRatio: number;
      openPointer: number;
      openAt: string;
    };
    const result: Array<{
      id: string;
      direction: 'LONG' | 'SHORT';
      openPrice: number;
      closePrice: number | null;
      openPointer: number;
      closePointer: number | null;
      positionPercent: number | null;
      pnl: number | null;
      closeReason: string | null;
      openedAt: string;
      closedAt: string | null;
    }> = [];

    let current: OpenLeg | null = null;
    for (const action of actions) {
      if (
        action.actionType === ActionType.OPEN_LONG ||
        action.actionType === ActionType.OPEN_SHORT ||
        action.actionType === ActionType.ADD_LONG ||
        action.actionType === ActionType.ADD_SHORT
      ) {
        const ratio = Math.max(0.0001, Math.min(1, action.positionPercent ?? 0.1));
        const isLong = action.actionType === ActionType.OPEN_LONG || action.actionType === ActionType.ADD_LONG;
        if (current && current.direction === (isLong ? PositionSide.LONG : PositionSide.SHORT)) {
          const prevLeg: OpenLeg = current;
          const nextTotal: number = prevLeg.positionAmountRatio + ratio;
          current = {
            id: prevLeg.id,
            direction: prevLeg.direction,
            openPointer: prevLeg.openPointer,
            openAt: prevLeg.openAt,
            avgOpenPrice: (prevLeg.avgOpenPrice * prevLeg.positionAmountRatio + action.price * ratio) / nextTotal,
            positionAmountRatio: nextTotal,
          };
          continue;
        }
        current = {
          id: action.id,
          direction: isLong ? PositionSide.LONG : PositionSide.SHORT,
          avgOpenPrice: action.price,
          positionAmountRatio: ratio,
          openPointer: action.timePointer,
          openAt: action.createdAt.toISOString(),
        };
        continue;
      }
      if (!current) continue;
      if (
        action.actionType === ActionType.CLOSE ||
        action.actionType === ActionType.PARTIAL_CLOSE ||
        action.actionType === ActionType.FULL_CLOSE ||
        action.actionType === ActionType.TP ||
        action.actionType === ActionType.SL ||
        action.actionType === ActionType.LIQUIDATED
      ) {
        const closeRatio = Math.max(0.0001, Math.min(1, action.positionPercent ?? 1));
        result.push({
          id: `${current.id}:${action.id}`,
          direction: current.direction,
          openPrice: current.avgOpenPrice,
          closePrice: action.price,
          openPointer: current.openPointer,
          closePointer: action.timePointer,
          positionPercent: closeRatio,
          pnl: action.pnl ?? null,
          closeReason: action.reason ?? action.actionType,
          openedAt: current.openAt,
          closedAt: action.createdAt.toISOString(),
        });
        const isForcedClose =
          action.actionType === ActionType.TP ||
          action.actionType === ActionType.SL ||
          action.actionType === ActionType.LIQUIDATED;
        const remaining = Math.max(0, current.positionAmountRatio * (1 - closeRatio));
        if (isForcedClose || remaining <= 0.000001) current = null;
        else current = { ...current, positionAmountRatio: remaining };
      }
    }

    if (current) {
      result.push({
        id: `${current.id}:open`,
        direction: current.direction,
        openPrice: current.avgOpenPrice,
        closePrice: null,
        openPointer: current.openPointer,
        closePointer: null,
        positionPercent: current.positionAmountRatio,
        pnl: null,
        closeReason: null,
        openedAt: current.openAt,
        closedAt: null,
      });
    }

    return result;
  }

  private buildBehaviorStats(
    session: { actions: Array<{ actionType: string; positionPercent: number | null; stopLossRatio: number | null; stopLossPrice?: number | null }>; snapshots: Array<{ totalEquity: number }> },
    trades: Array<{ pnl: number | null; positionPercent: number | null; closeReason: string | null }>,
  ) {
    const closedTrades = trades.filter((t) => t.pnl !== null);
    const winTrades = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const lossTrades = closedTrades.filter((t) => (t.pnl ?? 0) < 0);
    const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0;
    const avgPosition =
      trades.length > 0
        ? trades.reduce((sum, t) => sum + (t.positionPercent ?? 0), 0) / trades.length
        : 0;

    let peak = Number.NEGATIVE_INFINITY;
    let maxDrawdown = 0;
    for (const s of session.snapshots) {
      peak = Math.max(peak, s.totalEquity);
      if (peak > 0) {
        const dd = (peak - s.totalEquity) / peak;
        maxDrawdown = Math.max(maxDrawdown, dd);
      }
    }

    const openActions = session.actions.filter((a) => a.actionType === ActionType.OPEN_LONG || a.actionType === ActionType.OPEN_SHORT);
    const noStopLossCount = openActions.filter((a) => !a.stopLossRatio && !a.stopLossPrice).length;
    const highPositionCount = trades.filter((t) => (t.positionPercent ?? 0) >= 0.5).length;

    return {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winTrades: winTrades.length,
      lossTrades: lossTrades.length,
      winRate: Number(winRate.toFixed(2)),
      averagePositionPercent: Number(avgPosition.toFixed(4)),
      maxDrawdown: Number((maxDrawdown * 100).toFixed(2)),
      noStopLossCount,
      highPositionCount,
    };
  }
}
