export interface CrowdArmPose {
  rotationX: number;
  rotationZ: number;
}

export interface CrowdPose {
  bounce: number;
  bodyScale: number;
  headScale: number;
  arms: [CrowdArmPose, CrowdArmPose];
}

export function crowdPose(elapsed: number, phase: number, energy: number): CrowdPose {
  const cheer = Number.isFinite(energy) ? Math.max(0, Math.min(1, energy)) : 0;
  const wave = (arm: number) => Math.sin(elapsed * 9 + phase + arm * Math.PI) * cheer * 0.16;
  const armAngle = 0.5 * (1 - cheer) + 0.1 * cheer;
  const armX = Math.sin(elapsed * 7 + phase) * cheer * 0.24;

  return {
    bounce: Math.abs(Math.sin(elapsed * 6.4 + phase)) * (0.025 + cheer * 0.32),
    bodyScale: 1 + cheer * 0.1,
    headScale: 1 + cheer * 0.025,
    arms: [
      { rotationX: armX, rotationZ: armAngle + wave(0) },
      { rotationX: armX, rotationZ: -armAngle + wave(1) },
    ],
  };
}
