/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReportList from "../../../components/workforce/report/ReportList";
import ReportModal, {
  CreateReportPayload,
  UpdateReportPayload,
} from "../../../components/workforce/report/ReportModal";
import ReportSummaryCards from "../../../components/workforce/report/ReportSummaryCards";
import { useReportStore } from "../../../stores/global/report/report.store";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import type {
  Report as IReport,
  ReportStatus,
} from "../../../types/global/report/report.types";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import InfoModal from "../../../components/global/InfoModal";

export default function ReportManagement() {
  const { user, otherUsers, fetchOtherUsers, fetchMe } = useUserStore();

  const canModerate = useMemo(() => {
    const pos = user?.position;
    const roles = Array.isArray(pos)
      ? pos.map((p) => (p ?? "").toLowerCase())
      : [(pos ?? "").toLowerCase()];
    const managerKeywords = [
      "workforce",
      "team leader",
      "hr",
      "operation manager",
      "supervisory",
      "management",
    ];
    return roles.some((role) =>
      managerKeywords.some((keyword) => role.includes(keyword))
    );
  }, [user]);

  const {
    reports,
    fetchAllReports,
    fetchMyReports,
    createReportFromBody,
    updateReportStatus,
    updateReport,
    fetchAllLoading,
    fetchMineLoading,
    createLoading,
    updateLoading,
    error,
  } = useReportStore();



  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentReport, setCurrentReport] = useState<IReport | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      fetchMe().catch(() => void 0);
    }
  }, [user, fetchMe]);

  useEffect(() => {
    fetchOtherUsers().catch(() => void 0);
  }, [fetchOtherUsers]);

  useEffect(() => {
    if (!user) return;
    if (canModerate) {
      fetchAllReports().catch(() => void 0);
    } else {
      fetchMyReports().catch(() => void 0);
    }
  }, [user, canModerate, fetchAllReports, fetchMyReports]);

  const employees = useMemo(() => {
    const list = [...(otherUsers ?? [])];
    if (user && !list.some((u) => u._id === user._id)) list.unshift(user);
    return list;
  }, [user, otherUsers]);

  const fullName = (e: any) =>
    [e?.firstName, e?.middleName, e?.lastName].filter(Boolean).join(" ");

  const teamLeaders = useMemo(
    () =>
      employees
        .filter((e: any) => {
          const pos = e?.position;
          const roles = Array.isArray(pos)
            ? pos.map((p: any) => (p ?? "").toLowerCase())
            : [(pos ?? "").toLowerCase()];
          return roles.some((r) => r === "team leader");
        })
        .map((e: any) => ({
          id: e._id,
          name: fullName(e),
        })),
    [employees]
  );

  const filteredReports: IReport[] = useMemo(() => {
    let result: IReport[] = [];

    // First filter by role
    if (canModerate) {
      result = reports;
    } else {
      result = reports.filter((r) => {
        const reporterId =
          typeof r.employeeId === "object"
            ? (r.employeeId as any)?._id || (r.employeeId as any)?.id
            : r.employeeId;
        return reporterId === user?._id;
      });
    }

    // Then apply active filter if any
    if (activeFilter) {
      if (activeFilter.startsWith("status:")) {
        const status = activeFilter.split(":")[1];
        result = result.filter((r) => r.status === status);
      } else if (activeFilter.startsWith("priority:")) {
        const priority = activeFilter.split(":")[1];
        result = result.filter((r) => r.priority === priority);
      }
    }

    return result;
  }, [reports, user, activeFilter]);



  const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      if (
        report.assignedTo === "Not yet assigned" ||
        report.priority === "--"
      ) {
        setInfoModalMessage(
          "Please ensure that the 'Assigned To' field is set and priority is not '--' before starting progress."
        );
        setShowInfoModal(true);
        return;
      }
      await updateReportStatus(reportId, status);
    }
  };

  const openEdit = (report: IReport) => {
    setCurrentReport(report);
    setShowEditForm(true);
  };

  const loading = fetchAllLoading || fetchMineLoading;
  const userRoleLower = Array.isArray(user?.position)
    ? user?.position[0]?.toLowerCase()
    : (user?.position ?? "").toLowerCase();

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Report Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Track and manage workplace reports and issues
          </p>
          {error && (
            <motion.div
              className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg"
              variants={itemVariants}
            >
              <p className="text-sm text-red-600 font-medium">
                Error: {error}
              </p>
            </motion.div>
          )}
        </div>

        {/* Desktop Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateForm(true)}
          className="hidden md:flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          disabled={createLoading || loading}
        >
          <Plus className="w-4 h-4" />
          <span>New Report</span>
        </motion.button>

        {/* Mobile Floating Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onClick={() => {
            setShowCreateForm(true);
            setIsOpen((prev) => !prev);
          }}
          disabled={createLoading || loading}
          className={`fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 rounded-full shadow-lg bg-blue-600 text-white transition-transform duration-300 hover:bg-blue-700 sm:hidden z-50 ${isOpen ? "rotate-45" : "rotate-0"
            }`}
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="space-y-4">
        <ReportSummaryCards
          reports={(() => {
            // Show counts from all reports user has access to
            if (canModerate) {
              return reports;
            }
            return reports.filter((r) => {
              const reporterId =
                typeof r.employeeId === "object"
                  ? (r.employeeId as any)?._id || (r.employeeId as any)?.id
                  : r.employeeId;
              return reporterId === user?._id;
            });
          })()}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Active Filter Indicator */}
        {activeFilter && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                Filtered by:{" "}
                <span className="font-semibold">
                  {activeFilter.startsWith("status:")
                    ? activeFilter.split(":")[1].charAt(0).toUpperCase() +
                    activeFilter.split(":")[1].slice(1).replace("-", " ")
                    : "High Priority"}
                </span>
              </span>
            </div>
            <button
              onClick={() => setActiveFilter(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-medium rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear filter
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Report List Section */}
      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-600 rounded-full" />
            <h2 className="text-lg font-bold text-slate-300">Detailed View</h2>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <ReportList
            reports={filteredReports}
            userRoleLower={userRoleLower}
            updateLoading={updateLoading}
            onEdit={openEdit}
            onUpdateStatus={handleUpdateStatus}
            loading={loading}
            employees={employees as any}
          />
        </div>
      </motion.div>

      {/* Create Modal */}
      <ReportModal
        mode="create"
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        employees={employees}
        teamLeaders={teamLeaders}
        me={user as any}
        loading={createLoading}
        onCreate={async (payload: CreateReportPayload) => {
          try {
            await createReportFromBody(payload);
            // Refetch reports based on user role
            if (canModerate) {
              await fetchAllReports();
            } else {
              await fetchMyReports();
            }
          } catch (error) {
            console.error("Failed to create report:", error);
          }
        }}
      />

      {/* Edit Modal */}
      {showEditForm && currentReport && (
        <ReportModal
          mode="edit"
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          employees={employees}
          teamLeaders={teamLeaders}
          me={user as any}
          loading={updateLoading}
          report={currentReport}
          onUpdate={async (id: string, payload: UpdateReportPayload) => {
            try {
              await updateReport(id, payload);
              // Refetch reports based on user role
              if (canModerate) {
                await fetchAllReports();
              } else {
                await fetchMyReports();
              }
            } catch (error) {
              console.error("Failed to update report:", error);
            }
          }}
        />
      )}

      {/* Info Modal */}
      <InfoModal
        open={showInfoModal}
        message={infoModalMessage}
        type="warning"
        title="Status Update Restriction"
        onClose={() => setShowInfoModal(false)}
      />

      <Chatbot />
    </motion.div>
  );
}
