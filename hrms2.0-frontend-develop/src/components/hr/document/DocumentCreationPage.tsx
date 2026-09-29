/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { FileText, ArrowLeft, ChevronDown, SaveIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RichTextEditor } from "./RichTextEditor";
import DocumentPreview from "./DocumentPreview";
import toast, { Toaster } from "react-hot-toast";
import { useFetchData } from "../../../hooks/useFetchData";
import { sendDocumentDataToApi } from "../../../api/hr/document/document.api";

interface DocumentData {
  documentType: "contract" | "resolution";
  title: string;
  content: string;
  dateDrafted: string;
  seriesYear: string;
}

const initialFormData: DocumentData = {
  documentType: "contract",
  title: "",
  content: "",
  dateDrafted: new Date().toISOString().split("T")[0],
  seriesYear: new Date().getFullYear().toString(),
};

function DocumentPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DocumentData>(initialFormData);

  const { refetchAll } = useFetchData();

  const handleInputChange = (field: keyof DocumentData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const navigate = useNavigate();

  const documentTypes = [
    {
      value: "contract" as const,
      label: "Contract",
      icon: FileText,
      description: "Legal agreements and contracts",
    },
    {
      value: "resolution" as const,
      label: "Resolution",
      icon: FileText,
      description: "Official resolutions and decisions",
    },
  ];

  const selectedType = documentTypes.find(
    (type) => type.value === formData.documentType
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const requiredFields: (keyof DocumentData)[] = [
      "documentType",
      "title",
      "dateDrafted",
      "seriesYear",
    ];
    console.log(formData);
    for (const field of requiredFields) {
      if (!formData[field]) {
        toast.error("All required fields must be filled.");
        setLoading(false);
        return;
      }
    }

    try {
      const documentInput = {
        ...formData,
      };
      const success = await sendDocumentDataToApi(documentInput);

      if (success) {
        setFormData(initialFormData);
        toast.success("Account successfully registered");
        navigate("/hr-document-management");
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
    <div className="min-h-screen">
      <Toaster />
      <div className="max-w-full mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Document Creation
            </h1>
            <p className="text-gray-600">
              Create official government documents with live preview
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate("/hr-document-management")}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>View Documents</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-auto">
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Document Type Selection
                  </h2>
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                    disabled={loading}
                  >
                    <SaveIcon className="w-5 h-5 text-gray-100 inline-block mr-2" />
                    {loading ? (
                      <>
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
                        Loading...
                      </>
                    ) : (
                      "Save Document"
                    )}
                  </button>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen((v) => !v)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {selectedType && (
                          <selectedType.icon className="w-5 h-5 text-blue-600" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {selectedType?.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedType?.description}
                          </div>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                      {documentTypes.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => {
                            handleInputChange("documentType", type.value);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            <type.icon className="w-5 h-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {type.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {type.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Document Title
                </h2>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Title of{" "}
                  {formData.documentType === "contract"
                    ? "Contract"
                    : "Resolution"}{" "}
                  *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter a descriptive title for your document"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Document Content
                </h2>
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => handleInputChange("content", value)}
                  placeholder="Enter your message here... Use the toolbar to format text with bold, italic, and alignment options."
                />
              </div>
            </div>
          </div>
          <div className="h-auto">
            {formData.title ? (
              <DocumentPreview
                documentData={formData}
                content={formData.content}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <FileText className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Start typing to see your document preview
                </h3>
                <p className="text-sm">
                  Fill out the form on the left to generate a live preview of
                  your document
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentPage;
