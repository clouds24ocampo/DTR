import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "../../stores/workforce/user/user.store";
import { usePayrollStore } from "../../stores/hr/payroll/payroll.store";
import { Payroll } from "../../types/hr/payroll/payroll.type";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants } from "../../utils/global/pageMotion";
import moment from "moment";
import { Download, Eye, ChevronLeft, ChevronRight, DollarSign, AlertTriangle, Wallet } from "lucide-react";
import { pdf } from '@react-pdf/renderer';
import { PayslipDocument } from './PayslipDocument';
import toast from "react-hot-toast";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonGrid from "../../components/ui/SkeletonGrid";

// Reusing DetailModal from PayrollPreview structure (simplified)
interface DetailItem {
    date: string;
    description: string;
    amount: number;
}

const DetailModal = ({ open, title, items, onClose, type }: { open: boolean, title: string, items: DetailItem[], onClose: () => void, type: 'overtime' | 'late' }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 !mt-0">
             <div 
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden z-10">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                            <span className="sr-only">Close</span>
                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        {items.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">No records found.</p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{moment(item.date).format('MMM D, YYYY')}</p>
                                            <p className="text-xs text-slate-500">{item.description}</p>
                                        </div>
                                        <p className={`text-sm font-medium ${type === 'late' ? 'text-red-600' : 'text-slate-900'}`}>
                                            {type === 'late' ? '-' : ''}₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-700">Total</span>
                        <span className={`text-sm font-bold ${type === 'late' ? 'text-red-600' : 'text-slate-900'}`}>
                            {type === 'late' ? '-' : ''}₱{items.reduce((acc, item) => acc + item.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function MyPayroll() {
    const { user, fetchUserLoading, fetchMe } = useUserStore();
    const { payrolls, fetchMyPayrolls, loading } = usePayrollStore();
    
    // State
    const [selectedYear, setSelectedYear] = useState(moment().year());
    const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

    // Ensure user data is loaded
    useEffect(() => {
        if (!user && !fetchUserLoading) {
            fetchMe();
        }
    }, [user, fetchUserLoading, fetchMe]);

    // Fetch payrolls for current user
    useEffect(() => {
        if (user?._id) {
            const startOfYear = moment().year(selectedYear).startOf('year').format('YYYY-MM-DD');
            const endOfYear = moment().year(selectedYear).endOf('year').format('YYYY-MM-DD');
            fetchMyPayrolls(startOfYear, endOfYear);
        }
    }, [user?._id, selectedYear, fetchMyPayrolls]);

    // Derived Data
    const sortedPayrolls = useMemo(() => {
        if (!user?._id) return [];
        const safePayrolls = Array.isArray(payrolls) ? payrolls : [];
        return safePayrolls
            .filter(p => {
                if (!p || !p.employee) return false;
                const empId = typeof p.employee === 'string' ? p.employee : p.employee._id;
                return empId === user._id;
            })
            .sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime());
    }, [payrolls, user]);


    // Handlers
    const handleViewDetails = (payroll: Payroll) => {
        setSelectedPayroll(payroll);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedPayroll(null);
    };

    const handleDownloadPayslip = async (payroll: Payroll) => {
        try {
            const blob = await pdf(<PayslipDocument payroll={payroll} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Payslip_${moment(payroll.periodEnd).format('YYYY-MM-DD')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("Payslip downloaded successfully");
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate payslip PDF");
        }
    };

    // Components
    const PayrollCard = ({ payroll }: { payroll: Payroll }) => (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm text-slate-500 font-medium">Period</p>
                    <p className="text-slate-900 font-semibold">
                        {moment(payroll.periodStart).format('MMM D')} - {moment(payroll.periodEnd).format('MMM D, YYYY')}
                    </p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    payroll.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                    payroll.status === 'finalized' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                    {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-slate-500 mb-1">Gross Pay</p>
                    <p className="text-slate-900 font-medium">₱{payroll.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 mb-1">Net Pay</p>
                    <p className="text-blue-600 font-bold text-lg">₱{payroll.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                    Processed {moment(payroll.updatedAt).fromNow()}
                </p>
                <button 
                    onClick={() => handleViewDetails(payroll)}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                    <Eye className="w-4 h-4" />
                    View Slip
                </button>
            </div>
        </div>
    );

    const PayrollDetailView = ({ payroll }: { payroll: Payroll }) => {
        const [showLateDetails, setShowLateDetails] = useState(false);
        const [showOvertimeDetails, setShowOvertimeDetails] = useState(false);
        
        const otherDeductions = Math.max(0, payroll.grossPay - payroll.netPay - payroll.lateDeductionAmount);

        // Prepare late details items
        const lateItems: DetailItem[] = (payroll.lateDetails || []).map(d => ({
            date: d.date,
            description: `Late arrival (${moment(d.actualTime, 'HH:mm').format('h:mm A')}, ${d.lateMinutes} mins late)`,
            amount: (d.deductionHours || 0) * payroll.hourlyRate
        }));

        // Mock overtime details if needed, similar to Preview
        const overtimeItems: DetailItem[] = []; // Populate if overtime details exist in future
        if (payroll.overtimeHours > 0) {
             const overtimeAmount = payroll.grossPay - (payroll.regularHours * payroll.hourlyRate);
             // Simple representation
             overtimeItems.push({
                 date: payroll.periodEnd,
                 description: `${payroll.overtimeHours} hours total overtime`,
                 amount: overtimeAmount
             });
        }

        return (
            <div className="max-w-2xl mx-auto w-full">
                {/* Actions Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 sm:gap-0">
                    <button 
                        onClick={handleBackToList}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors w-full sm:w-auto justify-center sm:justify-start"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back to Payrolls
                    </button>
                    <button 
                        onClick={() => handleDownloadPayslip(payroll)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
                    >
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>

                {/* Payslip Container */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/80">
                    {/* Header */}
                    <div className="bg-slate-50 p-6 sm:p-8 border-b border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Payslip</h1>
                                <p className="text-slate-500 mt-1">Period: {moment(payroll.periodStart).format('MMM D, YYYY')} - {moment(payroll.periodEnd).format('MMM D, YYYY')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Reference ID</p>
                                <p className="font-mono font-medium text-slate-900">#{payroll._id.slice(-8).toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-8">
                        {/* Employee Info */}
                        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                            {user?.profilePicture ? (
                                <img 
                                    src={user.profilePicture} 
                                    alt={`${user.firstName} ${user.lastName}`} 
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">{user?.firstName} {user?.lastName}</h2>
                                <p className="text-slate-500">{user?.position || 'Employee'}</p>
                            </div>
                        </div>

                        {/* Earnings */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Earnings</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Regular Pay ({payroll.regularHours.toFixed(2)} hrs @ ₱{payroll.hourlyRate.toFixed(2)}/hr)</span>
                                    <span className="font-medium text-slate-900">₱{(payroll.regularHours * payroll.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {payroll.overtimeHours > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <button 
                                            onClick={() => setShowOvertimeDetails(true)}
                                            className="text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            Overtime Pay ({payroll.overtimeHours} hrs)
                                        </button>
                                        <span className="text-slate-500 block sm:hidden">Overtime Pay ({payroll.overtimeHours} hrs)</span>
                                        <span className="font-medium text-slate-900">₱{(payroll.grossPay - (payroll.regularHours * payroll.hourlyRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold">
                                    <span className="text-slate-900">Gross Pay</span>
                                    <span className="text-slate-900">₱{payroll.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Deductions</h3>
                            <div className="space-y-3">
                                {(payroll.lateDeductionAmount > 0) && (
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">Late Deductions</span>
                                            {payroll.lateDetails && payroll.lateDetails.length > 0 && (
                                                <button 
                                                    onClick={() => setShowLateDetails(true)}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                        <span className="font-medium text-red-600">-₱{payroll.lateDeductionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {otherDeductions > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Tax & Benefits (Est.)</span>
                                        <span className="font-medium text-red-600">-₱{otherDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-bold">
                                    <span className="text-slate-900">Total Deductions</span>
                                    <span className="text-red-600">-₱{(payroll.lateDeductionAmount + otherDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay */}
                        <div className="bg-blue-50 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-blue-700 font-medium mb-1">Net Pay</p>
                                {/* <p className="text-xs text-blue-600">Sent to bank account</p> */}
                            </div>
                            <p className="text-3xl font-bold text-blue-700">₱{payroll.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 p-6 border-t border-slate-200 text-center">
                        <p className="text-xs text-slate-500">
                            Generated on {moment().format('MMM D, YYYY h:mm A')} • This is a system generated document.
                        </p>
                    </div>
                </div>

                {/* Modals */}
                <DetailModal 
                    open={showLateDetails} 
                    title="Late Deduction Details" 
                    items={lateItems} 
                    onClose={() => setShowLateDetails(false)} 
                    type="late"
                />
                 <DetailModal 
                    open={showOvertimeDetails} 
                    title="Overtime Details" 
                    items={overtimeItems} 
                    onClose={() => setShowOvertimeDetails(false)} 
                    type="overtime"
                />
            </div>
        );
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full min-h-screen p-4 sm:p-6 lg:p-8 space-y-6"
        >
            {/* Header - Only show in list mode or mobile */}
            {viewMode === 'list' && (
                <PageHeader
                    icon={Wallet}
                    tint="blue"
                    eyebrow="Compensation"
                    title="My Payroll"
                    subtitle="View and download your payslips and compensation history."
                    actions={
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                            <button 
                                onClick={() => setSelectedYear(prev => prev - 1)}
                                className="p-1 hover:bg-slate-100 rounded-xl text-slate-500"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-slate-900 w-16 text-center">{selectedYear}</span>
                            <button 
                                onClick={() => setSelectedYear(prev => prev + 1)}
                                className="p-1 hover:bg-slate-100 rounded-xl text-slate-500"
                                disabled={selectedYear >= moment().year()}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    }
                />
            )}

            <AnimatePresence mode="wait">
                {viewMode === 'list' ? (
                    <motion.div 
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {loading || fetchUserLoading ? (
                            <SkeletonGrid count={6} columns="sm:grid-cols-2 lg:grid-cols-3" />
                        ) : sortedPayrolls.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sortedPayrolls.map(payroll => (
                                    <PayrollCard key={payroll._id} payroll={payroll} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={DollarSign}
                                title="No payroll records found"
                                message={`No payslips available for the year ${selectedYear}.`}
                            />
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {selectedPayroll && <PayrollDetailView payroll={selectedPayroll} />}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
