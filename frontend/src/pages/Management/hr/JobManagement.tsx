/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Filter,
  X,
} from "lucide-react";
import { AddCategoryModal } from "../../../components/global/modals/job/AddCategoryModal";
import { useFetchData } from "../../../hooks/useFetchData";
import { deleteJobPost } from "../../../api/hr/addJob.api";
import { Requirements } from "../../../types/hr/job/jobPostingTypes";
import toast, { Toaster } from "react-hot-toast";
import AddJobModal from "../../../components/global/modals/job/AddJobModal";
import EditJobModal from "../../../components/global/modals/job/EditJobModal";
import ViewApplicantsModal from "../../../components/global/modals/job/ViewApplicantsModal";
import { updateJob } from "../../../api/hr/editJob.api";
import useJobStore from "../../../stores/hr/admin/addJobStore";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";
import { LazyJobCard } from "../../../components/hr/job/LazyJobCard";
import PageHeader from "../../../components/ui/PageHeader";
import StatCard from "../../../components/ui/StatCard";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import EmptyState from "../../../components/ui/EmptyState";
import SkeletonGrid from "../../../components/ui/SkeletonGrid";

const INITIAL_FORM = {
  jobTitle: "",
  jobDescription: "",
  location: "",
  employmentType: "",
  category: "",
  jobStatus: "",
};

