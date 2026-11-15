// A status always comes with a shape and a word, not only with a color.
export const SHAPE = { normal: '●', caution: '▲', alert: '■' } as const
export type Status = keyof typeof SHAPE
