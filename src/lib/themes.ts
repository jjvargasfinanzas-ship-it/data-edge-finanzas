export const THEMES = [
  { id: "data-edge", name: "Data Edge", hint: "Azul profundo y turquesa", dark: "#0a1f3c", accent: "#14bfa8", soft: "#ebfbf8" },
  { id: "oceano", name: "Océano", hint: "Azul marino y celeste", dark: "#0c1f45", accent: "#0e98d8", soft: "#eaf6fd" },
  { id: "esmeralda", name: "Esmeralda", hint: "Verde bosque y esmeralda", dark: "#0b2a1c", accent: "#12b373", soft: "#e9faf2" },
  { id: "violeta", name: "Violeta", hint: "Índigo y lavanda", dark: "#1d1545", accent: "#8661e8", soft: "#f3effe" },
  { id: "grafito", name: "Grafito", hint: "Carbón y ámbar", dark: "#1a1d23", accent: "#eea10f", soft: "#fff7e6" },
  { id: "vino", name: "Vino", hint: "Borgoña y dorado", dark: "#33111f", accent: "#d4962a", soft: "#fdf6e9" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);
