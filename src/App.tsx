import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameState } from './game/GameEngine';

type Screen = 'menu' | 'playing' | 'gameover';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    coins: 0,
    distance: 0,
    speed: 0,
    isGameOver: false,
    isPlaying: false,
    lives: 3
  });
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('rainbowRunnerHighScore') || '0');
  });
  const [totalCoins, setTotalCoins] = useState(() => {
    return parseInt(localStorage.getItem('rainbowRunnerTotalCoins') || '0');
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);
    if (state.isGameOver) {
      setScreen('gameover');
      const newHighScore = Math.max(state.score, highScore);
      setHighScore(newHighScore);
      localStorage.setItem('rainbowRunnerHighScore', newHighScore.toString());
      const newTotalCoins = totalCoins + state.coins;
      setTotalCoins(newTotalCoins);
      localStorage.setItem('rainbowRunnerTotalCoins', newTotalCoins.toString());
    }
  }, [highScore, totalCoins]);

  useEffect(() => {
    if (containerRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(containerRef.current, handleStateChange);
      engineRef.current.render();
    }
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [handleStateChange]);

  const startGame = () => {
    setScreen('playing');
    if (engineRef.current) {
      engineRef.current.start();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing' || !engineRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          engineRef.current.moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          engineRef.current.moveRight();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          engineRef.current.jump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          engineRef.current.slide();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  // Touch controls
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (screen !== 'playing') return;
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (screen !== 'playing' || !touchStartRef.current || !engineRef.current) return;
      
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      const minSwipe = 30;

      if (absDx > absDy && absDx > minSwipe) {
        if (dx > 0) {
          engineRef.current.moveRight();
        } else {
          engineRef.current.moveLeft();
        }
      } else if (absDy > minSwipe) {
        if (dy < 0) {
          engineRef.current.jump();
        } else {
          engineRef.current.slide();
        }
      }

      touchStartRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [screen]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {/* Game Canvas Container */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* HUD - Playing */}
      {screen === 'playing' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bar */}
          <div className="flex justify-between items-start p-4">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2">
              <span className="text-2xl">🪙</span>
              <span className="text-white font-bold text-xl">{gameState.coins}</span>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2">
              <span className="text-white font-bold text-xl">{gameState.score}</span>
              <span className="text-yellow-300 text-sm ml-1">pts</span>
            </div>

            <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-2xl ${i < gameState.lives ? '' : 'opacity-30'}`}>
                  ❤️
                </span>
              ))}
            </div>
          </div>

          {/* Mobile control hints */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white/60 text-sm">
              ← Swipe → | ↑ Jump | ↓ Slide
            </div>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {screen === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900/80 via-purple-900/70 to-pink-900/80 backdrop-blur-sm">
          <div className="text-center animate-bounce-slow">
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-2 drop-shadow-lg">
              🌈 RAINBOW
            </h1>
            <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8">
              RUNNER
            </h2>
          </div>

          <div className="flex flex-col items-center gap-4 mt-4">
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-2xl px-12 py-4 rounded-full shadow-lg shadow-green-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95"
            >
              🎮 PLAY
            </button>

            <div className="flex gap-6 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                <div className="text-2xl">🏆</div>
                <div className="text-white font-bold text-lg">{highScore}</div>
                <div className="text-white/60 text-xs">Best Score</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                <div className="text-2xl">🪙</div>
                <div className="text-white font-bold text-lg">{totalCoins}</div>
                <div className="text-white/60 text-xs">Total Coins</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 text-white/50 text-sm text-center px-4">
            <p>Swipe or use arrow keys to move</p>
            <p className="mt-1">← → Change lane | ↑ Jump | ↓ Slide</p>
          </div>
        </div>
      )}

      {/* Game Over */}
      {screen === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-900/80 via-purple-900/70 to-indigo-900/80 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4 animate-pulse">
              GAME OVER
            </h2>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 mx-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl">🏆</div>
                  <div className="text-white font-bold text-2xl">{gameState.score}</div>
                  <div className="text-white/60 text-sm">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl">🪙</div>
                  <div className="text-white font-bold text-2xl">{gameState.coins}</div>
                  <div className="text-white/60 text-sm">Coins</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl">📏</div>
                  <div className="text-white font-bold text-2xl">{gameState.distance}m</div>
                  <div className="text-white/60 text-sm">Distance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl">⭐</div>
                  <div className="text-white font-bold text-2xl">{highScore}</div>
                  <div className="text-white/60 text-sm">Best</div>
                </div>
              </div>

              {gameState.score >= highScore && gameState.score > 0 && (
                <div className="mt-4 text-yellow-400 font-bold text-xl animate-pulse">
                  🎉 NEW HIGH SCORE! 🎉
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-xl px-10 py-3 rounded-full shadow-lg shadow-green-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95"
              >
                🔄 PLAY AGAIN
              </button>
              <button
                onClick={() => setScreen('menu')}
                className="bg-white/20 hover:bg-white/30 text-white font-bold text-lg px-8 py-2 rounded-full transition-all duration-200"
              >
                🏠 MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
