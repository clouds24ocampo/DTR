import { AlertTriangle, CheckCircle, Clock, MessageSquare, Search, ShieldCheck, Zap, ArrowRight, User } from "lucide-react";
import { useState, useMemo } from "react";
import type { Report as IReport } from "../../../types/global/report/report.types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  reports: IReport[];
  loading: boolean;
  onEdit: (report: IReport) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "resolved":
      return {
        icon: CheckCircle,
        color: "emerald",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        ring: "ring-emerald-500/10",
        label: "Resolved"
      };
    case "in-progress":
      return {
        icon: Clock,
        color: "blue",
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        ring: "ring-blue-500/10",
        label: "Processing"
      };
    case "closed":
      return {
        icon: ShieldCheck,
        color: "slate",
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        ring: "ring-slate-500/10",
        label: "Closed"
      };
    default:
      return {
        icon: AlertTriangle,
        color: "orange",
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
        ring: "ring-orange-500/10",
        label: "Awaiting Action"
      };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "high":
      return { color: "rose", label: "Critical", icon: Zap };
    case "medium":
      return { color: "amber", label: "Important", icon: AlertTriangle };
    case "low":
      return { color: "blue", label: "Standard", icon: MessageSquare };
    default:
      return { color: "slate", label: "Unset", icon: MinusIcon };
  }
};

const MinusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

export default function MyReportList({ reports, loading, onEdit }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return reports;
    return reports.filter((report) =>
      report.title?.toLowerCase().includes(q) ||
      report.description?.toLowerCase().includes(q) ||
      report.type?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  return (
    <div className="bg-white">
      {/* Search Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative group flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search your submissions by title or content..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 outline-none shadow-sm text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-black uppercase tracking-wider shadow-sm border border-blue-100">
              {filteredReports.length} Historical Records
            </div>
          </div>
        </div>
      </div>

      {/* Reports Grid/List */}
      <div className="divide-y divide-slate-100 min-h-[400px]">
        {loading ? (
          <div className="py-32 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-lg mb-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-600 font-bold tracking-tight">Syncing with registry...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {filteredReports.map((report) => {
                const isUnassigned = report.assignedTo === "Not yet assigned" || report.assignedTo === undefined;
                const hasNoPrioritySet = report.priority === "--" || report.priority === "low";
                const canEdit = isUnassigned && hasNoPrioritySet;
                const status = getStatusConfig(report.status);
                const priority = getPriorityConfig(report.priority || "--");

                return (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group p-6 hover:bg-slate-50/80 transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Status Icon Column */}
                      <div className="hidden lg:block">
                        <div className={`p-3 rounded-lg ${status.bg} ${status.text} border ${status.border} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                          <status.icon className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header Area */}
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ring-1 ${status.bg} ${status.text} ${status.border} ${status.ring}`}>
                                <status.icon className="w-3.5 h-3.5" />
                                {status.label}
                              </span>
                              <span className="text-[10px] font-black text-slate-400">·</span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{report.type}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight">
                              {report.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-3 py-1 bg-${priority.color}-50 text-${priority.color}-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-${priority.color}-100`}>
                              <priority.icon className="w-3 h-3" />
                              {priority.label}
                            </div>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
                              <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-2">
                                {report.description}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Internal Handling</p>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {report.assignedTo || "Decision Pending"}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 lg:text-right">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date Logged</p>
                              <p className="text-xs font-black text-slate-800 tracking-tight leading-none">
                                {new Date(report.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions Area */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-4">
                            {canEdit ? (
                              <button
                                onClick={() => onEdit(report)}
                                className="inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest group/btn"
                              >
                                Modify Request
                                <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                <ShieldCheck className="w-3 h-3 text-slate-300" />
                                Locked for Processing
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-32 text-center">
            <div className="w-20 h-20 mx-auto bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-1 ring-slate-100">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
              Registry Empty
            </h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto text-sm leading-relaxed">
              {searchQuery
                ? "We couldn't find any submission matching your current query."
                : "Your personal reporting history is currently blank. Start by creating a new entry."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
