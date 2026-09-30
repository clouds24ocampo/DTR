import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import moment from 'moment';
import { Payroll } from '../../types/hr/payroll/payroll.type';

// Register fonts that support the Peso sign
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 'medium' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
  ],
});

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Roboto',
    fontSize: 10,
    color: '#374151', // gray-700
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // gray-200
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827', // gray-900
  },
  reference: {
    fontSize: 9,
    color: '#6b7280', // gray-500
  },
  empInfo: {
    marginTop: 10,
  },
  empName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  empRole: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  statusPaid: { backgroundColor: '#dcfce7', color: '#15803d' }, // green-100, green-700
  statusFinalized: { backgroundColor: '#dbeafe', color: '#1d4ed8' }, // blue-100, blue-700
  statusDraft: { backgroundColor: '#fef3c7', color: '#b45309' }, // amber-100, amber-700
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb', // gray-50
    padding: 10,
    borderRadius: 4,
    marginBottom: 20,
  },
  periodBox: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 8,
    color: '#6b7280', // gray-500
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  periodValue: {
    fontSize: 10,
    fontWeight: 'medium',
    color: '#111827', // gray-900
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'uppercase',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 10,
    color: '#111827', // gray-900
    fontWeight: 'medium',
  },
  subLabel: {
    fontSize: 8,
    color: '#6b7280', // gray-500
    marginTop: 1,
  },
  value: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
  },
  valueGray: {
    fontSize: 10,
    color: '#9ca3af', // gray-400
    fontWeight: 'medium',
  },
  valueRed: {
    fontSize: 10,
    color: '#dc2626', // red-600
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6', // gray-100
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValueRed: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  netPaySection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eff6ff', // blue-50
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dbeafe', // blue-100
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netPayLabelContainer: {
    flexDirection: 'column',
  },
  netPayLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e40af', // blue-800
  },
  netPaySubLabel: {
    fontSize: 9,
    color: '#2563eb', // blue-600
  },
  netPayValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1d4ed8', // blue-700
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
});

interface PayslipDocumentProps {
  payroll: Payroll;
}

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({ payroll }) => {
  const otherDeductions = Math.max(0, payroll.grossPay - payroll.netPay - payroll.lateDeductionAmount);
  // Cast employee to any to access populated fields if needed, though type definition should cover it
  const emp: any = payroll.employee;
  const fullName = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
  const position = emp?.position || 'Employee';

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return styles.statusPaid;
      case 'finalized': return styles.statusFinalized;
      default: return styles.statusDraft;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Payslip</Text>
            <Text style={styles.reference}>Reference ID: #{payroll._id.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={styles.empInfo}>
            <Text style={styles.empName}>{fullName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.empRole}>{position}</Text>
              <Text style={[styles.statusBadge, getStatusStyle(payroll.status)]}>
                {payroll.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Period Info */}
        <View style={styles.periodContainer}>
          <View style={styles.periodBox}>
            <Text style={styles.periodLabel}>Pay Period</Text>
            <Text style={styles.periodValue}>
              {moment(payroll.periodStart).format('MMM D, YYYY')} - {moment(payroll.periodEnd).format('MMM D, YYYY')}
            </Text>
          </View>
          <View style={styles.periodBox}>
            <Text style={styles.periodLabel}>Payment Date</Text>
            <Text style={styles.periodValue}>
              {moment(payroll.updatedAt).format('MMM D, YYYY')}
            </Text>
          </View>
        </View>

        {/* Earnings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          
          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Regular Pay</Text>
              <Text style={styles.subLabel}>{payroll.regularHours.toFixed(2)} hrs @ ₱{payroll.hourlyRate.toFixed(2)}/hr</Text>
            </View>
            <Text style={styles.value}>
              ₱{(payroll.regularHours * payroll.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.row}>
             <View style={styles.labelContainer}>
              <Text style={styles.label}>Overtime Pay</Text>
              <Text style={styles.subLabel}>{payroll.overtimeHours > 0 ? `${payroll.overtimeHours} hrs` : '0 hrs'}</Text>
            </View>
            <Text style={styles.value}>
              ₱{(payroll.overtimeHours > 0 ? (payroll.grossPay - (payroll.regularHours * payroll.hourlyRate)) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Earnings</Text>
            <Text style={styles.totalValue}>
              ₱{payroll.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Deductions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          
          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Late Deduction</Text>
              <Text style={styles.subLabel}>{payroll.lateCount || 0} occurrences</Text>
            </View>
            <Text style={styles.valueRed}>
              -₱{payroll.lateDeductionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Tax Withholding (Est.)</Text>
              <Text style={styles.subLabel}>Flat Rate</Text>
            </View>
            {otherDeductions > 0 ? (
              <Text style={styles.valueRed}>
                -₱{otherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <Text style={styles.valueGray}>₱0.00</Text>
            )}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Deductions</Text>
            <Text style={styles.totalValueRed}>
              -₱{(payroll.lateDeductionAmount + otherDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Net Pay */}
        <View style={styles.netPaySection}>
          <View style={styles.netPayLabelContainer}>
            <Text style={styles.netPayLabel}>Net Pay</Text>
            <Text style={styles.netPaySubLabel}>Take home amount</Text>
          </View>
          <Text style={styles.netPayValue}>
            ₱{payroll.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <Text style={styles.footer}>
          This is a system generated document. Generated on {moment().format('MMM D, YYYY h:mm A')}
        </Text>
      </Page>
    </Document>
  );
};

export default PayslipDocument;
