import { AlertTriangle, CheckCircle, Clock, MessageSquare, User, Calendar, Shield } from "lucide-react";
import { useState } from "react";
import { Report as IReport, ReportStatus } from "../../../types/global/report/report.types";
import { UserType } from "../../../types/workforce/user/user.type";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  reports: IReport[];
  userRoleLower: string;
  updateLoading: boolean;
  loading: boolean;
  onEdit: (report: IReport) => void;
  onUpdateStatus: (id: string, status: ReportStatus) => void;
  employees: UserType[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "resolved":
      return <CheckCircle className="w-4 h-4" />;
    case "in-progress":
      return <Clock className="w-4 h-4" />;
    case "closed":
      return <Shield className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "resolved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10";
    case "in-progress":
      return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10";
    case "closed":
      return "bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10";
    default:
      return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10";
  }
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-rose-100 text-rose-800 ring-rose-600/20";
    case "medium":
      return "bg-orange-100 text-orange-800 ring-orange-600/20";
    case "low":
      return "bg-blue-100 text-blue-800 ring-blue-600/20";
    default:
      return "bg-slate-100 text-slate-800 ring-slate-600/20";
  }
};

const getTypeStyle = (type: string) => {
  switch (type) {
    case "issue":
      return "bg-purple-50 text-purple-700 border-purple-100";
    case "suggestion":
      return "bg-cyan-50 text-cyan-700 border-cyan-100";
    case "complaint":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-slate-50 text-slate-700 border-slate-100";
  }
};

export default function ReportList({
  reports,
  userRoleLower,
  updateLoading,
  loading,
  onEdit,
  onUpdateStatus,
  employees,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredReports = reports.filter((report) =>
    Object.values(report)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const getReporterInfo = (id: any) => {
    const searchId = typeof id === "object" ? id?._id || id?.id : id;
    return employees.find((u) => u._id === searchId);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Active Reports</h3>
            <p className="text-sm text-slate-500 font-medium">
              Monitor and respond to personnel feedback and workplace issues
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search by title, description, or reporter..."
                className="w-full lg:w-96 pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 outline-none shadow-sm text-sm group-hover:border-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold uppercase tracking-wider">
              {filteredReports.length} {filteredReports.length === 1 ? "Record" : "Records"}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-lg mb-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-600 font-medium">Synchronizing reports...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredReports.map((report) => {
              const canEdit = report.assignedTo === "Not yet assigned";
              const reporter = getReporterInfo(report.employeeId);

              return (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative p-6 hover:bg-slate-50/80 transition-all duration-300"
                >
                  <div className="flex flex-col xl:flex-row gap-6">
                    {/* Reporter Profile Section */}
                    <div className="flex items-start gap-4 xl:w-64 flex-shrink-0">
                      <div className="relative">
                        {reporter?.profilePicture ? (
                          <img
                            src={reporter.profilePicture}
                            alt={report.employeeName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow-md">
                            {getInitials(reporter?.firstName, reporter?.lastName)}
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${report.status === 'resolved' ? 'bg-emerald-500' :
                          report.status === 'in-progress' ? 'bg-amber-500' : 'bg-slate-300'
                          }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {report.employeeName}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {reporter?.position || "Staff"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <p className="text-[11px] text-slate-400 font-medium">
                            {new Date(report.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 border-l border-slate-100 xl:pl-6">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(report.type)}`}>
                          {report.type}
                        </span>
                        <h4 className="text-lg font-bold text-slate-800 leading-tight">
                          {report.title}
                        </h4>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                        {report.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ring-1 ${getStatusStyle(report.status)}`}>
                          {getStatusIcon(report.status)}
                          <span className="capitalize">{report.status.replace('-', ' ')}</span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${getPriorityStyle(report.priority)}`}>
                          <AlertTriangle className="w-3 h-3" />
                          <span className="capitalize">{report.priority} Priority</span>
                        </div>

                        {report.assignedTo && report.assignedTo !== "Not yet assigned" && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[11px] font-bold text-slate-600 border border-slate-200">
                            <User className="w-3 h-3" />
                            <span>Assigned: {report.assignedTo}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 xl:flex-col xl:justify-center">
                      {[
                        "workforce",
                        "team leader",
                        "hr",
                        "operation manager",
                      ].some((r) => userRoleLower.includes(r)) && (
                          <div className="flex gap-2 w-full">
                            {report.status === "open" && (
                              <button
                                onClick={() => onUpdateStatus(report.id, "in-progress")}
                                disabled={updateLoading}
                                className="flex-1 xl:w-32 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                              >
                                Initialize
                              </button>
                            )}
                            {report.status === "in-progress" && (
                              <button
                                onClick={() => onUpdateStatus(report.id, "resolved")}
                                disabled={updateLoading}
                                className="flex-1 xl:w-32 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                              >
                                Resolve
                              </button>
                            )}
                            {report.status === "resolved" && (
                              <button
                                onClick={() => onUpdateStatus(report.id, "closed")}
                                disabled={updateLoading}
                                className="flex-1 xl:w-32 px-4 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        )}

                      <button
                        onClick={() => canEdit && onEdit(report)}
                        disabled={!canEdit}
                        className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all border ${canEdit
                          ? "text-blue-600 hover:bg-blue-50 border-blue-200"
                          : "text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed"
                          }`}
                        title={canEdit ? "Edit Report" : "Cannot edit active/resolved reports"}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <div className="py-32 text-center">
            <div className="inline-flex items-center justify-center p-6 bg-slate-50 rounded-full mb-6">
              <MessageSquare className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {searchTerm ? "No results found" : "Inbox Empty"}
            </h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium leading-relaxed">
              {searchTerm
                ? "We couldn't find any reports matching your search criteria."
                : "Great news! All workplace reports have been processed."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
