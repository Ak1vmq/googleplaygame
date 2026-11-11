import * as THREE from 'three';

export interface GameState {
  score: number;
  coins: number;
  distance: number;
  speed: number;
  isGameOver: boolean;
  isPlaying: boolean;
  lives: number;
  combo: number;
  comboMultiplier: number;
  currentWorld: number;
  worldName: string;
  activePowerUp: string | null;
  powerUpTimer: number;
  shieldActive: boolean;
  magnetActive: boolean;
  doubleCoinsActive: boolean;
  superJumpActive: boolean;
}

export type GameCallback = (state: GameState) => void;

export interface WorldTheme {
  name: string;
  skyColor: number;
  fogColor: number;
  groundColor: number;
  roadColor: number;
  treeColors: number[];
  ambientColor: number;
  emoji: string;
  minDistance: number;
}

export const WORLDS: WorldTheme[] = [
  {
    name: 'Rainbow Forest',
    skyColor: 0x87CEEB,
    fogColor: 0x87CEEB,
    groundColor: 0x4CAF50,
    roadColor: 0x555555,
    treeColors: [0x228B22, 0x32CD32, 0x00AA00, 0x44BB44],
    ambientColor: 0xffffff,
    emoji: '🌲',
    minDistance: 0
  },
  {
    name: 'Neon City',
    skyColor: 0x1a0533,
    fogColor: 0x1a0533,
    groundColor: 0x222222,
    roadColor: 0x333333,
    treeColors: [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF6600],
    ambientColor: 0x8888ff,
    emoji: '🏙️',
    minDistance: 500
  },
  {
    name: 'Crystal Cave',
    skyColor: 0x0a0a2e,
    fogColor: 0x0a0a2e,
    groundColor: 0x1a1a3e,
    roadColor: 0x2a2a4e,
    treeColors: [0x9B59B6, 0x3498DB, 0xE74C3C, 0x1ABC9C],
    ambientColor: 0x6666cc,
    emoji: '💎',
    minDistance: 1200
  },
  {
    name: 'Space Galaxy',
    skyColor: 0x000011,
    fogColor: 0x000022,
    groundColor: 0x111133,
    roadColor: 0x222244,
    treeColors: [0xFF69B4, 0x00CED1, 0xFFD700, 0xFF4500],
    ambientColor: 0x4444aa,
    emoji: '🚀',
    minDistance: 2000
  },
  {
    name: 'Candy Land',
    skyColor: 0xFFB6C1,
    fogColor: 0xFFB6C1,
    groundColor: 0x98FB98,
    roadColor: 0xFF69B4,
    treeColors: [0xFF1493, 0xFF6347, 0xFFD700, 0x00CED1],
    ambientColor: 0xffccff,
    emoji: '🍭',
    minDistance: 3000
  }
];

