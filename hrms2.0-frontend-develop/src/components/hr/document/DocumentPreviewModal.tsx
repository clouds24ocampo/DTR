import React, { useState, useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  PDFDownloadLink,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  FileText,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Edit,
  Trash,
} from "lucide-react";
import DocumentHeader from "./DocumentHeader";
import { splitContentToPagesByHeight } from "../../../utils/global/paginateContent";
import { renderHtmlToPdf } from "../../../utils/document/htmlToPdf";
import logo from "../../../assets/logo/Logo.png";

interface DocumentData {
  title: string;
  documentType: string;
  seriesYear: string;
  dateDrafted: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: DocumentData;
  content: string;
  setEditMode: () => void;
  setDeleteMode: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentData,
  content,
  setEditMode,
  setDeleteMode,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Use the same pagination as live preview
  const pages = useMemo(
    () => splitContentToPagesByHeight(content, 700, 750),
    [content]
  );

  const totalPages = pages.length || 1;

  // PDF Header component matching the live preview
  const PDFHeader: React.FC = () => (
    <View style={pdfStyles.header}>
      <View style={pdfStyles.headerContent}>
        <Image src={logo} style={pdfStyles.logo} />
        <View style={pdfStyles.headerText}>
          <Text style={pdfStyles.companyName}>
            QUANTUM CLOUD CORPORATION
          </Text>
          <Text style={pdfStyles.address}>
            Unit 7, Block 1 Lot 23, Home Lane Realty Building, Villa Amparo Subd.,
          </Text>
          <Text style={pdfStyles.address}>
            Bayan Luma IV, Imus, Cavite
          </Text>
          <Text style={pdfStyles.address}>
            +63 917 123 4567
          </Text>
        </View>
        <Image src={logo} style={pdfStyles.logo} />
      </View>
    </View>
  );

