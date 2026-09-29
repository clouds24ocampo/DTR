import { Calendar, Layers, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalHeader } from "../../global/modals/ModalHeader";
import { ModalFooter } from "../../global/modals/ModalFooter";
import { RadioGroup } from "../../common/Radio";
import { modalVariants } from "../../../utils/global/motionVariants";


interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: {
    startDate: string;
    endDate: string;
    departmentId: string | "all";
  }) => void;
  departments: Array<{ _id: string; name: string }>;
  loading?: boolean;
}

export default function ExportModal({
  open,
  onClose,
  onExport,
  departments,
  loading = false,
}: ExportModalProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [departmentSelection, setDepartmentSelection] = useState<"all" | "selected">("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");

  const safeDepartments = useMemo(() => {
    return Array.isArray(departments) ? departments : [];
  }, [departments]);

  const handleExport = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date");
      return;
    }

    if (departmentSelection === "selected" && !selectedDepartmentId) {
      alert("Please select a department");
      return;
    }

    onExport({
      startDate,
      endDate,
      departmentId: departmentSelection === "all" ? "all" : selectedDepartmentId,
    });
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
          className="bg-white rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader
            title="Export Analytics Report"
            subtitle="Analyze performance and attendance trends"
            onClose={onClose}
          />

          <div className="p-6 overflow-y-auto space-y-8 flex-1">
            {/* Date Range Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Date Range
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-gray-600">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Department Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Department Filter
                </label>
              </div>

              <RadioGroup
                name="departmentSelection"
                selectedValue={departmentSelection}
                onChange={(val) => setDepartmentSelection(val as "all" | "selected")}
                options={[
                  {
                    value: "all",
                    label: "All Departments",
                    description: "Include data from entire company",
                    icon: <Layers className="w-5 h-5" />,
                  },
                  {
                    value: "selected",
                    label: "Specific Department",
                    description: "Filter analysis by department",
                    icon: <MapPin className="w-5 h-5" />,
                  },
                ]}
              />

              <AnimatePresence>
                {departmentSelection === "selected" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      <select
                        value={selectedDepartmentId}
                        onChange={(e) => setSelectedDepartmentId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 1rem center",
                          backgroundSize: "1.25rem",
                        }}
                      >
                        <option value="">Select a department</option>
                        {safeDepartments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          <ModalFooter
            primaryButtonText={loading ? "Generating Report..." : "Export Analytics"}
            primaryButtonLoadingText="Exporting..."
            onPrimaryClick={handleExport}
            onCancelClick={onClose}
            loading={loading}
            showCancel={true}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
