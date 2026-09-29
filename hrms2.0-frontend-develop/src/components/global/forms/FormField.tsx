/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { InfoIcon } from "../../common/InfoIcon";
import { FieldConfig } from "../../../types/employee/employeeFormTypes";

interface FormFieldProps {
  config: FieldConfig;
  value: string | string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | any) => void;
  showPasswordToggle?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  config,
  value,
  onChange,
  showPasswordToggle = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Helper to safely get array value
  const getArrayValue = (): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value) return [value];
    return [];
  };

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    const currentValues = getArrayValue();
    let newValues: string[];

    if (checked) {
      newValues = [...currentValues, optionValue];
    } else {
      newValues = currentValues.filter((v) => v !== optionValue);
    }

    // Create synthetic event
    const event = {
      target: {
        name: config.name,
        value: newValues,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onChange(event);
  };

  const inputType =
    config.type === "password" && showPasswordToggle
      ? showPassword
        ? "text"
        : "password"
      : config.type === "password"
        ? "password"
        : config.type === "email"
          ? "email"
          : config.type === "number"
            ? "number"
            : "text";

  const baseInputClasses =
    "w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-sm transition-colors";

  const renderInput = () => {
    if (config.type === "select") {
      return (
        <div className="relative">
          <select
            name={config.name}
            value={value as string}
            onChange={onChange}
            className={`${baseInputClasses} appearance-none`}
            required={config.required}
          >
            <option value="">{config.placeholder}</option>
            {config.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      );
    }

    if (config.type === "checkbox-group") {
      const selectedValues = getArrayValue();
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
          {config.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                name={`${config.name}[]`}
                value={option.value}
                checked={selectedValues.includes(option.value)}
                onChange={(e) =>
                  handleCheckboxChange(option.value, e.target.checked)
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded-lg focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      );
    }

    if (config.type === "textarea") {
      return (
        <textarea
          name={config.name}
          placeholder={config.placeholder}
          value={value as string}
          onChange={onChange}
          rows={config.rows || 3}
          className={`${baseInputClasses} resize-none`}
        />
      );
    }

    return (
      <input
        name={config.name}
        type={inputType}
        placeholder={config.placeholder}
        value={value as string}
        onChange={onChange}
        className={baseInputClasses}
        required={config.required}
      />
    );
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <label className="text-xs text-gray-600">
          {config.label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <InfoIcon description={config.description} title={config.label} />
      </div>
      {renderInput()}
      {config.type === "password" && showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="mt-2 text-blue-600 text-sm hover:text-blue-700 transition-colors font-medium"
        >
          {showPassword ? "Hide Password" : "Show Password"}
        </button>
      )}
    </div>
  );
};

