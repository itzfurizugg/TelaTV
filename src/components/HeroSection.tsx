import { useState, useEffect, useCallback } from 'react';
import type { Channel } from '../types/channel';

interface HeroChannelLogoProps {
  channel: Channel;
}

function HeroChannelLogo({ channel }: HeroChannelLogoProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (channel.logoUrl) {
    return (
      <img
        src={channel.logoUrl}
        alt={channel.name}
        className={`w-full h-full object-contain p-4 transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImgLoaded(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-7xl font-extrabold text-tela-text">
      {channel.name.charAt(0)}
    </div>
  );
}

interface HeroSectionProps {
  featuredChannels: Channel[];
  activeChannel: Channel | null;
  heroFocused: boolean;
  heroIndex: number;
  onHeroIndexChange: (index: number) => void;
  onPlay: (channel: Channel) => void;
}

export default function HeroSection({ featuredChannels, activeChannel, heroFocused, heroIndex, onHeroIndexChange, onPlay }: HeroSectionProps) {
  const heroChannel = activeChannel && activeChannel.isFeatured
    ? activeChannel
    : featuredChannels[heroIndex] ?? null;

  useEffect(() => {
    if (featuredChannels.length <= 1) return;

    const interval = setInterval(() => {
      onHeroIndexChange((heroIndex + 1) % featuredChannels.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [featuredChannels.length, heroIndex, onHeroIndexChange]);

  const handlePlay = useCallback(() => {
    if (heroChannel) onPlay(heroChannel);
  }, [heroChannel, onPlay]);

  if (!heroChannel) return null;

  return (
    <div
      data-hero
      className={`relative w-full h-[300px] md:h-[480px] mb-12 overflow-hidden rounded-3xl md:rounded-[2rem] mx-2 md:mx-4 transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
        heroFocused ? 'shadow-[0_16px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]' : ''
      }`}
    >
      {/* Background blur */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{
          backgroundImage: heroChannel.logoUrl ? `url(${heroChannel.logoUrl})` : undefined,
          filter: 'blur(80px) brightness(0.25) saturate(1.3)',
          transform: 'scale(1.4)',
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-tela-bg via-tela-bg/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-tela-bg/60 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-tela-bg/30 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end p-8 md:p-14">
        <div className="flex items-end gap-6 md:gap-12 max-w-5xl">
          {/* Logo */}
          <div className="w-[100px] h-[100px] md:w-[180px] md:h-[180px] rounded-3xl md:rounded-[2rem] overflow-hidden flex-shrink-0 bg-tela-surface/80 backdrop-blur-xl shadow-2xl">
            <HeroChannelLogo key={heroChannel.id} channel={heroChannel} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-semibold text-tela-accent mb-2 md:mb-3 uppercase tracking-[0.25em]">
              Featured
            </p>
            <h1 className="text-4xl md:text-7xl font-extrabold text-tela-text mb-2 md:mb-5 tracking-tight leading-[1.1] truncate">
              {heroChannel.name}
            </h1>
            <p className="text-lg md:text-2xl font-medium text-tela-textMuted mb-5 md:mb-10">{heroChannel.category}</p>
            <button
              onClick={handlePlay}
              className={`flex items-center gap-3 md:gap-4 rounded-full md:rounded-2xl px-8 md:px-14 py-3 md:py-5 text-base md:text-xl font-bold transition-all duration-200 ${
                heroFocused
                  ? 'bg-tela-accent text-white shadow-[0_8px_40px_rgba(10,132,255,0.35)] scale-105'
                  : 'bg-tela-surface/80 text-tela-text backdrop-blur-xl hover:bg-tela-surface border border-tela-cardHover/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play Now
            </button>
          </div>
        </div>

        {/* Pagination dots */}
        {featuredChannels.length > 1 && (
          <div className="absolute bottom-8 md:bottom-14 right-8 md:right-14 flex gap-3">
            {featuredChannels.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onHeroIndexChange(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === heroIndex
                    ? 'bg-tela-accent w-8'
                    : 'bg-tela-textMuted/30 hover:bg-tela-textMuted/50 w-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
