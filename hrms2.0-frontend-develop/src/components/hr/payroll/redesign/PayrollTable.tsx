import { Payroll } from "../../../../types/hr/payroll/payroll.type";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import moment from "moment";
import { DepartmentLite } from "../../../workforce/dtr/EmployeesPanel";
import { DetailModal, DetailItem } from "./PayrollPreview";
import { useNavigate } from "react-router-dom";

interface PayrollTableProps {
    payrolls: Payroll[];
    departments: DepartmentLite[];
    loading: boolean;
    onView: (payroll: Payroll) => void;
    onEdit: (payroll: Payroll) => void;
    onDelete: (id: string) => void;
}

export default function PayrollTable({ payrolls, loading, onView, onEdit, onDelete }: PayrollTableProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const navigate = useNavigate();
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Calculate pagination values
    const totalPages = Math.ceil(payrolls.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = payrolls.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setExpandedId(null); // Collapse expanded items when changing page
    };
    
    const [detailModal, setDetailModal] = useState<{
        open: boolean;
        title: string;
        type: 'overtime' | 'late';
        items: DetailItem[];
        employeeId?: string;
    }>({
        open: false,
        title: '',
        type: 'late',
        items: [],
        employeeId: undefined
    });

    const handleLateClick = (payroll: Payroll) => {
        let items: DetailItem[] = [];

        if (payroll.lateDetails && payroll.lateDetails.length > 0) {
            items = payroll.lateDetails.map(d => ({
                date: d.date,
                description: `Late arrival (${moment(d.actualTime, 'HH:mm').format('h:mm A')}, ${d.lateMinutes} mins late) - ${d.session}`,
                amount: (d.deductionHours || 0) * payroll.hourlyRate
            }));
        } else if (payroll.lateCount > 0) {
            // Fallback
            const amountPerLate = payroll.lateDeductionAmount / payroll.lateCount;
            for (let i = 0; i < payroll.lateCount; i++) {
                items.push({
                    date: moment(payroll.periodEnd).subtract(i * 3 + 2, 'days').toISOString(),
                    description: `Late arrival (approx.)`,
                    amount: amountPerLate
                });
            }
        }

        const empId = typeof payroll.employee === 'string' ? payroll.employee : payroll.employee._id;

        setDetailModal({
            open: true,
            title: 'Late Deduction Details',
            type: 'late',
            items,
            employeeId: empId
        });
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-700 border-green-200';
            case 'finalized': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading payroll data...</p>
            </div>
        );
    }

    if (payrolls.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payroll Records Found</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Try adjusting your filters or calculate payroll for a new period.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Period</th>
                            <th className="px-6 py-4 text-right">Regular Hrs</th>
                            <th className="px-6 py-4 text-right">Untagged Excess</th>
                            <th className="px-6 py-4 text-right">Overtime</th>
                            <th className="px-6 py-4 text-right">Gross Pay</th>
                            <th className="px-6 py-4 text-right">Net Pay</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {currentItems.map((payroll) => {
                            const emp: any = payroll.employee; // Type assertion since it might be string or object
                            const isExpanded = expandedId === payroll._id;
                            
                            return (
                                <>
                                    <tr 
                                        key={payroll._id} 
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleExpand(payroll._id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs overflow-hidden relative border border-blue-200">
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
                                                    <div className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
                                                    <div className="text-xs text-gray-500">ID: {emp.idNumber || "N/A"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{moment(payroll.periodStart).format('MMM D')} - {moment(payroll.periodEnd).format('MMM D, YYYY')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">{payroll.regularHours.toFixed(1)}</td>
                                        <td className="px-6 py-4 text-right text-gray-500">{(payroll.untaggedExcessHours || 0).toFixed(1)}</td>
                                        <td className="px-6 py-4 text-right text-amber-600 font-medium">{(payroll.overtimeHours || 0).toFixed(1)}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                            ₱{payroll.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                                            ₱{payroll.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payroll.status)}`}>
                                                {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => onView(payroll)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onEdit(payroll)}
                                                    className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Edit Status"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDelete(payroll._id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpand(payroll._id);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.tr
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50/50"
                                            >
                                                <td colSpan={9} className="px-6 py-4 border-b border-gray-100">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                                        <div className="space-y-2">
                                                            <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-1">Earnings</h4>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Base Salary (Regular)</span>
                                                                <span>₱{(payroll.regularHours * payroll.hourlyRate).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Overtime Pay</span>
                                                                <span>₱{(payroll.overtimeHours > 0 ? (payroll.grossPay - (payroll.regularHours * payroll.hourlyRate)) : 0).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between font-medium pt-1 border-t border-gray-200 mt-1">
                                                                <span>Gross Total</span>
                                                                <span>₱{payroll.grossPay.toFixed(2)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-1">Deductions</h4>
                                                            <div 
                                                                className="flex justify-between cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleLateClick(payroll);
                                                                }}
                                                            >
                                                                <span className="text-gray-600">Late Deductions ({payroll.lateCount}x, {payroll.lateHours || 0}h)</span>
                                                                <span className="text-red-600">-₱{payroll.lateDeductionAmount.toFixed(2)}</span>
                                                            </div>
                                                            {/* Placeholder for future tax/benefits */}
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-400">Tax (Est.)</span>
                                                                <span className="text-gray-400">₱0.00</span>
                                                            </div>
                                                            <div className="flex justify-between font-medium pt-1 border-t border-gray-200 mt-1">
                                                                <span>Total Deductions</span>
                                                                <span className="text-red-600">-₱{payroll.lateDeductionAmount.toFixed(2)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-1">Summary</h4>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-600">Hourly Rate</span>
                                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">₱{payroll.hourlyRate.toFixed(2)}/hr</span>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                                                <span className="font-bold text-blue-900">Net Pay</span>
                                                                <span className="font-bold text-blue-700 text-lg">₱{payroll.netPay.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Controls */}
            {payrolls.length > 0 && (
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, payrolls.length)} of {payrolls.length} entries
                    </span>
                    <div className="flex gap-2">
                        <button 
                            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors" 
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            Previous
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="hidden sm:flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show window of pages around current page
                                let p = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) {
                                        p = currentPage - 2 + i;
                                    }
                                    if (p > totalPages) {
                                        p = totalPages - 4 + i;
                                    }
                                }
                                
                                if (p > 0 && p <= totalPages) {
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => handlePageChange(p)}
                                            className={`w-8 h-8 flex items-center justify-center rounded text-sm ${
                                                currentPage === p 
                                                    ? 'bg-blue-600 text-white border border-blue-600' 
                                                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button 
                            className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors" 
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <DetailModal 
                open={detailModal.open}
                title={detailModal.title}
                items={detailModal.items}
                type={detailModal.type}
                onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
                onItemClick={(dateStr) => {
                    if (detailModal.employeeId) {
                        const date = moment(dateStr).format('YYYY-MM-DD');
                        navigate(`/workforce-dtr-tracking?date=${date}&employeeId=${detailModal.employeeId}`);
                    }
                }}
            />
        </div>
    );
}
