import { Search, Clock } from "lucide-react";
import { DepartmentLite } from "../../../workforce/dtr/EmployeesPanel";

interface PayrollFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedDepartment: string;
    onDepartmentChange: (value: string) => void;
    selectedStatus: string;
    onStatusChange: (value: string) => void;
    departments: DepartmentLite[];
    periodType: string;
    onPeriodTypeChange: (value: string) => void;
    startDate: string;
    onStartDateChange: (value: string) => void;
    endDate: string;
    onEndDateChange: (value: string) => void;
}

export default function PayrollFilters({
    searchTerm,
    onSearchChange,
    selectedDepartment,
    onDepartmentChange,
    selectedStatus,
    onStatusChange,
    departments,
    periodType,
    onPeriodTypeChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange
}: PayrollFiltersProps) {
    return (
        <div className="card-dashboard p-4 mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
                {/* Left Side: Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <select
                            value={selectedDepartment}
                            onChange={(e) => onDepartmentChange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[140px]"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept._id} value={dept._id}>{dept.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedStatus}
                            onChange={(e) => onStatusChange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[120px]"
                        >
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="finalized">Finalized</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>

                {/* Right Side: Period Selection */}
                <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <Clock className="w-4 h-4 text-gray-500 ml-2 hidden sm:block" />
                    <select
                        value={periodType}
                        onChange={(e) => onPeriodTypeChange(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer text-gray-700"
                    >
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="1st_half">1st Half</option>
                        <option value="2nd_half">2nd Half</option>
                        <option value="custom">Custom</option>
                    </select>

                    {periodType === 'custom' && (
                        <div className="flex items-center gap-2 pl-2 border-l border-gray-300 ml-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onStartDateChange(e.target.value)}
                                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onEndDateChange(e.target.value)}
                                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
