#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_PATH = path.resolve(__dirname, '../src/data/channels.ts');

const CATEGORY_ORDER = [
  'Local', 'News', 'Sports', 'Animation', 'Kids', 'Movies',
  'Entertainment', 'Music', 'Lifestyle', 'Religion', 'Education',
  'Business', 'Government', 'Culture', 'Other',
];

const CATEGORY_MAP = {
  'Local': ['Indonesia', 'General', 'lokal', 'daerah'],
};

// tvgId patterns that indicate Indonesian channels
const INDONESIAN_TVGID_PATTERNS = [
  /\.id$/i, /\.id@/i,
];

// Known Indonesian TV channel names (national networks)
const INDONESIAN_CHANNEL_NAMES = [
  'trans tv', 'trans7', 'metro tv', 'tvri', 'rcti', 'mnctv', 'gtv',
  'inews', 'kompas tv', 'sctv', 'indosiar', 'moji', 'antv', 'tvone',
  'nusantara tv', 'garuda tv', 'mdtv', 'magna channel', 'jtv',
  'bandung tv', 'jambi tv', 'celebes tv', 'padang tv', 'batam tv',
  'banten tv', 'banyumas tv', 'banjar tv', 'balikpapan tv',
  'beritasatu', 'cnbc indonesia', 'cnn indonesia',
  'jakarta globe', 'huma betang tv',
  'jawapos tv', 'jogja tv', 'jogja istimewa tv',
  'surabaya tv', 'semarang tv', 'radar tasikmalaya tv',
  'riau tv', 'sampit tv', 'sultra tv', 'timor tv',
  'atambua tv', 'dhoho tv', 'duta tv', 'elshin',
  'kawanua tv', 'kilisuci tv', 'lingkar tv',
  'salira tv', 'online tv nusantara',
  'daai tv', 'rodja tv', 'ahsan tv', 'nabawi tv', 'madani tv',
  'tv mu', 'tv tabalong', 'wesal tv', 'sakti tv',
  'salam tv', 'surau tv', 'tegar tv lampung',
  'ashil tv', 'astha tv', 'al-bahjah tv', 'al-iman tv',
  'izzah tv', 'dmi tv', 'fajar tv', 'mgi tv',
  'bintang film', 'galaxy', 'hbo', 'cinemax', 'cinemaworld',
  'thrill', 'rock action', 'soccer channel', 'champions tv',
  'sportstars', 'spotv', 'my kidz', 'biznet kids',
  'kids tv', 'biznet lifestyle',
  'bungo tv', 'pontv', 'rri net', 'sakti tv', 'stv', 'tatv',
  'tv9 nusantara', 'tvku', 'ugtv',
  'parlemen', 'mbg tv', 'tv parlemen',
  'dtvi', 'brtv',
];

function isIndonesian(ch) {
  if (!ch) return false;

  // Check by tvgId pattern
  if (ch.tvgId) {
    const tvgId = String(ch.tvgId);
    if (INDONESIAN_TVGID_PATTERNS.some(p => p.test(tvgId))) return true;
  }

  // Check by name
  if (ch.name) {
    const nameLower = ch.name.toLowerCase().trim();
    if (INDONESIAN_CHANNEL_NAMES.some(n => nameLower.includes(n))) return true;
  }

  // Check by streamUrl
  if (ch.streamUrl) {
    try {
      const url = new URL(ch.streamUrl);
      const hostname = url.hostname.toLowerCase();
      if (hostname.endsWith('.id')) return true;
      if (hostname.includes('medcom.id')) return true;
      if (hostname.includes('siar.us')) return true;
      if (hostname.includes('tv.aliman.id')) return true;
      if (hostname.includes('gentv.to')) return true;
      if (hostname.includes('juraganstreaming.com')) return true;
      if (hostname.includes('hgmtv.com')) return true;
      if (hostname.includes('tvku.tv')) return true;
    } catch {}
  }

  return false;
}

function hasTVinName(name) {
  if (!name) return false;
  return /\bTV\b/i.test(name);
}

function contentHasTV(name) {
  if (!name) return false;
  return /TV/i.test(name);
}

