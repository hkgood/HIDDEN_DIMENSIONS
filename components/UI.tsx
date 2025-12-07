
import React from 'react';
import { useGameStore } from '../store';
import { GameStatus } from '../types';

export const UI: React.FC = () => {
  const { status, initGame, rotateView, isRotatingView } = useGameStore();

  if (status === GameStatus.IDLE) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="text-center p-12 pointer-events-auto">
          <h1 className="text-6xl font-extralight text-[#818cf8] mb-2 tracking-widest uppercase drop-shadow-sm opacity-90 font-serif">Hidden</h1>
          <h2 className="text-2xl font-light text-[#f59e0b] mb-6 tracking-[0.5em] uppercase">Dimensions</h2>
          <div className="h-px w-24 bg-[#f59e0b] mx-auto mb-8 opacity-50"></div>
          <button 
            onClick={initGame}
            className="group px-10 py-4 border border-[#f59e0b] text-[#c7d2fe] rounded-sm hover:bg-[#f59e0b] hover:text-white transition-all duration-500 tracking-[0.3em] uppercase text-xs backdrop-blur-sm"
          >
            Enter The Prism
          </button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.COMPLETED) {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center animate-pulse">
            <h1 className="text-4xl font-thin text-[#22d3ee] mb-4 tracking-[0.5em] uppercase drop-shadow-md">Timestream Synced</h1>
          </div>
        </div>
      );
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <div className="absolute top-8 left-8 right-8 flex justify-between items-center opacity-90">
        <h2 className="text-[#c7d2fe] font-bold tracking-widest uppercase text-xs">Level 06: The Chrono Prism</h2>
        <div className="flex gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]"></div>
        </div>
      </div>

      <div className="absolute bottom-12 right-12 flex gap-4 pointer-events-auto">
         <div className="flex flex-col items-center gap-2">
             <span className="text-[10px] uppercase tracking-widest text-[#6366f1]">View</span>
             <div className="flex gap-4">
                <button
                onClick={() => rotateView('left')}
                disabled={isRotatingView}
                className={`w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-[#6366f1]/30 flex items-center justify-center text-xl text-[#f59e0b] hover:scale-110 hover:bg-white/20 transition-all shadow-sm ${isRotatingView ? 'opacity-50' : ''}`}
                >
                ⟲
                </button>
                <button
                onClick={() => rotateView('right')}
                disabled={isRotatingView}
                className={`w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-[#6366f1]/30 flex items-center justify-center text-xl text-[#f59e0b] hover:scale-110 hover:bg-white/20 transition-all shadow-sm ${isRotatingView ? 'opacity-50' : ''}`}
                >
                ⟳
                </button>
             </div>
         </div>
      </div>

      <div className="absolute bottom-12 left-12 text-left opacity-90">
        <div className="flex flex-col gap-3 text-xs text-[#c7d2fe] font-medium">
            <div className="flex items-center gap-2">
                <span className="block w-2 h-2 rounded-full bg-[#a855f7]"></span> 
                <span>Align the Prism</span>
            </div>
            <div className="flex items-center gap-2">
                 <span className="block w-2 h-2 rounded-full bg-[#22d3ee]"></span>
                 <span>Raise the Lift</span>
            </div>
        </div>
      </div>
    </div>
  );
};