export default function JobManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [applicantId, setApplicantId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [editShowJobModal, setEditShowJobModal] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [editJobLoading, setEditJobLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [qualificationsList, setQualificationsList] = useState<string[]>([]);
  const [customRequirements, setCustomRequirements] = useState<Requirements[]>(
    []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [showViewApplicantsModal, setShowViewApplicantsModal] = useState(false);
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState<any>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { filteredApplicants, filteredPosts, toCategory, loading, refetchAll } =
    useFetchData();
  const { jobState } = useJobStore();

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedCategory = toCategory.find(
    (c: any) => c.name === formData.category
  );
  const totalNumberOfQuestions = selectedCategory?.quiz.length ?? 0;

  const filteredJobs = filteredPosts.filter((job: any) => {
    const matchesSearch = job.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || job.jobStatus === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || job.category === categoryFilter;
    const matchesEmploymentType =
      employmentTypeFilter === "all" ||
      job.employmentType === employmentTypeFilter;

    return (
      matchesSearch && matchesStatus && matchesCategory && matchesEmploymentType
    );
  });

  const uniqueEmploymentTypes = Array.from(
    new Set(filteredPosts.map((job: any) => job.employmentType))
  );
  const uniqueStatuses = Array.from(
    new Set(filteredPosts.map((job: any) => job.jobStatus))
  );

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setEmploymentTypeFilter("all");
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    employmentTypeFilter !== "all";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setJobLoading(true);

    if (
      !profileImageFile ||
      !formData.jobTitle ||
      !formData.jobDescription ||
      !formData.location ||
      !formData.employmentType ||
      !formData.category
    ) {
      toast.error("Please fill in all required fields.");
      setJobLoading(false);
      return;
    }

    try {
      const success = await jobState({
        title: formData.jobTitle,
        description: formData.jobDescription,
        location: formData.location,
        employmentType: formData.employmentType,
        category: formData.category,
        jobStatus: formData.jobStatus,
        image: profileImageFile,
        qualifications: qualificationsList.filter(Boolean),
        customRequirements: customRequirements.map(({ name, fileType }) => ({
          name,
          fileType,
        })),
        timeDuration: "01:00",
        totalNumberOfQuestions,
      });

      if (success === true) {
        toast.success("Job posted successfully!");
        setProfileImage(null);
        setProfileImageFile(null);
        setQualificationsList([]);
        setCustomRequirements([]);
        setFormData(INITIAL_FORM);
        setShowJobModal(false);
        refetchAll();
      } else {
        toast.error("Failed to post job.");
      }
    } catch {
      toast.error("An error occurred.");
    } finally {
      setJobLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setEditJobLoading(true);

    try {
      const response = await updateJob(
        id,
        formData.jobTitle,
        formData.jobDescription,
        formData.location,
        formData.employmentType,
        formData.category,
        formData.jobStatus,
        profileImageFile,
        qualificationsList.filter(Boolean),
        customRequirements.map(({ name, fileType }) => ({ name, fileType })),
        imageUrl
      );

      if (response) {
        toast.success("Job posted successfully!");
        setProfileImage(null);
        setProfileImageFile(null);
        setQualificationsList([]);
        setCustomRequirements([]);
        setFormData(INITIAL_FORM);
        setEditShowJobModal(false);
        refetchAll();
      } else {
        toast.error("Failed to post job.");
      }
    } catch (error) {
      console.error("Error updating job:", error);
      toast.error("An error occurred while updating the job.");
    } finally {
      setEditJobLoading(false);
    }
  };

  const handleDeleteClick = async (_id: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this job post?"
    );
    if (isConfirmed) {
      const result = await deleteJobPost(_id);
      if (result.success) {
        toast.success("Job deleted successfully");
        refetchAll();
      } else {
        console.error("Error deleting job post:");
      }
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed!");
      return;
    }
    setProfileImage(URL.createObjectURL(file));
    setProfileImageFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const addQualification = () => setQualificationsList((prev) => [...prev, ""]);

  const deleteQualification = (idx: number) =>
    setQualificationsList((prev) => prev.filter((_, i) => i !== idx));

  const updateQualification = (idx: number, value: string) =>
    setQualificationsList((prev) =>
      prev.map((q, i) => (i === idx ? value : q))
    );

  const addRequirement = () =>
    setCustomRequirements((prev) => [...prev, { name: "", fileType: "" }]);
  const deleteRequirement = (idx: number) =>
    setCustomRequirements((prev) => prev.filter((_, i) => i !== idx));
  const updateRequirement = (
    idx: number,
    field: keyof Requirements,
    value: string
  ) =>
    setCustomRequirements((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );

  const HandleCloseModal = () => {
    setProfileImage(null);
    setProfileImageFile(null);
    setQualificationsList([]);
    setCustomRequirements([]);
    setFormData(INITIAL_FORM);
    setEditShowJobModal(false);
    setShowJobModal(false);
  };

  const HandleOpenEditModal = (id: number) => {
    const applicant = filteredJobs.find(
      (applicant: { _id: number }) => applicant._id === id
    );
    setProfileImage(applicant?.image || "");
    setQualificationsList(applicant?.qualifications || []);
    setCustomRequirements(applicant?.customRequirements || []);
    setFormData({
      jobTitle: applicant?.title || "",
      jobDescription: applicant?.description || "",
      location: applicant?.location || "",
      employmentType: applicant?.employmentType || "",
      category: applicant?.category || "",
      jobStatus: applicant?.jobStatus || "",
    });
    setImageUrl(applicant?.image || "");
    setApplicantId(String(id));
    setEditShowJobModal(true);
  };

  const handleViewApplicants = (job: any) => {
    setSelectedJobForApplicants(job);
    setShowViewApplicantsModal(true);
  };

  const getApplicantsForJob = (jobId: string | number) => {
    return filteredApplicants.filter((applicant: any) =>
      applicant.quizAttempts?.some(
        (quiz: any) => String(quiz.jobId) === String(jobId)
      )
    );
  };

  return (
    <motion.div
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Toaster />
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={Briefcase}
          tint="blue"
          eyebrow="Recruitment"
          title="Job Postings"
          subtitle="Manage job openings and recruitment"
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="hidden md:flex items-center space-x-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add category</span>
              </button>
              <button
                onClick={() => setShowJobModal(true)}
                className="hidden md:flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Job</span>
              </button>
            </div>
          }
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-5">
            <div
              ref={menuRef}
              className="fixed bottom-6 right-6 flex flex-col items-end space-y-3 sm:hidden z-[10000]"
            >
              <div
                className={`flex flex-col items-end space-y-3 transition-all duration-300 ease-in-out transform ${
                  isOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0 pointer-events-none"
                }`}
              >
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-md transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>

                <button
                  onClick={() => setShowJobModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 shadow-md transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post New Job</span>
                </button>
              </div>

              <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`flex items-center justify-center bg-blue-600 text-white w-12 h-12 rounded-full shadow-md transition-all duration-300 hover:bg-blue-700 transform ${
                  isOpen ? "rotate-45" : "rotate-0"
                }`}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div variants={itemVariants}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Jobs"
              value={
                filteredPosts.filter(
                  (job: any) => job.jobStatus === "active"
                ).length || 0
              }
              subtitle="Currently open roles"
              icon={Briefcase}
              color="blue"
            />
            <StatCard
              title="Total Applicants"
              value={toCategory.length}
              subtitle="Across all postings"
              icon={Users}
              color="green"
            />
            <StatCard
              title="Avg Time to Fill"
              value={18}
              subtitle="days on average"
              icon={Clock}
              color="purple"
            />
            <StatCard
              title="Departments Hiring"
              value={2}
              subtitle="With open roles"
              icon={MapPin}
              color="yellow"
            />
          </div>

          <SearchToolbar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search job titles, departments..."
          >
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center space-x-2 px-3 py-2.5 border rounded-xl transition-colors text-sm ${
                showFilters || hasActiveFilters
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                  {
                    [
                      searchTerm,
                      statusFilter !== "all",
                      categoryFilter !== "all",
                      employmentTypeFilter !== "all",
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center space-x-1 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </SearchToolbar>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 sticky -top-8 mb-6 z-50">
            <div className="space-y-4">
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      {uniqueStatuses
                        .filter(
                          (status) =>
                            status &&
                            status !== "active" &&
                            status !== "inactive"
                        )
                        .map((status) => {
                          const statusStr = String(status);
                          return (
                            <option key={statusStr} value={statusStr}>
                              {statusStr.charAt(0).toUpperCase() +
                                statusStr.slice(1)}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                    >
                      <option value="all">All Categories</option>
                      {toCategory.map((category: any) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Employment Type
                    </label>
                    <select
                      value={employmentTypeFilter}
                      onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8"
                    >
                      <option value="all">All Types</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      {uniqueEmploymentTypes.map((type) => {
                        const typeStr = String(type);
                        return ![
                          "full-time",
                          "part-time",
                          "contract",
                          "internship",
                        ].includes(typeStr) ? (
                          <option key={typeStr} value={typeStr}>
                            {typeStr.charAt(0).toUpperCase() + typeStr.slice(1)}
                          </option>
                        ) : null;
                      })}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Row */}
          <div className="flex items-center justify-between text-sm text-slate-500 px-4 py-3 bg-white rounded-2xl border border-slate-200/80">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading jobs...</span>
              </div>
            ) : (
              <span>
                Showing {filteredJobs.length} of {filteredPosts.length}{" "}
                {filteredPosts.length === 1 ? "job" : "jobs"}
                {hasActiveFilters && " (filtered)"}
              </span>
            )}

            {hasActiveFilters && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Filter className="w-4 h-4" />
                <span>Filters applied</span>
              </div>
            )}
          </div>

          {/* Jobs Grid with Lazy Loading */}
          {loading ? (
            <SkeletonGrid count={4} columns="lg:grid-cols-2" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredJobs
                .slice()
                .reverse()
                .map((job: any) => (
                  <LazyJobCard
                    key={job._id}
                    job={job}
                    toCategory={toCategory}
                    filteredApplicants={filteredApplicants}
                    onEdit={HandleOpenEditModal}
                    onDelete={handleDeleteClick}
                    onViewApplicants={handleViewApplicants}
                    menuOpen={menuOpen}
                    setMenuOpen={setMenuOpen}
                    dropdownRef={dropdownRef}
                  />
                ))}
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <motion.div
              className="col-span-1 lg:col-span-2"
              variants={itemVariants}
            >
              <EmptyState
                icon={Briefcase}
                title={
                  hasActiveFilters
                    ? "No job postings match your filters"
                    : "No job postings found"
                }
                message={
                  hasActiveFilters
                    ? "Try adjusting your search criteria or clear filters"
                    : "Create your first job posting to get started"
                }
                action={
                  hasActiveFilters ? (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowJobModal(true)}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Create First Job Posting
                    </button>
                  )
                }
              />
            </motion.div>
          )}
        </div>
      </motion.div>
      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
      <AddJobModal
        isOpen={showJobModal}
        onClose={() => HandleCloseModal()}
        toCategory={toCategory}
        profileImage={profileImage}
        setProfileImage={setProfileImage}
        profileImageFile={profileImageFile}
        setProfileImageFile={setProfileImageFile}
        qualificationsList={qualificationsList}
        setQualificationsList={setQualificationsList}
        customRequirements={customRequirements}
        setCustomRequirements={setCustomRequirements}
        jobLoading={jobLoading}
        handleSubmit={handleSubmit}
        formData={formData}
        handleInputChange={handleInputChange}
        handleDrop={handleDrop}
        handleFileChange={handleFileChange}
        addQualification={addQualification}
        deleteQualification={deleteQualification}
        updateQualification={updateQualification}
        addRequirement={addRequirement}
        deleteRequirement={deleteRequirement}
        updateRequirement={updateRequirement}
      />
      <EditJobModal
        isOpen={editShowJobModal}
        onClose={() => HandleCloseModal()}
        toCategory={toCategory}
        profileImage={profileImage}
        setProfileImage={setProfileImage}
        profileImageFile={profileImageFile}
        setProfileImageFile={setProfileImageFile}
        qualificationsList={qualificationsList}
        setQualificationsList={setQualificationsList}
        customRequirements={customRequirements}
        setCustomRequirements={setCustomRequirements}
        editJobLoading={editJobLoading}
        handleEditSubmit={handleEditSubmit}
        formData={formData}
        handleInputChange={handleInputChange}
        handleDrop={handleDrop}
        handleFileChange={handleFileChange}
        addQualification={addQualification}
        deleteQualification={deleteQualification}
        updateQualification={updateQualification}
        addRequirement={addRequirement}
        deleteRequirement={deleteRequirement}
        updateRequirement={updateRequirement}
        applicantId={applicantId}
      />
      <ViewApplicantsModal
        isOpen={showViewApplicantsModal}
        onClose={() => {
          setShowViewApplicantsModal(false);
          setSelectedJobForApplicants(null);
        }}
        applicants={
          selectedJobForApplicants
            ? getApplicantsForJob(selectedJobForApplicants._id)
            : []
        }
        jobTitle={selectedJobForApplicants?.title || ""}
      />
      <Chatbot />
    </motion.div>
  );
}
