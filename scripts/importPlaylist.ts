#!/usr/bin/env tsx
/**
 * M3U Import Script — IPTV Streaming Service
 *
 * Fetches playlists from multiple IPTV sources and generates static channel data.
 *
 * Sources:
 *   iptv-org  — https://github.com/iptv-org/iptv (Unlicense/CC0)
 *   doms9     — https://github.com/doms9/iptv (Unlicense)
 *   free-tv   — https://github.com/Free-TV/IPTV (Unlicense)
 *
 * Usage:
 *   npx tsx scripts/importPlaylist.ts                           # Default: all sources, Indonesia + doms9 base
 *   npx tsx scripts/importPlaylist.ts --source iptv-org         # Only iptv-org
 *   npx tsx scripts/importPlaylist.ts --source doms9            # Only doms9
 *   npx tsx scripts/importPlaylist.ts --source free-tv          # Only free-tv
 *   npx tsx scripts/importPlaylist.ts --source all              # All sources merged
 *   npx tsx scripts/importPlaylist.ts --country us              # iptv-org USA playlist
 *   npx tsx scripts/importPlaylist.ts --doms9-base              # doms9 base channels only
 *   npx tsx scripts/importPlaylist.ts --doms9-live              # doms9 live events only
 *   npx tsx scripts/importPlaylist.ts --doms9-combined          # doms9 base + live events
 *   npx tsx scripts/importPlaylist.ts --url <custom-url>        # Custom M3U URL
 *   npx tsx scripts/importPlaylist.ts --output src/data/channels.ts
 *
 * Note: Some streams may be geo-blocked or temporarily unavailable.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// --- Types ---

interface Channel {
  id: string;
  name: string;
  logoUrl: string | null;
  category: string;
  streamUrl: string;
  tvgId: string | null;
  isFeatured: boolean;
  sortOrder: number;
  needsProxy?: boolean;
}

interface RawChannel {
  name: string;
  logoUrl: string | null;
  category: string;
  streamUrl: string;
  tvgId: string | null;
  source: string;
}

// --- CORS-restrictive domains (matched at import time) ---

const CORS_RESTRICTIVE_DOMAINS = [
  'live.cnbcindonesia.com',
  'live.cnnindonesia.com',
  'b1news.beritasatumedia.com',
  'video.detik.com',
  'edge.medcom.id',
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

function needsProxy(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:') return true;
    const hostname = parsed.hostname.toLowerCase();
    return CORS_RESTRICTIVE_DOMAINS.some(p => hostname === p || hostname.endsWith('.' + p));
  } catch {
    return false;
  }
}

// --- Existing file data (for --append mode) ---

interface ExistingData {
  header: string;
  entries: string[];
  footer: string;
  existingTvgIds: Set<string>;
  existingNames: Set<string>;
}

function readExistingFile(filePath: string): ExistingData | null {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const arrStart = content.indexOf('[');
  const arrEnd = content.lastIndexOf(']');
  if (arrStart === -1 || arrEnd === -1) return null;

  const header = content.slice(0, arrStart + 1);
  const arrayContent = content.slice(arrStart + 1, arrEnd);
  const footer = content.slice(arrEnd);

  const entries: string[] = [];
  const existingTvgIds = new Set<string>();
  const existingNames = new Set<string>();

  let braceDepth = 0;
  let currentEntry = '';

  for (const line of arrayContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '{') {
      if (braceDepth === 0) {
        currentEntry = line;
      } else {
        currentEntry += '\n' + line;
      }
      braceDepth++;
    } else if (trimmed === '},' || trimmed === '}') {
      braceDepth--;
      currentEntry += '\n' + line;
      if (braceDepth === 0) {
        entries.push(currentEntry);
        const tvgIdMatch = currentEntry.match(/tvgId:\s*(null|"[^"]*")/);
        const nameMatch = currentEntry.match(/name:\s*"([^"]+)"/);
        if (tvgIdMatch && tvgIdMatch[1] !== 'null') {
          existingTvgIds.add(tvgIdMatch[1].replace(/"/g, ''));
        }
        if (nameMatch) {
          existingNames.add(nameMatch[1].toLowerCase().trim());
        }
        currentEntry = '';
      }
    } else if (braceDepth > 0) {
      currentEntry += '\n' + line;
    }
  }

  return { header, entries, footer, existingTvgIds, existingNames };
}

// --- Source URLs ---

const IPTV_ORG_BASE = 'https://iptv-org.github.io/iptv';

const DOMS9_URLS = {
  base: 'https://s.id/d9Base',
  live: 'https://s.id/d9Live',
  combined: 'https://s.id/d9M3U8',
};

const FREE_TV_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';

// --- CLI Argument Parsing ---

type SourceChoice = 'iptv-org' | 'doms9' | 'free-tv' | 'all';

interface CliArgs {
  source: SourceChoice;
  iptvOrgUrl: string;
  doms9Urls: string[];
  freeTvUrls: string[];
  customUrls: string[];
  outputFile: string;
  append: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let source: SourceChoice = 'all';
  let iptvOrgUrl = `${IPTV_ORG_BASE}/countries/id.m3u`;
  const doms9Urls: string[] = [];
  const freeTvUrls: string[] = [];
  const customUrls: string[] = [];
  let outputFile = path.resolve(process.cwd(), 'src/data/channels.ts');
  let doms9Mode: 'base' | 'live' | 'combined' | null = null;
  let append = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--source':
      case '-s': {
        const val = args[++i];
        if (val === 'iptv-org' || val === 'doms9' || val === 'free-tv' || val === 'all') {
          source = val;
        } else {
          console.error(`Invalid source: ${val}. Use: iptv-org, doms9, free-tv, or all`);
          process.exit(1);
        }
        break;
      }
      case '--country':
      case '-c': {
        const code = args[++i];
        if (!code) { console.error('Missing country code'); process.exit(1); }
        iptvOrgUrl = `${IPTV_ORG_BASE}/countries/${code.toLowerCase()}.m3u`;
        break;
      }
      case '--category':
      case '-cat': {
        const cat = args[++i];
        if (!cat) { console.error('Missing category name'); process.exit(1); }
        iptvOrgUrl = `${IPTV_ORG_BASE}/categories/${cat.toLowerCase()}.m3u`;
        break;
      }
      case '--region':
      case '-r': {
        const region = args[++i];
        if (!region) { console.error('Missing region name'); process.exit(1); }
        iptvOrgUrl = `${IPTV_ORG_BASE}/regions/${region.toLowerCase()}.m3u`;
        break;
      }
      case '--doms9-base': {
        doms9Mode = 'base';
        break;
      }
      case '--doms9-live': {
        doms9Mode = 'live';
        break;
      }
      case '--doms9-combined': {
        doms9Mode = 'combined';
        break;
      }
      case '--url':
      case '-u': {
        const customUrl = args[++i];
        if (!customUrl) { console.error('Missing URL'); process.exit(1); }
        customUrls.push(customUrl);
        break;
      }
      case '--output':
      case '-o': {
        const out = args[++i];
        if (!out) { console.error('Missing output path'); process.exit(1); }
        outputFile = path.resolve(process.cwd(), out);
        break;
      }
      case '--append':
      case '-a':
        append = true;
        break;
      case '--help':
      case '-h':
        console.log(`
IPTV Playlist Importer

Usage: npx tsx scripts/importPlaylist.ts [options]

Sources:
  -s, --source <name>       Source: iptv-org, doms9, free-tv, or all  [default: all]

iptv-org options:
  -c, --country <code>      Country ISO code (e.g., id, us, gb)  [default: id]
  -cat, --category <name>   Category name (e.g., news, sports)
  -r, --region <name>       Region name (e.g., sea, europe)

doms9 options:
  --doms9-base              Base channels only
  --doms9-live              Live events only
  --doms9-combined          Base + live events (default when source=doms9)

General:
  -u, --url <url>           Custom M3U URL (can be repeated)
  -o, --output <path>       Output file path  [default: src/data/channels.ts]
  -a, --append              Append to existing file instead of overwriting
  -h, --help                Show this help

Examples:
  npx tsx scripts/importPlaylist.ts                              # All sources, default playlists
  npx tsx scripts/importPlaylist.ts --source iptv-org --country us
  npx tsx scripts/importPlaylist.ts --source doms9               # doms9 combined
  npx tsx scripts/importPlaylist.ts --source free-tv             # Free-TV only
  npx tsx scripts/importPlaylist.ts --source all --country id    # All sources
  npx tsx scripts/importPlaylist.ts --url https://example.com/x.m3u
`);
        process.exit(0);
    }
  }

  // Resolve doms9 URLs based on mode
  if (source === 'doms9' || source === 'all') {
    if (doms9Mode === null) doms9Mode = 'combined';
    switch (doms9Mode) {
      case 'base':
        doms9Urls.push(DOMS9_URLS.base);
        break;
      case 'live':
        doms9Urls.push(DOMS9_URLS.live);
        break;
      case 'combined':
        doms9Urls.push(DOMS9_URLS.combined);
        break;
    }
  }

  // Add free-tv URL
  if (source === 'free-tv' || source === 'all') {
    freeTvUrls.push(FREE_TV_URL);
  }

  return { source, iptvOrgUrl, doms9Urls, freeTvUrls, customUrls, outputFile, append };
}

// --- M3U Parsing ---

function extractAttribute(line: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = line.match(regex);
  return match?.[1] ?? null;
}

function parseM3U(content: string, source: string): RawChannel[] {
  const lines = content.split('\n').map(l => l.trim());
  const channels: RawChannel[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF:')) {
      const infoLine = lines[i];
      const name = infoLine.split(',').slice(1).join(',').trim() || 'Unknown Channel';
      const logoUrl = extractAttribute(infoLine, 'tvg-logo');
      const rawCategory = extractAttribute(infoLine, 'group-title') || 'Uncategorized';
      const tvgId = extractAttribute(infoLine, 'tvg-id');

      let category = rawCategory.trim();
      if (!category || category.toLowerCase() === 'undefined') {
        category = 'Uncategorized';
      } else if (category.includes(';')) {
        category = category.split(';')[0].trim();
      }

      const nextLine = lines[i + 1] || '';
      if (nextLine && !nextLine.startsWith('#')) {
        channels.push({ name, logoUrl, category, streamUrl: nextLine, tvgId, source });
        i++;
      }
    }
  }

  return channels;
}

// --- Filtering & Deduplication ---

function isValidStreamUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function filterAndDeduplicate(channels: RawChannel[]): RawChannel[] {
  const valid = channels.filter(ch => isValidStreamUrl(ch.streamUrl));

  const seen = new Map<string, boolean>();
  const deduped: RawChannel[] = [];

  for (const ch of valid) {
    const key = ch.tvgId
      ? `tvg:${ch.tvgId}`
      : `name:${ch.name.toLowerCase().trim()}|url:${ch.streamUrl}`;

    if (!seen.has(key)) {
      seen.set(key, true);
      deduped.push(ch);
    }
  }

  return deduped;
}

// --- Channel Assignment ---

const FEATURED_CATEGORIES = ['Entertainment', 'News', 'Sports'];

function assignChannels(rawChannels: RawChannel[]): Channel[] {
  const channels: Channel[] = [];
  const categoryCounters = new Map<string, number>();

  for (let i = 0; i < rawChannels.length; i++) {
    const raw = rawChannels[i];
    const counter = (categoryCounters.get(raw.category) || 0) + 1;
    categoryCounters.set(raw.category, counter);

    channels.push({
      id: `${raw.source}-${generateId(raw.name, i)}`,
      name: raw.name,
      logoUrl: raw.logoUrl,
      category: raw.category,
      streamUrl: raw.streamUrl,
      tvgId: raw.tvgId,
      isFeatured: counter <= 2 && FEATURED_CATEGORIES.some(
        fc => raw.category.toLowerCase().includes(fc.toLowerCase())
      ),
      sortOrder: counter,
    });
  }

  return channels;
}

function generateId(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${index}`;
}

// --- File Generation ---

function generateChannelFile(channels: Channel[], existing?: ExistingData | null): string {
  if (existing) {
    const lines: string[] = [existing.header.trim()];
    for (const entry of existing.entries) {
      lines.push(entry);
    }
    for (const ch of channels) {
      lines.push('  {');
      lines.push(`    id: ${JSON.stringify(ch.id)},`);
      lines.push(`    name: ${JSON.stringify(ch.name)},`);
      lines.push(`    logoUrl: ${JSON.stringify(ch.logoUrl)},`);
      lines.push(`    category: ${JSON.stringify(ch.category)},`);
      lines.push(`    streamUrl: ${JSON.stringify(ch.streamUrl)},`);
      lines.push(`    tvgId: ${JSON.stringify(ch.tvgId)},`);
      lines.push(`    isFeatured: ${ch.isFeatured},`);
      lines.push(`    sortOrder: ${ch.sortOrder},`);
      if (ch.needsProxy) {
        lines.push(`    needsProxy: true,`);
      }
      lines.push('  },');
    }
    lines.push(existing.footer.trim());
    return lines.join('\n');
  }

  const lines: string[] = [
    "import type { Channel } from '../types/channel';",
    '',
    'export const channels: Channel[] = [',
  ];

  for (const ch of channels) {
    lines.push('  {');
    lines.push(`    id: ${JSON.stringify(ch.id)},`);
    lines.push(`    name: ${JSON.stringify(ch.name)},`);
    lines.push(`    logoUrl: ${JSON.stringify(ch.logoUrl)},`);
    lines.push(`    category: ${JSON.stringify(ch.category)},`);
    lines.push(`    streamUrl: ${JSON.stringify(ch.streamUrl)},`);
    lines.push(`    tvgId: ${JSON.stringify(ch.tvgId)},`);
    lines.push(`    isFeatured: ${ch.isFeatured},`);
    lines.push(`    sortOrder: ${ch.sortOrder},`);
    if (ch.needsProxy) {
      lines.push(`    needsProxy: true,`);
    }
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

// --- Fetch Helper ---

async function fetchPlaylist(url: string, label: string): Promise<RawChannel[]> {
  console.log(`  Fetching: ${label}`);
  console.log(`  URL: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  Failed: ${response.status} ${response.statusText}`);
      return [];
    }
    const content = await response.text();
    const channels = parseM3U(content, label);
    console.log(`  Parsed: ${channels.length} entries`);
    return channels;
  } catch (err) {
    console.error(`  Error: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

// --- Main ---

async function main() {
  const args = parseArgs();
  const allRaw: RawChannel[] = [];

  console.log('=== IPTV Playlist Importer ===\n');

  // Fetch from iptv-org
  if (args.source === 'iptv-org' || args.source === 'all') {
    console.log('[iptv-org/iptv]');
    const channels = await fetchPlaylist(args.iptvOrgUrl, 'iptv-org');
    allRaw.push(...channels);
    console.log();
  }

  // Fetch from doms9
  if (args.source === 'doms9' || args.source === 'all') {
    console.log('[doms9/iptv]');
    for (const url of args.doms9Urls) {
      const channels = await fetchPlaylist(url, 'doms9');
      allRaw.push(...channels);
    }
    console.log();
  }

  // Fetch from free-tv
  if (args.source === 'free-tv' || args.source === 'all') {
    console.log('[Free-TV/IPTV]');
    for (const url of args.freeTvUrls) {
      const channels = await fetchPlaylist(url, 'free-tv');
      allRaw.push(...channels);
    }
    console.log();
  }

  // Fetch custom URLs
  for (const url of args.customUrls) {
    console.log('[custom]');
    const channels = await fetchPlaylist(url, 'custom');
    allRaw.push(...channels);
    console.log();
  }

  if (allRaw.length === 0) {
    console.error('No channels fetched from any source.');
    process.exit(1);
  }

  console.log(`Total raw entries: ${allRaw.length}`);
  console.log('Filtering invalid streams and deduplicating...');
  const filtered = filterAndDeduplicate(allRaw);
  console.log(`After internal dedup: ${filtered.length} channels.`);

  if (filtered.length === 0) {
    console.error('No valid channels found.');
    process.exit(1);
  }

  // Append mode: read existing file and dedupe against it
  let existingData: ExistingData | null = null;
  if (args.append) {
    existingData = readExistingFile(args.outputFile);
    if (existingData) {
      const before = filtered.length;
      const deduped: RawChannel[] = [];
      for (const ch of filtered) {
        if (ch.tvgId && existingData.existingTvgIds.has(ch.tvgId)) continue;
        const normalizedName = ch.name.toLowerCase().trim();
        if (existingData.existingNames.has(normalizedName)) continue;
        deduped.push(ch);
      }
      console.log(`Deduped against ${existingData.entries.length} existing channels: ${deduped.length} new (${before - deduped.length} duplicates skipped).`);
      if (deduped.length === 0) {
        console.log('No new channels to append.');
        process.exit(0);
      }
      // Replace filtered with deduped
      filtered.length = 0;
      filtered.push(...deduped);
    } else {
      console.log('No existing file found — will create new.');
    }
  }

  console.log('Assigning IDs and categories...');
  const channels = assignChannels(filtered);

  // Mark CORS-prone channels at import time
  for (const ch of channels) {
    if (needsProxy(ch.streamUrl)) {
      ch.needsProxy = true;
    }
  }

  const fileContent = generateChannelFile(channels, existingData);

  const outputDir = path.dirname(args.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(args.outputFile, fileContent, 'utf-8');
  const totalMsg = existingData
    ? `\nAppended ${channels.length} new channels to: ${args.outputFile} (total: ${existingData.entries.length + channels.length})`
    : `\nWritten ${channels.length} channels to: ${args.outputFile}`;
  console.log(totalMsg);

  const categoryMap = new Map<string, number>();
  for (const ch of channels) {
    categoryMap.set(ch.category, (categoryMap.get(ch.category) || 0) + 1);
  }

  const sortedCategories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\nCategories (${sortedCategories.length}):`);
  for (const [cat, count] of sortedCategories) {
    console.log(`  ${cat}: ${count} channels`);
  }

  const featured = channels.filter(ch => ch.isFeatured);
  console.log(`\nFeatured channels: ${featured.length}`);
  for (const ch of featured) {
    console.log(`  ★ ${ch.name} (${ch.category})`);
  }

  console.log('\nDone! Run "npm run build" to verify.');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
