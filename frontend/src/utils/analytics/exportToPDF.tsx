import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 20,
    color: "#666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
    padding: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingVertical: 3,
  },
  label: {
    fontWeight: "bold",
    width: "60%",
  },
  value: {
    width: "40%",
    textAlign: "right",
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 5,
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
});

interface ExportData {
  startDate: string;
  endDate: string;
  departmentName: string;
  workforceStats: {
    totalEmployees: number;
    activeEmployees: number;
    archivedEmployees: number;
  };
  attendanceStats: {
    attendanceRate: number;
    employeesWithDTR: number;
    absentEmployees: number;
  };
  leaveStats: {
    totalLeaves: number;
    leaveByType: Record<string, number>;
    leaveByStatus: Record<string, number>;
  };
  reportStats: {
    totalReports: number;
    reportsByStatus: Record<string, number>;
  };
  workplaceStats: {
    totalWorkplaces: number;
    totalWorkstations: number;
    assignedWorkstations: number;
    availableWorkstations: number;
    utilizationRate: number;
  };
  departmentStats?: Array<{
    name: string;
    members: number;
    leaves: number;
    reports: number;
  }>;
}

const AnalyticsReportPDF = ({ data }: { data: ExportData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>Workforce Analytics Report</Text>
      <Text style={styles.subtitle}>
        Period: {new Date(data.startDate).toLocaleDateString()} -{" "}
        {new Date(data.endDate).toLocaleDateString()}
      </Text>
      <Text style={styles.subtitle}>Department: {data.departmentName}</Text>

      {/* Workforce Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workforce Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Employees:</Text>
          <Text style={styles.value}>{data.workforceStats.totalEmployees}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Active Employees:</Text>
          <Text style={styles.value}>{data.workforceStats.activeEmployees}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Archived Employees:</Text>
          <Text style={styles.value}>{data.workforceStats.archivedEmployees}</Text>
        </View>
      </View>

      {/* Attendance Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Attendance Rate:</Text>
          <Text style={styles.value}>{data.attendanceStats.attendanceRate.toFixed(2)}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Employees Present:</Text>
          <Text style={styles.value}>{data.attendanceStats.employeesWithDTR}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Employees Absent:</Text>
          <Text style={styles.value}>{data.attendanceStats.absentEmployees}</Text>
        </View>
      </View>

      {/* Leave Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Leave Requests:</Text>
          <Text style={styles.value}>{data.leaveStats.totalLeaves}</Text>
        </View>
        <Text style={{ marginTop: 5, marginBottom: 5, fontWeight: "bold" }}>
          By Type:
        </Text>
        {Object.entries(data.leaveStats.leaveByType).map(([type, count]) => (
          <View key={type} style={styles.row}>
            <Text style={styles.label}>{type.charAt(0).toUpperCase() + type.slice(1)}:</Text>
            <Text style={styles.value}>{count}</Text>
          </View>
        ))}
        <Text style={{ marginTop: 5, marginBottom: 5, fontWeight: "bold" }}>
          By Status:
        </Text>
        {Object.entries(data.leaveStats.leaveByStatus).map(([status, count]) => (
          <View key={status} style={styles.row}>
            <Text style={styles.label}>{status.charAt(0).toUpperCase() + status.slice(1)}:</Text>
            <Text style={styles.value}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Report Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Reports:</Text>
          <Text style={styles.value}>{data.reportStats.totalReports}</Text>
        </View>
        {Object.entries(data.reportStats.reportsByStatus).map(([status, count]) => (
          <View key={status} style={styles.row}>
            <Text style={styles.label}>
              {status === "in-progress"
                ? "In Progress"
                : status.charAt(0).toUpperCase() + status.slice(1)}
              :
            </Text>
            <Text style={styles.value}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Workplace Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workplace Statistics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Workplaces:</Text>
          <Text style={styles.value}>{data.workplaceStats.totalWorkplaces}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Workstations:</Text>
          <Text style={styles.value}>{data.workplaceStats.totalWorkstations}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Assigned Workstations:</Text>
          <Text style={styles.value}>{data.workplaceStats.assignedWorkstations}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Available Workstations:</Text>
          <Text style={styles.value}>{data.workplaceStats.availableWorkstations}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Utilization Rate:</Text>
          <Text style={styles.value}>
            {data.workplaceStats.utilizationRate.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Department Statistics */}
      {data.departmentStats && data.departmentStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Department Breakdown</Text>
          <View style={[styles.table, styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Department</Text>
            <Text style={styles.tableCell}>Members</Text>
            <Text style={styles.tableCell}>Leaves</Text>
            <Text style={styles.tableCell}>Reports</Text>
          </View>
          {data.departmentStats.map((dept, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.tableCell}>{dept.name}</Text>
              <Text style={styles.tableCell}>{dept.members}</Text>
              <Text style={styles.tableCell}>{dept.leaves}</Text>
              <Text style={styles.tableCell}>{dept.reports}</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  </Document>
);

export async function exportAnalyticsToPDF(data: ExportData): Promise<void> {
  const blob = await pdf(<AnalyticsReportPDF data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workforce-analytics-${data.startDate}-to-${data.endDate}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

