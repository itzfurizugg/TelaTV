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
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
  'from-orange-500 to-orange-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
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
    <div
      className={`relative transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
        isFocused ? 'scale-[1.08] z-10' : 'hover:scale-[1.03] active:scale-[0.98]'
      }`}
    >
      {/* Ambient glow */}
      <div
        className={`absolute -inset-4 md:-inset-6 rounded-3xl md:rounded-[2rem] transition-all duration-300 ease-out pointer-events-none ${
          isFocused
            ? 'bg-tela-accent/20 blur-2xl md:blur-3xl opacity-100'
            : 'opacity-0 blur-xl'
        }`}
      />

      {/* Card */}
      <button
        data-row={rowIndex}
        data-card={cardIndex}
        onClick={() => onSelect(channel)}
        aria-label={`Putar ${channel.name}`}
        aria-current={isActive ? 'true' : undefined}
        tabIndex={-1}
        className={`
          tv-focus-ring group relative flex-shrink-0 w-[200px] md:w-[320px] aspect-video
          rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer will-change-transform
          bg-tela-card
          transition-shadow duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]
          ${
            isFocused
              ? 'shadow-[0_8px_40px_rgba(0,0,0,0.5)]'
              : 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
          }
        `}
      >
        {/* Background: logo atau gradient avatar */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-tela-surface to-tela-card">
          {channel.logoUrl ? (
            <img
              src={channel.logoUrl}
              alt=""
              className="max-h-[60%] max-w-[60%] object-contain drop-shadow-lg"
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
            className={`h-14 w-14 md:h-18 md:w-18 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl md:text-3xl font-bold text-white shadow-2xl ${getAvatarGradient(
              channel.name
            )} ${channel.logoUrl ? 'hidden' : 'flex'}`}
          >
            {channel.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Gradient overlay di bawah untuk teks */}
        <div className="absolute inset-0 bg-gradient-to-t from-tela-bg via-tela-bg/60 to-transparent" />

        {/* Info channel di bawah */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
          <p
            title={channel.name}
            className={`truncate text-sm md:text-base font-semibold leading-tight transition-colors ${
              isFocused ? 'text-tela-text' : 'text-tela-text/90'
            }`}
          >
            {channel.name}
          </p>
          <p className="mt-1.5 truncate text-[11px] md:text-xs font-medium uppercase tracking-wider text-tela-textMuted">
            {channel.category}
          </p>
        </div>

        {/* LIVE badge */}
        {isActive && (
          <span className="absolute right-2.5 top-2.5 md:right-4 md:top-4 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
        )}

        {/* Blue focus indicator line */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[3px] md:h-1 bg-tela-accent transition-all duration-200 ease-out ${
            isFocused
              ? 'opacity-100 scale-x-100'
              : 'opacity-0 scale-x-0'
          }`}
        />
      </button>
    </div>
  );
}
