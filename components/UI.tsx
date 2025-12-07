
import React from 'react';
import { useGameStore } from '../store';
import { GameStatus } from '../types';

export const UI: React.FC = () => {
  const { status, initGame, rotateView, isRotatingView, activePalette, archetype, regenerateWorld } = useGameStore();

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
            <button 
                onClick={regenerateWorld} 
                className="mt-2 ml-3 text-[10px] text-white/60 hover:text-white border border-white/20 px-2 py-1 rounded hover:bg-white/10 transition-colors uppercase tracking-wider"
            >
                Regenerate
            </button>
        </div>
      </div>

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
