import { useRef, useEffect, useState, useCallback } from 'react';
import ChannelCard from './ChannelCard';
import type { Channel } from '../types/channel';

interface ChannelRowProps {
  title: string;
  channels: Channel[];
  focusedIndex: number;
  activeChannelId: string | null;
  onSelect: (channel: Channel) => void;
  rowIndex: number;
}

export default function ChannelRow({
  title,
  channels,
  focusedIndex,
  activeChannelId,
  onSelect,
  rowIndex,
}: ChannelRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, channels.length]);

  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = scrollRef.current;
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      const card = el.querySelector<HTMLElement>(`[data-card="${focusedIndex}"]`);
      if (!card) return;

      const containerRect = el.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      const cardCenter = cardRect.left + cardRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;

      const delta = cardCenter - containerCenter;

      if (Math.abs(delta) > 1) {
        el.scrollBy({ left: delta, behavior: 'smooth' });
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [focusedIndex]);

  function scrollByAmount(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  if (channels.length === 0) return null;

  return (
    <div
      data-row-index={rowIndex}
      className="group/row mb-10 md:mb-14 animate-slide-in"
      style={{ animationDelay: `${rowIndex * 50}ms` }}
    >
      {/* Title */}
      <div className="mb-5 md:mb-6 flex items-center gap-3 px-6 md:px-16">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-tela-text">{title}</h2>
        <span className="text-sm md:text-base font-medium text-tela-textMuted">
          {channels.length}
        </span>
      </div>

      {/* Scroll container */}
      <div className="relative">
        {/* Fade tepi kiri */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-20 md:w-32 bg-gradient-to-r from-tela-bg to-transparent transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Fade tepi kanan */}
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-20 md:w-32 bg-gradient-to-l from-tela-bg to-transparent transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Tombol panah */}
        {canScrollLeft && (
          <button
            type="button"
            aria-label={`Scroll ${title} ke kiri`}
            onClick={() => scrollByAmount('left')}
            tabIndex={-1}
            className="absolute left-2 md:left-4 top-1/2 z-20 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-tela-surface/80 backdrop-blur-xl flex items-center justify-center text-tela-text opacity-0 transition-all duration-200 hover:bg-tela-surface group-hover/row:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            aria-label={`Scroll ${title} ke kanan`}
            onClick={() => scrollByAmount('right')}
            tabIndex={-1}
            className="absolute right-2 md:right-4 top-1/2 z-20 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-tela-surface/80 backdrop-blur-xl flex items-center justify-center text-tela-text opacity-0 transition-all duration-200 hover:bg-tela-surface group-hover/row:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Cards */}
        <div
          ref={scrollRef}
          role="list"
          aria-label={`Daftar channel kategori ${title}`}
          className="hide-scrollbar flex gap-5 md:gap-8 overflow-x-auto px-6 md:px-16 py-4 md:py-6"
        >
          {channels.map((channel, idx) => (
            <div key={channel.id} role="listitem">
              <ChannelCard
                channel={channel}
                isFocused={idx === focusedIndex}
                isActive={channel.id === activeChannelId}
                onSelect={onSelect}
                rowIndex={rowIndex}
                cardIndex={idx}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
