"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#F59E0B", "#0D9488", "#14B8A6", "#FBB924", "#6FE7CC", "#FCCB4D"];
const COUNT = 28;

interface Piece {
  x: number;
  delay: number;
  color: string;
  size: number;
  rotate: number;
}

function randomPieces(): Piece[] {
  return Array.from({ length: COUNT }, () => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
  }));
}

interface Props {
  onDone?: () => void;
}

export function Confetti({ onDone }: Props) {
  const pieces = useRef(randomPieces()).current;

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${1.0 + Math.random() * 0.6}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
