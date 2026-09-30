/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useFetchData } from "../../../hooks/useFetchData";
import { sendEmployeeDataToApi } from "../../../api/hr/employee.api";
import { AnimatePresence, motion } from "framer-motion";
import {
  backdropVariants,
  modalVariants,
} from "../../../utils/global/motionVariants";
import { ModalHeader } from "./ModalHeader";
import { ModalFooter } from "./ModalFooter";
import { EmployeeFormSections } from "../forms/EmployeeFormSections";
import { ApplicantSelectionPanel } from "../forms/ApplicantSelectionPanel";
import { EmployeeFormFields } from "../../../types/employee/employeeFormTypes";
import {
  validateForm,
  prepareFormData,
} from "../../../utils/employee/employeeFormValidation";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialFormData: EmployeeFormFields = {
  username: "",
  email: "",
  password: "",
  lastName: "",
  firstName: "",
  middleName: "",
  position: "",
  idNumber: "",
  workInfo: "",
  location: "",
  salary: "",
  salaryType: "monthly",
};

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<EmployeeFormFields>(initialFormData);
  const [activeTab, setActiveTab] = useState<"manual" | "applicant">("manual");
  const [autoIdNumber, setAutoIdNumber] = useState(true);
  const [loading, setLoading] = useState(false);

  const { filteredApplicants, toCategory, refetchAll } = useFetchData();

  const filteredAccepted = filteredApplicants.filter(
    (applicant) => applicant.status === "Accepted"
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = validateForm(formData, "add", { autoIdNumber });
    if (!validation.isValid) {
      toast.error(validation.errorMessage || "All required fields must be filled.");
      setLoading(false);
      return;
    }

    if (!autoIdNumber && !formData.idNumber.trim()) {
      toast.error("ID number is required when auto-generate is off.");
      setLoading(false);
      return;
    }

    try {
      const payload = prepareFormData(formData, "add");

      const apiPayload: any = {
        ...payload,
        password: payload.password || "",
        // Blank → backend auto-generates a sequential QC-YYYY-NNNN ID.
        idNumber: autoIdNumber ? "" : payload.idNumber.trim().toUpperCase(),
      };

      if (Array.isArray(payload.position)) {
        apiPayload.position = payload.position;
      } else {
        apiPayload.position = [payload.position];
      }

      // Type assertion is safe because validation ensures password exists for add mode
      const success = await sendEmployeeDataToApi(apiPayload);

      if (success) {
        setFormData(initialFormData);
        setAutoIdNumber(true);
        toast.success("Account successfully registered");
        onClose();
        refetchAll();
      } else {
        toast.error("Failed to submit request");
      }
    } catch (error: any) {
      toast.error(error?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOnClose = () => {
    setFormData(initialFormData);
    setActiveTab("manual");
    setAutoIdNumber(true);
    onClose();
  };

  const handleApplicantSelect = (selectedData: EmployeeFormFields) => {
    setFormData(selectedData);
    setActiveTab("manual");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 !mt-0"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={handleOnClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader
            title="Employee account"
            subtitle="Create account"
            onClose={handleOnClose}
          />

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="flex space-x-4">
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "manual"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("applicant")}
                className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "applicant"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                From Applicant
              </button>
            </nav>
          </div>

          {/* CONTENT */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === "manual" ? (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Create account
                    </h3>
                    <p className="text-sm text-gray-600">
                      Create account manually
                    </p>
                    <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoIdNumber}
                        onChange={(e) => setAutoIdNumber(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      Auto-generate ID number
                      <span className="text-xs text-gray-500">
                        (uncheck to assign manually, e.g. legacy badge)
                      </span>
                    </label>
                  </div>
                  <EmployeeFormSections
                    formData={formData}
                    onChange={handleChange}
                    mode="add"
                    showPasswordToggle={true}
                    layout="single"
                  />
                </div>
              ) : (
                <ApplicantSelectionPanel
                  filteredAccepted={filteredAccepted}
                  toCategory={toCategory}
                  onApplicantSelect={handleApplicantSelect}
                />
              )}
            </div>

            <ModalFooter
              primaryButtonText="Create account"
              primaryButtonLoadingText="Creating..."
              onPrimaryClick={() => { }}
              loading={loading}
              showCancel={false}
            />
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
