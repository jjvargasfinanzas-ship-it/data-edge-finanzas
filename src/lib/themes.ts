/** Paletas disponibles. Solo cambian la apariencia; la estructura y la información son las mismas. */
export const THEMES = [
  { id: "data-edge", name: "Actual", hint: "Azul profundo y turquesa", dark: "#0a1f3c", accent: "#14bfa8", soft: "#ebfbf8" },
  { id: "rosado", name: "Rosado", hint: "Rosa pastel y ciruela", dark: "#3d1d2e", accent: "#d66b93", soft: "#fdf2f6" },
  { id: "clasico", name: "Clásico", hint: "Negro, blanco y grises", dark: "#18181b", accent: "#a1a1aa", soft: "#f4f4f5" },
  { id: "vino", name: "Vino", hint: "Borgoña y dorado", dark: "#33111f", accent: "#d4962a", soft: "#fdf6e9" },
  { id: "salvia", name: "Salvia", hint: "Verde salvia y oliva", dark: "#1e2e25", accent: "#739c6c", soft: "#f2f6f1" },
  { id: "arena", name: "Arena", hint: "Arena y terracota", dark: "#33261d", accent: "#c97d52", soft: "#fcf4ee" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];
export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);
