import React, { useMemo } from "react";
import { Report as IReport, ReportType, ReportPriority } from "../../../types/global/report/report.types";
import ModalShell from "../../global/ModalShell";
import { InfoIcon } from "../../common/InfoIcon";

type EmployeeLite = {
  _id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  position?: string | string[];
};

type TeamLeaderOption = { id: string; name: string };

export type CreateReportPayload = {
  employeeId: string;
  employeeName: string;
  type: ReportType;
  title: string;
  description: string;
  priority: ReportPriority;
  status: "open";
  assignedTo?: string;
};

export type UpdateReportPayload = {
  employeeId: string;
  employeeName: string;
  type: ReportType;
  title: string;
  description: string;
  priority: ReportPriority;
  assignedTo?: string;
};

type BaseProps = {
  open: boolean;
  onClose: () => void;
  employees: EmployeeLite[];
  teamLeaders: TeamLeaderOption[];
  me?: EmployeeLite | null;
  loading?: boolean;
};

type CreateProps = {
  mode: "create";
  onCreate: (payload: CreateReportPayload) => Promise<void> | void;
  report?: never;
  onUpdate?: never;
};

type EditProps = {
  mode: "edit";
  report: IReport;
  onUpdate: (id: string, payload: UpdateReportPayload) => Promise<void> | void;
  onCreate?: never;
};

type ReportModalProps = BaseProps & (CreateProps | EditProps);

const fullName = (e?: EmployeeLite) =>
  [e?.firstName, e?.middleName, e?.lastName].filter(Boolean).join(" ");

const ReportModal: React.FC<ReportModalProps> = (props) => {
  const { open, onClose, employees, teamLeaders, me, loading } = props;
  const isCreate = props.mode === "create";
  const isEdit = props.mode === "edit";
  const report = isEdit ? props.report : undefined;

  const myRole = useMemo(() => {
    const pos = me?.position;
    const posValue = Array.isArray(pos) ? pos[0] : pos;
    return (posValue ?? "").toLowerCase();
  }, [me?.position]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);

    const employeeId = (fd.get("employeeId") as string) || "";
    const reporter = employees.find((x) => x._id === employeeId);
    const employeeName = reporter ? fullName(reporter) : "";

    const common = {
      employeeId,
      employeeName,
      type: fd.get("type") as ReportType,
      title: (fd.get("title") as string) || "",
      description: (fd.get("description") as string) || "",
      priority: fd.get("priority") as ReportPriority,
    };

    const assignedToValue = (fd.get("assignedTo") as string) || "";

    if (isCreate) {
      const payload: CreateReportPayload = {
        ...common,
        status: "open",
        assignedTo:
          myRole === "workforce" ? assignedToValue || undefined : undefined,
      };
      await props.onCreate(payload);
    } else {
      const payload: UpdateReportPayload = {
        ...common,
        assignedTo: assignedToValue || undefined,
      };
      await props.onUpdate(report!.id, payload);
    }

    onClose();
  }

  return (
    <ModalShell
      title={isCreate ? "New Report" : "Edit Report"}
      onClose={onClose}
    >
      <div className="max-w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="rm-employeeId"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Reporter
              <InfoIcon
                description="Select the employee who is creating this report. This identifies who the report is coming from and is used for tracking and communication purposes."
                title="Reporter"
              />
            </label>
            <select
              id="rm-employeeId"
              name="employeeId"
              defaultValue={isEdit ? report?.employeeId : me?._id}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select user</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {fullName(emp)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rm-type"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Report Type
              <InfoIcon
                description="Select the category of this report. Options include Issue (problem that needs resolution), Suggestion (improvement idea), Complaint (formal grievance), or Other (miscellaneous reports)."
                title="Report Type"
              />
            </label>
            <select
              id="rm-type"
              name="type"
              defaultValue={isEdit ? report?.type : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select type</option>
              <option value="issue">Issue</option>
              <option value="suggestion">Suggestion</option>
              <option value="complaint">Complaint</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="rm-priority"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Priority
              <InfoIcon
                description="Set the urgency level of this report. Low priority indicates non-urgent matters, Medium priority requires attention soon, and High priority needs immediate attention or resolution."
                title="Priority"
              />
            </label>
            <select
              id="rm-priority"
              name="priority"
              defaultValue={isEdit ? report?.priority : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="rm-title"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Title
              <InfoIcon
                description="Enter a brief, descriptive title for the report. This should summarize the main issue or topic in a few words. A clear title helps others quickly understand what the report is about."
                title="Title"
              />
            </label>
            <input
              id="rm-title"
              type="text"
              name="title"
              defaultValue={isEdit ? report?.title : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief summary of the report"
              required
            />
          </div>

          <div>
            <label
              htmlFor="rm-description"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Description
              <InfoIcon
                description="Provide a detailed description of the report. Include all relevant information, context, and any specific details that will help understand and address the issue, suggestion, or complaint effectively."
                title="Description"
              />
            </label>
            <textarea
              id="rm-description"
              name="description"
              rows={4}
              defaultValue={isEdit ? report?.description : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed description of the report..."
              required
            />
          </div>

          {(isEdit || (isCreate && myRole === "workforce")) && (
            <div>
              <label
                htmlFor="rm-assignedTo"
                className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
              >
                Assigned To
                <InfoIcon
                  description="Optionally assign this report to a specific team leader. When assigned, the selected team leader will be responsible for reviewing and handling this report. Leave unassigned if no specific assignment is needed."
                  title="Assigned To"
                />
              </label>
              <select
                id="rm-assignedTo"
                name="assignedTo"
                defaultValue={isEdit ? report?.assignedTo || "" : ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby="rm-assignedTo-hint"
              >
                <option value="">Unassigned</option>
                {teamLeaders.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <p id="rm-assignedTo-hint" className="mt-1 text-xs text-gray-500">
                Optional — pick a team leader to assign this report.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreate ? "Submit Report" : "Update Report"}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

export default ReportModal;
