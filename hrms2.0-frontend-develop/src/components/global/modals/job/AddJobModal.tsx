import { X, ChevronDown, Image as ImageIcon } from "lucide-react";
import {
  Category,
  Requirements,
} from "../../../../types/hr/job/jobPostingTypes";
import { Dispatch, SetStateAction, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  backdropVariants,
  modalVariants,
} from "../../../../utils/global/motionVariants";
import { InfoIcon } from "../../../common/InfoIcon";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  toCategory: Category[];
  profileImage: string | null;
  setProfileImage: Dispatch<SetStateAction<string | null>>;
  profileImageFile: File | null;
  setProfileImageFile: Dispatch<SetStateAction<File | null>>;
  qualificationsList: string[];
  setQualificationsList: Dispatch<SetStateAction<string[]>>;
  customRequirements: Requirements[];
  setCustomRequirements: Dispatch<SetStateAction<Requirements[]>>;
  jobLoading: boolean;
  formData: {
    jobTitle: string;
    jobDescription: string;
    location: string;
    employmentType: string;
    category: string;
    jobStatus: string;
  };
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleInputChange: (
    field: keyof AddJobModalProps["formData"],
    value: string
  ) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  addQualification: () => void;
  deleteQualification: (idx: number) => void;
  updateQualification: (idx: number, value: string) => void;
  addRequirement: () => void;
  deleteRequirement: (idx: number) => void;
  updateRequirement: (
    idx: number,
    field: keyof Requirements,
    value: string
  ) => void;
}

const REQUIREMENT_TYPES = [
  { fileType: "file", name: "PDF" },
  { fileType: "image", name: "Image" },
];

