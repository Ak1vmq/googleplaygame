import * as THREE from 'three';

export interface GameState {
  score: number;
  coins: number;
  distance: number;
  speed: number;
  isGameOver: boolean;
  isPlaying: boolean;
  lives: number;
}

export type GameCallback = (state: GameState) => void;

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: THREE.Group;
  private road: THREE.Group;
  private obstacles: THREE.Group[] = [];
  private collectibles: THREE.Group[] = [];
  private particles: THREE.Points[] = [];
  private trees: THREE.Group[] = [];
  private clouds: THREE.Mesh[] = [];

  private currentLane = 1; // 0, 1, 2
  private targetLaneX = 0;
  private laneWidth = 2.5;
  private isJumping = false;
  private jumpVelocity = 0;
  private playerY = 0.5;
  private isSliding = false;
  private slideTimer = 0;

  private gameSpeed = 0.15;
  private maxSpeed = 0.45;
  private speedIncrement = 0.0001;
  private spawnTimer = 0;
  private collectibleTimer = 0;
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
  private clock: THREE.Clock;

  private playerBounce = 0;
  private invincibleTimer = 0;

  constructor(container: HTMLElement, onStateChange: GameCallback) {
    this.onStateChange = onStateChange;
    this.clock = new THREE.Clock();

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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    // Create game objects
    this.player = this.createPlayer();
    this.road = this.createRoad();
    this.scene.add(this.player);
    this.scene.add(this.road);

    // Create initial environment
    this.createInitialEnvironment();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize(container));
  }

  private createPlayer(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeom = new THREE.CapsuleGeometry(0.3, 0.5, 8, 16);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xFF6B6B, shininess: 80 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshPhongMaterial({ color: 0xFFDBB5, shininess: 80 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.1;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.08, 1.15, 0.2);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.08, 1.15, 0.2);
    group.add(rightEye);

    // Hat
    const hatGeom = new THREE.ConeGeometry(0.2, 0.3, 8);
    const hatMat = new THREE.MeshPhongMaterial({ color: 0x4ECDC4 });
    const hat = new THREE.Mesh(hatGeom, hatMat);
    hat.position.y = 1.4;
    hat.castShadow = true;
    group.add(hat);

    // Legs
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

    group.position.set(0, 0, 0);
    return group;
  }

  private createRoad(): THREE.Group {
    const group = new THREE.Group();

    // Main road
    const roadGeom = new THREE.PlaneGeometry(8, 200);
    const roadMat = new THREE.MeshPhongMaterial({
      color: 0x555555,
      shininess: 10
    });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.position.z = -80;
    road.receiveShadow = true;
    group.add(road);

    // Lane markings
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

    // Side grass
    const grassGeom = new THREE.PlaneGeometry(30, 200);
    const grassMat = new THREE.MeshPhongMaterial({ color: 0x4CAF50 });
    
    const leftGrass = new THREE.Mesh(grassGeom, grassMat);
    leftGrass.rotation.x = -Math.PI / 2;
    leftGrass.position.set(-19, -0.01, -80);
    leftGrass.receiveShadow = true;
    group.add(leftGrass);

    const rightGrass = new THREE.Mesh(grassGeom, grassMat);
    rightGrass.rotation.x = -Math.PI / 2;
    rightGrass.position.set(19, -0.01, -80);
    rightGrass.receiveShadow = true;
    group.add(rightGrass);

    // Sidewalk
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
    // Create initial trees
    for (let i = 0; i < 20; i++) {
      this.spawnTree(-15 - Math.random() * 15);
    }
    // Create initial clouds
    for (let i = 0; i < 8; i++) {
      this.spawnCloud();
    }
  }

  private spawnTree(x: number): void {
    const group = new THREE.Group();
    const z = -Math.random() * 100 - 10;

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage
    const colors = [0x228B22, 0x32CD32, 0x00AA00, 0x44BB44];
    const foliageColor = colors[Math.floor(Math.random() * colors.length)];
    const foliageGeom = new THREE.SphereGeometry(1 + Math.random() * 0.5, 8, 8);
    const foliageMat = new THREE.MeshPhongMaterial({ color: foliageColor });
    const foliage = new THREE.Mesh(foliageGeom, foliageMat);
    foliage.position.y = 2.5 + Math.random() * 0.5;
    foliage.castShadow = true;
    group.add(foliage);

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

    const types = ['barrier', 'cone', 'rock'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'barrier') {
      const geom = new THREE.BoxGeometry(1.8, 1.2, 0.5);
      const mat = new THREE.MeshPhongMaterial({ color: 0xFF4444 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.6;
      mesh.castShadow = true;
      group.add(mesh);

      // Stripes
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

      const baseGeom = new THREE.BoxGeometry(0.8, 0.1, 0.8);
      const baseMat = new THREE.MeshPhongMaterial({ color: 0xFF8C00 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.position.y = 0.05;
      group.add(base);
    } else {
      const geom = new THREE.DodecahedronGeometry(0.6, 0);
      const mat = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.5;
      mesh.castShadow = true;
      group.add(mesh);
    }

    group.position.set(
      (lane - 1) * this.laneWidth,
      0,
      -60
    );
    group.userData = { type: 'obstacle', lane };
    this.scene.add(group);
    this.obstacles.push(group);
  }

  private createCollectible(): void {
    const lane = Math.floor(Math.random() * 3);
    const group = new THREE.Group();

    const isStar = Math.random() > 0.6;

    if (isStar) {
      // Star
      const starShape = new THREE.Shape();
      const outerRadius = 0.3;
      const innerRadius = 0.15;
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        if (i === 0) {
          starShape.moveTo(
            Math.cos(outerAngle) * outerRadius,
            Math.sin(outerAngle) * outerRadius
          );
        } else {
          starShape.lineTo(
            Math.cos(outerAngle) * outerRadius,
            Math.sin(outerAngle) * outerRadius
          );
        }
        starShape.lineTo(
          Math.cos(innerAngle) * innerRadius,
          Math.sin(innerAngle) * innerRadius
        );
      }
      starShape.closePath();

      const extrudeSettings = { depth: 0.1, bevelEnabled: false };
      const geom = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
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
      group.userData = { type: 'collectible', value: 5, lane };
    } else {
      // Coin
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
      group.userData = { type: 'collectible', value: 1, lane };
    }

    group.position.set(
      (lane - 1) * this.laneWidth,
      0,
      -60
    );
    this.scene.add(group);
    this.collectibles.push(group);
  }

  private createParticleEffect(position: THREE.Vector3, color: number): void {
    const particleCount = 15;
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
      this.jumpVelocity = 0.25;
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

    // Clear obstacles and collectibles
    this.obstacles.forEach(o => this.scene.remove(o));
    this.collectibles.forEach(c => this.scene.remove(c));
    this.obstacles = [];
    this.collectibles = [];

    this.player.position.set(0, 0, 0);
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
    // Increase speed
    this.gameSpeed = Math.min(this.gameSpeed + this.speedIncrement * delta * 60, this.maxSpeed);
    this.distance += this.gameSpeed;
    this.score = Math.floor(this.distance * 10);

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

    // Player animation
    if (this.isSliding) {
      this.player.scale.y = 0.5;
      this.player.position.y = 0.25;
    } else {
      this.player.scale.y = 1;
    }

    // Running animation (leg movement)
    this.playerBounce += delta * this.gameSpeed * 40;
    const leftLeg = this.player.getObjectByName('leftLeg');
    const rightLeg = this.player.getObjectByName('rightLeg');
    if (leftLeg && rightLeg && !this.isJumping) {
      leftLeg.rotation.x = Math.sin(this.playerBounce) * 0.5;
      rightLeg.rotation.x = Math.sin(this.playerBounce + Math.PI) * 0.5;
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
    if (this.spawnTimer > 1.5 / (this.gameSpeed * 5)) {
      this.spawnTimer = 0;
      this.createObstacle();
      // Sometimes spawn double
      if (Math.random() > 0.6) {
        setTimeout(() => {
          if (this.isPlaying) this.createObstacle();
        }, 200);
      }
    }

    // Spawn collectibles
    this.collectibleTimer += delta;
    if (this.collectibleTimer > 0.8 / (this.gameSpeed * 4)) {
      this.collectibleTimer = 0;
      this.createCollectible();
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

      // Collision detection
      if (this.invincibleTimer <= 0) {
        const dx = Math.abs(obs.position.x - this.player.position.x);
        const dz = Math.abs(obs.position.z - this.player.position.z);
        
        if (dx < 1.0 && dz < 0.8) {
          // Check if jumping over or sliding under
          if (this.isJumping && this.playerY > 1.2) {
            // Jumped over
          } else if (this.isSliding) {
            // Slid under (only for tall obstacles)
          } else {
            // Hit!
            this.lives--;
            this.invincibleTimer = 2.0;
            this.createParticleEffect(this.player.position.clone(), 0xFF0000);
            
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

      // Rotate collectible
      col.rotation.y += delta * 3;

      // Bobbing animation
      const child = col.children[0];
      if (child) {
        child.position.y = 1.2 + Math.sin(Date.now() * 0.005 + i) * 0.15;
      }

      // Collection detection
      const dx = Math.abs(col.position.x - this.player.position.x);
      const dz = Math.abs(col.position.z - this.player.position.z);

      if (dx < 1.2 && dz < 1.0) {
        const value = col.userData.value || 1;
        this.coins += value;
        this.score += value * 10;
        this.createParticleEffect(col.position.clone(), 0xFFD700);
        this.scene.remove(col);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.position.z > 10) {
        this.scene.remove(col);
        this.collectibles.splice(i, 1);
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

    // Update particles
    this.updateParticles(delta);

    // Camera follow
    this.camera.position.x += (this.player.position.x * 0.3 - this.camera.position.x) * 0.05;

    // Update state
    this.onStateChange({
      score: this.score,
      coins: this.coins,
      distance: Math.floor(this.distance),
      speed: this.gameSpeed,
      isGameOver: this.isGameOver,
      isPlaying: this.isPlaying,
      lives: this.lives
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
      lives: 0
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
