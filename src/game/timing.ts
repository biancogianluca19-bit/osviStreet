import type { MatchPhase } from './types';

export const GOAL_RESTART_DELAY_SECONDS = 1.45;
export const ACTION_BUFFER_MS = GOAL_RESTART_DELAY_SECONDS * 1_000 + 350;

export function actionWaitNotice(phase: MatchPhase, playerHasBall: boolean) {
  if (phase === 'goal' || phase === 'kickoff') return 'ESPERA EL SAQUE';
  if (phase === 'playing' && !playerHasBall) return 'RECUPERA LA PELOTA';
  return undefined;
}