function categorizeByContent(ch) {
  const name = (ch.name || '').toLowerCase();

  // Religion (determined by content only, not old category)
  if (
    name.includes('angel tv') ||
    name.includes('rodja') || name.includes('ahsan') || name.includes('nabawi') ||
    name.includes('madani') || name.includes('dhamma') || name.includes('daai') ||
    name.includes('al-bahjah') || name.includes('al-iman') ||
    name.includes('izzah') || name.includes('dmi tv') || name.includes('fajar tv') ||
    name.includes('mgi tv') || name.includes('ashil') || name.includes('wesal') ||
    name.includes('salam tv') || name.includes('surau tv') ||
    name.includes('mq tv') || name.includes('mqtv') ||
    name.includes('astha') || name.includes('sakti tv') ||
    name.match(/\btv mu\b/) || name === 'tv mu'
  ) return 'Religion';

  // News (international) — must have TV in name to be kept
  if (
    name.includes('bbc') && name.includes('news') ||
    name.includes('sky news') || name.includes('cbs news') ||
    name.includes('nbc news') || name.includes('abc news') ||
    name === 'bbc world news' || name === 'cgtn' ||
    name === 'al jazeera' || name === 'euronews' ||
    name === 'france 24' || name === 'franceinfo'
  ) {
    if (hasTVinName(name) || isIndonesian(ch)) return 'News';
    return null;
  }
  if (name.includes('newsmax') || name.includes('ktn news')) return 'News';

  // Sports
  if (
    name.includes('spotv') || name.includes('soccer channel') ||
    name.includes('champions tv') || name.includes('sportstars') ||
    name.includes('bein sport') || name.includes('eurosport') ||
    name.includes('espn')
  ) return 'Sports';

  // Movies
  if (name.includes('hbo') || name.includes('cinemax') || name.includes('cinema')) return 'Movies';

  // Music
  if (name.includes('music') || name.includes('mtv') || name.includes('vh1')) return 'Music';

  return null;
}

function mapCategory(ch) {
  const name = (ch.name || '').toLowerCase();
  const url = (ch.streamUrl || '').toLowerCase();
  const tvgId = (ch.tvgId || '').toLowerCase();
  const oldCat = ch.category || '';
  const oldCatLower = oldCat.toLowerCase();

  let newCat = null;

  // Try content-based categorization first
  newCat = categorizeByContent(ch);
  if (newCat) return newCat;

  // Map by old category
  if (oldCatLower === 'indonesia') return 'Local';
  if (oldCatLower === 'general' || oldCatLower === 'uncategorized') {
    if (isIndonesian(ch)) return 'Local';
    if (name.includes('tv')) return 'Entertainment';
    return 'Other';
  }
  if (oldCatLower === 'religious') return 'Religion';
  if (oldCatLower === 'news') return 'News';
  if (oldCatLower === 'sports') return 'Sports';
  if (oldCatLower === 'kids') return 'Kids';
  if (oldCatLower === 'animation') return 'Animation';
  if (oldCatLower === 'movies') return 'Movies';
  if (oldCatLower === 'entertainment') return 'Entertainment';
  if (oldCatLower === 'music') return 'Music';
  if (oldCatLower === 'lifestyle') return 'Lifestyle';
  if (oldCatLower === 'education') return 'Education';
  if (oldCatLower === 'business') return 'Business';
  if (oldCatLower === 'legislative') return 'Government';
  if (oldCatLower === 'culture') return 'Culture';
  if (oldCatLower === 'weather') return 'Other';
  if (oldCatLower === 'tv') return 'Entertainment';

  // VOD categories -> Entertainment or Other
  if (oldCatLower.includes('vod') || oldCatLower.includes('vod movies')) return 'Entertainment';

  // Indonesian channels that weren't caught by content detection -> Local
  if (isIndonesian(ch)) {
    if (name.includes('mbg tv') || name.includes('parlemen') || name === 'rri net') return 'Government';
    if (name.includes('ugtv')) return 'Education';
    if (name.includes('pontv')) return 'Sports';
    return 'Local';
  }

  return 'Other';
}

function shouldKeep(ch) {
  // Always keep Indonesian channels
  if (isIndonesian(ch)) return true;

  // For international channels, only keep if name contains "TV" as standalone word
  return hasTVinName(ch.name);
}

