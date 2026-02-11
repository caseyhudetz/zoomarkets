"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  vx: number;
  vy: number;
}

const COLORS = ["#00ff88", "#ff3366", "#00bbff", "#aa55ff", "#ffcc00"];

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
    }));

    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            animation: `confetti-fall 2.5s ease-in forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            top: -5%;
            opacity: 1;
          }
          100% {
            top: 105%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
