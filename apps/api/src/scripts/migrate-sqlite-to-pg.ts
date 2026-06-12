import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';

type Row = Record<string, unknown>;

const BATCH_SIZE = Number(process.env.SQLITE_BATCH_SIZE ?? 200);

function sqlite(dbPath: string, sql: string): Row[] {
  const out = execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf-8',
    maxBuffer: 128 * 1024 * 1024,
  }).trim();
  if (!out) return [];
  return JSON.parse(out) as Row[];
}

function asDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

function asNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function locateSqlitePath() {
  const p =
    process.env.SQLITE_MIGRATE_PATH ||
    [path.resolve(process.cwd(), 'prisma/dev.db'), path.resolve(process.cwd(), 'apps/api/prisma/dev.db')].find((x) => fs.existsSync(x));
  if (!p) throw new Error('Cannot locate sqlite dev.db. Set SQLITE_MIGRATE_PATH explicitly.');
  return p;
}

async function migrateTable(
  pg: PrismaClient,
  dbPath: string,
  name: string,
  readSqlBase: string,
  writer: (row: Row) => Promise<void>,
) {
  const total = Number(sqlite(dbPath, `SELECT COUNT(*) AS c FROM (${readSqlBase}) t;`)[0]?.c ?? 0);
  console.log(`[migrate:${name}] total=${total}`);
  let done = 0;
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const rows = sqlite(dbPath, `${readSqlBase} LIMIT ${BATCH_SIZE} OFFSET ${offset};`);
    for (const row of rows) await writer(row);
    done += rows.length;
    console.log(`[migrate:${name}] ${done}/${total}`);
  }
}

