#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_PATHS = [
  path.resolve(__dirname, '../src/data/channels.ts'),
  path.resolve(__dirname, '../src/data/pildunChannels.ts'),
];
const REPORT_PATH = path.resolve(__dirname, 'channel-health-report.json');
const TIMEOUT_MS = 5000;
const CONCURRENCY = 25;

const KEY_RE = /(["']?)(\w+)\1\s*:\s*["']([^"']+)["']/g;

function parseChannelsFromTs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const channels = [];

  const ids = [];
  const names = [];
  const urls = [];

  let match;
  KEY_RE.lastIndex = 0;
  while ((match = KEY_RE.exec(content)) !== null) {
    const key = match[2];
    const value = match[3];
    if (key === 'id') ids.push(value);
    else if (key === 'name') names.push(value);
    else if (key === 'streamUrl') urls.push(value);
  }

  function classifyFormat(url) {
    try {
      const pathname = new URL(url).pathname;
      if (pathname.endsWith('.m3u8')) return 'hls';
      if (pathname.endsWith('.mpd')) return 'dash';
    } catch {}
    return 'raw_ts_or_unknown';
  }

  for (let i = 0; i < urls.length; i++) {
    channels.push({
      id: ids[i] || `unknown-${i}`,
      name: names[i] || `Channel ${i}`,
      streamUrl: urls[i],
      format: classifyFormat(urls[i]),
    });
  }

  return channels;
}

async function checkUrl(channel) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const start = Date.now();

  try {
    const response = await fetch(channel.streamUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelaChannelChecker/1.0)',
      },
    });

    clearTimeout(timer);
    const elapsed = Date.now() - start;

    const status = response.ok
      ? 'OK'
      : response.status === 404 || response.status === 410
        ? 'DEAD'
        : response.status >= 300 && response.status < 400
          ? 'REDIRECT'
          : 'UNKNOWN';

    return {
      id: channel.id,
      name: channel.name,
      streamUrl: channel.streamUrl,
      format: channel.format,
      status,
      httpCode: response.status,
      error: null,
      elapsedMs: elapsed,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    let status;
    if (err instanceof TypeError && message.includes('fetch')) {
      status = 'DEAD';
    } else if (err.name === 'AbortError') {
      status = 'DEAD';
    } else {
      status = 'UNKNOWN';
    }

    return {
      id: channel.id,
      name: channel.name,
      streamUrl: channel.streamUrl,
      format: channel.format,
      status,
      httpCode: null,
      error: message,
      elapsedMs: elapsed,
      checkedAt: new Date().toISOString(),
    };
  }
}

async function main() {
  console.log('=== Channel Health Check ===\n');

  let channels = [];

  for (const filePath of CHANNELS_PATHS) {
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping (not found): ${filePath}`);
      continue;
    }
    console.log(`Reading: ${filePath}`);
    const parsed = parseChannelsFromTs(filePath);
    console.log(`  Found ${parsed.length} channels`);
    channels.push(...parsed);
  }

  console.log(`\nTotal channels found: ${channels.length}\n`);

  if (channels.length === 0) {
    console.error('No channels found to check.');
    process.exit(1);
  }

  const results = [];
  let completed = 0;
  let okCount = 0;
  let deadCount = 0;
  let redirectCount = 0;
  let unknownCount = 0;

  async function processBatch(batch) {
    const batchResults = await Promise.all(batch.map(checkUrl));
    for (const r of batchResults) {
      results.push(r);
      completed++;
      switch (r.status) {
        case 'OK': okCount++; break;
        case 'DEAD': deadCount++; break;
        case 'REDIRECT': redirectCount++; break;
        default: unknownCount++;
      }
      const icon = r.status === 'OK' ? '✓' : r.status === 'DEAD' ? '✗' : r.status === 'REDIRECT' ? '→' : '?';
      const fmt = r.format === 'hls' ? '' : ` [${r.format}]`;
      console.log(`  ${icon} [${r.status}]${fmt} ${r.name} (${r.httpCode || r.error || 'N/A'})`);
    }
  }

  for (let i = 0; i < channels.length; i += CONCURRENCY) {
    const batch = channels.slice(i, i + CONCURRENCY);
    await processBatch(batch);
  }

  const report = {
    summary: {
      total: channels.length,
      ok: okCount,
      dead: deadCount,
      redirect: redirectCount,
      unknown: unknownCount,
      checkedAt: new Date().toISOString(),
    },
    channels: results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n=== Report ===`);
  console.log(`  Total:    ${report.summary.total}`);
  console.log(`  OK:       ${report.summary.ok}`);
  console.log(`  DEAD:     ${report.summary.dead}`);
  console.log(`  REDIRECT: ${report.summary.redirect}`);
  console.log(`  UNKNOWN:  ${report.summary.unknown}`);
  console.log(`\nReport written to: ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error('Health check failed:', err);
  process.exit(1);
});
