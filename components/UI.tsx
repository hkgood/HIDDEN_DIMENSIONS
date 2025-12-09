
import React from 'react';
import { useGameStore } from '../store';
import { GameStatus } from '../types';

// 海洋控制面板组件
const OceanControls: React.FC = () => {
  const { oceanConfig, setOceanConfig } = useGameStore();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="absolute top-6 right-6 pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-[10px] text-white/60 hover:text-white border border-white/20 px-3 py-1.5 rounded hover:bg-white/10 transition-colors uppercase tracking-wider"
      >
        {isOpen ? '✕ Ocean' : '≈ Ocean'}
      </button>
      
      {isOpen && (
        <div className="mt-2 bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/10 w-64 space-y-3">
          {/* 波浪高度 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/60">
              <label>Height</label>
              <span>{oceanConfig.height.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={oceanConfig.height}
              onChange={(e) => setOceanConfig({ height: parseFloat(e.target.value) })}
              className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-teal-400"
            />
          </div>

          {/* 波浪速度 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/60">
              <label>Speed</label>
              <span>{oceanConfig.speed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={oceanConfig.speed}
              onChange={(e) => setOceanConfig({ speed: parseFloat(e.target.value) })}
              className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-teal-400"
            />
          </div>

          {/* 波浪密度 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/60">
              <label>Frequency</label>
              <span>{oceanConfig.density.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={oceanConfig.density}
              onChange={(e) => setOceanConfig({ density: parseFloat(e.target.value) })}
              className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-teal-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const UI: React.FC = () => {
  const { status, initGame, rotateView, isRotatingView, activePalette, archetype, timbre, regenerateWorld } = useGameStore();

  if (status === GameStatus.IDLE) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="text-center p-12 pointer-events-auto backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
          <h1 className="text-6xl font-extralight text-white mb-2 tracking-widest uppercase drop-shadow-sm opacity-90 font-serif">Hidden</h1>
          <h2 className="text-2xl font-light mb-6 tracking-[0.5em] uppercase text-teal-300">Dimensions</h2>
          <div className="h-px w-24 mx-auto mb-8 opacity-50 bg-white"></div>
          <button 
            onClick={initGame}
            className="group px-10 py-4 border border-white/30 text-white rounded-sm hover:bg-white hover:text-black transition-all duration-500 tracking-[0.3em] uppercase text-xs"
          >
            Enter The Prism
          </button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.COMPLETED) {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-auto">
          <div className="text-center animate-pulse backdrop-blur-md bg-black/30 p-8 rounded-xl border border-white/20">
            <h1 className="text-4xl font-thin text-white mb-4 tracking-[0.5em] uppercase drop-shadow-md">Ascension</h1>
            <p className="text-white/70 mb-6 text-sm">Timeline Synchronized</p>
            <button 
                onClick={regenerateWorld}
                className="px-6 py-2 bg-white text-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
            >
                Generate New World
            </button>
          </div>
        </div>
      );
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Top Left Info */}
      <div className="absolute top-6 left-6 flex justify-between items-center opacity-90 pointer-events-auto">
        <div className="flex flex-col gap-1">
            <h2 className="text-white font-bold tracking-widest uppercase text-xs border-l-2 border-white pl-3">{archetype}</h2>
            <div className="flex items-center gap-2 pl-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                <span className="text-[10px] tracking-wider uppercase opacity-70 text-white">{activePalette.name}</span>
            </div>
            {/* 音色信息 */}
            <div className="flex items-center gap-2 pl-3 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></div>
                <span className="text-[10px] tracking-wider uppercase opacity-70 text-teal-300">
                  {timbre.nameCN}
                </span>
            </div>
            <button 
                onClick={regenerateWorld} 
                className="mt-2 ml-3 text-[10px] text-white/60 hover:text-white border border-white/20 px-2 py-1 rounded hover:bg-white/10 transition-colors uppercase tracking-wider"
            >
                Regenerate
            </button>
        </div>
      </div>

      {/* Ocean Controls - Top Right */}
      <OceanControls />

      {/* Rotation Controls - Perfect Ratio */}
      <div className="absolute bottom-12 right-12 flex gap-6 pointer-events-auto">
         <div className="flex gap-4">
            <button
            onClick={() => rotateView('left')}
            disabled={isRotatingView}
            className={`w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl text-white hover:scale-105 hover:bg-white/20 hover:border-white/50 transition-all shadow-lg active:scale-95 ${isRotatingView ? 'opacity-50' : ''}`}
            >
            <span className="pb-1">⟲</span>
            </button>
            <button
            onClick={() => rotateView('right')}
            disabled={isRotatingView}
            className={`w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl text-white hover:scale-105 hover:bg-white/20 hover:border-white/50 transition-all shadow-lg active:scale-95 ${isRotatingView ? 'opacity-50' : ''}`}
            >
            <span className="pb-1">⟳</span>
            </button>
         </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-12 left-12 text-left opacity-80">
        <div className="flex flex-col gap-2 text-[10px] text-white/70 uppercase tracking-widest font-medium">
            <div className="flex items-center gap-2">
                <span className="w-4 h-4 border border-white/30 rounded-full flex items-center justify-center">↕</span> 
                <span>Drag Vertical to Pan</span>
            </div>
             <div className="flex items-center gap-2">
                <span className="w-4 h-4 border border-white/30 rounded-full flex items-center justify-center">↔</span> 
                <span>Pinch to Zoom</span>
            </div>
        </div>
      </div>
    </div>
  );
};
