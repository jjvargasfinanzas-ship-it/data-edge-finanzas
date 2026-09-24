import type { Metadata } from "next";
import { SignUpForm } from "./form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return <SignUpForm google={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"} />;
}
