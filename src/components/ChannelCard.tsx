import type { Channel } from '../types/channel';

interface ChannelCardProps {
  channel: Channel;
  isFocused: boolean;
  isActive: boolean;
  onSelect: (channel: Channel) => void;
  rowIndex: number;
  cardIndex: number;
}

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

function getAvatarGradient(name: string) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export default function ChannelCard({
  channel,
  isFocused,
  isActive,
  onSelect,
  rowIndex,
  cardIndex,
}: ChannelCardProps) {
  return (
    <button
      data-row={rowIndex}
      data-card={cardIndex}
      onClick={() => onSelect(channel)}
      aria-label={`Putar ${channel.name}`}
      aria-current={isActive ? 'true' : undefined}
      tabIndex={-1}
      className={`
        tv-focus-ring group relative flex-shrink-0 w-[160px] md:w-[280px] aspect-video
        rounded-lg md:rounded-xl overflow-hidden cursor-pointer will-change-transform
        bg-tela-card border-2 shadow-lg shadow-black/20
        transition-[transform,box-shadow,border-color] duration-200 ease-out
        ${
          isFocused
            ? 'border-tela-accent scale-110 shadow-2xl shadow-tela-accent/30 z-10'
            : 'border-transparent hover:border-tela-cardHover hover:scale-105 active:scale-95'
        }
      `}
    >
      {/* Background: logo atau gradient avatar */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-tela-surface to-tela-card">
        {channel.logoUrl ? (
          <img
            src={channel.logoUrl}
            alt=""
            className="max-h-[70%] max-w-[70%] object-contain drop-shadow-sm"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className={`h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-lg md:rounded-xl bg-gradient-to-br text-lg md:text-xl font-bold text-white shadow-inner ${getAvatarGradient(
            channel.name
          )} ${channel.logoUrl ? 'hidden' : 'flex'}`}
        >
          {channel.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Gradient overlay di bawah untuk teks */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Info channel di bawah */}
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-3">
        <p
          title={channel.name}
          className={`truncate text-xs md:text-sm font-semibold leading-tight transition-colors ${
            isFocused ? 'text-white' : 'text-tela-text'
          }`}
        >
          {channel.name}
        </p>
        <p className="mt-0.5 truncate text-[8px] md:text-[10px] uppercase tracking-wide text-tela-textMuted">
          {channel.category}
        </p>
      </div>

      {/* LIVE badge */}
      {isActive && (
        <span className="absolute right-1.5 top-1.5 md:right-2 md:top-2 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 md:px-2 text-[8px] md:text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          <span className="h-1 w-1 md:h-1.5 md:w-1.5 animate-pulse rounded-full bg-green-400" />
          Live
        </span>
      )}

      {/* Glow saat fokus */}
      {isFocused && (
        <div className="pointer-events-none absolute inset-0 rounded-lg md:rounded-xl ring-2 ring-tela-accentGlow/50 animate-glow-pulse" />
      )}
    </button>
  );
}
