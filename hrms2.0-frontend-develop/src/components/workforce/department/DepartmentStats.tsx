import type { LucideIcon } from "lucide-react";

type Stat = {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "blue" | "green" | "purple" | "yellow";
};

export default function DepartmentStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;

        const styles =
          s.color === "blue"
            ? { bg: "bg-blue-100", text: "text-blue-600" }
            : s.color === "green"
            ? { bg: "bg-green-100", text: "text-green-600" }
            : s.color === "yellow"
            ? { bg: "bg-yellow-100", text: "text-yellow-600" }
            : { bg: "bg-purple-100", text: "text-purple-600" };

        const description =
          s.title === "Departments"
            ? "All departments created"
            : s.title === "With Head"
            ? "Departments with assigned heads"
            : s.title === "Members"
            ? "Total registered members"
            : "Currently active departments";

        return (
          <div
            key={s.title}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center space-x-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${styles.bg}`}
              >
                <Icon className={`h-6 w-6 ${styles.text}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {s.title}
                </h3>
                <p className={`text-2xl font-bold ${styles.text}`}>{s.value}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        );
      })}
    </div>
  );
}
