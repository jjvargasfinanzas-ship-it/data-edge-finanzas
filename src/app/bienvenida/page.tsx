import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/data";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function BienvenidaPage() {
  const { profile, today } = await getContext();
  if (profile.onboarding_completed_at) redirect("/inicio");
  return <Wizard firstName={profile.first_name ?? ""} today={today} />;
}
