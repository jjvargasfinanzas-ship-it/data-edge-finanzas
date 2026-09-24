import { redirect } from "next/navigation";
import { AppDataProvider } from "@/components/app/app-data";
import { AppShell } from "@/components/app/shell";
import { getAccounts, getCategories, getContext } from "@/lib/data";
import { formatLong } from "@/lib/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, today, currency } = await getContext();
  if (!profile.onboarding_completed_at) redirect("/bienvenida");
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <AppDataProvider
      today={today}
      currency={currency}
      accounts={accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        is_archived: a.is_archived,
        credit_limit: a.credit_limit,
        statement_day: a.statement_day,
        due_day: a.due_day,
        institution: a.institution,
        opening_balance: a.opening_balance,
        opening_date: a.opening_date,
        include_in_net_worth: a.include_in_net_worth,
        balance: a.balance,
      }))}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        parent_id: c.parent_id,
        icon: c.icon,
        color: c.color,
        is_archived: c.is_archived,
      }))}
    >
      <AppShell name={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || ""} todayLabel={formatLong(today)} theme={profile.theme ?? "data-edge"}>
        {children}
      </AppShell>
    </AppDataProvider>
  );
}
