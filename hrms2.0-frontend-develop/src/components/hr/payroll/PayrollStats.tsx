import { DollarSign, Clock, AlertCircle, Wallet } from "lucide-react";
import DTRStats, { DTRStat } from "../../../components/workforce/dtr/DTRStats";

interface PayrollStatsProps {
  grossPay: number;
  netPay: number;
  deductions: number;
  overtimePay: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
}

export default function PayrollStats({
  grossPay,
  netPay,
  deductions,
  overtimePay,
  overtimeHours,
  hourlyRate
}: PayrollStatsProps) {
  const stats: DTRStat[] = [
    {
      title: "Net Pay",
      value: `₱${netPay.toFixed(2)}`,
      icon: Wallet,
      color: "green",
      description: "Take home pay",
    },
    {
      title: "Gross Pay",
      value: `₱${grossPay.toFixed(2)}`,
      icon: DollarSign,
      color: "blue",
      description: `Rate: ₱${hourlyRate.toFixed(2)}/hr`,
    },
    {
      title: "Deductions",
      value: `₱${deductions.toFixed(2)}`,
      icon: AlertCircle,
      color: "red",
      description: "Late/Absences",
    },
    {
      title: "Overtime",
      value: `₱${overtimePay.toFixed(2)}`,
      icon: Clock,
      color: "orange",
      description: `${overtimeHours.toFixed(2)} hrs`,
    },
  ];

  return <DTRStats stats={stats} />;
}
