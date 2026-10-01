import { ClipboardList, FileText, Plus } from "lucide-react";
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
import PageHeader from "../../components/ui/PageHeader";
import ErrorBanner from "../../components/ui/ErrorBanner";
import { SectionHeader } from "../../components/ui/dashboardUi";

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
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={FileText}
          tint="blue"
          eyebrow="Workplace"
          title="My Reports"
          subtitle="Submit workplace reports and follow how they are resolved."
          actions={
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateForm(true)}
              className="hidden md:flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-[0_8px_16px_-6px_rgba(37,99,235,0.4)] disabled:opacity-50"
              disabled={createLoading || loading}
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Create New Entry
            </motion.button>
          }
        />
      </motion.div>

      {/* Error banner */}
      <motion.div variants={itemVariants}>
        <ErrorBanner message={error} />
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        className="space-y-4"
        variants={itemVariants}
      >
        <SectionHeader icon={ClipboardList} title="My reports" />

        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
        className="fixed bottom-8 right-8 z-50 flex md:hidden items-center justify-center w-14 h-14 rounded-2xl shadow-xl bg-blue-600 text-white transition-all active:bg-blue-700"
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
