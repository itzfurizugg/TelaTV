import { useState, useEffect } from 'react';
import logo from '../assets/logo.svg';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 2000);
    const t3 = setTimeout(onFinish, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        phase === 'enter' ? 'opacity-0' : phase === 'visible' ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Logo */}
      <div
        className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          phase === 'visible'
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-75 translate-y-4'
        }`}
      >
        <img src={logo} alt="Tela" className="h-16 md:h-24 w-auto" />
      </div>

      {/* Loading bar */}
      <div className="mt-10 w-48 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full bg-tela-accent transition-all duration-[1800ms] ease-linear ${
            phase === 'visible' ? 'w-full' : 'w-0'
          }`}
        />
      </div>

      {/* Subtitle */}
      <p
        className={`mt-6 text-sm font-medium text-white/40 tracking-widest uppercase transition-all duration-500 delay-300 ${
          phase === 'visible' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        IPTV Player
      </p>
    </div>
  );
}
