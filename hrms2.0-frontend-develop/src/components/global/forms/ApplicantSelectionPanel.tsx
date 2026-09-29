/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from "react";
import { X, Search, Mail, Phone } from "lucide-react";
import { DataTable } from "../../common/DataTable";
import { Applicant } from "../../../types/hr/applicant/applicationInfoTypes";
import { EmployeeFormFields } from "../../../types/employee/employeeFormTypes";

interface ApplicantSelectionPanelProps {
  filteredAccepted: any[];
  toCategory: any[];
  onApplicantSelect: (formData: EmployeeFormFields) => void;
}

export const ApplicantSelectionPanel: React.FC<ApplicantSelectionPanelProps> = ({
  filteredAccepted,
  toCategory,
  onApplicantSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const searchApplicants = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredAccepted;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return filteredAccepted.filter((applicant: any) => {
      const firstName = (applicant.firstName || "").toLowerCase();
      const lastName = (applicant.lastName || "").toLowerCase();
      const middleName = (applicant.middleName || "").toLowerCase();
      const fullName = `${firstName} ${middleName} ${lastName}`.trim();
      const email = (applicant.email || "").toLowerCase();
      const phoneNumber = (applicant.phoneNumber || "").toLowerCase();
      const jobTitle = (
        applicant.jobId?.title ||
        applicant.jobTitle ||
        ""
      ).toLowerCase();

      return (
        lastName.includes(searchLower) ||
        firstName.includes(searchLower) ||
        middleName.includes(searchLower) ||
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phoneNumber.includes(searchLower) ||
        jobTitle.includes(searchLower)
      );
    });
  }, [filteredAccepted, searchTerm]);

  const columns = [
    {
      key: "name",
      header: "Applicant",
      render: (_value: string, row: any) => {
        const firstName = row.firstName || "";
        const lastName = row.lastName || "";
        const initials = (
          (firstName[0] || "") + (lastName[0] || "")
        ).toUpperCase();

        return (
          <div className="flex items-center space-x-3">
            <div className="min-w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">{initials}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 min-w-48">
                {[firstName, row.middleName, lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p className="text-sm text-gray-600">
                {row.jobId?.title || row.jobTitle || "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact",
      render: (_value: any, row: any) => (
        <div className="min-w-0">
          <div className="flex items-center space-x-1">
            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-sm truncate">{row.email}</span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-sm truncate">{row.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (_value: any, row: any) => {
        const cat = row.jobId.category;
        return (
          <span className="text-gray-900 truncate">
            {toCategory.find((c) => c._id === cat)?.name || "Unknown Category"}
          </span>
        );
      },
    },
    {
      key: "job",
      header: "Job",
      render: (_value: any, row: any) => {
        const job = row.jobId;
        return (
          <span className="text-gray-900 truncate">
            {job && job.title ? job.title : "--"}
          </span>
        );
      },
    },
  ];

  const handleRowClick = (applicant: Applicant) => {
    onApplicantSelect({
      username: `Employee-${applicant.applicantId}`,
      email: applicant.email,
      password: `Password-${applicant.applicantId}`,
      lastName: applicant.lastName,
      firstName: applicant.firstName,
      middleName: applicant.middleName || "",
      position: "Employee",
      idNumber: applicant.applicantId,
      workInfo: "Hybrid",
      location: applicant.address || "",
      salary: "10000",
      salaryType: "monthly",
    });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="bg-white rounded-lg p-6 h-full flex flex-col border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Create account from applicant
        </h3>
        <p className="text-sm text-gray-600">
          Select to create an account from the registered hired candidate
        </p>
      </div>

      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search applicant by name, email, or job title"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-sm transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchTerm && (
          <div className="text-sm text-gray-600">
            Found {searchApplicants.length} result
            {searchApplicants.length !== 1 ? "s" : ""} for "{searchTerm}"
          </div>
        )}

        <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
          <div className="h-full overflow-auto">
            <DataTable
              data={searchApplicants}
              columns={columns}
              onRowClick={handleRowClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

