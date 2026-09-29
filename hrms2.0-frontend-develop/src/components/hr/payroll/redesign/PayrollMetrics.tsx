import { Payroll } from "../../../../types/hr/payroll/payroll.type";
import { motion } from "framer-motion";
import { DollarSign, Users, Clock, CheckCircle } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    color: string;
    delay: number;
}

const MetricCard = ({ title, value, subValue, icon: Icon, color, delay }: MetricCardProps) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-start justify-between"
    >
        <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
    </motion.div>
);

interface PayrollMetricsProps {
    payrolls: Payroll[];
}

export default function PayrollMetrics({ payrolls }: PayrollMetricsProps) {
    const totalPayroll = payrolls.reduce((sum, p) => sum + p.netPay, 0);
    const totalEmployees = new Set(payrolls.map(p => typeof p.employee === 'string' ? p.employee : p.employee._id)).size;
    const pendingCount = payrolls.filter(p => p.status === 'draft').length;
    const paidCount = payrolls.filter(p => p.status === 'paid').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
                title="Total Payroll"
                value={`₱${totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subValue="For selected period"
                icon={DollarSign}
                color="bg-blue-600"
                delay={0}
            />
            <MetricCard
                title="Employees Processed"
                value={totalEmployees}
                subValue={`${payrolls.length} Records`}
                icon={Users}
                color="bg-purple-600"
                delay={0.1}
            />
            <MetricCard
                title="Pending Approval"
                value={pendingCount}
                subValue="Draft Status"
                icon={Clock}
                color="bg-amber-500"
                delay={0.2}
            />
            <MetricCard
                title="Paid"
                value={paidCount}
                subValue="Completed"
                icon={CheckCircle}
                color="bg-green-500"
                delay={0.3}
            />
        </div>
    );
}
