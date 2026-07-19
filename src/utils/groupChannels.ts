import type { Channel, CategoryGroup } from '../types/channel';

export function groupChannelsByCategory(channelList: Channel[]): CategoryGroup[] {
  const sorted = [...channelList].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  const groupMap = new Map<string, Channel[]>();

  for (const ch of sorted) {
    const group = ch.category || 'Uncategorized';
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group)!.push(ch);
  }

  const groups: CategoryGroup[] = [];
  for (const [name, channels] of groupMap) {
    groups.push({ name, channels });
  }

  return groups;
}

export function filterChannelsBySearch(
  categories: CategoryGroup[],
  query: string
): CategoryGroup[] {
  if (!query.trim()) return categories;

  const q = query.toLowerCase();
  return categories
    .map(cat => ({
      ...cat,
      channels: cat.channels.filter(
        ch =>
          ch.name.toLowerCase().includes(q) ||
          ch.category.toLowerCase().includes(q)
      ),
    }))
    .filter(cat => cat.channels.length > 0);
}

export function getFeaturedChannels(channelList: Channel[]): Channel[] {
  return channelList.filter(ch => ch.isFeatured);
}
