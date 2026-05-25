import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * ConcentricRings — Nested circular progress arcs (Apple Watch style).
 *
 * Props:
 *   rings — Array of { value, max, color, label, unit }
 *   size  — outer diameter in px (default 220)
 *   gap   — spacing between rings in px (default 6)
 *   strokeWidth — thickness of each ring (default 12)
 */

const AnimatedArc = ({ cx, cy, radius, circumference, pct, color, strokeWidth, delay = 0 }) => {
  const spring = useSpring(0, { stiffness: 50, damping: 16 });
  const offset = useTransform(spring, (v) => circumference * (1 - v));

  useEffect(() => {
    const timer = setTimeout(() => spring.set(Math.min(pct, 1)), delay);
    return () => clearTimeout(timer);
  }, [pct, spring, delay]);

  return (
    <>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--color-surface-container-low)"
        strokeWidth={strokeWidth}
        opacity={0.5}
      />
      {/* Progress */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: offset }}
        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.12))"
      />
    </>
  );
};

const ConcentricRings = ({
  rings = [],
  size = 220,
  gap = 6,
  strokeWidth = 12,
  className = '',
  centerLabel = '',
  centerValue = '',
  centerUnit = '',
}) => {
  const cx = size / 2;
  const cy = size / 2;

  // Outermost ring radius, then shrink inward
  const outerRadius = (size - strokeWidth) / 2;

  return (
    <div className={`flex flex-col items-center gap-6 w-full ${className}`}>
      {/* SVG Rings Container - Clean, zero text overlap */}
      <div className="glass-ring-card rounded-2xl p-4 flex-shrink-0 flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.02)]" style={{ width: size + 32, height: size + 32 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {rings.map((ring, i) => {
            const radius = outerRadius - i * (strokeWidth + gap);
            if (radius <= 0) return null;
            const circumference = 2 * Math.PI * radius;
            const pct = ring.max > 0 ? Math.min(ring.value / ring.max, 1.5) : 0;

            return (
              <AnimatedArc
                key={ring.label}
                cx={cx}
                cy={cy}
                radius={radius}
                circumference={circumference}
                pct={pct}
                color={ring.color}
                strokeWidth={strokeWidth}
                delay={i * 120}
              />
            );
          })}
        </svg>
      </div>

      {/* Main Remaining Calorie Readout at the Bottom */}
      {centerValue && (
        <div className="text-center bg-surface-container-low/40 border border-outline-variant/15 px-6 py-3 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-xs w-full">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant/70 leading-none">
            {centerLabel || "Remaining"}
          </p>
          <p className="text-2xl font-black text-text-rich-black mt-1">
            {centerValue} <span className="text-sm font-semibold text-on-surface-variant/60">{centerUnit}</span>
          </p>
        </div>
      )}

      {/* Structured Grid of Nutrition Stats at the Bottom */}
      <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl">
        {rings.map((ring) => {
          const pct = ring.max > 0 ? Math.round((ring.value / ring.max) * 100) : 0;
          return (
            <div
              key={ring.label}
              className="flex flex-col bg-surface-container-lowest/50 backdrop-blur-sm p-3.5 rounded-2xl border border-outline-variant/15 shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:border-primary/20 transition-all min-w-[110px] flex-1 max-w-[160px]"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ring.color }}
                />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant">
                  {ring.label}
                </span>
              </div>
              
              <div className="mt-auto">
                <p className="text-sm font-black text-text-rich-black leading-tight">
                  {Math.round(ring.value).toLocaleString()}
                  <span className="text-[10px] text-on-surface-variant/60 font-medium">
                    {' '}{ring.unit}
                  </span>
                </p>
                <div className="flex items-center justify-between mt-1 text-[9px] font-bold text-on-surface-variant/70">
                  <span>Goal: {ring.max.toLocaleString()}</span>
                  <span style={{ color: ring.color }}>{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConcentricRings;
