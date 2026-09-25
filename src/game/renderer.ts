import * as THREE from 'three';
import { FIELD, type Footballer, type MatchState, type TeamId } from './types';

type ActorView = { root: THREE.Group; pulse?: THREE.Mesh; keeper: boolean };

const colorMaterial = (color: string) => new THREE.MeshToonMaterial({ color });

export class MatchRenderer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 120);
  readonly renderer: THREE.WebGLRenderer;
  private actors = new Map<string, ActorView>();
  private ball!: THREE.Group;
  private ballShadow!: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private cameraTarget = new THREE.Vector3();
  private arena!: THREE.Group;
  private requestedPixelScale = 1.5;

  constructor(private readonly host: HTMLElement) {
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
    this.camera.position.set(0, 22.5, 18.5);
    this.camera.lookAt(0, 0, 0);
    this.buildArena();
    this.buildBall();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
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

  private buildArena() {
    this.scene.background = new THREE.Color('#ed8954');
    this.scene.fog = new THREE.Fog('#ed8954', 27, 62);
    this.scene.add(new THREE.HemisphereLight('#d8fdff', '#51415a', 2.1));
    const sun = new THREE.DirectionalLight('#fff6c4', 3.1);
    sun.position.set(-9, 19, -7);
    this.scene.add(sun);
    this.arena = new THREE.Group();
    this.scene.add(this.arena);

    const apron = new THREE.Mesh(new THREE.BoxGeometry(27.8, 0.45, 17.6), colorMaterial('#ffbd65'));
    apron.position.y = -0.37;
    this.arena.add(apron);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.halfLength * 2, FIELD.halfWidth * 2), colorMaterial('#80bf54'));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.12;
    this.arena.add(floor);

    const stripe = colorMaterial('#93cf60');
    const stripe2 = colorMaterial('#75b84f');
    for (let index = 0; index < 6; index++) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, FIELD.halfWidth * 2), index % 2 ? stripe : stripe2);
      panel.rotation.x = -Math.PI / 2;
      panel.position.set(-10 + index * 4, -0.105, 0);
      this.arena.add(panel);
    }
    const lineMat = new THREE.MeshBasicMaterial({ color: '#f9f4d4' });
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
      this.buildGoal(side);
    }
    this.buildWalls();
    this.buildCrowdProps();
  }

  private buildGoal(side: number) {
    const goal = new THREE.Group();
    const postMaterial = colorMaterial('#fff4d8');
    const postGeometry = new THREE.CylinderGeometry(0.095, 0.095, 2.65, 8);
    const postX = side * 12.05;
    for (const z of [-2, 2]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(postX, 1.22, z);
      goal.add(post);
    }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 4.05), postMaterial);
    crossbar.position.set(postX, 2.52, 0);
    goal.add(crossbar);
    const netMaterial = new THREE.LineBasicMaterial({ color: '#fff7d4', transparent: true, opacity: 0.58 });
    const addNetLine = (points: THREE.Vector3[]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      goal.add(new THREE.Line(geometry, netMaterial));
    };
    const backX = side * 13;
    for (const z of [-2, -1, 0, 1, 2]) addNetLine([new THREE.Vector3(postX, 0.1, z), new THREE.Vector3(backX, 0.1, z)]);
    for (const y of [0.15, 0.75, 1.35, 1.95, 2.52]) addNetLine([new THREE.Vector3(postX, y, -2), new THREE.Vector3(backX, y, -2), new THREE.Vector3(backX, y, 2), new THREE.Vector3(postX, y, 2)]);
    this.arena.add(goal);
  }

  private buildWalls() {
    const wallMat = colorMaterial('#ef744e');
    const railMat = new THREE.MeshBasicMaterial({ color: '#3e2c45' });
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

  private buildCrowdProps() {
    const colorSet = ['#ffe45e', '#3ce0c0', '#ff526e', '#8b71ff', '#fff1dd'];
    for (let i = 0; i < 34; i++) {
      const x = -12.5 + (i % 17) * 1.55;
      const z = i < 17 ? -8.6 : 8.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.62, 6), colorMaterial(colorSet[(i * 3) % colorSet.length]));
      post.position.set(x, 0.15, z);
      this.arena.add(post);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), colorMaterial(colorSet[(i * 7 + 1) % colorSet.length]));
      head.position.set(x, 0.58, z);
      this.arena.add(head);
    }
  }

  private outline(geometry: THREE.BufferGeometry, color: string, scale = 1) {
    const root = new THREE.Group();
    const ink = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#261f30', side: THREE.BackSide }));
    ink.scale.setScalar(scale * 1.07);
    const fill = new THREE.Mesh(geometry, colorMaterial(color));
    fill.scale.setScalar(scale);
    root.add(ink, fill);
    return root;
  }

  private createActor(player: Footballer, colors: [string, string]): ActorView {
    const root = new THREE.Group();
    const torso = this.outline(new THREE.CapsuleGeometry(0.3, 0.48, 3, 7), colors[0]);
    torso.position.y = 1.06;
    root.add(torso);
    const shorts = this.outline(new THREE.CylinderGeometry(0.28, 0.31, 0.29, 8), colors[1]);
    shorts.position.y = 0.58;
    root.add(shorts);
    const head = this.outline(new THREE.SphereGeometry(0.235, 9, 7), '#f3bd82');
    head.position.y = 1.62;
    root.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.47), colorMaterial('#302638'));
    hair.position.y = 1.69;
    root.add(hair);
    for (const side of [-1, 1]) {
      const arm = this.outline(new THREE.CapsuleGeometry(0.09, 0.32, 2, 5), colors[0]);
      arm.position.set(side * 0.34, 1.05, 0.03);
      arm.rotation.z = -side * 0.15;
      root.add(arm);
      const leg = this.outline(new THREE.CapsuleGeometry(0.115, 0.36, 2, 5), '#312b48');
      leg.position.set(side * 0.14, 0.22, 0);
      root.add(leg);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.28), colorMaterial('#fff1d2'));
      shoe.position.set(side * 0.14, 0.075, 0.075);
      root.add(shoe);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(player.role === 'keeper' ? 0.66 : 0.53, 12), new THREE.MeshBasicMaterial({ color: '#172335', transparent: true, opacity: 0.18 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.006;
    root.add(shadow);
    let pulse: THREE.Mesh | undefined;
    if (player.role === 'keeper') {
      const cap = this.outline(new THREE.SphereGeometry(0.31, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.54), colors[1]);
      cap.position.y = 1.76;
      root.add(cap);
      const gloves = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), colorMaterial('#fff3c4'));
      gloves.position.set(0.36, 0.9, 0.06);
      root.add(gloves);
    }
    if (player.id === 't0-p1') {
      pulse = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 4, 24), new THREE.MeshBasicMaterial({ color: '#fff18b' }));
      pulse.rotation.x = Math.PI / 2;
      pulse.position.y = 0.04;
      root.add(pulse);
    }
    return { root, pulse, keeper: player.role === 'keeper' };
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
  }

  render(state: MatchState, dt: number) {
    const living = new Set(state.players.map((p) => p.id));
    for (const [id, view] of this.actors) {
      if (!living.has(id)) {
        this.arena.remove(view.root);
        this.actors.delete(id);
      }
    }
    for (const player of state.players) {
      let view = this.actors.get(player.id);
      if (!view) {
        const colors = [state.teams[player.team].primary, state.teams[player.team].secondary] as [string, string];
        view = this.createActor(player, colors);
        this.actors.set(player.id, view);
        this.arena.add(view.root);
      }
      view.root.position.set(player.position.x, 0, player.position.z);
      const facing = -Math.atan2(player.facing.z, player.facing.x);
      const trickProgress = player.trickTimer > 0 ? 1 - player.trickTimer / 0.78 : 0;
      const flourish = player.trickTimer > 0 ? Math.sin(Math.PI * trickProgress) : 0;
      const spin = player.trickTimer > 0 && player.trickId === 'rueda' ? trickProgress * Math.PI * 2 : 0;
      view.root.rotation.y = facing + spin;
      view.root.rotation.z = player.trickTimer > 0 ? (player.trickId === 'elastica' ? -0.48 : player.trickId === 'taco' ? 0.35 : 0) * flourish : 0;
      const run = Math.hypot(player.velocity.x, player.velocity.z) > 1;
      view.root.position.y = player.celebration > 0 ? Math.abs(Math.sin((1.2 - player.celebration) * 14)) * 0.5 : flourish * (player.trickId === 'sombrerito' ? 0.35 : 0.18) + (run ? Math.abs(Math.sin(state.elapsed * 13 + Number(player.id.slice(-1)))) * 0.055 : 0);
      if (view.pulse) {
        view.pulse.visible = player.id === state.selectedPlayerId;
        view.pulse.rotation.z += dt * 0.7;
      }
      if (view.keeper) view.root.scale.set(1.08, 1.08, 1.08);
    }
    const ball = state.ball;
    this.ball.position.set(ball.position.x, ball.height, ball.position.z);
    this.ball.rotation.set(state.elapsed * 3.2, 0, state.elapsed * 2.1);
    const airScale = Math.max(0.5, 1 - ball.height * 0.1);
    this.ballShadow.position.set(ball.position.x, 0.014, ball.position.z);
    this.ballShadow.scale.setScalar(airScale);
    this.ballShadow.material.opacity = Math.max(0.06, 0.23 - ball.height * 0.05);
    this.ball.scale.setScalar(ball.specialShot ? 1.2 : 1);
    const target = new THREE.Vector3(ball.position.x * 0.13, 0, ball.position.z * 0.12);
    this.cameraTarget.lerp(target, 1 - Math.exp(-dt * 1.2));
    this.camera.lookAt(this.cameraTarget);
    this.renderer.render(this.scene, this.camera);
  }

  celebrate(team: TeamId) {
    this.scene.background = new THREE.Color(team === 0 ? '#ffb455' : '#53ccbc');
    window.setTimeout(() => { this.scene.background = new THREE.Color('#ed8954'); }, 620);
  }
}