async function main() {
  const sqlitePath = locateSqlitePath();
  const pg = new PrismaClient();
  const start = Date.now();
  console.log(`[migrate] sqlite path: ${sqlitePath}`);
  console.log(`[migrate] batch size: ${BATCH_SIZE}`);

  try {
    await migrateTable(pg, sqlitePath, 'User', 'SELECT * FROM "User"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "User" ("id","email","password","role","isBanned","bannedAt","banReason","deletedAt","createdAt")
                   VALUES (${String(r.id)}, ${String(r.email)}, ${String(r.password)}, CAST(${String(r.role ?? 'USER')} AS "UserRole"), ${Boolean(r.isBanned)}, ${asDate(r.bannedAt)}, ${r.banReason ? String(r.banReason) : null}, ${asDate(r.deletedAt)}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'Symbol', 'SELECT * FROM "Symbol"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "Symbol" ("id","market","code","createdAt")
                   VALUES (${String(r.id)}, CAST(${String(r.market)} AS "Market"), ${String(r.code)}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'InviteCode', 'SELECT * FROM "InviteCode"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "InviteCode" ("id","code","isActive","maxUses","usedCount","expiresAt","createdBy","updatedAt","deletedAt","createdAt")
                   VALUES (${String(r.id)}, ${String(r.code)}, ${Boolean(r.isActive)}, ${Number(r.maxUses ?? 0)}, ${Number(r.usedCount ?? 0)}, ${asDate(r.expiresAt)}, ${r.createdBy ? String(r.createdBy) : null}, ${asDate(r.updatedAt) ?? new Date()}, ${asDate(r.deletedAt)}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'InviteCodeRedemption', 'SELECT * FROM "InviteCodeRedemption"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "InviteCodeRedemption" ("id","inviteCodeId","userId","createdAt")
                   VALUES (${String(r.id)}, ${String(r.inviteCodeId)}, ${String(r.userId)}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'TrainingSession', 'SELECT * FROM "TrainingSession"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "TrainingSession" ("id","userId","market","symbol","drivingTimeframe","totalBars","initialVisibleBars","initialBalance","finalBalance","isLiquidated","resetCount","status","pointer","viewTimeframe","barsData","createdAt","endedAt")
                   VALUES (${String(r.id)}, ${String(r.userId)}, CAST(${String(r.market)} AS "Market"), ${String(r.symbol)}, ${String(r.drivingTimeframe)}, ${Number(r.totalBars ?? 0)}, ${Number(r.initialVisibleBars ?? 500)}, ${Number(r.initialBalance ?? 0)}, ${asNum(r.finalBalance)}, ${Boolean(r.isLiquidated)}, ${Number(r.resetCount ?? 0)}, ${String(r.status ?? 'ACTIVE')}, ${Number(r.pointer ?? 0)}, ${String(r.viewTimeframe ?? r.drivingTimeframe ?? '1H')}, ${String(r.barsData ?? '[]')}::jsonb, ${asDate(r.createdAt) ?? new Date()}, ${asDate(r.endedAt)})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'Position', 'SELECT * FROM "Position"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "Position" ("id","sessionId","side","entryPrice","positionPercent","positionAmount","stopLossRatio","takeProfitRatio","stopLossPrice","takeProfitPrice","feePaid","openedAtPointer")
                   VALUES (${String(r.id)}, ${String(r.sessionId)}, CAST(${String(r.side)} AS "PositionSide"), ${Number(r.entryPrice ?? 0)}, ${Number(r.positionPercent ?? 0)}, ${Number(r.positionAmount ?? 0)}, ${asNum(r.stopLossRatio)}, ${asNum(r.takeProfitRatio)}, ${asNum(r.stopLossPrice)}, ${asNum(r.takeProfitPrice)}, ${Number(r.feePaid ?? 0)}, ${Number(r.openedAtPointer ?? 0)})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'TrainingAction', 'SELECT * FROM "TrainingAction"', async (r) => {
      const directionSql = r.direction ? Prisma.sql`CAST(${String(r.direction)} AS "PositionSide")` : Prisma.sql`NULL`;
      const reasonSql = r.reason ? Prisma.sql`CAST(${String(r.reason)} AS "CloseReason")` : Prisma.sql`NULL`;
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "TrainingAction" ("id","sessionId","actionType","direction","timePointer","price","amount","positionPercent","closePercent","stopLossRatio","takeProfitRatio","avgEntryPriceAfter","positionAmountAfter","realizedPnl","fee","pnl","reason","createdAt")
                   VALUES (${String(r.id)}, ${String(r.sessionId)}, CAST(${String(r.actionType)} AS "ActionType"), ${directionSql}, ${Number(r.timePointer ?? 0)}, ${Number(r.price ?? 0)}, ${asNum(r.amount)}, ${asNum(r.positionPercent)}, ${asNum(r.closePercent)}, ${asNum(r.stopLossRatio)}, ${asNum(r.takeProfitRatio)}, ${asNum(r.avgEntryPriceAfter)}, ${asNum(r.positionAmountAfter)}, ${asNum(r.realizedPnl)}, ${asNum(r.fee)}, ${asNum(r.pnl)}, ${reasonSql}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'AccountSnapshot', 'SELECT * FROM "AccountSnapshot"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "AccountSnapshot" ("id","sessionId","timePointer","balance","floatingPnl","totalEquity","createdAt")
                   VALUES (${String(r.id)}, ${String(r.sessionId)}, ${Number(r.timePointer ?? 0)}, ${Number(r.balance ?? 0)}, ${Number(r.floatingPnl ?? 0)}, ${Number(r.totalEquity ?? 0)}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'TrainingReview', 'SELECT * FROM "TrainingReview"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "TrainingReview" ("id","sessionId","userId","content","problemTags","createdAt","updatedAt")
                   VALUES (${String(r.id)}, ${String(r.sessionId)}, ${String(r.userId)}, ${String(r.content ?? '')}, ${r.problemTags ? String(r.problemTags) : null}::jsonb, ${asDate(r.createdAt) ?? new Date()}, ${asDate(r.updatedAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'RefreshToken', 'SELECT * FROM "RefreshToken"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "RefreshToken" ("id","userId","tokenHash","expiresAt","revokedAt","createdAt")
                   VALUES (${String(r.id)}, ${String(r.userId)}, ${String(r.tokenHash)}, ${asDate(r.expiresAt) ?? new Date()}, ${asDate(r.revokedAt)}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'AdminAuditLog', 'SELECT * FROM "AdminAuditLog"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "AdminAuditLog" ("id","adminUserId","targetUserId","action","resourceType","resourceId","detail","createdAt")
                   VALUES (${String(r.id)}, ${String(r.adminUserId)}, ${r.targetUserId ? String(r.targetUserId) : null}, CAST(${String(r.action)} AS "AuditAction"), ${String(r.resourceType)}, ${r.resourceId ? String(r.resourceId) : null}, ${r.detail ? String(r.detail) : null}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(pg, sqlitePath, 'SecurityLog', 'SELECT * FROM "SecurityLog"', async (r) => {
      await pg.$executeRaw(
        Prisma.sql`INSERT INTO "SecurityLog" ("id","userId","action","ip","userAgent","detail","createdAt")
                   VALUES (${String(r.id)}, ${r.userId ? String(r.userId) : null}, CAST(${String(r.action)} AS "AuditAction"), ${r.ip ? String(r.ip) : null}, ${r.userAgent ? String(r.userAgent) : null}, ${r.detail ? String(r.detail) : null}, ${asDate(r.createdAt) ?? new Date()})
                   ON CONFLICT ("id") DO NOTHING`,
      );
    });

    await migrateTable(
      pg,
      sqlitePath,
      'MarketBar(CRYPTO)->bars_crypto',
      `SELECT mb.* FROM "MarketBar" mb JOIN "Symbol" s ON s.id = mb.symbolId WHERE s.market = 'CRYPTO'`,
      async (r) => {
        await pg.$executeRaw(
          Prisma.sql`INSERT INTO "bars_crypto" ("id","symbolId","timeframe","timestamp","open","high","low","close","volume","source","createdAt")
                     VALUES (${`bc_mig_${String(r.id)}`}, ${String(r.symbolId)}, ${String(r.timeframe)}, ${asDate(r.openTime) ?? new Date()}, ${Number(r.open ?? 0)}, ${Number(r.high ?? 0)}, ${Number(r.low ?? 0)}, ${Number(r.close ?? 0)}, ${asNum(r.volume)}, ${'SQLITE_MARKETBAR'}, ${new Date()})
                     ON CONFLICT ("symbolId","timeframe","timestamp") DO NOTHING`,
        );
      },
    );

    console.log(`[migrate] done in ${Date.now() - start}ms`);
  } finally {
    await pg.$disconnect();
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
