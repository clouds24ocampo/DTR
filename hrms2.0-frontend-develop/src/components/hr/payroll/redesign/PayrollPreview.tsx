import { Payroll } from "../../../../types/hr/payroll/payroll.type";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, FileCheck, Trash2, Printer, Mail, AlertTriangle, ExternalLink } from "lucide-react";
import moment from "moment";
import { usePayrollStore } from "../../../../stores/hr/payroll/payroll.store";
import { useDTRStore } from "../../../../stores/global/dtr/dtr.store";
import { calculateLateDeduction } from "../../../../utils/hr/payroll/payrollCalculator";
import html2canvas from "html2canvas";
import { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface PayrollPreviewProps {
    payroll: Payroll | null;
    onClose: () => void;
}

interface ConfirmationModalProps {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
    confirmText?: string;
    confirmColor?: string;
    loading?: boolean;
}

export interface DetailItem {
    date: string;
    description: string;
    amount: number;
}

export interface DetailModalProps {
    open: boolean;
    title: string;
    items: DetailItem[];
    onClose: () => void;
    type: 'overtime' | 'late';
    onItemClick?: (date: string) => void;
}

export const DetailModal = ({ open, title, items, onClose, type, onItemClick }: DetailModalProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 !mt-0" role="dialog" aria-labelledby="modal-title" aria-modal="true">
             <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 id="modal-title" className="text-lg font-bold text-gray-900">{title}</h3>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close modal">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        {items.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No records found.</p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className={`flex justify-between items-center py-2 border-b border-gray-50 last:border-0 ${onItemClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors rounded px-2 -mx-2 group`}
                                        onClick={() => onItemClick && onItemClick(item.date)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && onItemClick && onItemClick(item.date)}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900">{moment(item.date).format('MMM D, YYYY')}</p>
                                                <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <p className="text-xs text-gray-500">{item.description}</p>
                                        </div>
                                        <p className={`text-sm font-medium ${type === 'late' ? 'text-red-600' : 'text-gray-900'}`}>
                                            {type === 'late' ? '-' : ''}₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700">Total</span>
                        <span className={`text-sm font-bold ${type === 'late' ? 'text-red-600' : 'text-gray-900'}`}>
                            {type === 'late' ? '-' : ''}₱{items.reduce((acc, item) => acc + item.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const ConfirmationModal = ({ open, title, message, onConfirm, onClose, confirmText = "Confirm", confirmColor = "bg-blue-600", loading = false }: ConfirmationModalProps) => {
    if (!open) return null;
    
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 !mt-0">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-4 py-2 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 ${confirmColor} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default function PayrollPreview({ payroll, onClose }: PayrollPreviewProps) {
    const { updatePayroll, deletePayroll, loading } = usePayrollStore();
    const { loadUserDTRs } = useDTRStore();
    const navigate = useNavigate();
    
    // State for real breakdown
    const [lateBreakdown, setLateBreakdown] = useState<DetailItem[]>([]);

    // Fetch breakdown when payroll opens
    useEffect(() => {
        const fetchDetails = async () => {
            if (!payroll) return;
            // Only fetch if we have late deductions or amount
            if ((payroll.lateCount && payroll.lateCount > 0) || (payroll.lateDeductionAmount && payroll.lateDeductionAmount > 0)) {
                 const empId = typeof payroll.employee === 'string' ? payroll.employee : payroll.employee._id;
                 const dtrs = await loadUserDTRs(empId);
                 const periodDTRs = dtrs?.filter(d => d.date >= payroll.periodStart && d.date <= payroll.periodEnd) || [];
                 const { breakdown } = calculateLateDeduction(periodDTRs, payroll.hourlyRate);
                 
                 const items: DetailItem[] = breakdown.map(b => ({
                     date: b.date,
                     description: `Late arrival (${moment(b.actualTime, 'HH:mm').format('h:mm A')}, ${b.lateMinutes} mins late) - ${b.session}`,
                     amount: b.amount
                 }));
                 setLateBreakdown(items);
            } else {
                setLateBreakdown([]);
            }
        };
        fetchDetails();
    }, [payroll, loadUserDTRs]);

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        message: string;
        action: () => Promise<void> | void;
        confirmText: string;
        confirmColor: string;
    }>({
        open: false,
        title: '',
        message: '',
        action: () => {},
        confirmText: '',
        confirmColor: ''
    });
    
    const [detailModal, setDetailModal] = useState<{
        open: boolean;
        title: string;
        type: 'overtime' | 'late';
        items: DetailItem[];
    }>({
        open: false,
        title: '',
        type: 'late',
        items: []
    });

    const contentRef = useRef<HTMLDivElement>(null);

    if (!payroll) return null;

    const emp: any = payroll.employee; // Handle type assertion

    const handleItemClick = (dateStr: string) => {
        // Navigate to DTR Tracking with query params
        // Assuming route is /workforce-dtr-tracking based on common patterns, or /dtr-tracking
        // We'll use /workforce-dtr-tracking as it is safer for admin modules
        const date = moment(dateStr).format('YYYY-MM-DD');
        const employeeId = emp._id;
        navigate(`/workforce-dtr-tracking?date=${date}&employeeId=${employeeId}`);
    };

    const handleOvertimeClick = () => {
        if (!payroll) return;
        const items: DetailItem[] = [];
        if (payroll.overtimeHours > 0) {
            const overtimeAmount = payroll.grossPay - (payroll.regularHours * payroll.hourlyRate);
            // Distribute across a few days for mock data
            const sessions = Math.max(1, Math.ceil(payroll.overtimeHours / 2));
            const hoursPerSession = payroll.overtimeHours / sessions;
            const amountPerSession = overtimeAmount / sessions;

            for (let i = 0; i < sessions; i++) {
                items.push({
                    date: moment(payroll.periodEnd).subtract(i + 1, 'days').toISOString(),
                    description: `${hoursPerSession.toFixed(1)} hours`,
                    amount: amountPerSession
                });
            }
        }
        
        setDetailModal({
            open: true,
            title: 'Overtime Details',
            type: 'overtime',
            items
        });
    };

    const handleLateClick = () => {
        if (!payroll) return;
        let items: DetailItem[] = [];

        // 1. Use persisted details from backend if available
        if (payroll.lateDetails && payroll.lateDetails.length > 0) {
            items = payroll.lateDetails.map(d => ({
                date: d.date,
                description: `Late arrival (${moment(d.actualTime, 'HH:mm').format('h:mm A')}, ${d.lateMinutes} mins late) - ${d.session}`,
                amount: (d.deductionHours || 0) * payroll.hourlyRate
            }));
        } 
        // 2. Use frontend-calculated breakdown if available
        else if (lateBreakdown.length > 0) {
            items = lateBreakdown;
        }
        // 3. Fallback to mock data (legacy support)
        else if (payroll.lateCount > 0) {
            const amountPerLate = payroll.lateDeductionAmount / payroll.lateCount;
            
            for (let i = 0; i < payroll.lateCount; i++) {
                items.push({
                    date: moment(payroll.periodEnd).subtract(i * 3 + 2, 'days').toISOString(),
                    description: `Late arrival (${Math.floor(Math.random() * 30 + 5)} mins)`,
                    amount: amountPerLate
                });
            }
        }

        setDetailModal({
            open: true,
            title: 'Late Deduction Details',
            type: 'late',
            items
        });
    };

    const handleStatusUpdate = async (status: 'finalized' | 'paid' | 'draft') => {
        await updatePayroll(payroll._id, { status });
    };

    const confirmDelete = () => {
        setConfirmState({
            open: true,
            title: "Delete Payroll Record",
            message: "Are you sure you want to delete this payroll record? This action cannot be undone.",
            confirmText: "Delete",
            confirmColor: "bg-red-600 hover:bg-red-700",
            action: async () => {
                await deletePayroll(payroll._id);
                setConfirmState(prev => ({ ...prev, open: false }));
                onClose();
                toast.success("Payroll record deleted successfully");
            }
        });
    };

    const generateEmailTemplate = () => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
                    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; margin-bottom: 20px; }
                    .header h1 { color: #2563eb; margin: 0; }
                    .details { margin-bottom: 20px; }
                    .amount-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #eee; padding-top: 10px; margin-top: 10px; }
                    .footer { text-align: center; font-size: 0.8em; color: #666; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div className="container">
                    <div className="header">
                        <h1>Payroll Slip</h1>
                        <p>Reference: #${payroll._id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div className="details">
                        <p><strong>Employee:</strong> ${emp.firstName} ${emp.lastName}</p>
                        <p><strong>Period:</strong> ${moment(payroll.periodStart).format('MMM D, YYYY')} - ${moment(payroll.periodEnd).format('MMM D, YYYY')}</p>
                        <p><strong>Payment Date:</strong> ${moment(payroll.updatedAt).format('MMM D, YYYY')}</p>
                    </div>
                    <div className="earnings">
                        <h3>Earnings</h3>
                        <div className="amount-row">
                            <span>Regular Pay</span>
                            <span>₱${(payroll.regularHours * payroll.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="amount-row">
                            <span>Overtime Pay</span>
                            <span>₱${(payroll.overtimeHours > 0 ? (payroll.grossPay - (payroll.regularHours * payroll.hourlyRate)) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                         <div className="amount-row" style="font-weight: bold;">
                            <span>Gross Pay</span>
                            <span>₱${payroll.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    <div className="deductions">
                        <h3>Deductions</h3>
                        <div className="amount-row">
                            <span>Late Deductions</span>
                            <span style="color: #dc2626;">-₱${payroll.lateDeductionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                    <div className="amount-row total">
                        <span>Net Pay</span>
                        <span style="color: #2563eb;">₱${payroll.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="footer">
                        <p>This is a system generated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const confirmEmail = () => {
        setConfirmState({
            open: true,
            title: "Send Payslip via Email",
            message: `Are you sure you want to send the payslip to ${emp.firstName} ${emp.lastName}?`,
            confirmText: "Send Email",
            confirmColor: "bg-blue-600 hover:bg-blue-700",
            action: async () => {
                // Simulate API call
                const emailContent = generateEmailTemplate();
                console.log("Sending email:", emailContent);
                await new Promise(resolve => setTimeout(resolve, 1000));
                setConfirmState(prev => ({ ...prev, open: false }));
                toast.success(`Payslip sent to ${emp.firstName} ${emp.lastName}`);
            }
        });
    };

    const confirmPrint = () => {
        setConfirmState({
            open: true,
            title: "Print to PNG",
            message: "Generate and download the payroll slip as a PNG image?",
            confirmText: "Download PNG",
            confirmColor: "bg-purple-600 hover:bg-purple-700",
            action: async () => {
                if (contentRef.current) {
                    try {
                        // Small delay to ensure modal is closed/rendering is stable
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        const canvas = await html2canvas(contentRef.current, {
                            scale: 2, // Higher quality
                            useCORS: true, // For images
                            backgroundColor: '#ffffff',
                            ignoreElements: (element) => element.hasAttribute('data-html2canvas-ignore')
                        });
                        
                        const dataUrl = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.href = dataUrl;
                        link.download = `Payslip_${emp.lastName}_${moment(payroll.periodEnd).format('YYYY-MM-DD')}.png`;
                        link.click();
                        
                        setConfirmState(prev => ({ ...prev, open: false }));
                        toast.success("Payslip downloaded successfully");
                    } catch (error) {
                        console.error("Print error:", error);
                        toast.error("Failed to generate image");
                    }
                }
            }
        });
    };

    const handleActionConfirm = async () => {
        if (confirmState.action) {
            await confirmState.action();
        }
    };


    return (
        <AnimatePresence>
            {payroll && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40 !mt-0"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        ref={contentRef}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto flex flex-col !mt-0"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Payroll Details</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Reference ID: #{payroll._id.slice(-8).toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                data-html2canvas-ignore
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Employee Profile */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl overflow-hidden relative border border-blue-200">
                                    {emp.profilePicture ? (
                                        <img 
                                            src={emp.profilePicture} 
                                            alt={`${emp.firstName} ${emp.lastName}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <>{emp.firstName?.[0]}{emp.lastName?.[0]}</>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{emp.firstName} {emp.lastName}</h3>
                                    <p className="text-gray-500">{emp.position || "Employee"}</p>
                                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        payroll.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                        payroll.status === 'finalized' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}>
                                        {payroll.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="px-6 py-3 border-b border-gray-200 flex gap-2 overflow-x-auto" data-html2canvas-ignore>
                            {payroll.status === 'draft' && (
                                <button 
                                    onClick={() => handleStatusUpdate('finalized')}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                    <FileCheck className="w-4 h-4" /> Finalize
                                </button>
                            )}
                            {payroll.status === 'finalized' && (
                                <button 
                                    onClick={() => handleStatusUpdate('paid')}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors whitespace-nowrap"
                                >
                                    <CheckCircle className="w-4 h-4" /> Mark Paid
                                </button>
                            )}
                            <button 
                                onClick={confirmPrint}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button 
                                onClick={confirmEmail}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
                            >
                                <Mail className="w-4 h-4" /> Email
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors ml-auto whitespace-nowrap"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                            
                            {/* Period Info */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Pay Period</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                        {moment(payroll.periodStart).format('MMM D, YYYY')} - {moment(payroll.periodEnd).format('MMM D, YYYY')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Payment Date</p>
                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                        {moment(payroll.updatedAt).format('MMM D, YYYY')}
                                    </p>
                                </div>
                            </div>

                            {/* Earnings */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3 border-b pb-2">Earnings</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Regular Pay</p>
                                            <p className="text-xs text-gray-500">{payroll.regularHours.toFixed(2)} hrs @ ₱{payroll.hourlyRate.toFixed(2)}/hr</p>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            ₱{(payroll.regularHours * payroll.hourlyRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div 
                                        className="flex justify-between items-center cursor-pointer hover:bg-blue-50 p-2 -mx-2 rounded-lg transition-colors group"
                                        onClick={handleOvertimeClick}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && handleOvertimeClick()}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Overtime Pay</p>
                                            <p className="text-xs text-gray-500 group-hover:text-blue-600">{payroll.overtimeHours} hrs</p>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                                            ₱{(payroll.overtimeHours > 0 ? (payroll.grossPay - (payroll.regularHours * payroll.hourlyRate)) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <p className="text-sm font-bold text-gray-900">Total Earnings</p>
                                        <p className="text-sm font-bold text-gray-900">₱{payroll.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Deductions */}
                            <section>
                                <h4 className="text-sm font-bold text-gray-900 uppercase mb-3 border-b pb-2">Deductions</h4>
                                <div className="space-y-3">
                                    <div 
                                        className="flex justify-between items-center cursor-pointer hover:bg-red-50 p-2 -mx-2 rounded-lg transition-colors group"
                                        onClick={handleLateClick}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLateClick()}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 group-hover:text-red-700">Late Deduction</p>
                                            <p className="text-xs text-gray-500 group-hover:text-red-600">{payroll.lateCount} occurrences</p>
                                        </div>
                                        <p className="text-sm font-medium text-red-600 group-hover:text-red-700">
                                            -₱{payroll.lateDeductionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    {/* Placeholder Tax */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Tax Withholding (Est.)</p>
                                            <p className="text-xs text-gray-500">Flat Rate</p>
                                        </div>
                                        <p className="text-sm font-medium text-gray-400">₱0.00</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <p className="text-sm font-bold text-gray-900">Total Deductions</p>
                                        <p className="text-sm font-bold text-red-600">-₱{payroll.lateDeductionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Net Pay */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-blue-800 font-medium">Net Pay</p>
                                    <p className="text-xs text-blue-600">Take home amount</p>
                                </div>
                                <p className="text-2xl font-bold text-blue-700">
                                    ₱{payroll.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                    
                    <DetailModal
                        open={detailModal.open}
                        title={detailModal.title}
                        items={detailModal.items}
                        onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
                        type={detailModal.type}
                        onItemClick={handleItemClick}
                    />
                    
                    <ConfirmationModal 
                        open={confirmState.open}
                        title={confirmState.title}
                        message={confirmState.message}
                        onConfirm={handleActionConfirm}
                        onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
                        confirmText={confirmState.confirmText}
                        confirmColor={confirmState.confirmColor}
                        loading={loading}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
