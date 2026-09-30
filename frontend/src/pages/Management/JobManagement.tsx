import { useState } from "react";
import {
  Plus,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Search,
  Filter,
} from "lucide-react";
import { StatusBadge } from "../../components/common/StatusBadge";
import { AddCategoryModal } from "../../components/global/modals/job/AddCategoryModal";
import { format } from "date-fns";
import { useFetchData } from "../../hooks/useFetchData";
import { deleteJobPost } from "../../api/hr/addJob.api";
import { Requirements } from "../../types/job/jobPostingTypes";
import toast, { Toaster } from "react-hot-toast";
import AddJobModal from "../../components/modals/job/AddJobModal";
import useJobStore from "../../stores/admin/addJobStore";

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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [qualificationsList, setQualificationsList] = useState<string[]>([]);
  const [customRequirements, setCustomRequirements] = useState<Requirements[]>(
    []
  );

  const { filteredPosts, toCategory, refetchAll } = useFetchData();
  const { jobState } = useJobStore();

  const selectedCategory = toCategory.find((c) => c.name === formData.category);
  const totalNumberOfQuestions = selectedCategory?.quiz.length ?? 0;

  const filteredJobs = filteredPosts.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      } else {
        toast.error("Failed to post job.");
      }
    } catch {
      toast.error("An error occurred.");
    } finally {
      setJobLoading(false);
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

  return (
    <div className="h-screen overflow-hidden flex flex-col pb-32">
      <Toaster />
      <div className="flex-shrink-0 bg-white border-b border-slate-200/80 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Job Postings</h1>
            <p className="text-slate-500">Manage job openings and recruitment</p>
          </div>
          <div className="flex gap-5">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add category</span>
            </button>
            <button
              onClick={() => setShowJobModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Job</span>
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card-dashboard p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Jobs</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredPosts.length || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="card-dashboard p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Applicants</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {toCategory.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card-dashboard p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Time to Fill</p>
                  <p className="text-2xl font-bold text-slate-900">18</p>
                  <p className="text-xs text-slate-500">days</p>
                </div>
              </div>
            </div>
            <div className="card-dashboard p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Departments Hiring</p>
                  <p className="text-2xl font-bold text-slate-900">2</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card-dashboard p-4 sticky top-0 z-10 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search job titles, departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="relative card-dashboard p-6 hover:shadow-md transition-shadow overflow-hidden z-0"
                style={{
                  backgroundImage: job.image
                    ? `
                      linear-gradient(
                        50deg,
                        white 0%,
                        white 25%,
                        rgba(255,255,255,0.9) 70%,
                        rgba(255,255,255,0.5) 90%,
                        transparent 100%
                      ),
                      url(${job.image})
                    `
                    : undefined,
                  backgroundSize: job.image ? "cover" : undefined,
                  backgroundPosition: job.image ? "center" : undefined,
                  backgroundRepeat: job.image ? "no-repeat" : undefined,
                }}
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {job.title}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {toCategory.find((c) => c._id === job.category)?.name ||
                          "Unknown Category"}
                      </p>
                    </div>
                    <StatusBadge
                      status={job.jobStatus || "unknown"}
                      variant={
                        job.jobStatus === "active" ? "success" : "neutral"
                      }
                    />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Briefcase className="w-4 h-4" />
                      <span className="capitalize">{job.employmentType}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>
                        Posted {format(new Date(job.postedAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                    {job.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-blue-600 font-medium">
                        applicants
                      </span>
                      <span className="text-slate-500">{0} views</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        Edit
                      </button>
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        View Applicants
                      </button>
                      <button
                        onClick={() => handleDeleteClick(String(job._id))}
                        className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredJobs.length === 0 && (
              <div className="col-span-1 lg:col-span-2 text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Briefcase className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg">No job postings found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "Create your first job posting to get started"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
      <AddJobModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
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
    </div>
  );
}