const AddJobModal = ({
  isOpen,
  onClose,
  toCategory,
  profileImage,
  setProfileImage,
  setProfileImageFile,
  qualificationsList,
  customRequirements,
  jobLoading,
  handleSubmit,
  handleDrop,
  handleFileChange,
  addQualification,
  deleteQualification,
  updateQualification,
  addRequirement,
  deleteRequirement,
  updateRequirement,
  handleInputChange,
  formData,
}: AddJobModalProps) => {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 !mt-0"
        onClick={handleOverlayClick}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.form
          className="bg-white text-on-light rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onSubmit={handleSubmit}
          autoComplete="off"
          onClick={(e) => e.stopPropagation()}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-200 shadow-sm">
            <div>
              <p className="text-sm text-gray-600 mb-1">Create job posting</p>
              <h2 className="text-2xl font-bold text-gray-900">
                New Job Posting
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    {/* Job Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Job Title <span className="text-red-500">*</span>
                        <InfoIcon
                          description="The official title of the job position. This will be displayed to applicants and used for job listings. Use clear, descriptive titles like 'Senior Software Engineer' or 'Marketing Manager'."
                          title="Job Title"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Senior Software Engineer"
                        value={formData.jobTitle}
                        onChange={(e) =>
                          handleInputChange("jobTitle", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                        required
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Location <span className="text-red-500">*</span>
                        <InfoIcon
                          description="The primary work location for this position. Include city and country (e.g., 'Manila, Philippines'). This helps applicants understand where they would be working."
                          title="Location"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Manila, Philippines"
                        value={formData.location}
                        onChange={(e) =>
                          handleInputChange("location", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                        required
                      />
                    </div>

                    {/* Employment Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Employment Type <span className="text-red-500">*</span>
                        <InfoIcon
                          description="Select the type of employment arrangement. Options include Full-time (standard work week), Part-time (reduced hours), Contract (temporary/fixed-term), or Internship (training position)."
                          title="Employment Type"
                        />
                      </label>
                      <div className="relative">
                        <select
                          value={formData.employmentType}
                          onChange={(e) =>
                            handleInputChange("employmentType", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-10 transition-colors"
                          required
                        >
                          <option value="" disabled>
                            Select employment type
                          </option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Category <span className="text-red-500">*</span>
                        <InfoIcon
                          description="Select the job category that best fits this position. Categories help organize job postings and make them easier to find. If no categories are available, create one first using the category management feature."
                          title="Category"
                        />
                      </label>
                      <div className="relative">
                        <select
                          value={formData.category}
                          onChange={(e) =>
                            handleInputChange("category", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-10 transition-colors"
                          required
                        >
                          <option value="" disabled>
                            Select category
                          </option>
                          {toCategory.length ? (
                            toCategory.map((cat) => (
                              <option key={cat._id} value={cat.name}>
                                {cat.name}
                              </option>
                            ))
                          ) : (
                            <option disabled>No categories available</option>
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>

                    {/* Job Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Job Status <span className="text-red-500">*</span>
                        <InfoIcon
                          description="Set the job posting status. Active jobs are visible to applicants and accepting applications. Inactive jobs are hidden from applicants but can be reactivated later. Use inactive status for closed positions or positions on hold."
                          title="Job Status"
                        />
                      </label>
                      <div className="relative">
                        <select
                          value={formData.jobStatus}
                          onChange={(e) =>
                            handleInputChange("jobStatus", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-10 transition-colors"
                          required
                        >
                          <option value="" disabled>
                            Select status
                          </option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Additional Details */}
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Job Image
                    </h3>
                    <InfoIcon
                      description="Upload an image that represents this job posting. The image will be displayed in job listings and help attract applicants. Supported formats: JPG, PNG, GIF. Recommended size: 800x600px. You can drag and drop the image or click to browse."
                      title="Job Image"
                    />
                  </div>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <label className="h-48 w-full flex flex-col items-center justify-center cursor-pointer p-4">
                      {profileImage ? (
                        <div className="relative w-full h-full">
                          <img
                            src={profileImage}
                            alt="Uploaded"
                            className="h-full w-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProfileImage(null);
                              setProfileImageFile(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-600 font-medium text-sm mb-1">
                            Upload Job Image <span className="text-red-500">*</span>
                          </p>
                          <p className="text-gray-500 text-xs">
                            Drag & drop or click to browse
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    Job Description <span className="text-red-500">*</span>
                    <InfoIcon
                      description="Provide a comprehensive description of the job role, including key responsibilities, required skills, qualifications, and what the position entails. This helps applicants understand the role and determine if they're a good fit. Be detailed and specific."
                      title="Job Description"
                    />
                  </label>
                  <textarea
                    placeholder="Describe the role, responsibilities, and requirements..."
                    value={formData.jobDescription}
                    onChange={(e) =>
                      handleInputChange("jobDescription", e.target.value)
                    }
                    rows={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white resize-none transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Qualifications Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Qualifications
                  </h3>
                  <InfoIcon
                    description="List the required qualifications, skills, education, or experience needed for this position. Each qualification should be a separate item. These help filter and match applicants to the job requirements. Add multiple qualifications to cover all necessary criteria."
                    title="Qualifications"
                  />
                </div>
                <button
                  type="button"
                  onClick={addQualification}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  + Add Qualification
                </button>
              </div>
              <div className="space-y-3">
                {qualificationsList.map((qualification, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={qualification}
                      onChange={(e) =>
                        updateQualification(index, e.target.value)
                      }
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                      placeholder={`Qualification ${index + 1} *`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => deleteQualification(index)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {qualificationsList.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No qualifications added. Click "Add Qualification" to add
                    requirements.
                  </p>
                )}
              </div>
            </div>

            {/* Custom Requirements Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Custom Requirements
                  </h3>
                  <InfoIcon
                    description="Define custom document or file requirements that applicants must submit. Each requirement needs a name and file type (PDF or Image). These requirements will be requested from applicants during the application process. Examples: Resume (PDF), ID Photo (Image), Portfolio (PDF)."
                    title="Custom Requirements"
                  />
                </div>
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  + Add Requirement
                </button>
              </div>
              <div className="space-y-3">
                {customRequirements.map((requirement, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Requirement name *"
                      value={requirement.name}
                      onChange={(e) =>
                        updateRequirement(idx, "name", e.target.value)
                      }
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white transition-colors"
                      required
                    />
                    <div className="relative w-32">
                      <select
                        value={requirement.fileType}
                        onChange={(e) =>
                          updateRequirement(idx, "fileType", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white appearance-none pr-8 transition-colors"
                        required
                      >
                        <option value="" disabled>
                          Type *
                        </option>
                        {REQUIREMENT_TYPES.map((item) => (
                          <option key={item.fileType} value={item.fileType}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteRequirement(idx)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {customRequirements.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No custom requirements added. Click "Add Requirement" to add
                    file requirements.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 bg-white flex items-center justify-between p-6 border-t border-gray-200 shadow-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 ml-4 bg-blue-600 text-white py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={jobLoading}
            >
              {jobLoading ? (
                <div className="flex items-center justify-center">
                  <svg
                    aria-hidden="true"
                    className="inline w-5 h-5 text-white animate-spin fill-white me-2"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  <span>Creating Job...</span>
                </div>
              ) : (
                "Create Job Posting"
              )}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddJobModal;
