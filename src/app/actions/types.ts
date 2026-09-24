export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** cambia en cada respuesta para que el cliente detecte envíos sucesivos */
  ts?: number;
};

export const initialState: ActionState = {};
