/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  UserPlus,
  Mail,
  Phone,
  Filter,
  Clock,
  Search,
  UserX2Icon,
  UserRoundSearchIcon,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { DataTable } from "../../../components/common/DataTable";
import { StatusBadge } from "../../../components/common/StatusBadge";
import { useFetchData } from "../../../hooks/useFetchData";
import toast, { Toaster } from "react-hot-toast";
import ApplicantModal from "../../../components/hr/applicant/ApplicantModal";
import React from "react";
import {
  Applicant,
  Contacts,
  Education,
  Experience,
  Requirement,
} from "../../../types/hr/applicant/applicationInfoTypes";
import { ActionsDropdownForApplicant } from "../../../components/hr/applicant/ActionsDropdownForApplicant";
import { ActionModal } from "../../../components/hr/applicant/ActionModal";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";

export default function JobManagement() {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApplicant, setSelectedApplicant] =
    React.useState<Applicant | null>(null);

  const [specificApplicantEducation, setSpecificApplicantEducation] = useState<
    Education[]
  >([]);
  const [specificApplicantWorkExperience, setSpecificApplicantWorkExperience] =
    useState<Experience[]>([]);
  const [specificApplicantReferences, setSpecificApplicantReferences] =
    useState<Contacts[]>([]);
  const [specificApplicantSkill, setSpecificApplicantSkill] = useState<
    string[]
  >([]);
  const [requirement, setRequirement] = useState<Requirement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalActionType, setModalActionType] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<
    (typeof filteredDisplayApplicants)[0] | null
  >(null);
  const [candidateStatuses, setCandidateStatuses] = useState<{
    [key: number]: string;
  }>({
    1: "Unreviewed",
    2: "Scheduled",
    3: "Pending",
    4: "Rejected",
    5: "Accepted",
  });

  const { filteredApplicants, toCategory, loading } = useFetchData();

  const uniqueJobs = Array.from(
    new Set(filteredApplicants.map((app) => app.jobId?.title).filter(Boolean))
  ).sort();

  const filteredDisplayApplicants = filteredApplicants.filter((applicant) => {
    if (selectedStatus && applicant.status !== selectedStatus) {
      return false;
    }

    if (selectedCategory && applicant.jobId?.category !== selectedCategory) {
      return false;
    }

    if (selectedJob && applicant.jobId?.title !== selectedJob) {
      return false;
    }

    if (minScore || maxScore) {
      const attempt =
        Array.isArray(applicant.quizAttempts) &&
          applicant.quizAttempts.length > 0
          ? applicant.quizAttempts[0]
          : null;
      const percentage = attempt ? attempt.percentage : 0;

      if (minScore && percentage < parseInt(minScore)) {
        return false;
      }
      if (maxScore && percentage > parseInt(maxScore)) {
        return false;
      }
    }

    return true;
  });

  const handleRowClick = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setSpecificApplicantEducation(
      applicant.education.map((edu) => ({
        ...edu,
        address: edu.address ?? "",
      }))
    );
    setSpecificApplicantWorkExperience(applicant.workExperience);
    setSpecificApplicantReferences(applicant.reference);
    setSpecificApplicantSkill(applicant.majorSkills);
    setRequirement(applicant.uploadedFiles);

    setIsModalOpen(true);
  };

  const handleStatusChange = (candidateId: number, newStatus: string) => {
    setCandidateStatuses((prev) => ({
      ...prev,
      [candidateId]: newStatus,
    }));
  };

  const clearAllFilters = () => {
    setSelectedStatus("");
    setSelectedCategory("");
    setSelectedJob("");
    setMinScore("");
    setMaxScore("");
    setSearchTerm("");
  };

  const activeFiltersCount = [
    selectedStatus,
    selectedCategory,
    selectedJob,
    minScore,
    maxScore,
    searchTerm,
  ].filter(Boolean).length;

  const openModal = (
    actionType: string,
    candidate: (typeof filteredDisplayApplicants)[0]
  ) => {
    setModalActionType(actionType);
    setSelectedCandidate(candidate);
    setModalOpen(true);
  };

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
              <p className="font-medium text-gray-900">
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
        <div>
          <div className="flex items-center space-x-1">
            <Mail className="w-3 h-3 text-gray-400" />
            <span className="text-sm">{row.email}</span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <Phone className="w-3 h-3 text-gray-400" />
            <span className="text-sm">{row.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (_value: any, row: any) => {
        const cat = row.jobId?.category;
        return (
          <span className="text-gray-900">
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
          <span className="text-gray-900">
            {job && job.title ? job.title : "--"}
          </span>
        );
      },
    },
    {
      key: "score",
      header: "Score",
      render: (_: any, row: any) => {
        const attempt =
          Array.isArray(row.quizAttempts) && row.quizAttempts.length > 0
            ? row.quizAttempts[0]
            : null;
        return (
          <span className="text-gray-900">
            {attempt ? attempt.score : "--"}
          </span>
        );
      },
    },
    {
      key: "percentage",
      header: "Percentage",
      render: (_: any, row: any) => {
        const attempt =
          Array.isArray(row.quizAttempts) && row.quizAttempts.length > 0
            ? row.quizAttempts[0]
            : null;
        return (
          <span className="text-gray-900">
            {attempt ? attempt.percentage + "%" : "--"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (value: string, row: any) => (
        <StatusBadge
          status={candidateStatuses[row._id] || value}
          variant={
            value === "Accepted"
              ? "success"
              : value === "Rejected"
                ? "error"
                : value === "Pending"
                  ? "info"
                  : value === "Scheduled"
                    ? "success"
                    : "warning"
          }
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_value: any, row: any) => (
        <div
          className="flex items-center z-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionsDropdownForApplicant
            row={row}
            onDownloadResume={() => {
              const file =
                Array.isArray(row.uploadedFiles) && row.uploadedFiles.length > 0
                  ? row.uploadedFiles[0]
                  : null;
              if (file?.reqFile) {
                window.open(
                  String(file.reqFile),
                  "_blank",
                  "noopener,noreferrer"
                );
              } else {
                alert("No file to download");
              }
            }}
            onHire={() => openModal("hire", row)}
            onReject={() => openModal("reject", row)}
            onScheduleInterview={() => openModal("interview", row)}
            onMarkPending={() => openModal("pending", row)}
          />
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "Unreviewed", label: "Unreviewed" },
    { value: "Scheduled", label: "Scheduled for Interview" },
    { value: "Pending", label: "Pending" },
    { value: "Rejected", label: "Rejected" },
    { value: "Accepted", label: "Accepted" },
  ];

  const closeModal = () => {
    setModalOpen(false);
    setModalActionType("");
    setSelectedCandidate(null);
  };

  const filteredJobs = filteredDisplayApplicants.filter(
    (app) =>
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.middleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      className="space-y-6 pb-8 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Toaster />

      {/* Header Section */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Applicant Management
          </h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            Track and manage job applicants
          </p>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-5 gap-6"
          variants={containerVariants}
        >
          {[
            {
              title: "Total Applicants",
              count: filteredApplicants.length,
              icon: <UserPlus className="w-5 h-5 text-blue-600" />,
              bg: "bg-blue-100",
              status: "", // Empty string means show all
              borderColor: "border-blue-200",
              hoverBg: "hover:bg-blue-50",
            },
            {
              title: "In Review",
              count: filteredApplicants.filter(
                (a: any) => a.status === "Unreviewed"
              ).length,
              icon: <Clock className="w-5 h-5 text-purple-600" />,
              bg: "bg-purple-100",
              status: "Unreviewed",
              borderColor: "border-purple-200",
              hoverBg: "hover:bg-purple-50",
            },
            {
              title: "Interviews Scheduled",
              count: filteredApplicants.filter(
                (a: any) => a.status === "Scheduled"
              ).length,
              icon: (
                <UserRoundSearchIcon className="w-5 h-5 text-yellow-600" />
              ),
              bg: "bg-yellow-100",
              status: "Scheduled",
              borderColor: "border-yellow-200",
              hoverBg: "hover:bg-yellow-50",
            },
            {
              title: "Rejected",
              count: filteredApplicants.filter(
                (a: any) => a.status === "Rejected"
              ).length,
              icon: <UserX2Icon className="w-5 h-5 text-red-600" />,
              bg: "bg-red-100",
              status: "Rejected",
              borderColor: "border-red-200",
              hoverBg: "hover:bg-red-50",
            },
            {
              title: "Hired",
              count: filteredApplicants.filter(
                (a: any) => a.status === "Accepted"
              ).length,
              icon: <UserPlus className="w-5 h-5 text-green-600" />,
              bg: "bg-green-100",
              status: "Accepted",
              borderColor: "border-green-200",
              hoverBg: "hover:bg-green-50",
            },
          ]
            .slice()
            .reverse()
            .map((stat, idx) => {
              const isActive = selectedStatus === stat.status;
              return (
                <motion.div
                  key={idx}
                  onClick={() => setSelectedStatus(stat.status)}
                  className={`bg-white text-on-light rounded-lg shadow-sm border-2 p-6 cursor-pointer transition-all duration-200 ${isActive
                    ? `${stat.borderColor} shadow-md ring-2 ring-opacity-50 ${stat.status === ""
                      ? "ring-blue-500"
                      : stat.status === "Unreviewed"
                        ? "ring-purple-500"
                        : stat.status === "Scheduled"
                          ? "ring-yellow-500"
                          : stat.status === "Rejected"
                            ? "ring-red-500"
                            : "ring-green-500"
                    }`
                    : "border-gray-200"
                    } ${stat.hoverBg}`}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}
                    >
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.count}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </motion.div>

        {/* Filters Section */}
        <motion.div
          className="bg-white text-on-light rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sticky -top-8 z-10"
          variants={itemVariants}
        >
          <div className="space-y-4">
            {/* Top Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
              >
                {statusOptions.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="flex items-center justify-center space-x-2 px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">More Filters</span>
                {activeFiltersCount > 2 && (
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {activeFiltersCount - 2}
                  </span>
                )}
                {showMoreFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center justify-center space-x-1 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Loading / Info */}
            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading applicants...</span>
                </div>
              ) : (
                <span>
                  Showing {filteredJobs.length} of{" "}
                  {filteredApplicants.length}{" "}
                  {filteredApplicants.length === 1 ? "applicant" : "applicants"}
                  {activeFiltersCount > 0 && " (filtered)"}
                </span>
              )}
              {activeFiltersCount > 0 && !loading && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Filter className="w-4 h-4" />
                  <span>Filters applied</span>
                </div>
              )}
            </div>

            {/* Expanded Filter Options */}
            {showMoreFilters && (
              <motion.div
                className="border-t border-gray-200 pt-4 mt-4"
                variants={itemVariants}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                    >
                      <option value="">All Categories</option>
                      {toCategory.map((category: any) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Job Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Job Position
                    </label>
                    <select
                      value={selectedJob}
                      onChange={(e) => setSelectedJob(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                    >
                      <option value="">All Jobs</option>
                      {uniqueJobs.map((job: string) => (
                        <option key={job} value={job}>
                          {job}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min / Max Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Min Score %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Max Score %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Data Table Section */}
        <motion.div
          className="bg-white text-on-light rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          variants={itemVariants}
        >
          <div className="overflow-x-auto">
            <DataTable
              data={filteredJobs}
              columns={columns}
              onRowClick={handleRowClick}
            />
          </div>

          <ApplicantModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            applicant={selectedApplicant!}
            education={specificApplicantEducation}
            experience={specificApplicantWorkExperience}
            reference={specificApplicantReferences}
            skills={specificApplicantSkill}
            requirements={requirement}
          />
        </motion.div>

        {/* Empty State */}
        {!loading && filteredJobs.length === 0 && (
          <motion.div
            className="text-center py-12 px-4"
            variants={itemVariants}
          >
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeFiltersCount > 0
                ? "No applicants match your filters"
                : filteredApplicants.length === 0
                  ? "No applicants found"
                  : "No applicants found"}
            </h3>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              {activeFiltersCount > 0
                ? "Try adjusting your filters to see more results."
                : filteredApplicants.length === 0
                  ? "No applicants have been submitted yet."
                  : "No applicants match the current criteria."}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={clearAllFilters}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Clear all filters
              </button>
            ) : null}
          </motion.div>
        )}
      </div>

      {/* Action Modal */}
      <ActionModal
        isOpen={modalOpen}
        onClose={closeModal}
        actionType={modalActionType}
        candidate={selectedCandidate}
        onConfirm={() => {
          if (selectedCandidate) {
            switch (modalActionType) {
              case "hire":
                handleStatusChange(Number(selectedCandidate._id), "hired");
                toast.success(
                  `${selectedCandidate.firstName} ${selectedCandidate.lastName} has been hired!`
                );
                break;
              case "reject":
                handleStatusChange(Number(selectedCandidate._id), "rejected");
                toast.success(
                  `${selectedCandidate.firstName} ${selectedCandidate.lastName} has been rejected.`
                );
                break;
              case "interview":
                handleStatusChange(Number(selectedCandidate._id), "interview");
                toast.success(
                  `Interview scheduled for ${selectedCandidate.firstName} ${selectedCandidate.lastName}`
                );
                break;
              case "pending":
                handleStatusChange(Number(selectedCandidate._id), "pending");
                toast.success(
                  `${selectedCandidate.firstName} ${selectedCandidate.lastName} marked as pending`
                );
                break;
            }
          }
        }}
      />
      <Chatbot />
    </motion.div>
  );
}
