import type { ClientProject } from "@/content/projects/client-work";

export function ProjectStatusBadge({ status }: { status: ClientProject["status"] }) {
  const launched = status === "Launched";

  return (
    <span className={launched ? "client-badge client-badge-live" : "client-badge"}>
      {status}
    </span>
  );
}
