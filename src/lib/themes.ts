/** Paletas disponibles. Solo cambian la apariencia; la estructura y la información son las mismas. */
export const THEMES = [
  { id: "data-edge", name: "Actual", hint: "Azul profundo y turquesa", dark: "#0a1f3c", accent: "#14bfa8", soft: "#ebfbf8" },
  { id: "rosado", name: "Rosado", hint: "Rosa pastel y ciruela", dark: "#3d1d2e", accent: "#d66b93", soft: "#fdf2f6" },
  { id: "clasico", name: "Clásico", hint: "Negro, blanco y grises", dark: "#18181b", accent: "#a1a1aa", soft: "#f4f4f5" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);
