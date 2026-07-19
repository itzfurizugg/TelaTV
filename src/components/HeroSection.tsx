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
        className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImgLoaded(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-tela-accent">
      {channel.name.charAt(0)}
    </div>
  );
}

interface HeroSectionProps {
  featuredChannels: Channel[];
  activeChannel: Channel | null;
  heroFocused: boolean;
  onPlay: (channel: Channel) => void;
}

export default function HeroSection({ featuredChannels, activeChannel, heroFocused, onPlay }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const heroChannel = activeChannel && activeChannel.isFeatured
    ? activeChannel
    : featuredChannels[currentIndex] ?? null;

  useEffect(() => {
    if (featuredChannels.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featuredChannels.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [featuredChannels.length]);

  const handlePlay = useCallback(() => {
    if (heroChannel) onPlay(heroChannel);
  }, [heroChannel, onPlay]);

  if (!heroChannel) return null;

  return (
    <div
      data-hero
      className={`relative w-full h-[220px] md:h-[350px] mb-8 overflow-hidden rounded-2xl md:rounded-3xl mx-2 md:mx-4 transition-all duration-300 ${
        heroFocused ? 'ring-2 ring-tela-accent shadow-[0_0_30px_rgba(99,102,241,0.3)]' : ''
      }`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: heroChannel.logoUrl ? `url(${heroChannel.logoUrl})` : undefined,
          filter: 'blur(60px) brightness(0.3) saturate(1.5)',
          transform: 'scale(1.3)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-tela-bg via-tela-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-tela-bg/80 to-transparent" />

      <div className="relative z-10 h-full flex items-end p-4 md:p-10">
        <div className="flex items-end gap-4 md:gap-8 max-w-4xl">
          <div className="w-[80px] h-[80px] md:w-[140px] md:h-[140px] rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 bg-tela-surface border-2 border-white/10 shadow-2xl">
            <HeroChannelLogo key={heroChannel.id} channel={heroChannel} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-tela-accent mb-1 md:mb-2 uppercase tracking-widest">
              Featured
            </p>
            <h1 className="text-2xl md:text-5xl font-extrabold text-white mb-1 md:mb-3 tracking-tight leading-tight truncate">
              {heroChannel.name}
            </h1>
            <p className="text-sm md:text-lg text-tela-textMuted mb-3 md:mb-6">{heroChannel.category}</p>
            <button
              onClick={handlePlay}
              className={`btn btn-sm md:btn-lg border-none text-white font-semibold px-6 md:px-10 gap-2 md:gap-3 rounded-lg md:rounded-xl transition-all duration-200 ${
                heroFocused
                  ? 'bg-tela-accentGlow shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-105'
                  : 'bg-tela-accent hover:bg-tela-accentGlow hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play Now
            </button>
          </div>
        </div>

        {featuredChannels.length > 1 && (
          <div className="absolute bottom-4 md:bottom-6 right-4 md:right-10 flex gap-2">
            {featuredChannels.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'bg-tela-accent w-6'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
