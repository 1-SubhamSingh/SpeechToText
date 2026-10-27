import React from 'react';

export default function AudioVisualizer({ isRecording, volume = 0 }) {
  // 12 dynamic visualizer bars
  const bars = [0.4, 0.7, 0.9, 0.6, 1.0, 0.8, 0.5, 0.9, 0.7, 1.0, 0.6, 0.4];

  return (
    <div className="flex items-center justify-center gap-1.5 h-12 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800/80">
      {bars.map((weight, index) => {
        const height = isRecording
          ? Math.max(8, Math.min(42, Math.round(volume * 40 * weight + Math.random() * 6)))
          : 6;

        return (
          <div
            key={index}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isRecording
                ? 'bg-gradient-to-t from-brand-600 via-indigo-400 to-emerald-400 shadow-sm shadow-brand-500/50'
                : 'bg-slate-700'
            }`}
            style={{
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
}
