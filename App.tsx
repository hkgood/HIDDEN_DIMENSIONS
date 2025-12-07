
import React from 'react';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen relative font-sans overflow-hidden bg-black" style={{ touchAction: 'none' }}>
      <GameScene />
      <UI />
    </div>
  );
};

export default App;
