import { MapPin } from "lucide-react";

interface Props {
  totalWorkplaces: number;
  totalWorkstations: number;
  availableWorkstations: number;
  assignedWorkstations: number;
}

export default function WorkplaceStats({
  totalWorkplaces,
  totalWorkstations,
  availableWorkstations,
  assignedWorkstations,
}: Props) {
  const stats = [
    { title: "Total Workplaces", value: totalWorkplaces, color: "blue" },
    { title: "Total Workstations", value: totalWorkstations, color: "green" },
    { title: "Available", value: availableWorkstations, color: "yellow" },
    { title: "Assigned", value: assignedWorkstations, color: "purple" },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center space-x-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                stat.color === "blue"
                  ? "bg-blue-100 text-blue-600"
                  : stat.color === "green"
                  ? "bg-green-100 text-green-600"
                  : stat.color === "yellow"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-purple-100 text-purple-600"
              }`}
            >
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {stat.title}
              </h3>
              <p
                className={`text-2xl font-bold ${
                  stat.color === "blue"
                    ? "text-blue-600"
                    : stat.color === "green"
                    ? "text-green-600"
                    : stat.color === "yellow"
                    ? "text-yellow-600"
                    : "text-purple-600"
                }`}
              >
                {stat.value}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {stat.title === "Total Workplaces" && "All workplaces created"}
            {stat.title === "Total Workstations" && "All available stations"}
            {stat.title === "Available" && "Unassigned stations today"}
            {stat.title === "Assigned" && "Assigned stations today"}
          </p>
        </div>
      ))}
    </div>
  );
}
