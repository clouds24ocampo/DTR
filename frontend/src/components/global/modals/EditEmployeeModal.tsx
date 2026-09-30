/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useFetchData } from "../../../hooks/useFetchData";
import { updateEmployeeDataToApi } from "../../../api/hr/employee.api";
import { AnimatePresence, motion } from "framer-motion";
import {
  backdropVariants,
  modalVariants,
} from "../../../utils/global/motionVariants";
import { ModalHeader } from "./ModalHeader";
import { ModalFooter } from "./ModalFooter";
import { EmployeeFormSections } from "../forms/EmployeeFormSections";
import { EmployeeFormFields } from "../../../types/employee/employeeFormTypes";
import {
  validateForm,
  prepareFormData,
} from "../../../utils/employee/employeeFormValidation";

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: any;
}

const initialFormData: EmployeeFormFields = {
  _id: "",
  username: "",
  email: "",
  lastName: "",
  firstName: "",
  middleName: "",
  position: "",
  idNumber: "",
  workInfo: "",
  location: "",
  salary: "",
  salaryType: "",
};

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  row,
}) => {
  const [formData, setFormData] = useState<EmployeeFormFields>(initialFormData);
  const [loading, setLoading] = useState(false);

  const { refetchAll } = useFetchData();

  useEffect(() => {
    if (row) {
      setFormData({
        _id: row._id || "",
        username: row?.username || "",
        email: row?.email || "",
        lastName: row?.lastName || "",
        firstName: row?.firstName || "",
        middleName: row?.middleName || "",
        position: Array.isArray(row?.position)
          ? row.position
          : row?.roles && row.roles.length > 0
            ? row.roles
            : row?.position
              ? [row.position]
              : [],
        idNumber: row?.idNumber || "",
        workInfo: row?.workInfo || "",
        location: row?.location || "",
        salary: row?.salary || "",
        salaryType: row?.salaryType || "",
      });
    }
  }, [row]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  const handleOnClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validation = validateForm(formData, "edit");
    if (!validation.isValid) {
      toast.error(validation.errorMessage || "All required fields must be filled.");
      setLoading(false);
      return;
    }

    try {
      const payload = prepareFormData(formData, "edit");

      const apiPayload: any = {
        ...payload,
      };

      if (Array.isArray(payload.position)) {
        apiPayload.position = payload.position;
      } else {
        apiPayload.position = [payload.position];
      }

      const success = await updateEmployeeDataToApi(apiPayload);

      if (success) {
        setFormData(initialFormData);
        toast.success("Edited successfully");
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
            subtitle="Edit account"
            onClose={handleOnClose}
          />

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 overflow-y-auto flex-1">
              <EmployeeFormSections
                formData={formData}
                onChange={handleChange}
                mode="edit"
                layout="grid"
              />
            </div>

            <ModalFooter
              primaryButtonText="Save Changes"
              primaryButtonLoadingText="Updating..."
              onPrimaryClick={() => { }}
              onCancelClick={handleOnClose}
              loading={loading}
              showCancel={true}
            />
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
