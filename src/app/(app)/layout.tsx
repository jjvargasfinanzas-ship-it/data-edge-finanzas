import { redirect } from "next/navigation";
import { AppDataProvider } from "@/components/app/app-data";
import { AppShell } from "@/components/app/shell";
import { getAccounts, getCategories, getContext, getPlanned } from "@/lib/data";
import { formatLong } from "@/lib/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, today, currency } = await getContext();
  if (!profile.onboarding_completed_at) redirect("/bienvenida");
  const [accounts, categories, planned] = await Promise.all([getAccounts(), getCategories(), getPlanned()]);

  return (
    <AppDataProvider
      today={today}
      currency={currency}
      planned={planned.map((p) => ({
        id: p.id,
        kind: p.kind,
        name: p.name,
        amount: Number(p.amount),
        account_id: p.account_id,
        to_account_id: p.to_account_id,
        category_id: p.category_id,
        frequency: p.frequency,
        start_date: p.start_date,
        end_date: p.end_date,
        notes: p.notes,
        is_active: p.is_active,
      }))}
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
