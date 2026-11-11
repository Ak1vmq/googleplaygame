export interface SkinItem {
  id: string;
  name: string;
  emoji: string;
  bodyColor: number;
  hatColor: number;
  price: number;
  owned: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  target: number;
  reward: number;
  type: 'distance' | 'coins' | 'score' | 'combo' | 'games' | 'worlds';
  unlocked: boolean;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  emoji: string;
  target: number;
  progress: number;
  reward: number;
  type: 'collect' | 'distance' | 'combo' | 'survive' | 'powerups';
  completed: boolean;
}

export const SKINS: SkinItem[] = [
  { id: 'default', name: 'Runner', emoji: '🏃', bodyColor: 0xFF6B6B, hatColor: 0x4ECDC4, price: 0, owned: true },
  { id: 'ninja', name: 'Ninja', emoji: '🥷', bodyColor: 0x222222, hatColor: 0x8B0000, price: 50, owned: false },
  { id: 'robot', name: 'Robot', emoji: '🤖', bodyColor: 0x888888, hatColor: 0x00FF00, price: 100, owned: false },
  { id: 'wizard', name: 'Wizard', emoji: '🧙', bodyColor: 0x6A0DAD, hatColor: 0xFFD700, price: 150, owned: false },
  { id: 'alien', name: 'Alien', emoji: '👽', bodyColor: 0x00FF88, hatColor: 0xFF00FF, price: 200, owned: false },
  { id: 'pirate', name: 'Pirate', emoji: '🏴‍☠️', bodyColor: 0x8B4513, hatColor: 0x000000, price: 250, owned: false },
  { id: 'astronaut', name: 'Astronaut', emoji: '👨‍🚀', bodyColor: 0xFFFFFF, hatColor: 0xFF6600, price: 300, owned: false },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', bodyColor: 0xFF4500, hatColor: 0xFFD700, price: 500, owned: false },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', bodyColor: 0xFF69B4, hatColor: 0x00CED1, price: 750, owned: false },
  { id: 'golden', name: 'Golden', emoji: '✨', bodyColor: 0xFFD700, hatColor: 0xFFA500, price: 1000, owned: false },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'dist100', name: 'First Steps', description: 'Run 100m', emoji: '👣', target: 100, reward: 20, type: 'distance', unlocked: false },
  { id: 'dist500', name: 'Marathon', description: 'Run 500m', emoji: '🏅', target: 500, reward: 50, type: 'distance', unlocked: false },
  { id: 'dist1000', name: 'Super Runner', description: 'Run 1000m', emoji: '🏆', target: 1000, reward: 100, type: 'distance', unlocked: false },
  { id: 'dist3000', name: 'Legend', description: 'Run 3000m', emoji: '👑', target: 3000, reward: 300, type: 'distance', unlocked: false },
  { id: 'coins50', name: 'Coin Collector', description: 'Collect 50 coins in one run', emoji: '🪙', target: 50, reward: 30, type: 'coins', unlocked: false },
  { id: 'coins200', name: 'Rich!', description: 'Collect 200 coins in one run', emoji: '💰', target: 200, reward: 100, type: 'coins', unlocked: false },
  { id: 'score1000', name: 'Score Master', description: 'Score 1000 points', emoji: '⭐', target: 1000, reward: 50, type: 'score', unlocked: false },
  { id: 'score5000', name: 'High Scorer', description: 'Score 5000 points', emoji: '🌟', target: 5000, reward: 150, type: 'score', unlocked: false },
  { id: 'combo10', name: 'Combo Starter', description: 'Get 10x combo', emoji: '🔥', target: 10, reward: 40, type: 'combo', unlocked: false },
  { id: 'combo25', name: 'Combo Master', description: 'Get 25x combo', emoji: '💥', target: 25, reward: 100, type: 'combo', unlocked: false },
  { id: 'games10', name: 'Dedicated', description: 'Play 10 games', emoji: '🎮', target: 10, reward: 30, type: 'games', unlocked: false },
  { id: 'games50', name: 'Addicted', description: 'Play 50 games', emoji: '🕹️', target: 50, reward: 100, type: 'games', unlocked: false },
  { id: 'worlds3', name: 'Explorer', description: 'Visit 3 different worlds', emoji: '🌍', target: 3, reward: 75, type: 'worlds', unlocked: false },
  { id: 'worlds5', name: 'World Traveler', description: 'Visit all 5 worlds', emoji: '🗺️', target: 5, reward: 200, type: 'worlds', unlocked: false },
];

