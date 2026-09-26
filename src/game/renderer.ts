import * as THREE from 'three';
import { crowdPose } from './crowd';
import { FIELD, type CourtId, type Footballer, type MatchState, type TeamId } from './types';

type ActorAnimation = 'kick' | 'slide' | 'save' | 'hit';

type ActorView = {
  root: THREE.Group;
  pulse?: THREE.Mesh;
  keeper: boolean;
  torso: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  shins: THREE.Group[];
  animation?: ActorAnimation;
  animationAge: number;
  animationDirection: number;
  animationPower: number;
};

type CrowdFigure = { x: number; z: number; phase: number };

const colorMaterial = (color: string) => new THREE.MeshToonMaterial({ color });

interface CourtPalette {
  background: string; fog: string; fogNear: number; fogFar: number;
  apron: string; floor: string; stripeA: string; stripeB: string;
  wall: string; rail: string; line: string; goal: string; crowd: string[];
}

const COURT_PALETTES: Record<CourtId, CourtPalette> = {
  'court-rooftop': {
    background: '#ed8954', fog: '#ed8954', fogNear: 27, fogFar: 62,
    apron: '#ffbd65', floor: '#80bf54', stripeA: '#93cf60', stripeB: '#75b84f',
    wall: '#ef744e', rail: '#3e2c45', line: '#f9f4d4', goal: '#fff4d8',
    crowd: ['#ffe45e', '#3ce0c0', '#ff526e', '#8b71ff', '#fff1dd'],
  },
  'court-graffiti': {
    background: '#25445b', fog: '#38566a', fogNear: 25, fogFar: 58,
    apron: '#e4bd57', floor: '#436577', stripeA: '#4c7180', stripeB: '#3b5b6f',
    wall: '#29384e', rail: '#171f34', line: '#ffe16b', goal: '#f4db97',
    crowd: ['#f95ebc', '#50e9d2', '#ffdb58', '#a882ff', '#f6f0d4'],
  },
  'court-beach': {
    background: '#62c4e9', fog: '#97dcf1', fogNear: 30, fogFar: 76,
    apron: '#d8ad69', floor: '#e9cf8b', stripeA: '#f2dc9e', stripeB: '#dfc27d',
    wall: '#2395bb', rail: '#fff3c7', line: '#fff7df', goal: '#fff4da',
    crowd: ['#ff5765', '#f8d547', '#32bfd0', '#fefff0', '#55a866'],
  },
  'court-neon': {
    background: '#160d31', fog: '#2b1c50', fogNear: 24, fogFar: 58,
    apron: '#392956', floor: '#2c2350', stripeA: '#362960', stripeB: '#292044',
    wall: '#60409b', rail: '#140f28', line: '#57f5eb', goal: '#f6edff',
    crowd: ['#ff4ab4', '#59f6e8', '#fff457', '#a470ff', '#fcf0ff'],
  },
};

const courtId = (id: string): CourtId => id in COURT_PALETTES ? id as CourtId : 'court-rooftop';