  // PDF Document component matching live preview
  const PDFDocument: React.FC = () => (
    <Document>
      {pages.map((pageContent, idx) => (
        <Page key={idx} size="LEGAL" style={pdfStyles.page}>
          <View style={pdfStyles.pageContent}>
            <PDFHeader />
            {idx === 0 && documentData.title && (
              <View style={pdfStyles.titleContainer}>
                <Text style={pdfStyles.documentTitle}>
                  {documentData.title.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={pdfStyles.content}>
              {pageContent ? (
                renderHtmlToPdf(pageContent)
              ) : (
                <Text style={pdfStyles.contentPlaceholder}>
                  Document content will appear here
                </Text>
              )}
            </View>
            <View style={pdfStyles.footer}>
              <Text style={pdfStyles.footerText}>
                Page {idx + 1} of {pages.length}
              </Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  if (!isOpen) return null;

  const hasContent = !!documentData.title && !!content;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95">
      <div className="h-full flex flex-col">
        <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-semibold text-lg">
                {documentData.title || "Document Preview"}
              </h3>
              <p className="text-gray-300 text-sm">
                {documentData.documentType} - Series of{" "}
                {documentData.seriesYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {hasContent && (
              <PDFDownloadLink
                document={<PDFDocument />}
                fileName={`${
                  documentData.documentType
                }_${documentData.title.replace(/\s+/g, "_")}.pdf`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {({ loading }) => (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? "Generating..." : "Download PDF"}
                  </>
                )}
              </PDFDownloadLink>
            )}
            <button
              onClick={setEditMode}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Edit className="w-5 h-5" />
              <span className="ml-2">Edit Document</span>
            </button>
            <button
              onClick={setDeleteMode}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              <Trash className="w-5 h-5" />
              <span className="ml-2">Delete Document</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-8 flex justify-center">
              <div
                className="transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                  transformOrigin: "center top",
                }}
              >
                {hasContent ? (
                  <div
                    className="bg-white border border-gray-300 shadow-2xl mx-auto"
                    style={{
                      aspectRatio: "8.5 / 13",
                      width: "100%",
                      maxWidth: "612px",
                      minHeight: "846px",
                    }}
                  >
                    <div className="h-full flex flex-col p-12">
                      <div className="mb-3">
                        <DocumentHeader />
                      </div>
                      {currentPage === 1 && (
                        <div className="text-center">
                          <h3 className="text-md font-bold text-gray-900 uppercase m-3">
                            {documentData.title}
                          </h3>
                        </div>
                      )}
                      <div className="flex-1">
                        {pages[currentPage - 1] ? (
                          <div
                            className="prose max-w-none text-sm leading-relaxed document-content"
                            dangerouslySetInnerHTML={{
                              __html: pages[currentPage - 1],
                            }}
                          />
                        ) : (
                          <div className="text-center text-gray-500 py-12">
                            <FileText className="w-12 h-12 mx-auto mb-4" />
                            <p>Document content will appear here</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right mt-4 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Page {currentPage} of {totalPages}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="bg-white border border-gray-300 shadow-2xl mx-auto p-12 text-center"
                    style={{ width: "595px", height: "842px" }}
                  >
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <FileText className="w-16 h-16 mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        No Document Content
                      </h3>
                      <p className="text-sm">
                        Fill out the form to generate a preview
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-800 text-white p-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2 px-3">
                    <input
                      type="number"
                      value={currentPage}
                      onChange={(e) => {
                        const page = Math.max(
                          1,
                          Math.min(totalPages, parseInt(e.target.value) || 1)
                        );
                        setCurrentPage(page);
                      }}
                      className="w-16 px-2 py-1 bg-gray-700 text-white text-center rounded-lg border-gray-600 focus:border-blue-500 focus:outline-none"
                      min="1"
                      max={totalPages}
                    />
                    <span className="text-gray-300">of {totalPages}</span>
                  </div>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 50}
                    className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <select
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="px-3 py-1 bg-gray-700 text-white rounded-lg border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={50}>50%</option>
                    <option value={75}>75%</option>
                    <option value={100}>100%</option>
                    <option value={125}>125%</option>
                    <option value={150}>150%</option>
                    <option value={200}>200%</option>
                  </select>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 200}
                    className="p-2 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors ml-2"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .document-content {
              padding: 0;
              margin: 0;
            }
            .document-content ul,
            .document-content ol {
              padding-left: 2rem;
              margin: 0.75rem 0;
              list-style-position: outside;
            }
            .document-content ul {
              list-style-type: disc;
            }
            .document-content ol {
              list-style-type: decimal;
            }
            .document-content li {
              margin: 0.25rem 0;
              padding-left: 0.5rem;
              line-height: 1.6;
            }
            .document-content ul ul,
            .document-content ol ol,
            .document-content ul ol,
            .document-content ol ul {
              margin-top: 0.5rem;
              margin-bottom: 0.5rem;
            }
            .document-content p {
              margin: 0.75rem 0;
              line-height: 1.6;
            }
            .document-content h1,
            .document-content h2,
            .document-content h3,
            .document-content h4,
            .document-content h5,
            .document-content h6 {
              margin-top: 1rem;
              margin-bottom: 0.5rem;
              line-height: 1.4;
            }
            .document-content * {
              box-sizing: border-box;
            }
          `,
        }}
      />
    </div>
  );
};

// PDF-specific styles matching live preview
const pdfStyles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  pageContent: {
    padding: 48, // px-12 = 48px, py-7 = 28px
    paddingBottom: 28,
    paddingTop: 28,
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 56, // w-14 = 56px
    height: "auto",
  },
  headerText: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: -2,
  },
  address: {
    fontSize: 9,
    color: "#374151",
    textAlign: "center",
    marginTop: -2,
    lineHeight: 1.2,
  },
  titleContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    marginBottom: 20,
  },
  contentPlaceholder: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 50,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    right: 40,
  },
  footerText: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "right",
  },
});

export default DocumentPreviewModal;
