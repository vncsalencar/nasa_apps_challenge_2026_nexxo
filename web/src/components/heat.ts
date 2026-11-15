// The input of the two body figures (2D and 3D): how strong each region shows, from 0 to 1.
// The figures do not know what the numbers mean. The CO2 panel computes them.

// The five parts cover the whole skin of the figure.
export const BODY_PARTS = ['head', 'chest', 'abdomen', 'arms', 'legs'] as const
export type BodyPart = (typeof BODY_PARTS)[number]

// Four small regions lie on top of the parts: the top of the skull, the two eyes,
// the lower face, and the throat with the windpipe.
export const SPOT_REGIONS = ['brain', 'eyes', 'face', 'airway'] as const
export type SpotRegion = (typeof SPOT_REGIONS)[number]

export type HeatRegion = BodyPart | SpotRegion
export const HEAT_REGIONS: HeatRegion[] = [...BODY_PARTS, ...SPOT_REGIONS]
export type Heat = Record<HeatRegion, number>

// A point of the window, in CSS pixels. The panel puts its tooltip there.
export type FigurePoint = { x: number; y: number }

export type FigureProps = {
  heat: Heat
  // The text of each region for a screen reader, for example "Eyes: blurred vision, 100% into the band".
  labels: Record<HeatRegion, string>
  selected: HeatRegion | null
  onSelect: (region: HeatRegion) => void
  // The region under the pointer or with the keyboard focus, or null. "point" is absent for the keyboard.
  onHover?: (region: HeatRegion | null, point?: FigurePoint) => void
}

// How a heat value becomes a color. The 2D and the 3D figure use the same numbers.
//   amount: how much of the hot color replaces the neutral color of the skin, from 0 to 1.
//   toCritical: where the hot color is between the caution color (0) and the alert color (1).
export function heatMix(heat: number): { amount: number; toCritical: number } {
  const h = Math.min(1, Math.max(0, heat))
  if (h === 0) return { amount: 0, toCritical: 0 }
  return { amount: 0.3 + 0.7 * h, toCritical: Math.min(1, Math.max(0, (h - 0.35) / 0.5)) }
}
