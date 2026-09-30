import { StyleSheet } from "@react-pdf/renderer";

const PDFDocumentStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "white",
    padding: 40,
    fontSize: 12,
    fontFamily: "Helvetica",
    width: 612,
    height: 1008,
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    paddingBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 10,
    alignSelf: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 3,
    color: "#666666",
  },
  address: {
    fontSize: 10,
    color: "#888888",
    marginTop: 10,
  },
  documentInfo: {
    marginBottom: 30,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  documentMeta: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 5,
  },
  officialSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cccccc",
    paddingVertical: 15,
    marginBottom: 20,
  },
  officialTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "center",
  },
  officialSubtitle: {
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
  },
  content: {
    flex: 1,
    marginBottom: 30,
  },
  contentPlaceholder: {
    textAlign: "center",
    color: "#cccccc",
    fontSize: 14,
    marginTop: 50,
  },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: "#888888",
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
  },
  qrPlaceholder: {
    width: 50,
    height: 50,
    border: "2 dashed #cccccc",
    textAlign: "center",
    fontSize: 8,
    color: "#cccccc",
    paddingTop: 20,
  },
});

export default PDFDocumentStyles;