export type PowerUpType = 'magnet' | 'shield' | 'doubleCoins' | 'superJump' | null;

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private road: THREE.Group;
  private obstacles: THREE.Group[] = [];
  private collectibles: THREE.Group[] = [];
  private powerUps: THREE.Group[] = [];
  private particles: THREE.Points[] = [];
  private trees: THREE.Group[] = [];
  private clouds: THREE.Mesh[] = [];
  private stars: THREE.Points | null = null;

  private currentLane = 1;
  private targetLaneX = 0;
  private laneWidth = 2.5;
  private isJumping = false;
  private jumpVelocity = 0;
  private playerY = 0.5;
  private isSliding = false;
  private slideTimer = 0;

  private gameSpeed = 0.15;
  private maxSpeed = 0.5;
  private speedIncrement = 0.00008;
  private spawnTimer = 0;
  private collectibleTimer = 0;
  private powerUpTimer = 0;
  private treeTimer = 0;
  private cloudTimer = 0;
  private distance = 0;

  private score = 0;
  private coins = 0;
  private lives = 3;
  private isGameOver = false;
  private isPlaying = false;
  private animationId: number | null = null;
  private lastTime = 0;

  private onStateChange: GameCallback;

  private playerBounce = 0;
  private invincibleTimer = 0;

  // Combo system
  private combo = 0;
  private comboTimer = 0;
  private comboMultiplier = 1;
  private lastCollectTime = 0;

  // Power-ups
  private activePowerUp: PowerUpType = null;
  private powerUpDuration = 0;
  private shieldActive = false;
  private magnetActive = false;
  private doubleCoinsActive = false;
  private superJumpActive = false;

  // World
  private currentWorldIndex = 0;
  private worldTransitionAlpha = 0;

  // Player skin
  private playerColor: number = 0xFF6B6B;
  private hatColor: number = 0x4ECDC4;

  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;

  constructor(container: HTMLElement, onStateChange: GameCallback) {
    this.onStateChange = onStateChange;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 1, -5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(5, 10, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // Create game objects
    this.player = this.createPlayer();
    this.road = this.createRoad();
    this.scene.add(this.player);
    this.scene.add(this.road);

    this.createInitialEnvironment();

    window.addEventListener('resize', () => this.handleResize(container));
  }

  setPlayerSkin(bodyColor: number, hatColor: number): void {
    this.playerColor = bodyColor;
    this.hatColor = hatColor;
    
    const body = this.player.children[0] as THREE.Mesh;
    if (body && body.material instanceof THREE.MeshPhongMaterial) {
      body.material.color.setHex(bodyColor);
    }
    const hat = this.player.children[3] as THREE.Mesh;
    if (hat && hat.material instanceof THREE.MeshPhongMaterial) {
      hat.material.color.setHex(hatColor);
    }
  }

  private createPlayer(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeom = new THREE.CapsuleGeometry(0.3, 0.5, 8, 16);
    const bodyMat = new THREE.MeshPhongMaterial({ color: this.playerColor, shininess: 80 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    const headGeom = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xFFDBB5, shininess: 80 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.1;
    head.castShadow = true;
    group.add(head);

    const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.08, 1.15, 0.2);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.08, 1.15, 0.2);
    group.add(rightEye);

    const hatGeom = new THREE.ConeGeometry(0.2, 0.3, 8);
    const hatMat = new THREE.MeshPhongMaterial({ color: this.hatColor });
    const hat = new THREE.Mesh(hatGeom, hatMat);
    hat.position.y = 1.4;
    hat.castShadow = true;
    group.add(hat);

    const legGeom = new THREE.CapsuleGeometry(0.1, 0.3, 4, 8);
    const legMat = new THREE.MeshPhongMaterial({ color: 0x4A90D9 });
    const leftLeg = new THREE.Mesh(legGeom, legMat);
    leftLeg.position.set(-0.15, 0.05, 0);
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeom, legMat);
    rightLeg.position.set(0.15, 0.05, 0);
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    // Arms
    const armGeom = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8);
    const armMat = new THREE.MeshPhongMaterial({ color: this.playerColor });
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-0.4, 0.6, 0);
    leftArm.name = 'leftArm';
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(0.4, 0.6, 0);
    rightArm.name = 'rightArm';
    group.add(rightArm);

    // Shield visual (hidden by default)
    const shieldGeom = new THREE.SphereGeometry(0.8, 16, 16);
    const shieldMat = new THREE.MeshPhongMaterial({
      color: 0x00BFFF,
      transparent: true,
      opacity: 0,
      shininess: 100
    });
    const shield = new THREE.Mesh(shieldGeom, shieldMat);
    shield.position.y = 0.7;
    shield.name = 'shield';
    group.add(shield);

    group.position.set(0, 0, 0);
    return group;
  }

  private createRoad(): THREE.Group {
    const group = new THREE.Group();

    const roadGeom = new THREE.PlaneGeometry(8, 200);
    const roadMat = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 10 });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.position.z = -80;
    road.receiveShadow = true;
    road.name = 'mainRoad';
    group.add(road);

    for (let i = -1; i <= 1; i += 2) {
      for (let z = 0; z > -200; z -= 4) {
        const markGeom = new THREE.PlaneGeometry(0.1, 2);
        const markMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const mark = new THREE.Mesh(markGeom, markMat);
        mark.rotation.x = -Math.PI / 2;
        mark.position.set(i * this.laneWidth, 0.01, z);
        group.add(mark);
      }
    }

    const grassGeom = new THREE.PlaneGeometry(30, 200);
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    
    const leftGrass = new THREE.Mesh(grassGeom, grassMat);
    leftGrass.rotation.x = -Math.PI / 2;
    leftGrass.position.set(-19, -0.01, -80);
    leftGrass.receiveShadow = true;
    leftGrass.name = 'leftGrass';
    group.add(leftGrass);

    const rightGrass = new THREE.Mesh(grassGeom, grassMat);
    rightGrass.rotation.x = -Math.PI / 2;
    rightGrass.position.set(19, -0.01, -80);
    rightGrass.receiveShadow = true;
    rightGrass.name = 'rightGrass';
    group.add(rightGrass);

    const sideGeom = new THREE.BoxGeometry(1, 0.15, 200);
    const sideMat = new THREE.MeshPhongMaterial({ color: 0xBBBBBB });
    
    const leftSide = new THREE.Mesh(sideGeom, sideMat);
    leftSide.position.set(-4.5, 0.07, -80);
    leftSide.receiveShadow = true;
    group.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeom, sideMat);
    rightSide.position.set(4.5, 0.07, -80);
    rightSide.receiveShadow = true;
    group.add(rightSide);

    return group;
  }

  private createInitialEnvironment(): void {
    for (let i = 0; i < 20; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.spawnTree(side * (6 + Math.random() * 15));
    }
    for (let i = 0; i < 8; i++) {
      this.spawnCloud();
    }
    this.createStarField();
  }

  private createStarField(): void {
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 1] = 15 + Math.random() * 30;
      starPositions[i * 3 + 2] = -Math.random() * 100;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.2, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(starGeom, starMat);
    this.scene.add(this.stars);
  }

  private updateWorldTheme(): void {
    const dist = this.distance;
    let newWorldIndex = 0;
    for (let i = WORLDS.length - 1; i >= 0; i--) {
      if (dist >= WORLDS[i].minDistance) {
        newWorldIndex = i;
        break;
      }
    }

    if (newWorldIndex !== this.currentWorldIndex) {
      this.currentWorldIndex = newWorldIndex;
      this.applyWorldTheme(WORLDS[newWorldIndex]);
    }
  }

  private applyWorldTheme(world: WorldTheme): void {
    // Animate sky color transition
    (this.scene.background as THREE.Color).setHex(world.skyColor);
    (this.scene.fog as THREE.Fog).color.setHex(world.fogColor);

    // Update road color
    const mainRoad = this.road.getObjectByName('mainRoad') as THREE.Mesh;
    if (mainRoad && mainRoad.material instanceof THREE.MeshPhongMaterial) {
      mainRoad.material.color.setHex(world.roadColor);
    }

    // Update grass
    const leftGrass = this.road.getObjectByName('leftGrass') as THREE.Mesh;
    const rightGrass = this.road.getObjectByName('rightGrass') as THREE.Mesh;
    if (leftGrass && leftGrass.material instanceof THREE.MeshPhongMaterial) {
      leftGrass.material.color.setHex(world.groundColor);
    }
    if (rightGrass && rightGrass.material instanceof THREE.MeshPhongMaterial) {
      rightGrass.material.color.setHex(world.groundColor);
    }

    // Update ambient light
    this.ambientLight.color.setHex(world.ambientColor);

    // Stars visibility for space world
    if (this.stars) {
      const mat = this.stars.material as THREE.PointsMaterial;
      mat.opacity = world.name === 'Space Galaxy' ? 0.8 : 0;
    }
  }

  private spawnTree(x: number): void {
    const group = new THREE.Group();
    const z = -Math.random() * 100 - 10;
    const world = WORLDS[this.currentWorldIndex];

    const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageColor = world.treeColors[Math.floor(Math.random() * world.treeColors.length)];
    
    if (this.currentWorldIndex === 1) {
      // Neon city - buildings instead of trees
      const buildGeom = new THREE.BoxGeometry(1 + Math.random(), 3 + Math.random() * 4, 1 + Math.random());
      const buildMat = new THREE.MeshPhongMaterial({ 
        color: foliageColor, 
        emissive: foliageColor,
        emissiveIntensity: 0.3 
      });
      const building = new THREE.Mesh(buildGeom, buildMat);
      building.position.y = 2 + Math.random() * 2;
      building.castShadow = true;
      group.add(building);
    } else if (this.currentWorldIndex === 2) {
      // Crystal cave - crystals
      const crystalGeom = new THREE.OctahedronGeometry(0.8 + Math.random() * 0.5, 0);
      const crystalMat = new THREE.MeshPhongMaterial({ 
        color: foliageColor, 
        transparent: true, 
        opacity: 0.7,
        emissive: foliageColor,
        emissiveIntensity: 0.2,
        shininess: 100
      });
      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      crystal.position.y = 1.5 + Math.random();
      crystal.rotation.y = Math.random() * Math.PI;
      crystal.castShadow = true;
      group.add(crystal);
    } else if (this.currentWorldIndex === 3) {
      // Space - planets
      const planetGeom = new THREE.SphereGeometry(0.5 + Math.random() * 1, 16, 16);
      const planetMat = new THREE.MeshPhongMaterial({ 
        color: foliageColor,
        emissive: foliageColor,
        emissiveIntensity: 0.1
      });
      const planet = new THREE.Mesh(planetGeom, planetMat);
      planet.position.y = 2 + Math.random() * 3;
      planet.castShadow = true;
      group.add(planet);

      // Ring
      if (Math.random() > 0.5) {
        const ringGeom = new THREE.TorusGeometry(1.2, 0.1, 8, 32);
        const ringMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.y = planet.position.y;
        ring.rotation.x = Math.PI / 3;
        group.add(ring);
      }
    } else if (this.currentWorldIndex === 4) {
      // Candy land - lollipops
      const stickGeom = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
      const stickMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
      const stick = new THREE.Mesh(stickGeom, stickMat);
      stick.position.y = 1;
      group.add(stick);

      const candyGeom = new THREE.SphereGeometry(0.5, 16, 16);
      const candyMat = new THREE.MeshPhongMaterial({ 
        color: foliageColor, 
        shininess: 100,
        emissive: foliageColor,
        emissiveIntensity: 0.1
      });
      const candy = new THREE.Mesh(candyGeom, candyMat);
      candy.position.y = 2.3;
      candy.castShadow = true;
      group.add(candy);
    } else {
      // Forest - normal trees
      const foliageGeom = new THREE.SphereGeometry(1 + Math.random() * 0.5, 8, 8);
      const foliageMat = new THREE.MeshPhongMaterial({ color: foliageColor });
      const foliage = new THREE.Mesh(foliageGeom, foliageMat);
      foliage.position.y = 2.5 + Math.random() * 0.5;
      foliage.castShadow = true;
      group.add(foliage);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.trees.push(group);
  }

  private spawnCloud(): void {
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 });

    for (let i = 0; i < 3; i++) {
      const size = 1 + Math.random() * 1.5;
      const geom = new THREE.SphereGeometry(size, 8, 8);
      const part = new THREE.Mesh(geom, cloudMat);
      part.position.set(i * 1.5 - 1.5, Math.random() * 0.5, Math.random() * 0.5);
      cloudGroup.add(part);
    }

    cloudGroup.position.set(
      (Math.random() - 0.5) * 60,
      12 + Math.random() * 5,
      -Math.random() * 80 - 20
    );
    this.scene.add(cloudGroup);
    this.clouds.push(cloudGroup as unknown as THREE.Mesh);
  }

  private createObstacle(): void {
    const lane = Math.floor(Math.random() * 3);
    const group = new THREE.Group();

    const types = ['barrier', 'cone', 'rock', 'laser'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'barrier') {
      const geom = new THREE.BoxGeometry(1.8, 1.2, 0.5);
      const mat = new THREE.MeshPhongMaterial({ color: 0xFF4444 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.6;
      mesh.castShadow = true;
      group.add(mesh);

      const stripeGeom = new THREE.BoxGeometry(0.3, 1.2, 0.52);
      const stripeMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
      for (let i = -1; i <= 1; i++) {
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.set(i * 0.6, 0.6, 0);
        group.add(stripe);
      }
    } else if (type === 'cone') {
      const geom = new THREE.ConeGeometry(0.4, 1.2, 8);
      const mat = new THREE.MeshPhongMaterial({ color: 0xFF8C00 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.6;
      mesh.castShadow = true;
      group.add(mesh);
    } else if (type === 'rock') {
      const geom = new THREE.DodecahedronGeometry(0.6, 0);
      const mat = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.5;
      mesh.castShadow = true;
      group.add(mesh);
    } else {
      // Laser beam (need to slide under)
      const geom = new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8);
      const mat = new THREE.MeshPhongMaterial({ 
        color: 0xFF0000, 
        emissive: 0xFF0000, 
        emissiveIntensity: 0.5 
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 1.0;
      mesh.rotation.z = Math.PI / 2;
      group.add(mesh);

      // Posts
      const postGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
      const postMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
      const leftPost = new THREE.Mesh(postGeom, postMat);
      leftPost.position.set(-1.0, 0.6, 0);
      group.add(leftPost);
      const rightPost = new THREE.Mesh(postGeom, postMat);
      rightPost.position.set(1.0, 0.6, 0);
      group.add(rightPost);

      group.userData.isLaser = true;
    }

    group.position.set((lane - 1) * this.laneWidth, 0, -60);
    group.userData = { ...group.userData, type: 'obstacle', lane };
    this.scene.add(group);
    this.obstacles.push(group);
  }

  private createCollectible(): void {
    const lane = Math.floor(Math.random() * 3);
    const group = new THREE.Group();

    const rand = Math.random();
    let value = 1;
    let isSpecial = false;

    if (rand > 0.92) {
      // Diamond (rare, worth 10)
      value = 10;
      isSpecial = true;
      const geom = new THREE.OctahedronGeometry(0.3, 0);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x00BFFF,
        emissive: 0x0066FF,
        emissiveIntensity: 0.4,
        shininess: 100,
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 1.2;
      mesh.castShadow = true;
      group.add(mesh);
    } else if (rand > 0.75) {
      // Star (worth 5)
      value = 5;
      const starShape = new THREE.Shape();
      const outerRadius = 0.3;
      const innerRadius = 0.15;
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        if (i === 0) {
          starShape.moveTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
        } else {
          starShape.lineTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
        }
        starShape.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
      }
      starShape.closePath();
      const geom = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false });
      const mat = new THREE.MeshPhongMaterial({
        color: 0xFFD700,
        emissive: 0xFFAA00,
        emissiveIntensity: 0.3,
        shininess: 100
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 1.2;
      mesh.castShadow = true;
      group.add(mesh);
    } else {
      // Coin
      value = 1;
      const geom = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
      const mat = new THREE.MeshPhongMaterial({
        color: 0xFFD700,
        emissive: 0xFFAA00,
        emissiveIntensity: 0.2,
        shininess: 100
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 1.2;
      mesh.rotation.x = Math.PI / 2;
      mesh.castShadow = true;
      group.add(mesh);
    }

    group.position.set((lane - 1) * this.laneWidth, 0, -60);
    group.userData = { type: 'collectible', value, isSpecial, lane };
    this.scene.add(group);
    this.collectibles.push(group);
  }

  private createPowerUp(): void {
    const lane = Math.floor(Math.random() * 3);
    const group = new THREE.Group();

    const types: PowerUpType[] = ['magnet', 'shield', 'doubleCoins', 'superJump'];
    const type = types[Math.floor(Math.random() * types.length)];

    let color = 0x00FF00;
    let emoji = '?';

    switch (type) {
      case 'magnet': color = 0xFF00FF; emoji = '🧲'; break;
      case 'shield': color = 0x00BFFF; emoji = '🛡️'; break;
      case 'doubleCoins': color = 0xFFD700; emoji = '×2'; break;
      case 'superJump': color = 0x00FF00; emoji = '⬆️'; break;
    }

    // Glowing orb
    const geom = new THREE.SphereGeometry(0.4, 16, 16);
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
      shininess: 100
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 1.2;
    group.add(mesh);

    // Outer ring
    const ringGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
    const ringMat = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 1.2;
    group.add(ring);

    group.position.set((lane - 1) * this.laneWidth, 0, -60);
    group.userData = { type: 'powerup', powerUpType: type, lane };
    this.scene.add(group);
    this.powerUps.push(group);
  }

  private activatePowerUp(type: PowerUpType): void {
    this.activePowerUp = type;
    this.powerUpDuration = 8.0; // 8 seconds

    switch (type) {
      case 'magnet':
        this.magnetActive = true;
        break;
      case 'shield':
        this.shieldActive = true;
        const shield = this.player.getObjectByName('shield') as THREE.Mesh;
        if (shield && shield.material instanceof THREE.MeshPhongMaterial) {
          shield.material.opacity = 0.3;
        }
        break;
      case 'doubleCoins':
        this.doubleCoinsActive = true;
        break;
      case 'superJump':
        this.superJumpActive = true;
        break;
    }
  }

  private deactivatePowerUp(): void {
    this.magnetActive = false;
    this.shieldActive = false;
    this.doubleCoinsActive = false;
    this.superJumpActive = false;
    this.activePowerUp = null;

    const shield = this.player.getObjectByName('shield') as THREE.Mesh;
    if (shield && shield.material instanceof THREE.MeshPhongMaterial) {
      shield.material.opacity = 0;
    }
  }

  private createParticleEffect(position: THREE.Vector3, color: number, count: number = 15): void {
    const particleCount = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.2
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.15,
      transparent: true,
      opacity: 1
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { velocities, life: 1.0 };
    this.scene.add(points);
    this.particles.push(points);
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const positions = particle.geometry.attributes.position.array as Float32Array;
      const velocities = particle.userData.velocities as THREE.Vector3[];
      particle.userData.life -= delta * 2;

      for (let j = 0; j < velocities.length; j++) {
        positions[j * 3] += velocities[j].x;
        positions[j * 3 + 1] += velocities[j].y;
        positions[j * 3 + 2] += velocities[j].z;
        velocities[j].y -= 0.01;
      }

      particle.geometry.attributes.position.needsUpdate = true;
      (particle.material as THREE.PointsMaterial).opacity = particle.userData.life;

      if (particle.userData.life <= 0) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        (particle.material as THREE.PointsMaterial).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  moveLeft(): void {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetLaneX = (this.currentLane - 1) * this.laneWidth;
    }
  }

  moveRight(): void {
    if (this.currentLane < 2) {
      this.currentLane++;
      this.targetLaneX = (this.currentLane - 1) * this.laneWidth;
    }
  }

  jump(): void {
    if (!this.isJumping && !this.isSliding) {
      this.isJumping = true;
      this.jumpVelocity = this.superJumpActive ? 0.35 : 0.25;
    }
  }

  slide(): void {
    if (!this.isJumping && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = 0.6;
    }
  }

  start(): void {
    this.isPlaying = true;
    this.isGameOver = false;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.distance = 0;
    this.gameSpeed = 0.15;
    this.currentLane = 1;
    this.targetLaneX = 0;
    this.playerY = 0.5;
    this.isJumping = false;
    this.isSliding = false;
    this.invincibleTimer = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMultiplier = 1;
    this.currentWorldIndex = 0;
    this.deactivatePowerUp();

    this.obstacles.forEach(o => this.scene.remove(o));
    this.collectibles.forEach(c => this.scene.remove(c));
    this.powerUps.forEach(p => this.scene.remove(p));
    this.obstacles = [];
    this.collectibles = [];
    this.powerUps = [];

    this.player.position.set(0, 0, 0);
    this.applyWorldTheme(WORLDS[0]);
    this.lastTime = performance.now();
    this.animate();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.isPlaying) return;
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number): void {
    this.gameSpeed = Math.min(this.gameSpeed + this.speedIncrement * delta * 60, this.maxSpeed);
    this.distance += this.gameSpeed;
    this.score = Math.floor(this.distance * 10 * this.comboMultiplier);

    // Update world theme
    this.updateWorldTheme();

    // Combo timer
    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1;
      }
    }

    // Power-up timer
    if (this.activePowerUp) {
      this.powerUpDuration -= delta;
      if (this.powerUpDuration <= 0) {
        this.deactivatePowerUp();
      }
    }

    // Move player to target lane
    const currentX = this.player.position.x;
    const diff = this.targetLaneX - currentX;
    this.player.position.x += diff * 0.15;

    // Jump physics
    if (this.isJumping) {
      this.playerY += this.jumpVelocity;
      this.jumpVelocity -= 0.012;
      if (this.playerY <= 0.5) {
        this.playerY = 0.5;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    }

    // Slide
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    this.player.position.y = this.playerY;

    if (this.isSliding) {
      this.player.scale.y = 0.5;
      this.player.position.y = 0.25;
    } else {
      this.player.scale.y = 1;
    }

    // Running animation
    this.playerBounce += delta * this.gameSpeed * 40;
    const leftLeg = this.player.getObjectByName('leftLeg');
    const rightLeg = this.player.getObjectByName('rightLeg');
    const leftArm = this.player.getObjectByName('leftArm');
    const rightArm = this.player.getObjectByName('rightArm');
    if (leftLeg && rightLeg && !this.isJumping) {
      leftLeg.rotation.x = Math.sin(this.playerBounce) * 0.5;
      rightLeg.rotation.x = Math.sin(this.playerBounce + Math.PI) * 0.5;
    }
    if (leftArm && rightArm && !this.isJumping) {
      leftArm.rotation.x = Math.sin(this.playerBounce + Math.PI) * 0.4;
      rightArm.rotation.x = Math.sin(this.playerBounce) * 0.4;
    }

    // Shield visual pulse
    const shield = this.player.getObjectByName('shield') as THREE.Mesh;
    if (shield && shield.material instanceof THREE.MeshPhongMaterial && this.shieldActive) {
      shield.material.opacity = 0.2 + Math.sin(Date.now() * 0.005) * 0.1;
      shield.rotation.y += delta * 2;
    }

    // Invincibility
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta;
      this.player.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
    } else {
      this.player.visible = true;
    }

    // Spawn obstacles
    this.spawnTimer += delta;
    const spawnRate = Math.max(0.8, 2.0 - this.gameSpeed * 3);
    if (this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.createObstacle();
      if (Math.random() > 0.65) {
        setTimeout(() => { if (this.isPlaying) this.createObstacle(); }, 200);
      }
    }

    // Spawn collectibles
    this.collectibleTimer += delta;
    if (this.collectibleTimer > 0.6) {
      this.collectibleTimer = 0;
      this.createCollectible();
      // Sometimes spawn a line of coins
      if (Math.random() > 0.7) {
        for (let i = 1; i <= 3; i++) {
          setTimeout(() => { if (this.isPlaying) this.createCollectible(); }, i * 150);
        }
      }
    }

    // Spawn power-ups
    this.powerUpTimer += delta;
    if (this.powerUpTimer > 12) {
      this.powerUpTimer = 0;
      if (Math.random() > 0.4) {
        this.createPowerUp();
      }
    }

    // Spawn trees
    this.treeTimer += delta;
    if (this.treeTimer > 0.5) {
      this.treeTimer = 0;
      if (this.trees.length < 30) {
        const side = Math.random() > 0.5 ? 1 : -1;
        this.spawnTree(side * (6 + Math.random() * 15));
      }
    }

    // Spawn clouds
    this.cloudTimer += delta;
    if (this.cloudTimer > 3) {
      this.cloudTimer = 0;
      if (this.clouds.length < 10) {
        this.spawnCloud();
      }
    }

    // Move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.position.z += this.gameSpeed;

      if (this.invincibleTimer <= 0) {
        const dx = Math.abs(obs.position.x - this.player.position.x);
        const dz = Math.abs(obs.position.z - this.player.position.z);

        if (dx < 1.0 && dz < 0.8) {
          const isLaser = obs.userData.isLaser;

          if (isLaser && this.isSliding) {
            // Slid under laser - safe!
          } else if (this.isJumping && this.playerY > 1.2 && !isLaser) {
            // Jumped over obstacle - safe!
          } else if (this.shieldActive) {
            // Shield absorbs hit
            this.shieldActive = false;
            this.activePowerUp = null;
            this.powerUpDuration = 0;
            const shieldMesh = this.player.getObjectByName('shield') as THREE.Mesh;
            if (shieldMesh && shieldMesh.material instanceof THREE.MeshPhongMaterial) {
              shieldMesh.material.opacity = 0;
            }
            this.createParticleEffect(obs.position.clone(), 0x00BFFF, 20);
            this.scene.remove(obs);
            this.obstacles.splice(i, 1);
            continue;
          } else {
            // Hit!
            this.lives--;
            this.invincibleTimer = 2.0;
            this.combo = 0;
            this.comboMultiplier = 1;
            this.createParticleEffect(this.player.position.clone(), 0xFF0000, 20);

            if (this.lives <= 0) {
              this.gameOver();
              return;
            }
          }
        }
      }

      if (obs.position.z > 10) {
        this.scene.remove(obs);
        this.obstacles.splice(i, 1);
      }
    }

    // Move collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.position.z += this.gameSpeed;
      col.rotation.y += delta * 3;

      const child = col.children[0];
      if (child) {
        child.position.y = 1.2 + Math.sin(Date.now() * 0.005 + i) * 0.15;
      }

      // Magnet effect - attract nearby coins
      if (this.magnetActive) {
        const dx = col.position.x - this.player.position.x;
        const dz = col.position.z - this.player.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 5) {
          col.position.x -= dx * 0.08;
          col.position.z -= dz * 0.05;
        }
      }

      // Collection
      const dx = Math.abs(col.position.x - this.player.position.x);
      const dz = Math.abs(col.position.z - this.player.position.z);

      if (dx < 1.2 && dz < 1.0) {
        let value = col.userData.value || 1;
        if (this.doubleCoinsActive) value *= 2;

        // Combo
        this.combo++;
        this.comboTimer = 2.0;
        this.comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
        if (this.comboMultiplier > 5) this.comboMultiplier = 5;

        this.coins += value;
        this.score += value * 10 * this.comboMultiplier;
        
        const particleColor = col.userData.isSpecial ? 0x00BFFF : 0xFFD700;
        this.createParticleEffect(col.position.clone(), particleColor, col.userData.isSpecial ? 25 : 10);
        
        this.scene.remove(col);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.position.z > 10) {
        this.scene.remove(col);
        this.collectibles.splice(i, 1);
      }
    }

    // Move power-ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.position.z += this.gameSpeed;
      pu.rotation.y += delta * 2;

      const child = pu.children[0];
      if (child) {
        child.position.y = 1.2 + Math.sin(Date.now() * 0.004 + i) * 0.2;
      }

      const dx = Math.abs(pu.position.x - this.player.position.x);
      const dz = Math.abs(pu.position.z - this.player.position.z);

      if (dx < 1.2 && dz < 1.0) {
        this.activatePowerUp(pu.userData.powerUpType);
        this.createParticleEffect(pu.position.clone(), 0xFFFFFF, 25);
        this.scene.remove(pu);
        this.powerUps.splice(i, 1);
        continue;
      }

      if (pu.position.z > 10) {
        this.scene.remove(pu);
        this.powerUps.splice(i, 1);
      }
    }

    // Move trees
    for (let i = this.trees.length - 1; i >= 0; i--) {
      const tree = this.trees[i];
      tree.position.z += this.gameSpeed;
      if (tree.position.z > 15) {
        this.scene.remove(tree);
        this.trees.splice(i, 1);
      }
    }

    // Move clouds
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      cloud.position.z += this.gameSpeed * 0.3;
      cloud.position.x += Math.sin(Date.now() * 0.0001 + i) * 0.01;
      if (cloud.position.z > 20) {
        this.scene.remove(cloud);
        this.clouds.splice(i, 1);
      }
    }

    this.updateParticles(delta);

    // Camera
    this.camera.position.x += (this.player.position.x * 0.3 - this.camera.position.x) * 0.05;

    this.onStateChange({
      score: this.score,
      coins: this.coins,
      distance: Math.floor(this.distance),
      speed: this.gameSpeed,
      isGameOver: this.isGameOver,
      isPlaying: this.isPlaying,
      lives: this.lives,
      combo: this.combo,
      comboMultiplier: this.comboMultiplier,
      currentWorld: this.currentWorldIndex,
      worldName: WORLDS[this.currentWorldIndex].name,
      activePowerUp: this.activePowerUp,
      powerUpTimer: this.powerUpDuration,
      shieldActive: this.shieldActive,
      magnetActive: this.magnetActive,
      doubleCoinsActive: this.doubleCoinsActive,
      superJumpActive: this.superJumpActive
    });
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.onStateChange({
      score: this.score,
      coins: this.coins,
      distance: Math.floor(this.distance),
      speed: this.gameSpeed,
      isGameOver: true,
      isPlaying: false,
      lives: 0,
      combo: this.combo,
      comboMultiplier: this.comboMultiplier,
      currentWorld: this.currentWorldIndex,
      worldName: WORLDS[this.currentWorldIndex].name,
      activePowerUp: null,
      powerUpTimer: 0,
      shieldActive: false,
      magnetActive: false,
      doubleCoinsActive: false,
      superJumpActive: false
    });
  }

  private handleResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
