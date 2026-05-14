import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Client } from 'pg';

type IndexRow = {
  schemaname: string;
  tablename: string;
  indexname: string;
  index_size: string;
  index_size_bytes: string;
  indexdef: string;
  is_unique: boolean;
  idx_scan: string;
  idx_tup_read: string;
  idx_tup_fetch: string;
};

type TableSizeRow = {
  table_name: string;
  data_size: string;
  index_size: string;
  total_size: string;
  data_size_bytes: string;
  index_size_bytes: string;
  total_size_bytes: string;
};

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function parseColumns(indexDef: string): string[] {
  const m = indexDef.match(/\((.*)\)/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((x) => x.trim().replace(/^"|"$/g, ''));
}

function normalizeDefForDup(indexDef: string): string {
  return indexDef
    .replace(/CREATE\s+UNIQUE\s+INDEX\s+\S+\s+ON\s+/i, 'CREATE INDEX ON ')
    .replace(/CREATE\s+INDEX\s+\S+\s+ON\s+/i, 'CREATE INDEX ON ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const tableSizes = (
      await client.query<TableSizeRow>(`
        SELECT
          relname AS table_name,
          pg_size_pretty(pg_relation_size(relid)) AS data_size,
          pg_size_pretty(pg_indexes_size(relid)) AS index_size,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          pg_relation_size(relid)::text AS data_size_bytes,
          pg_indexes_size(relid)::text AS index_size_bytes,
          pg_total_relation_size(relid)::text AS total_size_bytes
        FROM pg_catalog.pg_statio_user_tables
        WHERE relname IN ('bars_crypto', 'bars_stock')
      `)
    ).rows.map((r) => ({
      ...r,
      data_size_bytes: Number(r.data_size_bytes),
      index_size_bytes: Number(r.index_size_bytes),
      total_size_bytes: Number(r.total_size_bytes),
    }));

    const indexes = (
      await client.query<IndexRow>(`
        SELECT
          i.schemaname,
          i.tablename,
          i.indexname,
          pg_size_pretty(pg_relation_size(c.oid)) AS index_size,
          pg_relation_size(c.oid)::text AS index_size_bytes,
          i.indexdef,
          x.indisunique AS is_unique,
          COALESCE(s.idx_scan, 0)::text AS idx_scan,
          COALESCE(s.idx_tup_read, 0)::text AS idx_tup_read,
          COALESCE(s.idx_tup_fetch, 0)::text AS idx_tup_fetch
        FROM pg_indexes i
        JOIN pg_class c ON c.relname = i.indexname
        JOIN pg_index x ON x.indexrelid = c.oid
        LEFT JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
        WHERE i.tablename IN ('bars_crypto', 'bars_stock')
        ORDER BY pg_relation_size(c.oid) DESC
      `)
    ).rows.map((r) => ({
      ...r,
      index_size_bytes: Number(r.index_size_bytes),
      idx_scan: Number(r.idx_scan),
      idx_tup_read: Number(r.idx_tup_read),
      idx_tup_fetch: Number(r.idx_tup_fetch),
      columns: parseColumns(r.indexdef),
      normalizedDef: normalizeDefForDup(r.indexdef),
    }));

    const byTable = new Map<string, typeof indexes>();
    for (const idx of indexes) {
      const list = byTable.get(idx.tablename) ?? [];
      list.push(idx);
      byTable.set(idx.tablename, list);
    }

    const redundantCandidates: Array<{
      table: string;
      dropCandidate: string;
      coveredBy: string;
      reason: string;
      dropCandidateSizeBytes: number;
      risk: string;
    }> = [];

    for (const [table, list] of byTable.entries()) {
      const groups = new Map<string, typeof list>();
      for (const idx of list) {
        const key = idx.normalizedDef;
        const g = groups.get(key) ?? [];
        g.push(idx);
        groups.set(key, g);
      }

      for (const group of groups.values()) {
        if (group.length <= 1) continue;
        const sorted = group.slice().sort((a, b) => Number(b.is_unique) - Number(a.is_unique) || b.idx_scan - a.idx_scan);
        const keeper = sorted[0];
        for (let i = 1; i < sorted.length; i += 1) {
          const cand = sorted[i];
          redundantCandidates.push({
            table,
            dropCandidate: cand.indexname,
            coveredBy: keeper.indexname,
            reason: `Same indexed columns/order as ${keeper.indexname}${keeper.is_unique ? ' (unique)' : ''}`,
            dropCandidateSizeBytes: cand.index_size_bytes,
            risk: 'low',
          });
        }
      }
    }

    const estimatedReclaimBytes = redundantCandidates.reduce((sum, x) => sum + x.dropCandidateSizeBytes, 0);

    const suggestedSql = redundantCandidates.map((x) => `DROP INDEX CONCURRENTLY IF EXISTS "${x.dropCandidate}";`);

    const executionPlan = [
      '1) Confirm candidate indexes have same columns/order as unique index.',
      '2) Check pg_stat_user_indexes idx_scan trend over a representative window (at least 24h).',
      '3) Drop one redundant index per table using CONCURRENTLY during low traffic.',
      '4) Re-check query latency and index usage after each drop.',
      '5) Run VACUUM (ANALYZE) on affected tables after change window.',
    ];

    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        mode: 'read-only',
        tables: ['bars_crypto', 'bars_stock'],
      },
      tableSizes,
      indexes,
      redundantCandidates,
      estimatedReclaimBytes,
      estimatedReclaimPretty: formatBytes(estimatedReclaimBytes),
      suggestedSql,
      executionPlan,
      longTerm: [
        'Consider encoding timeframe to SMALLINT/ENUM-like code to reduce index width.',
        'Keep symbol lookup by symbolId (surrogate key); avoid text-based symbol indexes on bars tables.',
        'Use SymbolDataStats for heavy counts instead of full bars scans.',
        'At larger scale, consider partitioning bars tables by timeframe or time range.',
      ],
    };

    const reportDir = path.join(process.cwd(), 'data', 'reports');
    await fs.mkdir(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'bars-index-audit.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('===== Bars Index Audit =====');
    for (const t of tableSizes) {
      console.log(`${t.table_name}: data=${t.data_size}, index=${t.index_size}, total=${t.total_size}`);
    }
    console.log(`Total indexes scanned: ${indexes.length}`);
    console.log(`Redundant candidates: ${redundantCandidates.length}`);
    console.log(`Estimated reclaimable: ${formatBytes(estimatedReclaimBytes)}`);
    if (redundantCandidates.length > 0) {
      console.log('Candidates:');
      for (const c of redundantCandidates) {
        console.log(`- ${c.table}: ${c.dropCandidate} (covered by ${c.coveredBy}, size=${formatBytes(c.dropCandidateSizeBytes)})`);
      }
    }
    console.log(`JSON report written to: ${reportPath}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[data:audit-indexes] failed', err);
  process.exit(1);
});
