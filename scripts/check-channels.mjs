#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_PATH = path.resolve(__dirname, '../src/data/channels.ts');
const REPORT_PATH = path.resolve(__dirname, 'channel-health-report.json');
const TIMEOUT_MS = 8000;
const CONCURRENCY = 10;

function parseChannelsFromTs(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const channels = [];

  const streamUrlRegex = /streamUrl:\s*["']([^"']+)["']/g;
  const idRegex = /id:\s*["']([^"']+)["']/g;
  const nameRegex = /name:\s*["']([^"']+)["']/g;

  const ids = [...content.matchAll(idRegex)].map(m => m[1]);
  const names = [...content.matchAll(nameRegex)].map(m => m[1]);
  const urls = [...content.matchAll(streamUrlRegex)].map(m => m[1]);

  for (let i = 0; i < urls.length; i++) {
    channels.push({
      id: ids[i] || `unknown-${i}`,
      name: names[i] || `Channel ${i}`,
      streamUrl: urls[i],
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

  if (!fs.existsSync(CHANNELS_PATH)) {
    console.error(`Channels file not found: ${CHANNELS_PATH}`);
    process.exit(1);
  }

  console.log(`Reading channels from: ${CHANNELS_PATH}`);
  const channels = parseChannelsFromTs(CHANNELS_PATH);
  console.log(`Found ${channels.length} channels\n`);

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
      console.log(`  ${icon} [${r.status}] ${r.name} (${r.httpCode || r.error || 'N/A'})`);
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
