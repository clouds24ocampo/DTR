import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  PDFDownloadLink,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { FileText, Download } from "lucide-react";
import { splitContentToPagesByHeight } from "../../../utils/global/paginateContent";
import DocumentHeader from "./DocumentHeader";
import { renderHtmlToPdf } from "../../../utils/document/htmlToPdf";
import logo from "../../../assets/logo/Logo.png";
import "../../../index.css";

interface DocumentData {
  title: string;
  documentType: string;
  seriesYear: string;
  dateDrafted: string;
}

interface DocumentPreviewProps {
  documentData: DocumentData;
  content: string;
}

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

const PDFDocument: React.FC<DocumentPreviewProps> = ({
  documentData,
  content,
}) => {
  // Use the same pagination as live preview
  const pages = useMemo(
    () => splitContentToPagesByHeight(content, 700, 750),
    [content]
  );

  return (
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
};

const DocumentPreview: React.FC<DocumentPreviewProps> = (props) => {
  const { documentData, content } = props;
  const hasContent = !!documentData.title;
  const pages = useMemo(
    () => splitContentToPagesByHeight(content, 700, 750),
    [content]
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-full flex flex-col overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Live Preview
            </h2>
            <p className="text-gray-600">
              Document preview updates as you type
            </p>
          </div>
          {documentData.title && (
            <PDFDownloadLink
              document={<PDFDocument {...props} />}
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
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0 mt-10 overflow-hidden">
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-2 pb-6 scrollable-preview min-h-0">
          {hasContent ? (
            pages.length ? (
              pages.map((pageContent, idx) => (
                <div
                  key={idx}
                  className="w-full max-w-[750px] mb-8 page-break-after"
                  style={{
                    aspectRatio: "8.5 / 14",
                  }}
                >
                  <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg flex flex-col h-full w-full">
                    <div className="flex-1 flex flex-col px-12 py-7 border h-full">
                      <DocumentHeader />
                      <div className="mt-3 mb-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase text-center">
                          {documentData.title}
                        </h3>
                      </div>
                      <div className="flex-1 flex">
                        {pageContent ? (
                          <div
                            className="prose max-w-none text-sm leading-relaxed -mt-1 w-full mb-5 document-content"
                            dangerouslySetInnerHTML={{ __html: pageContent }}
                          />
                        ) : (
                          <div className="text-center text-gray-400 rounded-lg p-12 flex-1 flex flex-col items-center justify-center">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Document content will appear here</p>
                            <p className="text-sm mt-2">
                              Start adding sections and content to see them in the
                              preview
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute bottom-0 right-0 text-right text-xs text-gray-500 mb-5 px-10 mt-1">
                          Page {idx + 1} of {pages.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : null
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
              <FileText className="w-16 h-16 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Start typing to see your document preview
              </h3>
              <p className="text-sm">
                Fill out the form on the left to generate a live preview of your
                document
              </p>
            </div>
          )}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .scrollable-preview {
              scrollbar-width: none; /* Firefox */
              -ms-overflow-style: none; /* IE and Edge */
            }
            .scrollable-preview::-webkit-scrollbar {
              display: none; /* Chrome, Safari, Opera */
            }
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

export default DocumentPreview;
