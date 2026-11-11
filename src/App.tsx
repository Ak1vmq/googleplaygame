import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameState, WORLDS } from './game/GameEngine';
import {
  PlayerData, SKINS, ACHIEVEMENTS,
  loadPlayerData, savePlayerData, getDailyReward
} from './game/GameData';

type Screen = 'menu' | 'playing' | 'gameover' | 'shop' | 'missions' | 'achievements' | 'daily';

const defaultGameState: GameState = {
  score: 0, coins: 0, distance: 0, speed: 0,
  isGameOver: false, isPlaying: false, lives: 3,
  combo: 0, comboMultiplier: 1, currentWorld: 0,
  worldName: 'Rainbow Forest', activePowerUp: null,
  powerUpTimer: 0, shieldActive: false, magnetActive: false,
  doubleCoinsActive: false, superJumpActive: false
};

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [playerData, setPlayerData] = useState<PlayerData>(loadPlayerData);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [showWorldTransition, setShowWorldTransition] = useState(false);
  const [lastWorld, setLastWorld] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const updatePlayerData = useCallback((updates: Partial<PlayerData>) => {
    setPlayerData(prev => {
      const newData = { ...prev, ...updates };
      savePlayerData(newData);
      return newData;
    });
  }, []);

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);

    // World transition notification
    if (state.currentWorld !== lastWorld && state.isPlaying) {
      setLastWorld(state.currentWorld);
      setShowWorldTransition(true);
      setTimeout(() => setShowWorldTransition(false), 2000);
      
      // Track worlds visited
      if (state.currentWorld + 1 > playerData.worldsVisited) {
        updatePlayerData({ worldsVisited: state.currentWorld + 1 });
      }
    }

    if (state.isGameOver) {
      setScreen('gameover');
      
      // Update player stats
      const newHighScore = Math.max(state.score, playerData.highScore);
      const newTotalCoins = playerData.totalCoins + state.coins;
      const newTotalDistance = playerData.totalDistance + state.distance;
      const newGamesPlayed = playerData.gamesPlayed + 1;
      const newMaxCombo = Math.max(state.combo, playerData.maxCombo);
      const newMaxCoins = Math.max(state.coins, playerData.maxCoinsInRun);
      const newMaxScore = Math.max(state.score, playerData.maxScoreInRun);

      // Check achievements
      const newlyUnlocked: string[] = [];
      ACHIEVEMENTS.forEach(ach => {
        if (playerData.unlockedAchievements.includes(ach.id)) return;
        let unlocked = false;
        switch (ach.type) {
          case 'distance': unlocked = newTotalDistance >= ach.target; break;
          case 'coins': unlocked = newMaxCoins >= ach.target; break;
          case 'score': unlocked = newMaxScore >= ach.target; break;
          case 'combo': unlocked = newMaxCombo >= ach.target; break;
          case 'games': unlocked = newGamesPlayed >= ach.target; break;
          case 'worlds': unlocked = (state.currentWorld + 1) >= ach.target; break;
        }
        if (unlocked) {
          newlyUnlocked.push(ach.id);
        }
      });

      // Award achievement rewards
      let achievementBonus = 0;
      newlyUnlocked.forEach(id => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) achievementBonus += ach.reward;
      });

      // Update missions
      const updatedMissions = playerData.missions.map(m => {
        if (m.completed) return m;
        let newProgress = m.progress;
        switch (m.type) {
          case 'collect': newProgress += state.coins; break;
          case 'distance': newProgress += state.distance; break;
          case 'combo': newProgress = Math.max(newProgress, state.combo); break;
          case 'survive': newProgress = Math.max(newProgress, state.distance); break;
        }
        const completed = newProgress >= m.target;
        if (completed && !m.completed) {
          achievementBonus += m.reward;
        }
        return { ...m, progress: Math.min(newProgress, m.target), completed };
      });

      setNewAchievements(newlyUnlocked);

      updatePlayerData({
        totalCoins: newTotalCoins + achievementBonus,
        highScore: newHighScore,
        totalDistance: newTotalDistance,
        gamesPlayed: newGamesPlayed,
        maxCombo: newMaxCombo,
        maxCoinsInRun: newMaxCoins,
        maxScoreInRun: newMaxScore,
        missions: updatedMissions,
        unlockedAchievements: [...playerData.unlockedAchievements, ...newlyUnlocked]
      });
    }
  }, [playerData, lastWorld, updatePlayerData]);

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

  // Apply skin
  useEffect(() => {
    if (engineRef.current) {
      const skin = SKINS.find(s => s.id === playerData.currentSkin);
      if (skin) {
        engineRef.current.setPlayerSkin(skin.bodyColor, skin.hatColor);
      }
    }
  }, [playerData.currentSkin]);

  const startGame = () => {
    setScreen('playing');
    setGameState(defaultGameState);
    setLastWorld(0);
    if (engineRef.current) {
      const skin = SKINS.find(s => s.id === playerData.currentSkin);
      if (skin) engineRef.current.setPlayerSkin(skin.bodyColor, skin.hatColor);
      engineRef.current.start();
    }
  };

  const claimDailyReward = () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const lastReward = playerData.lastDailyReward;
    
    let streak = playerData.dailyStreak;
    if (now - lastReward > dayMs * 2) {
      streak = 0; // Reset streak if missed a day
    }
    
    const reward = getDailyReward(streak);
    updatePlayerData({
      totalCoins: playerData.totalCoins + reward.coins,
      lastDailyReward: now,
      dailyStreak: streak + 1
    });
    setScreen('menu');
  };

  const canClaimDaily = () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return now - playerData.lastDailyReward > dayMs;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing' || !engineRef.current) return;
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': engineRef.current.moveLeft(); break;
        case 'ArrowRight': case 'd': case 'D': engineRef.current.moveRight(); break;
        case 'ArrowUp': case 'w': case 'W': case ' ': engineRef.current.jump(); break;
        case 'ArrowDown': case 's': case 'S': engineRef.current.slide(); break;
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
        dx > 0 ? engineRef.current.moveRight() : engineRef.current.moveLeft();
      } else if (absDy > minSwipe) {
        dy < 0 ? engineRef.current.jump() : engineRef.current.slide();
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

  const buySkin = (skinId: string) => {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin || playerData.ownedSkins.includes(skinId)) return;
    if (playerData.totalCoins >= skin.price) {
      updatePlayerData({
        totalCoins: playerData.totalCoins - skin.price,
        ownedSkins: [...playerData.ownedSkins, skinId]
      });
    }
  };

  const equipSkin = (skinId: string) => {
    if (playerData.ownedSkins.includes(skinId)) {
      updatePlayerData({ currentSkin: skinId });
    }
  };

  const claimMissionReward = (missionId: string) => {
    const mission = playerData.missions.find(m => m.id === missionId);
    if (!mission || !mission.completed) return;
    updatePlayerData({
      totalCoins: playerData.totalCoins + mission.reward,
      missions: playerData.missions.map(m =>
        m.id === missionId ? { ...m, completed: true, reward: 0 } : m
      )
    });
  };

  const getPowerUpIcon = (type: string | null) => {
    switch (type) {
      case 'magnet': return '🧲';
      case 'shield': return '🛡️';
      case 'doubleCoins': return '×2';
      case 'superJump': return '⬆️';
      default: return '';
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* HUD - Playing */}
      {screen === 'playing' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bar */}
          <div className="flex justify-between items-start p-3 gap-2">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-lg">🪙</span>
              <span className="text-white font-bold text-base">{gameState.coins}</span>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
              <div className="text-white font-bold text-base">{gameState.score}</div>
              {gameState.comboMultiplier > 1 && (
                <div className="text-yellow-400 text-xs font-bold">×{gameState.comboMultiplier.toFixed(1)}</div>
              )}
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-lg ${i < gameState.lives ? '' : 'opacity-30'}`}>❤️</span>
              ))}
            </div>
          </div>

          {/* Combo indicator */}
          {gameState.combo >= 5 && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full px-4 py-1 animate-pulse">
              <span className="text-white font-bold text-sm">🔥 COMBO ×{gameState.combo}</span>
            </div>
          )}

          {/* Active power-up */}
          {gameState.activePowerUp && (
            <div className="absolute top-16 right-3 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-lg">{getPowerUpIcon(gameState.activePowerUp)}</span>
              <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${(gameState.powerUpTimer / 8) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* World indicator */}
          <div className="absolute top-16 left-3 bg-black/40 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <span className="text-white text-xs font-medium">
              {WORLDS[gameState.currentWorld].emoji} {gameState.worldName}
            </span>
          </div>

          {/* World transition */}
          {showWorldTransition && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-4 animate-bounce">
                <div className="text-white text-2xl font-bold text-center">
                  {WORLDS[gameState.currentWorld].emoji} {gameState.worldName}
                </div>
                <div className="text-yellow-400 text-sm text-center mt-1">New World Unlocked!</div>
              </div>
            </div>
          )}

          {/* Mobile controls hint */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1 text-white/50 text-xs">
              ← Swipe → | ↑ Jump | ↓ Slide
            </div>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {screen === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900/85 via-purple-900/75 to-pink-900/85 backdrop-blur-sm overflow-y-auto py-8">
          <div className="text-center mb-6">
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 mb-1">
              🌈 RAINBOW
            </h1>
            <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              RUNNER
            </h2>
          </div>

          {/* Coins display */}
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-full px-5 py-2 mb-4 flex items-center gap-2">
            <span className="text-xl">🪙</span>
            <span className="text-yellow-300 font-bold text-xl">{playerData.totalCoins}</span>
          </div>

          {/* Play button */}
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-2xl px-12 py-4 rounded-full shadow-lg shadow-green-500/30 transform hover:scale-105 transition-all duration-200 active:scale-95 mb-4"
          >
            🎮 PLAY
          </button>

          {/* Stats */}
          <div className="flex gap-3 mb-4 flex-wrap justify-center px-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[70px]">
              <div className="text-lg">🏆</div>
              <div className="text-white font-bold">{playerData.highScore}</div>
              <div className="text-white/50 text-[10px]">Best</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[70px]">
              <div className="text-lg">📏</div>
              <div className="text-white font-bold">{playerData.totalDistance}m</div>
              <div className="text-white/50 text-[10px]">Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center min-w-[70px]">
              <div className="text-lg">🎮</div>
              <div className="text-white font-bold">{playerData.gamesPlayed}</div>
              <div className="text-white/50 text-[10px]">Games</div>
            </div>
          </div>

          {/* Menu buttons */}
          <div className="grid grid-cols-2 gap-3 px-6 w-full max-w-sm">
            <button
              onClick={() => setScreen('shop')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all active:scale-95"
            >
              🛍️ Shop
            </button>
            <button
              onClick={() => setScreen('missions')}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all active:scale-95 relative"
            >
              📋 Missions
              {playerData.missions.some(m => m.completed && m.reward > 0) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setScreen('achievements')}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all active:scale-95"
            >
              🏅 Achieve
            </button>
            <button
              onClick={() => setScreen('daily')}
              className={`text-white font-bold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all active:scale-95 ${
                canClaimDaily()
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 animate-pulse'
                  : 'bg-gray-600'
              }`}
            >
              🎁 Daily
              {canClaimDaily() && <span className="ml-1">!</span>}
            </button>
          </div>

          {/* Current skin */}
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-xl">{SKINS.find(s => s.id === playerData.currentSkin)?.emoji}</span>
            <span className="text-white text-sm">Using: {SKINS.find(s => s.id === playerData.currentSkin)?.name}</span>
          </div>

          <div className="mt-4 text-white/40 text-xs text-center px-4">
            <p>Swipe or arrow keys to play</p>
          </div>
        </div>
      )}

      {/* Shop */}
      {screen === 'shop' && (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/95 to-indigo-900/95 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">🛍️ Shop</h2>
              <div className="flex items-center gap-2">
                <span className="text-yellow-300 font-bold">🪙 {playerData.totalCoins}</span>
                <button onClick={() => setScreen('menu')} className="text-white bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SKINS.map(skin => {
                const owned = playerData.ownedSkins.includes(skin.id);
                const equipped = playerData.currentSkin === skin.id;
                const canBuy = playerData.totalCoins >= skin.price;

                return (
                  <div
                    key={skin.id}
                    className={`rounded-xl p-3 text-center border-2 transition-all ${
                      equipped
                        ? 'border-yellow-400 bg-yellow-400/20'
                        : owned
                        ? 'border-green-400/50 bg-green-400/10'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="text-3xl mb-1">{skin.emoji}</div>
                    <div className="text-white font-bold text-sm">{skin.name}</div>
                    
                    {equipped ? (
                      <div className="text-yellow-400 text-xs font-bold mt-1">✓ Equipped</div>
                    ) : owned ? (
                      <button
                        onClick={() => equipSkin(skin.id)}
                        className="mt-1 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full"
                      >
                        Equip
                      </button>
                    ) : (
                      <button
                        onClick={() => buySkin(skin.id)}
                        disabled={!canBuy}
                        className={`mt-1 text-xs font-bold px-3 py-1 rounded-full ${
                          canBuy
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-400'
                        }`}
                      >
                        🪙 {skin.price}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Missions */}
      {screen === 'missions' && (
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/95 to-red-900/95 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">📋 Missions</h2>
              <button onClick={() => setScreen('menu')} className="text-white bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <p className="text-white/60 text-sm mb-4">Complete missions to earn bonus coins! Resets daily.</p>

            <div className="space-y-3">
              {playerData.missions.map(mission => (
                <div
                  key={mission.id}
                  className={`rounded-xl p-4 border-2 ${
                    mission.completed && mission.reward > 0
                      ? 'border-green-400 bg-green-400/20'
                      : mission.completed
                      ? 'border-gray-400/50 bg-gray-400/10'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mission.emoji}</span>
                    <div className="flex-1">
                      <div className="text-white font-bold text-sm">{mission.name}</div>
                      <div className="text-white/60 text-xs">{mission.description}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                            style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                          />
                        </div>
                        <span className="text-white/60 text-xs">{mission.progress}/{mission.target}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {mission.completed && mission.reward > 0 ? (
                        <button
                          onClick={() => claimMissionReward(mission.id)}
                          className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse"
                        >
                          🪙 {mission.reward}
                        </button>
                      ) : mission.completed ? (
                        <span className="text-green-400 text-xs">✓ Claimed</span>
                      ) : (
                        <span className="text-yellow-400 text-xs">🪙 {mission.reward}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      {screen === 'achievements' && (
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/95 to-cyan-900/95 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">🏅 Achievements</h2>
              <button onClick={() => setScreen('menu')} className="text-white bg-white/20 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <p className="text-white/60 text-sm mb-4">
              {playerData.unlockedAchievements.length}/{ACHIEVEMENTS.length} unlocked
            </p>

            <div className="space-y-2">
              {ACHIEVEMENTS.map(ach => {
                const unlocked = playerData.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl p-3 border-2 flex items-center gap-3 ${
                      unlocked
                        ? 'border-yellow-400/50 bg-yellow-400/10'
                        : 'border-white/10 bg-white/5 opacity-70'
                    }`}
                  >
                    <span className="text-2xl">{unlocked ? ach.emoji : '🔒'}</span>
                    <div className="flex-1">
                      <div className={`font-bold text-sm ${unlocked ? 'text-yellow-300' : 'text-white/70'}`}>
                        {ach.name}
                      </div>
                      <div className="text-white/50 text-xs">{ach.description}</div>
                    </div>
                    <div className="text-right">
                      {unlocked ? (
                        <span className="text-green-400 text-xs font-bold">✓ Done</span>
                      ) : (
                        <span className="text-yellow-400 text-xs">🪙 +{ach.reward}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Daily Reward */}
      {screen === 'daily' && (
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/95 to-amber-900/95 backdrop-blur-sm flex items-center justify-center">
          <div className="p-6 max-w-sm w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">🎁 Daily Reward</h2>
            <p className="text-white/60 text-sm mb-6">
              Day {playerData.dailyStreak + 1} streak! Come back every day for bigger rewards!
            </p>

            <div className="grid grid-cols-7 gap-1 mb-6">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const reward = getDailyReward(day);
                const isToday = day === playerData.dailyStreak;
                const isPast = day < playerData.dailyStreak;
                return (
                  <div
                    key={day}
                    className={`rounded-lg p-2 text-center ${
                      isToday
                        ? 'bg-yellow-400/30 border-2 border-yellow-400 animate-pulse'
                        : isPast
                        ? 'bg-green-400/20 border border-green-400/50'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    <div className="text-xs text-white/60">D{day + 1}</div>
                    <div className="text-sm">{isPast ? '✅' : reward.emoji}</div>
                    <div className="text-[10px] text-yellow-300">{reward.coins}</div>
                  </div>
                );
              })}
            </div>

            {canClaimDaily() ? (
              <button
                onClick={claimDailyReward}
                className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold text-xl px-10 py-4 rounded-full shadow-lg transform hover:scale-105 transition-all active:scale-95 animate-bounce"
              >
                🎁 Claim {getDailyReward(playerData.dailyStreak).coins} Coins!
              </button>
            ) : (
              <div className="text-center">
                <div className="text-green-400 text-xl font-bold mb-2">✅ Claimed Today!</div>
                <div className="text-white/60 text-sm">Come back tomorrow for more!</div>
              </div>
            )}

            <button
              onClick={() => setScreen('menu')}
              className="mt-6 text-white/60 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {screen === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-900/90 via-purple-900/80 to-indigo-900/90 backdrop-blur-sm overflow-y-auto py-6">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-3">GAME OVER</h2>

          {/* Stats card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4 mx-4 w-full max-w-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-2xl">🏆</div>
                <div className="text-white font-bold text-xl">{gameState.score}</div>
                <div className="text-white/50 text-xs">Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">🪙</div>
                <div className="text-white font-bold text-xl">+{gameState.coins}</div>
                <div className="text-white/50 text-xs">Coins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">📏</div>
                <div className="text-white font-bold text-xl">{gameState.distance}m</div>
                <div className="text-white/50 text-xs">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">🔥</div>
                <div className="text-white font-bold text-xl">×{gameState.combo}</div>
                <div className="text-white/50 text-xs">Max Combo</div>
              </div>
            </div>

            {/* World reached */}
            <div className="mt-3 text-center bg-white/5 rounded-xl p-2">
              <span className="text-white/60 text-xs">Reached: </span>
              <span className="text-white font-bold text-sm">
                {WORLDS[gameState.currentWorld].emoji} {gameState.worldName}
              </span>
            </div>

            {gameState.score >= playerData.highScore && gameState.score > 0 && (
              <div className="mt-3 text-yellow-400 font-bold text-lg text-center animate-pulse">
                🎉 NEW HIGH SCORE! 🎉
              </div>
            )}
          </div>

          {/* New achievements */}
          {newAchievements.length > 0 && (
            <div className="bg-yellow-400/20 border border-yellow-400/30 rounded-xl p-3 mb-4 mx-4 w-full max-w-sm">
              <div className="text-yellow-400 font-bold text-sm mb-2">🏅 New Achievements!</div>
              {newAchievements.map(id => {
                const ach = ACHIEVEMENTS.find(a => a.id === id);
                return ach ? (
                  <div key={id} className="flex items-center gap-2 text-white text-sm">
                    <span>{ach.emoji}</span>
                    <span>{ach.name}</span>
                    <span className="text-yellow-400 ml-auto">+{ach.reward}🪙</span>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2 w-full max-w-sm px-4">
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-xl px-10 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all active:scale-95"
            >
              🔄 PLAY AGAIN
            </button>
            <button
              onClick={() => setScreen('menu')}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-lg px-8 py-2 rounded-full transition-all"
            >
              🏠 MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