function deduplicate(channels) {
  const seen = new Map();
  const result = [];

  // Group by tvgId (prioritize non-null)
  for (const ch of channels) {
    const key = ch.tvgId
      ? `tvg:${ch.tvgId}`
      : `name:${ch.name.toLowerCase().trim()}`;

    if (!seen.has(key)) {
      seen.set(key, ch);
      result.push(ch);
    }
  }

  return result;
}

function sortChannels(channels) {
  const catOrder = new Map(CATEGORY_ORDER.map((c, i) => [c, i]));

  return [...channels].sort((a, b) => {
    const catA = catOrder.get(a.category) ?? 999;
    const catB = catOrder.get(b.category) ?? 999;
    if (catA !== catB) return catA - catB;

    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

function generateFile(channels) {
  const lines = [
    "import type { Channel } from '../types/channel';",
    '',
    'export const channels: Channel[] = [',
  ];

  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    lines.push('  {');
    lines.push(`    id: ${JSON.stringify(ch.id)},`);
    lines.push(`    name: ${JSON.stringify(ch.name)},`);
    lines.push(`    logoUrl: ${JSON.stringify(ch.logoUrl)},`);
    lines.push(`    category: ${JSON.stringify(ch.category)},`);
    lines.push(`    streamUrl: ${JSON.stringify(ch.streamUrl)},`);
    lines.push(`    tvgId: ${JSON.stringify(ch.tvgId)},`);
    lines.push(`    isFeatured: ${ch.isFeatured},`);
    lines.push(`    sortOrder: ${i + 1},`);
    if (ch.needsProxy) lines.push(`    needsProxy: true,`);
    if (ch.verified === true) lines.push(`    verified: true,`);
    if (ch.verified === false) lines.push(`    verified: false,`);
    if (ch.needsTranscode) lines.push(`    needsTranscode: true,`);
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

function main() {
  console.log('=== Channel Cleanup ===\n');

  const content = fs.readFileSync(CHANNELS_PATH, 'utf-8');
  const fileLines = content.split('\n');

  const channels = [];
  let braceDepth = 0;
  let current = {};

  for (const line of fileLines) {
    const t = line.trim();
    if (t === '{' && braceDepth === 0) {
      current = {};
      braceDepth++;
    } else if ((t === '},' || t === '}') && braceDepth > 0) {
      braceDepth--;
      if (braceDepth === 0 && current.id) {
        channels.push(current);
      }
    } else if (braceDepth > 0) {
      const m = t.match(/^(\w+):\s*(.+)/);
      if (m) {
        let val = m[2].trim();
        if (val.endsWith(',')) val = val.slice(0, -1);
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        if (val === 'null') val = null;
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        current[m[1]] = val;
      }
    }
  }

  console.log(`Total channels: ${channels.length}`);

  // Step 1: Filter
  const kept = channels.filter(ch => shouldKeep(ch));
  const removedCount = channels.length - kept.length;
  console.log(`Removed: ${removedCount} international channels`);

  // Step 2: Recategorize
  const categoryCounts = {};
  for (const ch of kept) {
    const newCat = mapCategory(ch);
    if (!newCat) continue;
    ch.category = newCat;
    categoryCounts[newCat] = (categoryCounts[newCat] || 0) + 1;
  }

  console.log('\nCategory distribution:');
  for (const cat of CATEGORY_ORDER) {
    if (categoryCounts[cat]) console.log(`  ${cat}: ${categoryCounts[cat]}`);
  }

  const finalChannels = kept.filter(ch => ch.category);

  // Step 3: Deduplicate
  const deduped = deduplicate(finalChannels);
  console.log(`\nAfter dedup: ${deduped.length} (removed ${finalChannels.length - deduped.length} duplicates)`);

  // Step 4: Sort
  const sorted = sortChannels(deduped);
  sorted.forEach((ch, i) => { ch.sortOrder = i + 1; ch.isFeatured = false; });

  // Step 5: Generate file
  const output = generateFile(sorted);
  fs.writeFileSync(CHANNELS_PATH, output, 'utf-8');

  console.log(`\nWritten ${sorted.length} channels to: ${CHANNELS_PATH}`);
  console.log('Done! Run "npm run build" to verify.');
}

main();
