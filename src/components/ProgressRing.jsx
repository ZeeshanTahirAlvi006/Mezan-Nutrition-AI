import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * ProgressRing — Animated SVG circular progress indicator.
 *
 * Props:
 *   value     — current numeric value (e.g. 1250)
 *   max       — target/goal value (e.g. 2000)
 *   size      — diameter in px (default 160)
 *   stroke    — ring thickness in px (default 10)
 *   color     — base color string (CSS value)
 *   label     — bottom label text (e.g. "Calories")
 *   unit      — unit suffix inside the ring (e.g. "kcal", "g")
 *   icon      — Material Symbol icon name (optional)
 *   className — additional wrapper classes
 */
const ProgressRing = ({
  value = 0,
  max = 100,
  size = 160,
  stroke = 10,
  color = 'var(--color-primary)',
  label = '',
  unit = '',
  icon = '',
  className = '',
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1.5) : 0; // cap at 150% for overflow visual
  const displayPct = Math.min(Math.round((value / (max || 1)) * 100), 999);

  // Determine dynamic color based on percentage
  const dynamicColor =
    displayPct > 110
      ? 'var(--color-error)'          // Over goal — red warning
      : displayPct > 85
        ? 'var(--color-data-carbs)'    // Approaching goal — amber
        : color;                        // Normal — provided color

  // Spring animation for the dash offset
  const springProgress = useSpring(0, { stiffness: 60, damping: 18 });
  const dashOffset = useTransform(springProgress, (v) => circumference * (1 - v));

  useEffect(() => {
    springProgress.set(Math.min(pct, 1)); // animate to 100% max visually
  }, [pct, springProgress]);

  // Animated number counter
  const numberRef = useRef(null);
  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    const duration = 900;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      if (numberRef.current) {
        numberRef.current.textContent = current.toLocaleString();
      }
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="glass-ring-card rounded-2xl p-4 relative" style={{ width: size + 24, height: size + 24 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block mx-auto"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-container-low)"
            strokeWidth={stroke}
            opacity={0.6}
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={dynamicColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
            filter="drop-shadow(0 2px 6px rgba(0,0,0,0.1))"
          />
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ padding: 12 }}
        >
          {icon && (
            <span
              className="material-symbols-outlined mb-0.5"
              style={{ fontSize: 18, color: dynamicColor }}
            >
              {icon}
            </span>
          )}
          <span
            ref={numberRef}
            className="font-headline font-bold text-text-rich-black leading-none"
            style={{ fontSize: size > 140 ? 28 : 18 }}
          >
            0
          </span>
          {unit && (
            <span
              className="text-on-surface-variant font-semibold uppercase tracking-wider mt-0.5"
              style={{ fontSize: size > 140 ? 10 : 8 }}
            >
              {unit}
            </span>
          )}
          <span
            className="font-semibold mt-0.5"
            style={{
              fontSize: size > 140 ? 11 : 9,
              color: dynamicColor,
            }}
          >
            {displayPct}%
          </span>
        </div>
      </div>

      {/* Label */}
      {label && (
        <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
};

export default ProgressRing;
