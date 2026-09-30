import { Payroll } from "../../../../types/hr/payroll/payroll.type";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DepartmentLite } from "../../../workforce/dtr/EmployeesPanel";

interface PayrollChartsProps {
    payrolls: Payroll[];
    departments: DepartmentLite[];
    employees: any[]; // User objects
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PayrollCharts({ payrolls, departments }: PayrollChartsProps) {
    
    // 1. Cost by Department
    const costByDept = departments.map(dept => {
        // Use dept.members directly as it contains the list of employee IDs in that department
        const deptEmpIds = dept.members || [];
        
        const deptCost = payrolls
            .filter(p => {
                const empId = typeof p.employee === 'string' ? p.employee : p.employee._id;
                return deptEmpIds.includes(empId);
            })
            .reduce((sum, p) => sum + p.netPay, 0);

        return {
            name: dept.name,
            cost: deptCost
        };
    }).filter(d => d.cost > 0).sort((a, b) => b.cost - a.cost);

    // 2. Status Distribution
    const statusDist = [
        { name: 'Paid', value: payrolls.filter(p => p.status === 'paid').length },
        { name: 'Finalized', value: payrolls.filter(p => p.status === 'finalized').length },
        { name: 'Draft', value: payrolls.filter(p => p.status === 'draft').length },
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-blue-600">
                        ₱{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Department Cost Chart */}
            <div className="card-dashboard p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Payroll Cost by Department</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={costByDept} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12 }} 
                                tickFormatter={(value) => `₱${value/1000}k`} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status Distribution Chart */}
            <div className="card-dashboard p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Status Distribution</h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusDist}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusDist.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
