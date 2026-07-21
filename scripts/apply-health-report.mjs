#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.resolve(__dirname, 'channel-health-report.json');
const CHANNELS_PATH = path.resolve(__dirname, '../src/data/channels.ts');
const PILDUIN_PATH = path.resolve(__dirname, '../src/data/pildunChannels.ts');

const CORS_RESTRICTIVE_DOMAINS = [
  'video.detik.com',
  'live.cnbcindonesia.com',
  'edge.medcom.id',
  'live.cnnindonesia.com',
  'streamlock.net',
  '.siar.us',
  'juraganstreaming.com',
  'tv.aliman.id',
  'hgmtv.com',
  'tvku.tv',
  'tv.rodja.live',
  'stream.asianastream.com',
  'streaming.radiosalamjambi.com',
  'ammedia.siar.us',
  'salamtv.siar.us',
  'tvstreamcast.com',
  'nusantaratv.siar.us',
  'dutatv.siar.us',
  'surautv.siar.us',
  'e.siar.us',
];

function domainMatch(hostname, patterns) {
  return patterns.some(p => hostname === p || hostname.endsWith('.' + p));
}

function hasHttpScheme(url) {
  try {
    return new URL(url).protocol === 'http:';
  } catch {
    return false;
  }
}

function needsProxyFlag(reportEntry) {
  if (hasHttpScheme(reportEntry.streamUrl)) return true;
  try {
    const hostname = new URL(reportEntry.streamUrl).hostname.toLowerCase();
    return domainMatch(hostname, CORS_RESTRICTIVE_DOMAINS);
  } catch {
    return false;
  }
}

function needsTranscodeFlag(reportEntry) {
  return reportEntry.format === 'raw_ts_or_unknown';
}

function parseChannelEntries(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const entries = [];

  let currentEntry = null;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '{') {
      if (braceDepth === 0) currentEntry = { startLine: i, lines: [line], id: null, streamUrl: null };
      else if (currentEntry) currentEntry.lines.push(line);
      braceDepth++;
      continue;
    }

    if (trimmed === '},' || trimmed === '}') {
      braceDepth--;
      if (currentEntry) currentEntry.lines.push(line);
      if (braceDepth === 0 && currentEntry) {
        entries.push(currentEntry);
        currentEntry = null;
      }
      continue;
    }

    if (braceDepth === 0) continue;

    if (!currentEntry) currentEntry = { startLine: i, lines: [], id: null, streamUrl: null };
    currentEntry.lines.push(line);

    const idMatch = trimmed.match(/^["']?id["']?\s*:\s*["']([^"']+)["'],?$/);
    if (idMatch) currentEntry.id = idMatch[1];

    const urlMatch = trimmed.match(/^["']?streamUrl["']?\s*:\s*["']([^"']+)["'],?$/);
    if (urlMatch) currentEntry.streamUrl = urlMatch[1];
  }

  return { content, lines, entries };
}

function writeChannelFile(filePath, lines) {
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function hasField(lines, fieldName) {
  return lines.some(l => {
    const trimmed = l.trimStart();
    return trimmed.startsWith(`${fieldName}:`) || trimmed.startsWith(`"${fieldName}":`);
  });
}

function processFile(filePath, reportMap) {
  const { content, lines, entries } = parseChannelEntries(filePath);
  if (entries.length === 0) {
    console.log(`  No entries found in ${filePath}`);
    return;
  }

  let modified = false;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry.id) continue;

    const report = reportMap.get(entry.id);
    if (!report) continue;

    const inserts = [];

    if (report.status === 'DEAD' && !hasField(entry.lines, 'verified')) {
      inserts.push({ field: 'verified', value: 'false' });
    }

    if (report.status === 'OK' && !hasField(entry.lines, 'verified')) {
      inserts.push({ field: 'verified', value: 'true' });
    }

    if (report.status === 'OK' && needsProxyFlag(report) && !hasField(entry.lines, 'needsProxy')) {
      inserts.push({ field: 'needsProxy', value: 'true' });
    }

    if (report.status === 'OK' && needsTranscodeFlag(report) && !hasField(entry.lines, 'needsTranscode')) {
      inserts.push({ field: 'needsTranscode', value: 'true' });
    }

    if (inserts.length === 0) continue;

    // Find insertion point: the last line of the entry (the closing brace)
    const closeBraceIdx = entry.startLine + entry.lines.length - 1;
    const indent = entry.lines[entry.lines.length - 2]?.match(/^\s*/)?.[0] || '  ';

    // Ensure the previous line (last property) ends with a comma
    const prevLineIdx = closeBraceIdx - 1;
    if (prevLineIdx >= 0) {
      const trimmed = lines[prevLineIdx].trimEnd();
      if (!trimmed.endsWith(',')) {
        lines[prevLineIdx] = trimmed + ',';
      }
    }

    for (const ins of inserts) {
      lines.splice(closeBraceIdx, 0, `${indent}${ins.field}: ${ins.value},`);
    }

    modified = true;
  }

  if (modified) {
    writeChannelFile(filePath, lines);
    console.log(`  Updated ${filePath}`);
  } else {
    console.log(`  No changes needed for ${filePath}`);
  }
}

function main() {
  console.log('=== Apply Health Report ===\n');

  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`Health report not found at: ${REPORT_PATH}`);
    console.error('Run "npm run check:channels" first.');
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
  console.log(`Loaded report: ${report.channels.length} channels checked`);
  console.log(`  OK: ${report.summary.ok}, DEAD: ${report.summary.dead}, REDIRECT: ${report.summary.redirect}, UNKNOWN: ${report.summary.unknown}\n`);

  const reportMap = new Map(report.channels.map(ch => [ch.id, ch]));

  const deadChannels = report.channels.filter(ch => ch.status === 'DEAD');
  const okChannels = report.channels.filter(ch => ch.status === 'OK');
  const proxyChannels = report.channels.filter(ch => ch.status === 'OK' && needsProxyFlag(ch));
  const transcodeChannels = report.channels.filter(ch => ch.status === 'OK' && needsTranscodeFlag(ch));

  console.log(`Channels to flag verified=false: ${deadChannels.length}`);
  console.log(`Channels to flag verified=true: ${okChannels.length}`);
  console.log(`Channels to flag needsProxy=true: ${proxyChannels.length}`);
  console.log(`Channels to flag needsTranscode=true: ${transcodeChannels.length}\n`);

  if (!fs.existsSync(CHANNELS_PATH)) {
    console.error(`Channels file not found: ${CHANNELS_PATH}`);
    process.exit(1);
  }

  console.log('Processing channels.ts...');
  processFile(CHANNELS_PATH, reportMap);

  if (fs.existsSync(PILDUIN_PATH)) {
    console.log('\nProcessing pildunChannels.ts...');
    processFile(PILDUIN_PATH, reportMap);
  }

  console.log('\nDone. Run "npm run build" to verify.');
}

try {
  main();
} catch (err) {
  console.error('Failed:', err);
  process.exit(1);
}
