import { useState, useMemo, useCallback, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import HeroSection from './components/HeroSection';
import ChannelRow from './components/ChannelRow';
import FullscreenPlayer from './components/FullscreenPlayer';
import { channels } from './data/channels';
import { groupChannelsByCategory, filterChannelsBySearch, getFeaturedChannels } from './utils/groupChannels';
import { useTvNavigation } from './hooks/useTvNavigation';
import logo from './assets/logo.svg';
import type { Channel } from './types/channel';

const allCategories = groupChannelsByCategory(channels);
const featuredChannels = getFeaturedChannels(channels);

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerChannel, setPlayerChannel] = useState<Channel | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const filteredCategories = useMemo(() => {
    return filterChannelsBySearch(allCategories, searchQuery);
  }, [searchQuery]);

  const getCardCount = useCallback((rowIndex: number) => {
    return filteredCategories[rowIndex]?.channels.length || 0;
  }, [filteredCategories]);

  const { focus, heroFocused } = useTvNavigation(
    filteredCategories.length,
    getCardCount,
    !searchQuery
  );

  const focusedChannel = useMemo(() => {
    if (filteredCategories.length > 0) {
      const row = filteredCategories[focus.rowIndex];
      return row?.channels[focus.cardIndex] ?? null;
    }
    return null;
  }, [focus, filteredCategories]);

  // Hero menampilkan channel terakhir yang di-interact:
  // - Klik card → tampilkan card yang diklik
  // - Arrow keys → tampilkan card yang difokus
  const heroChannel = selectedChannel ?? focusedChannel;

  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
  }, []);

  const handlePlayFullscreen = useCallback((channel: Channel) => {
    setPlayerChannel(channel);
    setIsFullscreen(true);
  }, []);

  const handleBackFromPlayer = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Scroll halaman secara vertikal agar row yang difokus selalu di tengah viewport
  useEffect(() => {
    if (isFullscreen) return;
    const raf = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-row-index="${focus.rowIndex}"]`);
      if (!row) return;

      const rowRect = row.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const rowCenter = rowRect.top + rowRect.height / 2;
      const delta = rowCenter - viewportCenter;

      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: 'smooth' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [focus.rowIndex, isFullscreen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isFullscreen) {
        e.preventDefault();
        if (heroFocused && heroChannel) {
          handlePlayFullscreen(heroChannel);
        } else if (focusedChannel) {
          handlePlayFullscreen(focusedChannel);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [heroFocused, heroChannel, focusedChannel, isFullscreen, handlePlayFullscreen]);

  if (isFullscreen && playerChannel) {
    return <FullscreenPlayer channel={playerChannel} onBack={handleBackFromPlayer} />;
  }

  return (
    <div className="min-h-screen bg-tela-bg">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="max-w-screen-2xl mx-auto flex h-14 items-center gap-4 px-4 md:h-16 md:gap-6 md:px-8 justify-between">
          <img src={logo} alt="Tela" className="h-6 w-auto shrink-0 md:h-12" />

          <div className="max-w-sm flex-1 md:max-w-md">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <span className="hidden shrink-0 whitespace-nowrap text-sm text-tela-textMuted md:block">
            {channels.length} channels available
          </span>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto pt-4 pb-20 mr-20 ml-10">
        {!searchQuery && (
          <HeroSection
            featuredChannels={featuredChannels}
            activeChannel={heroChannel}
            heroFocused={heroFocused}
            onPlay={handlePlayFullscreen}
          />
        )}

        {filteredCategories.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-tela-textMuted">
              {searchQuery ? 'No channels match your search' : 'No channels available'}
            </p>
          </div>
        )}

        {filteredCategories.map((cat, rowIndex) => (
          <ChannelRow
            key={cat.name}
            title={cat.name}
            channels={cat.channels}
            focusedIndex={focus.rowIndex === rowIndex ? focus.cardIndex : -1}
            activeChannelId={playerChannel?.id || null}
            onSelect={handleSelectChannel}
            rowIndex={rowIndex}
          />
        ))}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-tela-bg/80 backdrop-blur-xl border-t border-white/5 z-30 hidden md:block">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-tela-textMuted">
            <span className="flex items-center gap-1.5">
              <kbd className="kbd kbd-xs p-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </kbd>
              <kbd className="kbd kbd-xs p-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd kbd-xs p-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
              </kbd>
              <kbd className="kbd kbd-xs p-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </kbd>
              Rows
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd kbd-xs py-1 px-2 font-bold">Enter</kbd>
              Play
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd kbd-xs py-1 px-2 font-bold">/</kbd>
              Search
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="kbd kbd-xs py-1 px-2 font-bold">Q</kbd>
              Back
            </span>
          </div>
          {heroChannel && (
            <span className="text-xs text-tela-accent font-medium truncate max-w-xs">
              {heroChannel.name}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
