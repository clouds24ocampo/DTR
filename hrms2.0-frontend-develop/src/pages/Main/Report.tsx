import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import MyReportList from "../../components/workforce/report/MyReportList";
import MyReportModal, {
  CreateSelfReportPayload,
  UpdateSelfReportPayload,
} from "../../components/workforce/report/MyReportModal";
import { useReportStore } from "../../stores/global/report/report.store";
import { useUserStore } from "../../stores/workforce/user/user.store";
import type { Report as IReport } from "../../types/global/report/report.types";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import Chatbot from "../../components/common/ChatBot";
import InfoModal from "../../components/global/InfoModal";

export default function Report() {
  const { user, fetchMe } = useUserStore();
  const {
    reports,
    fetchMyReports,
    createReportFromCookie,
    updateReport,
    updateLoading,
    createLoading,
    fetchMineLoading,
    error,
  } = useReportStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentReport, setCurrentReport] = useState<IReport | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalMessage, setInfoModalMessage] = useState("");

  // Fetch user if not loaded
  useEffect(() => {
    if (!user) {
      fetchMe().catch((err) => {
        console.error("Failed to fetch user:", err);
      });
    }
  }, [user, fetchMe]);

  // Fetch reports
  useEffect(() => {
    fetchMyReports().catch((err) => {
      console.error("Failed to fetch reports:", err);
    });
  }, [fetchMyReports]);

  const myReports = useMemo<IReport[]>(() => {
    // Ensure reports have proper id field
    const normalizedReports = reports.map((r) => ({
      ...r,
      id: r.id || (r as any)._id || String((r as any)._id || ""),
    }));

    // fetchMyReports() should already filter by current user, so we trust the API response
    // Only do additional filtering if user is available and we want extra safety
    if (user?._id) {
      // Additional safety filter: ensure reports match current user
      const filtered = normalizedReports.filter((r) => {
        const userEmployeeId = String(user._id || "");
        const reportEmployeeId = String(r.employeeId || "");
        return reportEmployeeId === userEmployeeId;
      });
      return filtered;
    }

    // If user is not loaded yet, trust the API response (fetchMyReports already filters)
    // This allows reports to display while user is loading
    return normalizedReports;
  }, [reports, user]);

  /* ------------------------------ interactions ----------------------------- */
  const openEdit = (report: IReport) => {
    const isUnassigned = report.assignedTo === "Not yet assigned" || report.assignedTo === undefined;
    const hasNoPrioritySet = report.priority === "--" || report.priority === "low";

    if (!isUnassigned || !hasNoPrioritySet) {
      setInfoModalMessage(
        "You can only edit reports that are unassigned and have no priority set."
      );
      setShowInfoModal(true);
      return;
    }
    setCurrentReport(report);
    setShowEditForm(true);
  };

  const handleCreate = async (payload: CreateSelfReportPayload) => {
    try {
      await createReportFromCookie(payload);
      // Refetch reports to ensure the list is up to date
      await fetchMyReports();
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create report:", error);
      // Don't close modal on error so user can retry
      throw error; // Re-throw so the modal can handle it
    }
  };

  const handleUpdate = async (id: string, payload: UpdateSelfReportPayload) => {
    try {
      await updateReport(id, payload);
      // Refetch reports to ensure the list is up to date
      await fetchMyReports();
      setShowEditForm(false);
    } catch (error) {
      console.error("Failed to update report:", error);
      // Don't close modal on error so user can retry
      throw error; // Re-throw so the modal can handle it
    }
  };

  const loading = fetchMineLoading;

  const displayName =
    [user?.firstName, user?.middleName, user?.lastName]
      .filter(Boolean)
      .join(" ") || "You";

  return (
    <motion.div
      className="w-full space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Area */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 px-1"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-200">
            Submission Registry
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Track your workplace reports, incident logs, and resolution progress from your personal administrative dashboard.
          </p>
          {error && (
            <motion.div
              className="mt-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-3 text-rose-600"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <p className="text-sm font-bold">Cloud Sync Warning: {error}</p>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateForm(true)}
          className="hidden md:flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] disabled:opacity-50"
          disabled={createLoading || loading}
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Create New Entry
        </motion.button>
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2 px-1 text-slate-400">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <h2 className="text-xs font-black uppercase tracking-[0.2em]">Personnel History</h2>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
          <MyReportList reports={myReports} loading={loading} onEdit={openEdit} />
        </div>
      </motion.div>

      {/* Mobile Floating Trigger */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
        onClick={() => setShowCreateForm(true)}
        disabled={createLoading || loading}
        className="fixed bottom-8 right-8 z-50 flex md:hidden items-center justify-center w-14 h-14 rounded-lg shadow-xl bg-blue-600 text-white transition-all active:bg-blue-700"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* Modals */}
      <MyReportModal
        mode="create"
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        loading={createLoading}
        displayName={displayName}
        onCreate={handleCreate}
      />

      {showEditForm && currentReport && (
        <MyReportModal
          mode="edit"
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          loading={updateLoading}
          displayName={displayName}
          report={currentReport}
          onUpdate={handleUpdate}
        />
      )}

      <InfoModal
        open={showInfoModal}
        message={infoModalMessage}
        type="warning"
        title="Administrative Restriction"
        onClose={() => setShowInfoModal(false)}
      />

      <Chatbot />
    </motion.div>
  );
}
