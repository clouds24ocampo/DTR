/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { FormField } from "./FormField";
import { EmployeeFormFields } from "../../../types/employee/employeeFormTypes";
import { getFieldConfigs, getWorkInfoConfig } from "../../../utils/employee/employeeFormConfig";

interface EmployeeFormSectionsProps {
  formData: EmployeeFormFields;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  mode: "add" | "edit";
  showPasswordToggle?: boolean;
  layout?: "grid" | "single";
}

export const EmployeeFormSections: React.FC<EmployeeFormSectionsProps> = ({
  formData,
  onChange,
  mode,
  showPasswordToggle = false,
  layout = "grid",
}) => {
  const fieldConfigs = getFieldConfigs(mode);
  const workInfoConfig = getWorkInfoConfig();

  // Split fields into sections
  const personalInfoFields = fieldConfigs.filter((field) =>
    ["firstName", "middleName", "lastName", "idNumber"].includes(field.name)
  );

  const accountFields = fieldConfigs.filter((field) =>
    ["username", "email", "password"].includes(field.name)
  );

  const workFields = fieldConfigs.filter((field) =>
    ["position", "location", "salary", "salaryType"].includes(field.name)
  );

  if (layout === "single") {
    return (
      <div className="space-y-4">
        {fieldConfigs.map((config) => (
          <FormField
            key={config.name}
            config={config}
            value={formData[config.name] as string}
            onChange={onChange}
            showPasswordToggle={showPasswordToggle && config.name === "password"}
          />
        ))}
        <FormField
          config={workInfoConfig}
          value={formData.workInfo}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Personal Information */}
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Personal Information
            </h3>
            <p className="text-sm text-gray-500">Basic employee details</p>
          </div>

          <div className="space-y-4">
            {personalInfoFields.map((config) => (
              <FormField
                key={config.name}
                config={config}
                value={formData[config.name] as string}
                onChange={onChange}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN - Account & Work Details */}
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Account & Work Details
            </h3>
            <p className="text-sm text-gray-500">
              Login and employment information
            </p>
          </div>

          <div className="space-y-4">
            {accountFields.map((config) => (
              <FormField
                key={config.name}
                config={config}
                value={formData[config.name] as string}
                onChange={onChange}
                showPasswordToggle={showPasswordToggle && config.name === "password"}
              />
            ))}
            {workFields.map((config) => (
              <FormField
                key={config.name}
                config={config}
                value={formData[config.name] as string}
                onChange={onChange}
              />
            ))}
          </div>
        </div>
      </div>

      {/* FULL WIDTH - Work Information */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <FormField
          config={workInfoConfig}
          value={formData.workInfo}
          onChange={onChange}
        />
      </div>
    </>
  );
};

