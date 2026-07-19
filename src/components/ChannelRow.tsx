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

  // Scroll agar card yang difokus selalu di tengah viewport.
  // Menggunakan getBoundingClientRect untuk akurasi (tidak terpengaruh padding/scrollLeft).
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = scrollRef.current;
    if (!el) return;

    // requestAnimationFrame pastikan DOM sudah ter-update setelah render
    const raf = requestAnimationFrame(() => {
      const card = el.querySelector<HTMLElement>(`[data-card="${focusedIndex}"]`);
      if (!card) return;

      const containerRect = el.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      // Posisi center card relatif terhadap viewport
      const cardCenter = cardRect.left + cardRect.width / 2;
      // Posisi center scroll container relatif terhadap viewport
      const containerCenter = containerRect.left + containerRect.width / 2;

      // Delta: berapa px scroll yang diperlukan
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
      className="group/row mb-6 md:mb-8 animate-slide-in"
      style={{ animationDelay: `${rowIndex * 50}ms` }}
    >
      <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-3 px-4 md:px-12">
        <h2 className="text-lg md:text-2xl font-bold tracking-tight text-white">{title}</h2>
        <span className="rounded-full bg-tela-surface px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium text-tela-textMuted">
          {channels.length}
        </span>
      </div>

      <div className="relative">
        {/* Fade tepi kiri */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-12 md:w-16 bg-gradient-to-r from-tela-bg to-transparent transition-opacity duration-200 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Fade tepi kanan */}
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 md:w-16 bg-gradient-to-l from-tela-bg to-transparent transition-opacity duration-200 ${
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
            className="absolute left-1 md:left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-1.5 md:p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/80 group-hover/row:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth="2">
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
            className="absolute right-1 md:right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-1.5 md:p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/80 group-hover/row:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          role="list"
          aria-label={`Daftar channel kategori ${title}`}
          className="hide-scrollbar flex gap-3 md:gap-5 overflow-x-auto px-4 md:px-12 py-4 md:py-6"
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
