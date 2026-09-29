import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalHeader } from "../../global/modals/ModalHeader";
import { ModalFooter } from "../../global/modals/ModalFooter";
import { modalVariants } from "../../../utils/global/motionVariants";
import { Calendar, Users, AlertCircle } from "lucide-react";
import moment from "moment";

interface RunPayrollModalProps {
  open: boolean;
  onClose: () => void;
  onRun: (startDate: string, endDate: string) => Promise<void>;
  employeeCount: number;
  initialStartDate: string;
  initialEndDate: string;
}

export default function RunPayrollModal({
  open,
  onClose,
  onRun,
  employeeCount,
  initialStartDate,
  initialEndDate,
}: RunPayrollModalProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      await onRun(startDate, endDate);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm !mt-0">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader
            title="Run Payroll"
            subtitle="Calculate payroll for the selected period"
            onClose={loading ? () => {} : onClose}
          />

          <div className="p-6 space-y-6">
            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
              <div className="bg-blue-100 p-2 rounded-full h-fit">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Employee Scope</h4>
                <p className="text-sm text-blue-700 mt-1">
                  You are about to calculate payroll for <span className="font-bold">{employeeCount}</span> employees.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Period: {moment(startDate).format("MMM D, YYYY")} - {moment(endDate).format("MMM D, YYYY")}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex gap-2 items-start text-amber-600 bg-amber-50 p-3 rounded-md text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Existing draft payrolls for this period will be recalculated and overwritten.</p>
            </div>
          </div>

          <ModalFooter
            primaryButtonText="Run Payroll"
            onPrimaryClick={handleRun}
            onCancelClick={onClose}
            loading={loading}
            showCancel={true}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