export class MatchRenderer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 120);
  readonly actorsGroup = new THREE.Group();
  readonly renderer: THREE.WebGLRenderer;
  private actors = new Map<string, ActorView>();
  private ball!: THREE.Group;
  private ballShadow!: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private cameraTarget = new THREE.Vector3();
  private impactRemaining = 0;
  private impactPower = 0;
  private arena!: THREE.Group;
  private arenaLights: THREE.Light[] = [];
  private currentCourt: CourtId = 'court-rooftop';
  private ballStreak!: THREE.Group;
  private particles!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  private particleColors!: Float32Array;
  private particleLives!: Float32Array;
  private particleCursor = 0;
  private requestedPixelScale = 1.5;
  private crowdFigures: CrowdFigure[] = [];
  private crowdBodies: THREE.InstancedMesh | null = null;
  private crowdHeads: THREE.InstancedMesh | null = null;
  private crowdArms: THREE.InstancedMesh | null = null;
  private crowdEnergy = 0;
  private readonly crowdTransform = new THREE.Object3D();

  constructor(private readonly host: HTMLElement, initialCourt: CourtId = 'court-rooftop') {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.requestedPixelScale));
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setClearColor('#fa9c5a', 1);
    this.renderer.domElement.className = 'game-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Cancha 3D de osviStreet');
    host.appendChild(this.renderer.domElement);
    this.arena = new THREE.Group();
    this.scene.add(this.arena, this.actorsGroup);
    this.camera.position.set(0, 22.5, 18.5);
    this.camera.lookAt(0, 0, 0);
    this.buildArena(initialCourt);
    this.buildBall();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    this.disposeGroup(this.arena);
    this.disposeGroup(this.actorsGroup);
    this.particles?.geometry.dispose();
    this.particles?.material.dispose();
    this.disposeGroup(this.ball);
    this.disposeGroup(this.ballStreak);
    this.ballShadow?.geometry.dispose();
    this.ballShadow?.material.dispose();
    this.arenaLights.forEach((light) => this.scene.remove(light));
    this.renderer.dispose();
    this.host.replaceChildren();
  }

  private resize = () => {
    const width = this.host.clientWidth || window.innerWidth;
    const height = this.host.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.requestedPixelScale));
    this.renderer.setSize(width, height, false);
  };

  setPixelScale(scale: number) {
    this.requestedPixelScale = Math.max(0.7, Math.min(scale, 1.5));
    this.resize();
  }

  impact(power = 0.55) {
    const strength = Math.max(0.15, Math.min(power, 1));
    this.impactPower = Math.max(this.impactPower, strength);
    this.impactRemaining = Math.max(this.impactRemaining, 0.2);
  }

  setCourt(id: string) {
    const nextCourt = courtId(id);
    if (nextCourt === this.currentCourt) return;
    this.clearGroup(this.arena);
    this.buildArena(nextCourt);
  }

  resetActors() {
    this.clearGroup(this.actorsGroup);
    this.actors.clear();
  }

  private buildArena(id: CourtId) {
    this.currentCourt = id;
    const palette = COURT_PALETTES[id];
    this.scene.background = new THREE.Color(palette.background);
    this.scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
    this.renderer.setClearColor(palette.background, 1);
    this.arenaLights.forEach((light) => this.scene.remove(light));
    const hemi = new THREE.HemisphereLight(id === 'court-neon' ? '#8edbff' : '#d8fdff', '#51415a', id === 'court-neon' ? 1.5 : 2.1);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(id === 'court-beach' ? '#fff1bd' : '#fff6c4', id === 'court-neon' ? 1.9 : 3.1);
    sun.position.set(-9, 19, -7);
    this.scene.add(sun);
    this.arenaLights = [hemi, sun];

    const apron = new THREE.Mesh(new THREE.BoxGeometry(27.8, 0.45, 17.6), colorMaterial(palette.apron));
    apron.position.y = -0.37;
    this.arena.add(apron);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.halfLength * 2, FIELD.halfWidth * 2), colorMaterial(palette.floor));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.12;
    this.arena.add(floor);

    const stripe = colorMaterial(palette.stripeA);
    const stripe2 = colorMaterial(palette.stripeB);
    for (let index = 0; index < 6; index++) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, FIELD.halfWidth * 2), index % 2 ? stripe : stripe2);
      panel.rotation.x = -Math.PI / 2;
      panel.position.set(-10 + index * 4, -0.105, 0);
      this.arena.add(panel);
    }
    const lineMat = new THREE.MeshBasicMaterial({ color: palette.line });
    const addLine = (width: number, depth: number, x: number, z: number) => {
      const line = new THREE.Mesh(new THREE.BoxGeometry(width, 0.025, depth), lineMat);
      line.position.set(x, -0.075, z);
      this.arena.add(line);
    };
    addLine(0.09, 14, 0, 0);
    addLine(24, 0.09, 0, -6.93);
    addLine(24, 0.09, 0, 6.93);
    const center = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.045, 5, 48), lineMat);
    center.rotation.x = Math.PI / 2;
    center.position.y = -0.065;
    this.arena.add(center);
    for (const side of [-1, 1]) {
      addLine(0.09, 5.5, side * 9.4, 0);
      addLine(5.2, 0.09, side * 9.4, -2.72);
      addLine(5.2, 0.09, side * 9.4, 2.72);
      this.buildGoal(side, palette);
    }
    this.buildWalls(palette);
    this.buildCrowdProps(palette);
    this.buildCourtIdentity(id);
  }

  private buildGoal(side: number, palette: CourtPalette) {
    const goal = new THREE.Group();
    const postMaterial = colorMaterial(palette.goal);
    const postGeometry = new THREE.CylinderGeometry(0.095, 0.095, 2.65, 8);
    const postX = side * 12.05;
    for (const z of [-FIELD.goalHalfWidth, FIELD.goalHalfWidth]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(postX, 1.22, z);
      goal.add(post);
    }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, FIELD.goalHalfWidth * 2 + 0.15), postMaterial);
    crossbar.position.set(postX, 2.52, 0);
    goal.add(crossbar);
    const netMaterial = new THREE.LineBasicMaterial({ color: '#fff7d4', transparent: true, opacity: 0.58 });
    const addNetLine = (points: THREE.Vector3[]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      goal.add(new THREE.Line(geometry, netMaterial));
    };
    const backX = side * 13;
    const halfWidth = FIELD.goalHalfWidth;
    for (let index = 0; index <= 4; index++) {
      const z = -halfWidth + index * halfWidth / 2;
      addNetLine([new THREE.Vector3(postX, 0.1, z), new THREE.Vector3(backX, 0.1, z)]);
    }
    for (const y of [0.15, 0.75, 1.35, 1.95, 2.52]) addNetLine([new THREE.Vector3(postX, y, -halfWidth), new THREE.Vector3(backX, y, -halfWidth), new THREE.Vector3(backX, y, halfWidth), new THREE.Vector3(postX, y, halfWidth)]);
    this.arena.add(goal);
  }

  private buildWalls(palette: CourtPalette) {
    const wallMat = colorMaterial(palette.wall);
    const railMat = new THREE.MeshBasicMaterial({ color: palette.rail });
    for (const z of [-7.55, 7.55]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(24.8, 1.7, 0.32), wallMat);
      wall.position.set(0, 0.65, z);
      this.arena.add(wall);
      for (let x = -12; x <= 12; x += 1.2) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.9, 0.1), railMat);
        post.position.set(x, 0.77, z + Math.sign(z) * 0.2);
        this.arena.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(25, 0.09, 0.12), railMat);
      rail.position.set(0, 1.55, z + Math.sign(z) * 0.2);
      this.arena.add(rail);
    }
    for (const x of [-12.4, 12.4]) {
      for (const z of [-4.75, 4.75]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.7, 4.4), wallMat);
        panel.position.set(x, 0.65, z);
        this.arena.add(panel);
      }
    }
    const perimeter = new THREE.Mesh(new THREE.BoxGeometry(27.2, 0.28, 17.3), colorMaterial('#493752'));
    perimeter.position.y = -0.53;
    this.arena.add(perimeter);
  }

  private buildCrowdProps(palette: CourtPalette) {
    const colorSet = palette.crowd;
    const figureCount = 34;
    this.crowdFigures = [];
    this.crowdEnergy = 0;
    this.crowdBodies = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.62, 7),
      new THREE.MeshToonMaterial({ color: '#ffffff' }),
      figureCount,
    );
    this.crowdHeads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 9, 7),
      new THREE.MeshToonMaterial({ color: '#ffffff' }),
      figureCount,
    );
    this.crowdArms = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.045, 0.24, 2, 6),
      new THREE.MeshToonMaterial({ color: '#ffffff' }),
      figureCount * 2,
    );
    for (const instances of [this.crowdBodies, this.crowdHeads, this.crowdArms]) {
      instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instances.frustumCulled = false;
      this.arena.add(instances);
    }
    for (let i = 0; i < figureCount; i++) {
      const x = -12.5 + (i % 17) * 1.55;
      const z = i < 17 ? -8.6 : 8.6;
      const shirt = new THREE.Color(colorSet[(i * 3) % colorSet.length]!);
      const skin = new THREE.Color(colorSet[(i * 7 + 1) % colorSet.length]!);
      this.crowdFigures.push({ x, z, phase: (i % 17) * 0.73 + Math.floor(i / 17) * 0.4 });
      this.crowdBodies.setColorAt(i, shirt);
      this.crowdHeads.setColorAt(i, skin);
      this.crowdArms.setColorAt(i * 2, shirt);
      this.crowdArms.setColorAt(i * 2 + 1, shirt);
    }
    if (this.crowdBodies.instanceColor) this.crowdBodies.instanceColor.needsUpdate = true;
    if (this.crowdHeads.instanceColor) this.crowdHeads.instanceColor.needsUpdate = true;
    if (this.crowdArms.instanceColor) this.crowdArms.instanceColor.needsUpdate = true;
    this.updateCrowd(0, 0);
  }

  private updateCrowd(elapsed: number, dt: number) {
    if (!this.crowdBodies || !this.crowdHeads || !this.crowdArms) return;
    this.crowdEnergy = Math.max(0, this.crowdEnergy - dt * 0.82);
    const cheer = this.crowdEnergy;
    const apply = (mesh: THREE.InstancedMesh, slot: number, x: number, y: number, z: number, rotationZ = 0, rotationX = 0, scaleY = 1) => {
      this.crowdTransform.position.set(x, y, z);
      this.crowdTransform.rotation.set(rotationX, 0, rotationZ);
      this.crowdTransform.scale.set(1, scaleY, 1);
      this.crowdTransform.updateMatrix();
      mesh.setMatrixAt(slot, this.crowdTransform.matrix);
    };
    for (const [index, fan] of this.crowdFigures.entries()) {
      const pose = crowdPose(elapsed, fan.phase, cheer);
      apply(this.crowdBodies, index, fan.x, 0.15 + pose.bounce, fan.z, 0, 0, pose.bodyScale);
      apply(this.crowdHeads, index, fan.x, 0.58 + pose.bounce * 1.2, fan.z, 0, 0, pose.headScale);
      for (const [arm, side] of [-1, 1].entries()) {
        const armPose = pose.arms[arm]!;
        apply(this.crowdArms, index * 2 + arm, fan.x + side * 0.2, 0.38 + pose.bounce, fan.z + 0.025, armPose.rotationZ, armPose.rotationX);
      }
    }
    this.crowdBodies.instanceMatrix.needsUpdate = true;
    this.crowdHeads.instanceMatrix.needsUpdate = true;
    this.crowdArms.instanceMatrix.needsUpdate = true;
  }

  private buildCourtIdentity(id: CourtId) {
    if (id === 'court-rooftop') {
      const blocks = ['#514061', '#65506f', '#354159', '#7a4c62', '#423b56'];
      for (let index = 0; index < 10; index++) {
        const height = 1.7 + ((index * 17) % 5) * 0.54;
        const building = new THREE.Mesh(new THREE.BoxGeometry(2.2 + (index % 3) * 0.4, height, 1.9), colorMaterial(blocks[index % blocks.length]!));
        building.position.set(-13.5 + index * 3, height / 2 - 0.35, -10.2);
        this.arena.add(building);
        const windows = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.04), new THREE.MeshBasicMaterial({ color: index % 2 ? '#ffd880' : '#ffbca0' }));
        windows.position.set(building.position.x, height * 0.54, -9.18);
        this.arena.add(windows);
      }
      for (let index = 0; index < 14; index++) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 4), new THREE.MeshBasicMaterial({ color: '#fff0ae' }));
        star.position.set(-13 + (index * 2.1) % 26, 5 + (index % 3) * 0.72, -12.5);
        this.arena.add(star);
      }
    } else if (id === 'court-graffiti') {
      const colors = ['#ff4fb6', '#56e7d1', '#ffdf51', '#996eff', '#ff704d'];
      for (const side of [-1, 1]) {
        for (let index = 0; index < 12; index++) {
          const x = -11.6 + index * 2.1;
          const size = 0.24 + (index % 4) * 0.075;
          const tag = new THREE.Mesh(new THREE.CircleGeometry(size, 8), new THREE.MeshBasicMaterial({ color: colors[index % colors.length]!, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
          tag.position.set(x, 0.78 + (index % 3) * 0.28, side * 7.34);
          this.arena.add(tag);
          const slash = new THREE.Mesh(new THREE.BoxGeometry(size * 2.6, 0.075, 0.035), new THREE.MeshBasicMaterial({ color: colors[(index + 2) % colors.length]! }));
          slash.position.set(x, 0.75 + (index % 3) * 0.28, side * 7.31);
          slash.rotation.z = (index % 2 ? -1 : 1) * 0.62;
          this.arena.add(slash);
        }
      }
    } else if (id === 'court-beach') {
      for (const side of [-1, 1]) {
        const sea = new THREE.Mesh(new THREE.BoxGeometry(30, 0.08, 4.2), colorMaterial('#55c9df'));
        sea.position.set(0, -0.31, side * 10.45);
        this.arena.add(sea);
        const foam = new THREE.Mesh(new THREE.BoxGeometry(30, 0.06, 0.2), colorMaterial('#fff4da'));
        foam.position.set(0, -0.25, side * 8.68);
        this.arena.add(foam);
        for (let index = 0; index < 3; index++) {
          const x = -9.5 + index * 9.5;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 3.1, 7), colorMaterial('#a97449'));
          trunk.position.set(x, 1.08, side * 9.5);
          trunk.rotation.z = x > 1 ? -0.12 : 0.12;
          this.arena.add(trunk);
          for (let leaf = 0; leaf < 5; leaf++) {
            const frond = new THREE.Mesh(new THREE.ConeGeometry(0.16, 2.2, 5), colorMaterial(leaf % 2 ? '#308965' : '#48a55f'));
            frond.position.set(x + Math.cos(leaf * 1.25) * 0.77, 2.63 + Math.sin(leaf * 0.7) * 0.12, side * 9.5 + Math.sin(leaf * 1.25) * 0.74);
            frond.rotation.z = -Math.cos(leaf * 1.25) * 0.85;
            frond.rotation.x = Math.sin(leaf * 1.25) * 0.72;
            this.arena.add(frond);
          }
        }
      }
      for (let index = 0; index < 5; index++) {
        const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.25, 10), colorMaterial(index % 2 ? '#fa6756' : '#f6df77'));
        umbrella.position.set(-10 + index * 5, 1.5, index % 2 ? 9 : -9);
        umbrella.rotation.x = Math.PI;
        this.arena.add(umbrella);
      }
    } else {
      for (const side of [-1, 1]) {
        for (let index = 0; index < 13; index++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.78, 0.16), new THREE.MeshBasicMaterial({ color: index % 2 ? '#5bf3e8' : '#ff53bd' }));
          bar.position.set(-11.7 + index * 1.95, 0.75, side * 7.27);
          this.arena.add(bar);
        }
      }
      for (const [x, color] of [[-8, '#ff42bb'], [0, '#4ff3ec'], [8, '#b685ff']] as const) {
        const lamp = new THREE.PointLight(color, 7.5, 15, 2);
        lamp.position.set(x, 5.2, x ? (Math.sign(x) * -4) : 0);
        this.scene.add(lamp);
        this.arenaLights.push(lamp);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.13, 0.35), new THREE.MeshBasicMaterial({ color }));
        glow.position.copy(lamp.position);
        this.arena.add(glow);
      }
      const grid = new THREE.Mesh(new THREE.BoxGeometry(25, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: '#53f4ee' }));
      grid.position.set(0, 0.02, 0);
      this.arena.add(grid);
    }
  }

  private clearGroup(group: THREE.Group) {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line) && !(object instanceof THREE.Points)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    group.clear();
  }

  private disposeGroup(group: THREE.Group) {
    this.clearGroup(group);
  }

  private outline(geometry: THREE.BufferGeometry, color: string, scale = 1) {
    const root = new THREE.Group();
    const ink = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#261f30', side: THREE.BackSide }));
    ink.scale.setScalar(scale * 1.1);
    const fill = new THREE.Mesh(geometry, colorMaterial(color));
    fill.scale.setScalar(scale);
    root.add(ink, fill);
    return root;
  }

  private createActor(player: Footballer, colors: [string, string], bootColor: string): ActorView {
    const root = new THREE.Group();
    const torso = new THREE.Group();
    torso.position.y = 0.57;
    root.add(torso);
    const shirt = this.outline(new THREE.CapsuleGeometry(0.3, 0.48, 3, 8), colors[0]);
    shirt.position.y = 0.49;
    torso.add(shirt);
    const shorts = this.outline(new THREE.CylinderGeometry(0.28, 0.31, 0.29, 8), colors[1]);
    shorts.position.y = 0.04;
    root.add(shorts);
    const head = this.outline(new THREE.SphereGeometry(0.235, 9, 7), '#f3bd82');
    head.position.y = 1.05;
    torso.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.47), colorMaterial('#302638'));
    hair.position.y = 1.12;
    torso.add(hair);
    const stripe = this.outline(new THREE.CapsuleGeometry(0.045, 0.55, 2, 5), colors[1], 0.7);
    stripe.position.set(0.12, 0.52, 0.285);
    stripe.rotation.z = -0.08;
    torso.add(stripe);
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.065, 8), colorMaterial(player.team === 0 ? bootColor : '#fff1d2'));
    crest.position.set(-0.16, 0.59, 0.295);
    torso.add(crest);
    const eyeMaterial = colorMaterial('#312638');
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), eyeMaterial);
      eye.position.set(side * 0.075, 1.07, 0.215);
      torso.add(eye);
    }
    const smile = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.018), eyeMaterial);
    smile.position.set(0, 0.985, 0.221);
    torso.add(smile);
    const arms: THREE.Group[] = [];
    const legs: THREE.Group[] = [];
    const shins: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.31, 1.34, 0.015);
      const sleeve = this.outline(new THREE.CapsuleGeometry(0.095, 0.22, 2, 6), colors[0]);
      sleeve.position.y = -0.15;
      arm.add(sleeve);
      const forearm = this.outline(new THREE.CapsuleGeometry(0.068, 0.2, 2, 6), '#f3bd82');
      forearm.position.y = -0.4;
      arm.add(forearm);
      const wristBand = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.07, 7), colorMaterial(colors[1]));
      wristBand.position.y = -0.3;
      arm.add(wristBand);
      root.add(arm);
      arms.push(arm);

      const leg = new THREE.Group();
      leg.position.set(side * 0.14, 0.51, 0);
      const thigh = this.outline(new THREE.CapsuleGeometry(0.135, 0.24, 2, 6), colors[1]);
      thigh.position.y = -0.13;
      leg.add(thigh);
      const shin = new THREE.Group();
      shin.position.y = -0.27;
      const calf = this.outline(new THREE.CapsuleGeometry(0.105, 0.27, 2, 6), '#34304a');
      calf.position.y = -0.15;
      shin.add(calf);
      const sockStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.07, 7), colorMaterial('#fff1d2'));
      sockStripe.position.y = -0.08;
      shin.add(sockStripe);
      const shoe = this.outline(new THREE.SphereGeometry(0.16, 8, 6), player.team === 0 ? bootColor : '#fff1d2');
      shoe.scale.set(1, 0.55, 1.3);
      shoe.position.set(0, -0.34, 0.075);
      shin.add(shoe);
      leg.add(shin);
      root.add(leg);
      legs.push(leg);
      shins.push(shin);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(player.role === 'keeper' ? 0.66 : 0.53, 12), new THREE.MeshBasicMaterial({ color: '#172335', transparent: true, opacity: 0.22 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.006;
    root.add(shadow);
    let pulse: THREE.Mesh | undefined;
    if (player.role === 'keeper') {
      const cap = this.outline(new THREE.SphereGeometry(0.31, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.54), colors[1]);
      cap.position.y = 1.25;
      torso.add(cap);
      const gloves = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), colorMaterial('#fff3c4'));
      gloves.position.set(0.36, 0.9, 0.06);
      torso.add(gloves);
    }
    if (player.id === 't0-p1' || player.id === 't1-p1') {
      pulse = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 4, 24), new THREE.MeshBasicMaterial({ color: '#fff18b' }));
      pulse.rotation.x = Math.PI / 2;
      pulse.position.y = 0.04;
      root.add(pulse);
    }
    return { root, pulse, keeper: player.role === 'keeper', torso, arms, legs, shins, animationAge: 0, animationDirection: 1, animationPower: 1 };
  }

  private buildBall() {
    this.ball = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballRadius, 12, 8), colorMaterial('#fff8e6'));
    this.ball.add(base);
    for (let i = 0; i < 5; i++) {
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.074, 5), new THREE.MeshBasicMaterial({ color: '#292735', side: THREE.DoubleSide }));
      const angle = (i / 5) * Math.PI * 2;
      patch.position.set(Math.cos(angle) * 0.158, Math.sin(angle * 2) * 0.09, Math.sin(angle) * 0.158);
      patch.lookAt(patch.position.clone().multiplyScalar(2));
      this.ball.add(patch);
    }
    this.scene.add(this.ball);
    this.ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 12), new THREE.MeshBasicMaterial({ color: '#223126', transparent: true, opacity: 0.2 }));
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.012;
    this.scene.add(this.ballShadow);
    this.ballStreak = new THREE.Group();
    for (let index = 0; index < 5; index++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(FIELD.ballRadius * (0.88 - index * 0.14), 7, 5), new THREE.MeshBasicMaterial({ color: index % 2 ? '#ffdf5c' : '#ffffff', transparent: true, opacity: 0.19 - index * 0.027, depthWrite: false }));
      this.ballStreak.add(bead);
    }
    this.scene.add(this.ballStreak);
    this.createParticles();
  }

  private createParticles() {
    const count = 72;
    this.particlePositions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);
    this.particleColors = new Float32Array(count * 3);
    this.particleLives = new Float32Array(count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    const material = new THREE.PointsMaterial({ size: 0.17, vertexColors: true, transparent: true, opacity: 0.94, depthWrite: false, sizeAttenuation: true });
    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = false;
    this.scene.add(this.particles);
  }

  emitBurst(position: { x: number; z: number }, color: string, count = 18, height = 1.2) {
    const tint = new THREE.Color(color);
    for (let index = 0; index < count; index++) {
      const slot = this.particleCursor++ % this.particleLives.length;
      const offset = slot * 3;
      this.particlePositions[offset] = position.x + (Math.random() - 0.5) * 0.85;
      this.particlePositions[offset + 1] = height + Math.random() * 0.7;
      this.particlePositions[offset + 2] = position.z + (Math.random() - 0.5) * 0.85;
      this.particleVelocities[offset] = (Math.random() - 0.5) * 4.8;
      this.particleVelocities[offset + 1] = 1.2 + Math.random() * 4.1;
      this.particleVelocities[offset + 2] = (Math.random() - 0.5) * 4.8;
      this.particleColors[offset] = tint.r;
      this.particleColors[offset + 1] = tint.g;
      this.particleColors[offset + 2] = tint.b;
      this.particleLives[slot] = 0.7 + Math.random() * 0.55;
    }
    this.particles.visible = true;
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  private updateParticles(dt: number) {
    let active = false;
    for (let slot = 0; slot < this.particleLives.length; slot++) {
      const life = Math.max(0, this.particleLives[slot]! - dt);
      this.particleLives[slot] = life;
      if (!life) continue;
      active = true;
      const offset = slot * 3;
      this.particlePositions[offset] += this.particleVelocities[offset]! * dt;
      this.particlePositions[offset + 1] += this.particleVelocities[offset + 1]! * dt;
      this.particlePositions[offset + 2] += this.particleVelocities[offset + 2]! * dt;
      this.particleVelocities[offset + 1] -= 5.8 * dt;
    }
    this.particles.visible = active;
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  render(state: MatchState, dt: number) {
    const living = new Set(state.players.map((p) => p.id));
    for (const [id, view] of this.actors) {
      if (!living.has(id)) {
        this.actorsGroup.remove(view.root);
        this.actors.delete(id);
      }
    }
    for (const player of state.players) {
      let view = this.actors.get(player.id);
      if (!view) {
        const colors = [state.teams[player.team].primary, state.teams[player.team].secondary] as [string, string];
        view = this.createActor(player, colors, state.bootColor);
        this.actors.set(player.id, view);
        this.actorsGroup.add(view.root);
      }
      view.root.position.set(player.position.x, 0, player.position.z);
      view.root.scale.setScalar(view.keeper ? 1.08 : 1.13);
      const facing = -Math.atan2(player.facing.z, player.facing.x);
      const trickProgress = player.trickTimer > 0 ? 1 - player.trickTimer / 0.78 : 0;
      const flourish = player.trickTimer > 0 ? Math.sin(Math.PI * trickProgress) : 0;
      const spin = player.trickTimer > 0 && player.trickId === 'rueda' ? trickProgress * Math.PI * 2 : 0;
      const speed = Math.hypot(player.velocity.x, player.velocity.z);
      const run = Math.min(1, speed / 3.8);
      const celebration = player.celebration > 0 ? Math.min(1, player.celebration / 0.65) : 0;
      const celebrationAge = Math.max(0, 1.15 - player.celebration);
      const phase = state.elapsed * 12 + Number(player.id.slice(-1)) * 1.7;
      const animationDuration = view.animation === 'slide' ? 0.68 : view.animation === 'save' ? 0.72 : view.animation === 'hit' ? 0.38 : 0.52;
      if (view.animation) {
        view.animationAge += dt;
        if (view.animationAge >= animationDuration) view.animation = undefined;
      }
      const actionAge = view.animationAge;
      const actionPower = view.animationPower;
      const kickPulse = view.animation === 'kick' ? Math.exp(-actionAge * 4.8) * actionPower : 0;
      const slidePulse = view.animation === 'slide' ? Math.sin(Math.PI * Math.min(1, actionAge / animationDuration)) * actionPower : 0;
      const savePulse = view.animation === 'save' ? Math.sin(Math.PI * Math.min(1, actionAge / animationDuration)) * actionPower : 0;
      const hitPulse = view.animation === 'hit' ? Math.exp(-actionAge * 8) * actionPower : 0;
      const keeperDive = view.keeper ? Math.max(Math.min(1, speed / 2.8), savePulse) : 0;
      view.root.rotation.y = facing + spin;
      view.root.rotation.x = player.facing.z * slidePulse * 1.18 - view.animationDirection * savePulse * 1.2;
      view.root.rotation.z = (player.trickTimer > 0 ? (player.trickId === 'elastica' ? -0.48 : player.trickId === 'taco' ? 0.35 : 0) * flourish : 0)
        - Math.sign(player.velocity.z || 0) * keeperDive * 0.62
        - player.facing.x * slidePulse * 1.3
        + player.facing.x * hitPulse * 0.25;
      const celebrationJump = celebration > 0 ? Math.max(0, Math.sin(celebrationAge * 12)) * 0.42 : 0;
      view.root.position.x += player.facing.x * slidePulse * 0.34;
      view.root.position.y = celebrationJump + savePulse * 0.14 - slidePulse * 0.24
        + flourish * (player.trickId === 'sombrerito' ? 0.35 : 0.18)
        + (run ? Math.abs(Math.sin(state.elapsed * 13 + Number(player.id.slice(-1)))) * 0.055 : 0);
      view.root.position.z += player.facing.z * slidePulse * 0.34 + view.animationDirection * savePulse * 0.4;
      view.torso.rotation.x = -run * 0.1 + flourish * (player.trickId === 'pecho' ? -0.35 : 0.08) - kickPulse * 0.28 + celebration * Math.sin(celebrationAge * 8) * 0.12;
      view.torso.rotation.z = Math.sin(phase * 0.5) * run * 0.045 + celebration * 0.18 + slidePulse * 0.2;
      for (const [index, leg] of view.legs.entries()) {
        const swing = Math.cos(phase + index * Math.PI) * run * 0.68;
        const leadLeg = index === 1;
        const celebrationKick = celebration * Math.max(0, Math.sin(celebrationAge * 12 + index * Math.PI)) * 0.5;
        const actionSwing = leadLeg ? -kickPulse * 1.92 - slidePulse * 1.62 + savePulse * 0.28 : slidePulse * 0.68 + savePulse * 0.42;
        leg.rotation.x = swing + actionSwing - celebration * 0.2 + celebrationKick;
        view.shins[index]!.rotation.x = Math.max(0, -swing) * 0.85 + celebration * (0.25 + celebrationKick) + kickPulse * (leadLeg ? 1.2 : 0.08) - slidePulse * (leadLeg ? 0.72 : 0);
      }
      for (const [index, arm] of view.arms.entries()) {
        const swing = Math.sin(phase + index * Math.PI) * run * 0.4;
        const side = -index * 2 + 1;
        arm.rotation.x = swing - celebration * (0.96 + Math.sin(celebrationAge * 12 + index * Math.PI) * 0.18) - keeperDive * 0.42 - kickPulse * (index === 0 ? 0.54 : -0.18);
        arm.rotation.z = side * (0.08 + celebration * 0.42 + savePulse * 1.22 + slidePulse * 0.48) - Math.sign(player.velocity.z || 0) * keeperDive * 0.65;
      }
      if (view.pulse) {
        view.pulse.visible = player.id === state.selectedPlayerId || (state.localPlayers === 2 && player.id === state.secondSelectedPlayerId);
        view.pulse.rotation.z += dt * 0.7;
      }
    }
    const ball = state.ball;
    this.ball.position.set(ball.position.x, ball.height, ball.position.z);
    this.ball.rotation.set(state.elapsed * 3.2, 0, state.elapsed * 2.1);
    const airScale = Math.max(0.5, 1 - ball.height * 0.1);
    this.ballShadow.position.set(ball.position.x, 0.014, ball.position.z);
    this.ballShadow.scale.setScalar(airScale);
    this.ballShadow.material.opacity = Math.max(0.08, 0.28 - ball.height * 0.06);
    this.ball.scale.setScalar(ball.specialShot ? 1.34 : 1.18);
    this.ballStreak.visible = ball.trailTimer > 0;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.z) || 1;
    this.ballStreak.children.forEach((bead, index) => {
      const distance = 0.12 + index * 0.17;
      bead.position.set(ball.position.x - ball.velocity.x / speed * distance, ball.height, ball.position.z - ball.velocity.z / speed * distance);
    });
    const target = new THREE.Vector3(ball.position.x * 0.13, 0, ball.position.z * 0.12);
    this.cameraTarget.lerp(target, 1 - Math.exp(-dt * 1.2));
    this.impactRemaining = Math.max(0, this.impactRemaining - dt);
    const impactEnvelope = this.impactRemaining / 0.2 * this.impactPower;
    const impactPhase = (0.2 - this.impactRemaining) * 68;
    const impactX = Math.sin(impactPhase) * impactEnvelope * 0.12;
    const impactY = Math.cos(impactPhase * 0.72) * impactEnvelope * 0.045;
    this.camera.lookAt(this.cameraTarget.x + impactX, this.cameraTarget.y + impactY, this.cameraTarget.z);
    if (this.impactRemaining === 0) this.impactPower = 0;
    this.updateCrowd(state.elapsed, dt);
    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
  }

  animateAction(playerId: string, animation: ActorAnimation, direction = 1, power = 1) {
    const view = this.actors.get(playerId);
    if (!view) return;
    view.animation = animation;
    view.animationAge = 0;
    view.animationDirection = direction < 0 ? -1 : 1;
    view.animationPower = Math.max(0.65, Math.min(1.4, power));
  }

  celebrate(team: TeamId, color: string, position: { x: number; z: number }) {
    this.impact(1);
    this.crowdEnergy = 1;
    this.emitBurst(position, color, 64, 0.8);
    this.scene.background = new THREE.Color(team === 0 ? '#ffb455' : '#53ccbc');
    window.setTimeout(() => { this.scene.background = new THREE.Color(COURT_PALETTES[this.currentCourt].background); }, 620);
  }
}
