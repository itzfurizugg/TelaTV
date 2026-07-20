import { useState, useEffect } from 'react';

interface WelcomePopupProps {
  onDismiss: () => void;
}

export default function WelcomePopup({ onDismiss }: WelcomePopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`relative w-full max-w-md mx-4 bg-tela-surface rounded-3xl p-8 md:p-10 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-tela-accent/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="relative flex justify-center mb-6">
          <div className="w-20 h-20 rounded-3xl bg-tela-accent/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-tela-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Text */}
        <h2 className="relative text-2xl md:text-3xl font-bold text-center text-tela-text mb-3">
          Selamat Datang!
        </h2>
        <p className="relative text-center text-tela-textMuted text-sm md:text-base leading-relaxed mb-8">
          Nikmati ribuan channel TV langsung dari browser kamu. Gunakan keyboard untuk navigasi layaknya remote TV.
        </p>

        {/* Shortcuts */}
        <div className="relative grid grid-cols-2 gap-3 mb-8">
          <div className="flex items-center gap-2.5 bg-tela-card rounded-xl px-3 py-2.5">
            <kbd className="kbd kbd-xs bg-tela-cardHover px-2 py-1 text-xs font-bold text-tela-text">↑↓←→</kbd>
            <span className="text-xs text-tela-textMuted">Navigate</span>
          </div>
          <div className="flex items-center gap-2.5 bg-tela-card rounded-xl px-3 py-2.5">
            <kbd className="kbd kbd-xs bg-tela-cardHover px-2 py-1 text-xs font-bold text-tela-text">Enter</kbd>
            <span className="text-xs text-tela-textMuted">Play</span>
          </div>
          <div className="flex items-center gap-2.5 bg-tela-card rounded-xl px-3 py-2.5">
            <kbd className="kbd kbd-xs bg-tela-cardHover px-2 py-1 text-xs font-bold text-tela-text">/</kbd>
            <span className="text-xs text-tela-textMuted">Search</span>
          </div>
          <div className="flex items-center gap-2.5 bg-tela-card rounded-xl px-3 py-2.5">
            <kbd className="kbd kbd-xs bg-tela-cardHover px-2 py-1 text-xs font-bold text-tela-text">Q</kbd>
            <span className="text-xs text-tela-textMuted">Back</span>
          </div>
        </div>

        {/* Button */}
        <button
          onClick={handleDismiss}
          className="relative w-full py-3.5 rounded-2xl bg-tela-accent hover:bg-tela-accentGlow text-white font-bold text-base transition-all duration-200 hover:shadow-[0_8px_30px_rgba(10,132,255,0.3)]"
        >
          Mulai Menonton
        </button>
      </div>
    </div>
  );
}
