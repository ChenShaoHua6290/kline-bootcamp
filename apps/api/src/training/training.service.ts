import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActionType, CloseReason, PositionSide } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { StartTrainingDto, TrainingActionDto } from './dto';
import { buildStopPrices, calcFloatingPnl, ensureSeries, FEE_RATE } from './training.engine';

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService, private readonly marketDataService: MarketDataService) {}

  async start(userId: string, dto: StartTrainingDto) {
    if (dto.initialVisibleBars > dto.totalBars) throw new BadRequestException('initialVisibleBars must be <= totalBars');
    const { symbol, bars } = await this.marketDataService.pickRandomSeries(dto.market, dto.drivingTimeframe, dto.totalBars);

    const session = await this.prisma.trainingSession.create({
      data: {
        userId,
        market: dto.market,
        symbol,
        drivingTimeframe: dto.drivingTimeframe,
        totalBars: dto.totalBars,
        initialVisibleBars: dto.initialVisibleBars,
        initialBalance: 10000,
        finalBalance: 10000,
        pointer: dto.initialVisibleBars - 1,
        viewTimeframe: dto.drivingTimeframe,
        barsData: bars,
      },
    });

    await this.snapshot(session.id, session.pointer, 10000, 0);
    return this.getById(userId, session.id);
  }

  async next(userId: string, sessionId: string) {
    return this.handleAction(userId, sessionId, { action: 'HOLD' });
  }

  async action(userId: string, sessionId: string, dto: TrainingActionDto) {
    return this.handleAction(userId, sessionId, dto);
  }

  async end(userId: string, sessionId: string) {
    const session = await this.ensureOwnership(userId, sessionId);
    await this.prisma.trainingSession.update({ where: { id: sessionId }, data: { status: 'ENDED', endedAt: new Date() } });
    return this.getById(userId, sessionId);
  }

  async resetBalance(userId: string, sessionId: string) {
    const session = await this.ensureOwnership(userId, sessionId);
    const updated = await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: { finalBalance: 10000, resetCount: session.resetCount + 1, isLiquidated: false, status: 'ACTIVE' },
    });
    await this.snapshot(sessionId, updated.pointer, 10000, 0);
    return this.getById(userId, sessionId);
  }

  async history(userId: string) {
    return this.prisma.trainingSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  async getById(userId: string, sessionId: string) {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
      include: { position: true, actions: true, snapshots: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async handleAction(userId: string, sessionId: string, dto: TrainingActionDto) {
    const session = await this.ensureOwnership(userId, sessionId);
    if (session.status !== 'ACTIVE') throw new BadRequestException('Session ended');
    const bars = session.barsData as unknown as Array<{ close: number }>;
    ensureSeries(bars as never[], session.pointer);
    const close = bars[session.pointer].close;
    let balance = session.finalBalance ?? session.initialBalance;

    const position = await this.prisma.position.findUnique({ where: { sessionId } });

    if (dto.action === 'BUY_LONG' || dto.action === 'BUY_SHORT') {
      if (position) throw new BadRequestException('Position already exists');
      if (!dto.positionPercent) throw new BadRequestException('positionPercent required');
      const amount = balance * dto.positionPercent;
      const openFee = amount * FEE_RATE;
      balance -= openFee;
      const side: PositionSide = dto.action === 'BUY_LONG' ? 'LONG' : 'SHORT';
      const stops = buildStopPrices(side, close, dto.stopLossRatio, dto.takeProfitRatio);
      await this.prisma.position.create({
        data: {
          sessionId,
          side,
          entryPrice: close,
          positionPercent: dto.positionPercent,
          positionAmount: amount,
          stopLossRatio: dto.stopLossRatio,
          takeProfitRatio: dto.takeProfitRatio,
          stopLossPrice: stops.stopLossPrice,
          takeProfitPrice: stops.takeProfitPrice,
          feePaid: openFee,
          openedAtPointer: session.pointer,
        },
      });
      await this.recordAction(sessionId, side === 'LONG' ? ActionType.OPEN_LONG : ActionType.OPEN_SHORT, session.pointer, close, dto.positionPercent, dto.stopLossRatio, dto.takeProfitRatio);
    } else if (dto.action === 'CLOSE') {
      if (!position) throw new BadRequestException('No position');
      balance = await this.closePosition(sessionId, position, close, balance, CloseReason.USER);
    }

    // every action advances one bar for MVP
    const nextPointer = session.pointer + 1;
    const hasNext = nextPointer < session.totalBars;
    if (!hasNext) {
      if (position) {
        balance = await this.closePosition(sessionId, position, close, balance, CloseReason.END_OF_DATA);
      }
      await this.prisma.trainingSession.update({ where: { id: sessionId }, data: { pointer: session.pointer, finalBalance: balance, status: 'ENDED', endedAt: new Date() } });
      return this.getById(userId, sessionId);
    }

    const nextClose = bars[nextPointer].close;
    let floatingPnl = 0;
    const activePosition = await this.prisma.position.findUnique({ where: { sessionId } });
    if (activePosition) {
      floatingPnl = calcFloatingPnl(activePosition.side, activePosition.entryPrice, nextClose, activePosition.positionAmount);
      const sl = activePosition.stopLossPrice;
      const tp = activePosition.takeProfitPrice;
      const hitSL = sl ? (activePosition.side === 'LONG' ? nextClose <= sl : nextClose >= sl) : false;
      const hitTP = tp ? (activePosition.side === 'LONG' ? nextClose >= tp : nextClose <= tp) : false;
      if (hitSL || hitTP) {
        balance = await this.closePosition(
          sessionId,
          activePosition,
          nextClose,
          balance,
          hitTP ? CloseReason.TAKE_PROFIT : CloseReason.STOP_LOSS,
        );
        floatingPnl = 0;
      }
    }

    const liquidated = balance <= 0;
    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        pointer: nextPointer,
        finalBalance: balance,
        isLiquidated: liquidated,
        status: liquidated ? 'LIQUIDATED' : 'ACTIVE',
        endedAt: liquidated ? new Date() : null,
      },
    });
    if (liquidated) {
      await this.recordAction(sessionId, ActionType.LIQUIDATED, nextPointer, nextClose, undefined, undefined, undefined, 0, CloseReason.LIQUIDATED);
    }
    await this.snapshot(sessionId, nextPointer, balance, floatingPnl);
    return this.getById(userId, sessionId);
  }

  private async closePosition(sessionId: string, position: { side: PositionSide; entryPrice: number; positionAmount: number; positionPercent: number }, price: number, balance: number, reason: CloseReason) {
    const pnl = calcFloatingPnl(position.side, position.entryPrice, price, position.positionAmount);
    const closeFee = position.positionAmount * FEE_RATE;
    const nextBalance = balance + pnl - closeFee;
    const actionType = reason === CloseReason.TAKE_PROFIT ? ActionType.TP : reason === CloseReason.STOP_LOSS ? ActionType.SL : ActionType.CLOSE;
    await this.recordAction(sessionId, actionType, 0, price, position.positionPercent, undefined, undefined, pnl - closeFee, reason);
    await this.prisma.position.delete({ where: { sessionId } });
    return nextBalance;
  }

  private async ensureOwnership(userId: string, sessionId: string) {
    const session = await this.prisma.trainingSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async snapshot(sessionId: string, pointer: number, balance: number, floatingPnl: number) {
    await this.prisma.accountSnapshot.create({
      data: { sessionId, timePointer: pointer, balance, floatingPnl, totalEquity: balance + floatingPnl },
    });
  }

  private async recordAction(
    sessionId: string,
    actionType: ActionType,
    timePointer: number,
    price: number,
    positionPercent?: number,
    stopLossRatio?: number,
    takeProfitRatio?: number,
    pnl?: number,
    reason?: CloseReason,
  ) {
    await this.prisma.trainingAction.create({
      data: { sessionId, actionType, timePointer, price, positionPercent, stopLossRatio, takeProfitRatio, pnl, reason },
    });
  }
}
