/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown, Filter, Plus, Search, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "../../../stores/workforce/user/user.store";
import toast, { Toaster } from "react-hot-toast";
import { useFetchData } from "../../../hooks/useFetchData";
import { DataTable } from "../../../components/common/DataTable";
import { formatDate } from "../../../utils/global/dateFormatter";
import { useNavigate } from "react-router-dom";
import DocumentPreviewModal from "../../../components/hr/document/DocumentPreviewModal";
import { ActionsDropdownForDocuments } from "../../../components/hr/document/ActionsDropdownForEmployee";
import { deleteDocument } from "../../../api/hr/document/document.api";
import { motion } from "framer-motion";
import {
  containerVariants,
  itemVariants,
} from "../../../utils/global/pageMotion";
import Chatbot from "../../../components/common/ChatBot";

interface FilterState {
  search: string;
  dateDrafted: string;
  seriesYear: string;
}

interface Document {
  _id: string;
  title: string;
  content: string;
  dateDrafted: string;
  seriesYear: string;
  documentType: "contract" | "resolution";
}

const initialFormData: Document = {
  _id: "",
  title: "",
  content: "",
  dateDrafted: "",
  seriesYear: "",
  documentType: "contract",
};

export default function EmployeeManagement() {
  const { filteredDocuments, refetchAll } = useFetchData();
  const { fetchOtherUsers, loading } = useUserStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentDocument, setCurrentDocument] =
    useState<Document>(initialFormData);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    dateDrafted: "all",
    seriesYear: "all",
  });

  useEffect(() => {
    fetchOtherUsers();
  }, [fetchOtherUsers]);

  const navigate = useNavigate();

  const handleChangePage = () => {
    navigate("/hr-document-page");
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      dateDrafted: "all",
      seriesYear: "all",
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "search") return value.trim() !== "";
    return value !== "all";
  });

  const uniqueSeriesYears = [
    ...new Set(filteredDocuments.map((doc) => doc.seriesYear).filter(Boolean)),
  ].sort((a, b) => b - a);

  const uniqueDateDrafted = [
    ...new Set(
      filteredDocuments
        .map((doc) => {
          if (doc.dateDrafted) {
            const date = new Date(doc.dateDrafted);
            return `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
          }
          return null;
        })
        .filter(Boolean)
    ),
  ]
    .sort()
    .reverse();

  const filteredData = useMemo(() => {
    if (!filteredDocuments) return [];

    return filteredDocuments.filter((document) => {
      if (filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        const searchableFields = [
          document.title,
          document.documentType,
          document.seriesYear?.toString(),
        ].filter(Boolean);

        const matchesSearch = searchableFields.some((field) =>
          field.toLowerCase().includes(searchTerm)
        );

        if (!matchesSearch) return false;
      }

      if (filters.dateDrafted !== "all") {
        if (!document.dateDrafted) return false;

        const docDate = new Date(document.dateDrafted);
        const docMonth = `${docDate.getFullYear()}-${String(
          docDate.getMonth() + 1
        ).padStart(2, "0")}`;

        if (docMonth !== filters.dateDrafted) return false;
      }

      if (filters.seriesYear !== "all") {
        if (document.seriesYear?.toString() !== filters.seriesYear)
          return false;
      }

      return true;
    });
  }, [filteredDocuments, filters]);

  const handleRowClick = (document: Document) => {
    setCurrentDocument(document);
    setIsModalOpen(true);
  };

  const openEditSection = (row: any) => {
    navigate("/hr-document-edit", { state: { document: row } });
  };

  const handleDeleteDocument = async (row: any) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );
    if (isConfirmed) {
      const result = await deleteDocument(row._id);
      if (result) {
        toast.success("Document deleted successfully");
        setIsModalOpen(false);
        refetchAll();
      } else {
        console.error("Error deleting document:");
      }
    }
  };

  const columns = [
    {
      key: "type",
      header: "Document Type",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-gray-800 uppercase">
          {row.documentType}
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-gray-800 uppercase">
          {row.title}
        </div>
      ),
    },
    {
      key: "dateDrafted",
      header: "Date Drafted",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-gray-800 uppercase">
          {formatDate(row.dateDrafted)}
        </div>
      ),
    },
    {
      key: "seriesYear",
      header: "Series Year",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-gray-800 uppercase">
          {row.seriesYear}
        </div>
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
          <ActionsDropdownForDocuments
            row={row}
            onEdit={() => openEditSection(row)}
            onDelete={() => handleDeleteDocument(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <motion.div
      className="space-y-1"
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
            Document Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage documents and related settings
          </p>
        </div>

        <button
          onClick={handleChangePage}
          className="hidden md:flex items-center justify-center w-full sm:w-auto space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>

        <button
          onClick={() => {
            handleChangePage();
            setIsOpen((prev) => !prev);
          }}
          className={`fixed bottom-6 right-6 flex items-center justify-center w-12 h-12 rounded-full shadow-md bg-blue-600 text-white transition-transform duration-300 hover:bg-blue-700 sm:hidden z-50 ${
            isOpen ? "rotate-45" : "rotate-0"
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Filter & Table Section */}
      <motion.div
        className="bg-white rounded-lg shadow-sm border border-gray-200 mt-5"
        variants={itemVariants}
      >
        <motion.div
          className="p-6 border-b border-gray-200"
          variants={itemVariants}
        >
          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents by title, type, or year..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center justify-center space-x-2 px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">More Filters</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showAdvancedFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center justify-center space-x-1 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Info Row */}
            <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
              <span>
                Showing {filteredData.length} of {filteredDocuments.length}{" "}
                {filteredDocuments.length === 1 ? "document" : "documents"}
                {hasActiveFilters && " (filtered)"}
              </span>
              {hasActiveFilters && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Filter className="w-4 h-4" />
                  <span>Filters applied</span>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Drafted
                </label>
                <select
                  value={filters.dateDrafted}
                  onChange={(e) =>
                    handleFilterChange("dateDrafted", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="all">All Dates</option>
                  {uniqueDateDrafted
                    .filter((date) => date !== null)
                    .map((date) => (
                      <option key={String(date)} value={String(date)}>
                        {new Date(String(date) + "-01").toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long" }
                        )}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Series Year
                </label>
                <select
                  value={filters.seriesYear}
                  onChange={(e) =>
                    handleFilterChange("seriesYear", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                >
                  <option value="all">All Years</option>
                  {uniqueSeriesYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}

          {/* Table Section */}
          <motion.div className="mt-4" variants={itemVariants}>
            <div className="overflow-x-auto">
              <DataTable
                data={filteredData}
                columns={columns}
                onRowClick={handleRowClick}
              />
            </div>
          </motion.div>

          {/* Empty State */}
          {!loading && filteredData.length === 0 && (
            <motion.div
              className="text-center py-12 px-4"
              variants={itemVariants}
            >
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {hasActiveFilters
                  ? "No documents match your filters"
                  : filteredDocuments.length === 0
                  ? "No documents found"
                  : "No documents found"}
              </h3>
              <p className="text-gray-500 mb-6 text-sm sm:text-base">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : filteredDocuments.length === 0
                  ? "Get started by adding your first document."
                  : "No documents match the current criteria."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Clear all filters
                </button>
              ) : (
                <button
                  onClick={handleChangePage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Add First Document
                </button>
              )}
            </motion.div>
          )}
        </motion.div>

        <DocumentPreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          documentData={currentDocument}
          content={currentDocument.content}
          setEditMode={() => {
            navigate("/hr-document-edit", {
              state: { document: currentDocument },
            });
          }}
          setDeleteMode={() => handleDeleteDocument(currentDocument)}
        />
      </motion.div>
      <Chatbot />
    </motion.div>
  );
}