export function generateMissions(): Mission[] {
  const allMissions: Omit<Mission, 'progress' | 'completed'>[] = [
    { id: 'm1', name: 'Coin Rush', description: 'Collect 30 coins', emoji: '🪙', target: 30, reward: 20, type: 'collect' },
    { id: 'm2', name: 'Long Run', description: 'Run 200m', emoji: '🏃', target: 200, reward: 25, type: 'distance' },
    { id: 'm3', name: 'Combo King', description: 'Reach 15x combo', emoji: '🔥', target: 15, reward: 30, type: 'combo' },
    { id: 'm4', name: 'Survivor', description: 'Survive 300m', emoji: '💪', target: 300, reward: 35, type: 'survive' },
    { id: 'm5', name: 'Power User', description: 'Collect 3 power-ups', emoji: '⚡', target: 3, reward: 25, type: 'powerups' },
    { id: 'm6', name: 'Coin Master', description: 'Collect 80 coins', emoji: '💰', target: 80, reward: 40, type: 'collect' },
    { id: 'm7', name: 'Speed Demon', description: 'Run 500m', emoji: '⚡', target: 500, reward: 50, type: 'distance' },
    { id: 'm8', name: 'Untouchable', description: 'Reach 20x combo', emoji: '👊', target: 20, reward: 45, type: 'combo' },
  ];

  // Pick 3 random missions
  const shuffled = allMissions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(m => ({
    ...m,
    progress: 0,
    completed: false
  }));
}

export interface PlayerData {
  totalCoins: number;
  highScore: number;
  totalDistance: number;
  gamesPlayed: number;
  maxCombo: number;
  maxCoinsInRun: number;
  maxScoreInRun: number;
  worldsVisited: number;
  powerUpsCollected: number;
  currentSkin: string;
  ownedSkins: string[];
  unlockedAchievements: string[];
  missions: Mission[];
  lastMissionReset: number;
  lastDailyReward: number;
  dailyStreak: number;
}

export function getDefaultPlayerData(): PlayerData {
  return {
    totalCoins: 0,
    highScore: 0,
    totalDistance: 0,
    gamesPlayed: 0,
    maxCombo: 0,
    maxCoinsInRun: 0,
    maxScoreInRun: 0,
    worldsVisited: 1,
    powerUpsCollected: 0,
    currentSkin: 'default',
    ownedSkins: ['default'],
    unlockedAchievements: [],
    missions: generateMissions(),
    lastMissionReset: Date.now(),
    lastDailyReward: 0,
    dailyStreak: 0
  };
}

export function loadPlayerData(): PlayerData {
  try {
    const saved = localStorage.getItem('rainbowRunnerData');
    if (saved) {
      const data = JSON.parse(saved);
      // Check if missions need reset (daily)
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      if (now - data.lastMissionReset > dayMs) {
        data.missions = generateMissions();
        data.lastMissionReset = now;
      }
      return { ...getDefaultPlayerData(), ...data };
    }
  } catch (e) {
    console.error('Failed to load player data', e);
  }
  return getDefaultPlayerData();
}

export function savePlayerData(data: PlayerData): void {
  try {
    localStorage.setItem('rainbowRunnerData', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save player data', e);
  }
}

export function getDailyReward(streak: number): { coins: number; emoji: string } {
  const rewards = [
    { coins: 10, emoji: '🪙' },
    { coins: 15, emoji: '🪙' },
    { coins: 20, emoji: '💰' },
    { coins: 30, emoji: '💰' },
    { coins: 50, emoji: '💎' },
    { coins: 75, emoji: '💎' },
    { coins: 100, emoji: '👑' },
  ];
  return rewards[Math.min(streak, rewards.length - 1)];
}
