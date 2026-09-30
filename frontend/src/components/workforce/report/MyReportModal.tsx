import React from "react";
import {
  Report as IReport,
  ReportType,
} from "../../../types/global/report/report.types";
import ModalShell from "../../global/ModalShell";
import { InfoIcon } from "../../common/InfoIcon";

export type CreateSelfReportPayload = {
  type: ReportType;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "open";
  assignedTo: "Not yet assigned";
};

export type UpdateSelfReportPayload = {
  type: ReportType;
  title: string;
  description: string;
};

type BaseProps = {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  displayName: string;
};

type CreateProps = {
  mode: "create";
  onCreate: (payload: CreateSelfReportPayload) => Promise<void> | void;
  report?: never;
  onUpdate?: never;
};

type EditProps = {
  mode: "edit";
  report: IReport;
  onUpdate: (
    id: string,
    payload: UpdateSelfReportPayload
  ) => Promise<void> | void;
  onCreate?: never;
};

type MyReportModalProps = BaseProps & (CreateProps | EditProps);

const MyReportModal: React.FC<MyReportModalProps> = (props) => {
  const { open, onClose, loading, displayName } = props;
  const isCreate = props.mode === "create";
  const report = props.mode === "edit" ? props.report : undefined;

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);

    const type = fd.get("type") as ReportType;
    const title = (fd.get("title") as string) || "";
    const description = (fd.get("description") as string) || "";

    try {
      if (isCreate) {
        const payload: CreateSelfReportPayload = {
          type,
          title,
          description,
          priority: "low",
          status: "open",
          assignedTo: "Not yet assigned",
        };
        await props.onCreate(payload);
      } else {
        const payload: UpdateSelfReportPayload = { type, title, description };
        await props.onUpdate(report!.id, payload);
      }
      onClose();
    } catch (error) {
      // Error is logged in the parent component
      // Don't close modal on error
      console.error("Form submission error:", error);
    }
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
              htmlFor="my-reporter"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Reporter
              <InfoIcon
                description="Your name is automatically taken from your current session. This field is read-only and identifies you as the creator of this report."
                title="Reporter"
              />
            </label>
            <input
              id="my-reporter"
              type="text"
              value={displayName}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              readOnly
              aria-describedby="my-reporter-hint"
            />
            <p id="my-reporter-hint" className="mt-1 text-xs text-gray-500">
              Your identity is taken from your session.
            </p>
          </div>

          <div>
            <label
              htmlFor="my-type"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Report Type
              <InfoIcon
                description="Select the category of this report. Options include Suggestion (improvement idea), Complaint (formal grievance), or Other (miscellaneous reports)."
                title="Report Type"
              />
            </label>
            <select
              id="my-type"
              name="type"
              defaultValue={isCreate ? "" : report?.type}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select type</option>
              <option value="suggestion">Suggestion</option>
              <option value="complaint">Complaint</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="my-title"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Title
              <InfoIcon
                description="Enter a brief, descriptive title for the report. This should summarize the main issue or topic in a few words. A clear title helps others quickly understand what the report is about."
                title="Title"
              />
            </label>
            <input
              id="my-title"
              type="text"
              name="title"
              defaultValue={isCreate ? "" : report?.title}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief summary of the report"
              required
            />
          </div>

          <div>
            <label
              htmlFor="my-description"
              className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
            >
              Description
              <InfoIcon
                description="Provide a detailed description of the report. Include all relevant information, context, and any specific details that will help understand and address the issue, suggestion, or complaint effectively."
                title="Description"
              />
            </label>
            <textarea
              id="my-description"
              name="description"
              rows={4}
              defaultValue={isCreate ? "" : report?.description}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed description of the report..."
              required
            />
          </div>

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

export default MyReportModal;
