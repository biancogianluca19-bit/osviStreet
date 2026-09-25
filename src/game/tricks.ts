export const TRICKS = [
  { id: 'canio', name: 'CAÑO', direction: '→', style: 10, humiliates: true },
  { id: 'rabona', name: 'RABONA', direction: '↘', style: 10, humiliates: false },
  { id: 'bicicleta', name: 'BICICLETA', direction: '↓', style: 10, humiliates: false },
  { id: 'sombrerito', name: 'SOMBRERITO', direction: '↙', style: 10, humiliates: true },
  { id: 'elastica', name: 'ELÁSTICA', direction: '←', style: 10, humiliates: false },
  { id: 'taco', name: 'TACO', direction: '↖', style: 10, humiliates: false },
  { id: 'rueda', name: 'RUEDA', direction: '↑', style: 10, humiliates: false },
  { id: 'pecho', name: 'PECHO', direction: '↗', style: 10, humiliates: false },
] as const;

export type TrickId = (typeof TRICKS)[number]['id'];

export const DEFAULT_TRICK: TrickId = 'bicicleta';
export const TRICK_SWIPE_THRESHOLD = 18;

/** Map a thumb drag sector to one of the eight tricks, clockwise from right. */
export function trickFromSwipe(dx: number, dy: number): TrickId {
  if (Math.hypot(dx, dy) < TRICK_SWIPE_THRESHOLD) return DEFAULT_TRICK;
  const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
  const sector = Math.round(angle / (Math.PI / 4)) % TRICKS.length;
  return TRICKS[sector].id;
}

export function trickById(id: string): (typeof TRICKS)[number] | undefined {
  return TRICKS.find((trick) => trick.id === id);
}
