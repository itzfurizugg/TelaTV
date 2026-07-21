import { useState, useMemo, useCallback, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import HeroSection from './components/HeroSection';
import ChannelRow from './components/ChannelRow';
import IPTVPlayer from './components/IPTVPlayer';
import SplashScreen from './components/SplashScreen';
import WelcomePopup from './components/WelcomePopup';
import { channels } from './data/channels';
import { pildunChannels } from './data/pildunChannels';
import { groupChannelsByCategory, filterChannelsBySearch, getFeaturedChannels } from './utils/groupChannels';
import { useTvNavigation } from './hooks/useTvNavigation';
import logo from './assets/logo.svg';
import type { Channel } from './types/channel';

const allChannels: Channel[] = [...channels, ...pildunChannels];
const allCategories = groupChannelsByCategory(allChannels);
const featuredChannels = getFeaturedChannels(allChannels);

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerChannel, setPlayerChannel] = useState<Channel | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('tela-welcomed');
  });

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

  const heroChannel = useMemo(() => {
    if (selectedChannel?.isFeatured) return selectedChannel;
    if (focusedChannel?.isFeatured) return focusedChannel;
    return featuredChannels[heroIndex] ?? null;
  }, [selectedChannel, focusedChannel, heroIndex]);

  const handlePlayFullscreen = useCallback((channel: Channel) => {
    setPlayerChannel(channel);
    setIsFullscreen(true);
  }, []);

  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    handlePlayFullscreen(channel);
  }, [handlePlayFullscreen]);

  const handleBackFromPlayer = useCallback(() => {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem('tela-welcomed', '1');
  }, []);

  useEffect(() => {
    if (isFullscreen) return;
    const raf = requestAnimationFrame(() => {
      if (focus.rowIndex === -1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
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
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter' && !isFullscreen && !showSplash && !showWelcome) {
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
  }, [heroFocused, heroChannel, focusedChannel, isFullscreen, handlePlayFullscreen, showSplash, showWelcome]);

  if (isFullscreen && playerChannel) {
    return <IPTVPlayer channel={playerChannel} onBack={handleBackFromPlayer} />;
  }

  return (
    <div className="min-h-screen bg-tela-bg">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Welcome Popup */}
      {showWelcome && !showSplash && <WelcomePopup onDismiss={handleDismissWelcome} />}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-tela-bg/80 via-tela-bg/40 to-transparent">
        <div className="max-w-screen-2xl mx-auto flex h-16 items-center gap-5 px-6 md:h-20 md:gap-8 md:px-14 justify-between">
          <img src={logo} alt="Tela" className="h-7 w-auto shrink-0 md:h-14" />

          <div className="max-w-sm flex-1 md:max-w-lg">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <span className="hidden shrink-0 whitespace-nowrap text-sm md:text-base font-medium text-tela-textMuted md:block">
            {allChannels.length} channels
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto pt-6 pb-24">
        {!searchQuery && (
          <HeroSection
            featuredChannels={featuredChannels}
            activeChannel={heroChannel}
            heroFocused={heroFocused}
            heroIndex={heroIndex}
            onHeroIndexChange={setHeroIndex}
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

      {/* Footer */}
      <footer className="fixed bottom-0 inset-x-0 bg-tela-bg/90 backdrop-blur-xl border-t border-white/5 z-30 hidden md:block">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-14 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-5 text-sm text-tela-textMuted">
            <span className="flex items-center gap-2">
              <kbd className="kbd kbd-xs p-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </kbd>
              <kbd className="kbd kbd-xs p-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-2">
              <kbd className="kbd kbd-xs p-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
              </kbd>
              <kbd className="kbd kbd-xs p-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </kbd>
              Rows
            </span>
            <span className="flex items-center gap-2">
              <kbd className="kbd kbd-xs py-1.5 px-3 font-bold">Enter</kbd>
              Play
            </span>
            <span className="flex items-center gap-2">
              <kbd className="kbd kbd-xs py-1.5 px-3 font-bold">/</kbd>
              Search
            </span>
            <span className="flex items-center gap-2">
              <kbd className="kbd kbd-xs py-1.5 px-3 font-bold">Q</kbd>
              Back
            </span>
          </div>
          {heroChannel && (
            <span className="text-sm font-semibold text-tela-accent truncate max-w-xs">
              {heroChannel.name}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
