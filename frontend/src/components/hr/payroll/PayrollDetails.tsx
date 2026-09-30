import { motion } from "framer-motion";
import { itemVariants } from "../../../utils/global/pageMotion";
import { Payroll } from "../../../types/hr/payroll/payroll.type";
import { usePayrollStore } from "../../../stores/hr/payroll/payroll.store";
import { Trash2, CheckCircle, FileCheck, Loader2 } from "lucide-react";

interface PayrollDetailsProps {
    payroll: Payroll | null | undefined;
}

export default function PayrollDetails({ payroll }: PayrollDetailsProps) {
    const { updatePayroll, deletePayroll, loading } = usePayrollStore();

    if (!payroll) return (
        <motion.div variants={itemVariants} className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Select an employee and period, then click Calculate to view payroll.
        </motion.div>
    );

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this payroll record?")) {
            await deletePayroll(payroll._id);
        }
    };

    const handleStatusUpdate = async (status: 'finalized' | 'paid') => {
         await updatePayroll(payroll._id, { status });
    };

    return (
        <motion.div variants={itemVariants} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">Payroll Breakdown</h3>
                <div className="flex gap-2">
                     {payroll.status === 'draft' && (
                        <button 
                            onClick={() => handleStatusUpdate('finalized')}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
                            title="Finalize Payroll"
                        >
                             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
                        </button>
                     )}
                     {payroll.status === 'finalized' && (
                        <button 
                            onClick={() => handleStatusUpdate('paid')}
                            disabled={loading}
                            className="text-green-600 hover:text-green-800 p-1.5 rounded hover:bg-green-50 transition-colors"
                            title="Mark as Paid"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        </button>
                     )}
                    <button 
                        onClick={handleDelete}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Delete Payroll"
                    >
                         {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Period</span>
                    <span className="font-medium">{new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Regular Hours</span>
                    <span className="font-medium">{payroll.regularHours.toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Untagged Excess Hours</span>
                    <span className="font-medium">{payroll.untaggedExcessHours ? payroll.untaggedExcessHours.toFixed(2) : '0.00'} hrs</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Hourly Rate</span>
                    <span className="font-medium">₱{payroll.hourlyRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Overtime Hours</span>
                    <span className="font-medium">{payroll.overtimeHours.toFixed(2)} hrs</span>
                </div>
                 <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Late Count ({">"}= 30m)</span>
                    <span className="font-medium text-orange-600">{payroll.lateCount}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-gray-600">Late Deduction Amount</span>
                    <span className="font-medium text-red-500">- ₱{payroll.lateDeductionAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between border-b pb-2 font-bold text-gray-800">
                    <span>Gross Pay</span>
                    <span>₱{payroll.grossPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 text-xl font-bold text-green-600">
                    <span>Net Pay</span>
                    <span>₱{payroll.netPay.toFixed(2)}</span>
                </div>
                 <div className="flex justify-end pt-4">
                    <span className={`px-3 py-1 rounded-full text-xs uppercase font-bold ${payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {payroll.status}
                    </span>
                </div>
            </div>
        </motion.div>
    )
}
