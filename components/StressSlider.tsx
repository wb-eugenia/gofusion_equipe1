'use client';

import { useState } from 'react';

interface StressSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  emoji?: string;
}

export default function StressSlider({ value, onChange, label, emoji = '😊' }: StressSliderProps) {
  const emojis = ['😊', '😌', '😐', '😰', '😱'];
  const colors = ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'];
  
  const getEmoji = (val: number) => {
    if (val <= 2) return emojis[0];
    if (val <= 4) return emojis[1];
    if (val <= 6) return emojis[2];
    if (val <= 8) return emojis[3];
    return emojis[4];
  };

  const getColor = (val: number) => {
    if (val <= 2) return colors[0];
    if (val <= 4) return colors[1];
    if (val <= 6) return colors[2];
    if (val <= 8) return colors[3];
    return colors[4];
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-3">
        <label className="text-lg font-semibold text-gray-900">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getEmoji(value)}</span>
          <span 
            className="text-2xl font-bold"
            style={{ color: getColor(value) }}
          >
            {value}/10
          </span>
        </div>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${colors[0]} 0%, ${colors[1]} 25%, ${colors[2]} 50%, ${colors[3]} 75%, ${colors[4]} 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Très faible</span>
        <span>Faible</span>
        <span>Moyen</span>
        <span>Élevé</span>
        <span>Très élevé</span>
      </div>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${getColor(value)};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${getColor(value)};
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

