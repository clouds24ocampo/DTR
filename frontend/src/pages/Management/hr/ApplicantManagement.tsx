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
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import EmptyState from "../../../components/ui/EmptyState";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";

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
              <p className="font-medium text-slate-900">
                {[firstName, row.middleName, lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p className="text-sm text-slate-600">
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
            <Mail className="w-3 h-3 text-slate-400" />
            <span className="text-sm">{row.email}</span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <Phone className="w-3 h-3 text-slate-400" />
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
          <span className="text-slate-900">
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
          <span className="text-slate-900">
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
          <span className="text-slate-900">
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
          <span className="text-slate-900">
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
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={UserPlus}
          tint="blue"
          eyebrow="Recruitment"
          title="Applicant Management"
          subtitle="Track and manage job applicants"
        />
      </motion.div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
        >
          {[
            {
              title: "Hired",
              value: filteredApplicants.filter(
                (a: any) => a.status === "Accepted"
              ).length,
              subtitle: "Accepted applicants",
              icon: UserPlus,
              color: "green" as const,
              status: "Accepted",
            },
            {
              title: "Rejected",
              value: filteredApplicants.filter(
                (a: any) => a.status === "Rejected"
              ).length,
              subtitle: "Rejected applicants",
              icon: UserX2Icon,
              color: "red" as const,
              status: "Rejected",
            },
            {
              title: "Interviews Scheduled",
              value: filteredApplicants.filter(
                (a: any) => a.status === "Scheduled"
              ).length,
              subtitle: "Scheduled interviews",
              icon: UserRoundSearchIcon,
              color: "yellow" as const,
              status: "Scheduled",
            },
            {
              title: "In Review",
              value: filteredApplicants.filter(
                (a: any) => a.status === "Unreviewed"
              ).length,
              subtitle: "Awaiting review",
              icon: Clock,
              color: "purple" as const,
              status: "Unreviewed",
            },
          ].map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              subtitle={
                selectedStatus === stat.status
                  ? `Filtered · ${stat.subtitle}`
                  : stat.subtitle
              }
              icon={stat.icon}
              color={stat.color}
              onClick={() => setSelectedStatus(stat.status)}
            />
          ))}
        </motion.div>

        {/* Filters Section */}
        <motion.div variants={itemVariants}>
          <SearchToolbar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, email, or phone..."
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
              <Filter className="h-4 w-4 text-slate-500" aria-hidden />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="cursor-pointer bg-transparent text-sm font-medium text-slate-700 outline-none"
              >
                {statusOptions.map((option: any) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className="flex items-center justify-center space-x-2 rounded-xl border border-slate-300 px-3 py-2 transition-colors hover:bg-slate-50 relative"
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
                className="flex items-center justify-center space-x-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}
          </SearchToolbar>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5"
          variants={itemVariants}
        >
          <div className="space-y-4">
            {/* Loading / Info */}
            <div className="flex items-center justify-between text-sm text-slate-500 pt-1">
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
                className="border-t border-slate-200/80 pt-4 mt-4"
                variants={itemVariants}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Job Position
                    </label>
                    <select
                      value={selectedJob}
                      onChange={(e) => setSelectedJob(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Min Score %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Max Score %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Data Table Section */}
        <motion.div
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden"
          variants={itemVariants}
        >
          {loading ? (
            <SkeletonGrid count={5} columns="sm:grid-cols-2 lg:grid-cols-3" />
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                data={filteredJobs}
                columns={columns}
                onRowClick={handleRowClick}
              />
            </div>
          )}

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
          <motion.div variants={itemVariants}>
            <EmptyState
              icon={Search}
              title={
                activeFiltersCount > 0
                  ? "No applicants match your filters"
                  : "No applicants found"
              }
              message={
                activeFiltersCount > 0
                  ? "Try adjusting your filters to see more results."
                  : filteredApplicants.length === 0
                    ? "No applicants have been submitted yet."
                    : "No applicants match the current criteria."
              }
              action={
                activeFiltersCount > 0 ? (
                  <button
                    onClick={clearAllFilters}
                    className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  >
                    Clear all filters
                  </button>
                ) : undefined
              }
            />
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
