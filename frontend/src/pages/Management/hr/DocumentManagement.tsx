/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown, FileText, Filter, Plus, Search, X } from "lucide-react";
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
import PageHeader from "../../../components/ui/PageHeader";
import SearchToolbar from "../../../components/ui/SearchToolbar";
import EmptyState from "../../../components/ui/EmptyState";

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
        <div className="font-mono text-sm font-medium text-slate-800 uppercase">
          {row.documentType}
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-slate-800 uppercase">
          {row.title}
        </div>
      ),
    },
    {
      key: "dateDrafted",
      header: "Date Drafted",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-slate-800 uppercase">
          {formatDate(row.dateDrafted)}
        </div>
      ),
    },
    {
      key: "seriesYear",
      header: "Series Year",
      render: (_value: any, row: any) => (
        <div className="font-mono text-sm font-medium text-slate-800 uppercase">
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
      className="w-full space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Toaster />

      {/* Header Section */}
      <motion.div variants={itemVariants}>
        <PageHeader
          icon={FileText}
          tint="blue"
          eyebrow="Records"
          title="Document Management"
          subtitle="Manage documents and related settings"
          actions={
            <button
              onClick={handleChangePage}
              className="hidden md:flex items-center justify-center w-full sm:w-auto space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          }
        />

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

      {/* Toolbar (search + filters) */}
      <motion.div variants={itemVariants}>
        <SearchToolbar
          value={filters.search}
          onChange={(value) => handleFilterChange("search", value)}
          placeholder="Search documents by title, type, or year..."
        >
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-center space-x-2 px-3 py-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
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
              className="flex items-center justify-center space-x-1 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </SearchToolbar>
      </motion.div>

      {/* Filter & Table Section */}
      <motion.div
        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] mt-5"
        variants={itemVariants}
      >
        <motion.div
          className="pb-5 border-b border-slate-200/80"
          variants={itemVariants}
        >
          {/* Info Row */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Drafted
                </label>
                <select
                  value={filters.dateDrafted}
                  onChange={(e) =>
                    handleFilterChange("dateDrafted", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Series Year
                </label>
                <select
                  value={filters.seriesYear}
                  onChange={(e) =>
                    handleFilterChange("seriesYear", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
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
            <motion.div variants={itemVariants}>
              <EmptyState
                icon={Search}
                title={
                  hasActiveFilters
                    ? "No documents match your filters"
                    : "No documents found"
                }
                message={
                  hasActiveFilters
                    ? "Try adjusting your filters to see more results."
                    : filteredDocuments.length === 0
                      ? "Get started by adding your first document."
                      : "No documents match the current criteria."
                }
                action={
                  hasActiveFilters ? (
                    <button
                      onClick={clearAllFilters}
                      className="font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      Clear all filters
                    </button>
                  ) : (
                    <button
                      onClick={handleChangePage}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Add First Document
                    </button>
                  )
                }
              />
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
