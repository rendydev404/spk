import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/rbac";

export default async function Dashboard() {
  const p = await requireUser();
  return <PageHeader title={`Halo, ${p.name}`} />;
}
