import { X, ChevronDown, Image as ImageIcon } from "lucide-react";
import { Category, Requirements } from "../../../types/job/jobPostingTypes";
import { Dispatch, SetStateAction, useCallback } from "react";

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 !mt-0"
      onClick={handleOverlayClick}
    >
      <form
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-1">Create job</p>
            <h2 className="text-2xl font-bold text-gray-900">Job posting</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[600px] pb-8 flex-1">
          <div className="mb-6">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg text-center bg-slate-50"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <label className="h-60 w-full flex flex-col items-center justify-center cursor-pointer p-2">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Uploaded"
                    className="h-full w-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 transition-colors">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">Upload Image *</p>
                    <p className="text-gray-500 text-sm">
                      Drag & drop or click
                    </p>
                  </span>
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

          <div className="mb-6">
            <input
              type="text"
              placeholder="Job title *"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange("jobTitle", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              required
            />
          </div>

          <div className="mb-6">
            <textarea
              placeholder="Job Description *"
              value={formData.jobDescription}
              onChange={(e) =>
                handleInputChange("jobDescription", e.target.value)
              }
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 resize-none"
              required
            />
          </div>

          <div className="mb-6">
            <div className="bg-gray-100 rounded-lg p-4">
              {qualificationsList.map((qualification, index) => (
                <div key={index} className="flex items-center mb-3">
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => updateQualification(index, e.target.value)}
                    className="flex-1 px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Qualifications *"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => deleteQualification(index)}
                    className="ml-3 w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addQualification}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors text-center"
              >
                + Add qualification
              </button>
            </div>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Location *"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              required
            />
          </div>

          <div className="mb-6">
            <div className="relative">
              <select
                value={formData.employmentType}
                onChange={(e) =>
                  handleInputChange("employmentType", e.target.value)
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
                required
              >
                <option value="" disabled>
                  Employment type *
                </option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          <div className="mb-6">
            <select
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
              required
            >
              <option value="" disabled>
                Select Category *
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
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          <div className="mb-8">
            <div className="bg-gray-100 rounded-lg p-4">
              {customRequirements.map((requirement, idx) => (
                <div key={idx} className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Requirement name *"
                    value={requirement.name}
                    onChange={(e) =>
                      updateRequirement(idx, "name", e.target.value)
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  />
                  <div className="relative">
                    <select
                      value={requirement.fileType}
                      onChange={(e) =>
                        updateRequirement(idx, "fileType", e.target.value)
                      }
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none pr-10"
                      required
                    >
                      <option value="" disabled>
                        Select file type *
                      </option>
                      {REQUIREMENT_TYPES.map((item) => (
                        <option key={item.fileType} value={item.fileType}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteRequirement(idx)}
                    className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRequirement}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors text-center"
              >
                + Add requirements
              </button>
            </div>
          </div>

          <div className="mb-6">
            <select
              value={formData.jobStatus}
              onChange={(e) => handleInputChange("jobStatus", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 appearance-none"
              required
            >
              <option value="" disabled>
                Job Status *
              </option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              disabled={jobLoading}
            >
              {jobLoading ? (
                <svg
                  aria-hidden="true"
                  className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
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
              ) : (
                "Add job"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddJobModal;
