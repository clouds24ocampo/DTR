import { calculateLateDeduction } from "./payrollCalculator";
import { DTRDocLite } from "../../../types/global/dtr/dtr.type";

export const runTests = () => {
    console.log("%cRunning Payroll Calculator Tests...", "color: blue; font-weight: bold; font-size: 14px;");

    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, message: string) => {
        if (condition) {
            console.log(`%c✅ PASS: ${message}`, "color: green;");
            passed++;
        } else {
            console.error(`%c❌ FAIL: ${message}`, "color: red; font-weight: bold;");
            failed++;
        }
    };

    // Test Case 1: Less than 30 mins late (No deduction)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "08:29", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.deductionAmount === 0, "29 mins late should have 0 deduction");
        assert(result.occurrences === 0, "29 mins late should have 0 occurrences");
    }

    // Test Case 2: Exactly 30 mins late (1 hour deduction)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "08:30", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 1, "30 mins late should be 1 hour deduction");
        assert(result.deductionAmount === 100, "Amount should be 1 * hourlyRate");
        assert(result.occurrences === 1, "30 mins late should have 1 occurrence");
    }

    // Test Case 3: 1 hour 20 mins late (2 hours deduction) - User requirement
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "09:20", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 2, "1h 20m late should be 2 hours deduction");
        assert(result.occurrences === 1, "1h 20m late should have 1 occurrence");
        assert(result.breakdown[0].lateMinutes === 80, "Should record 80 minutes late");
    }

    // Test Case 3b: 1 hour 40 mins late (2 hours deduction)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "09:40", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 2, "1h 40m late should be 2 hours deduction");
    }

    // Test Case 4: Multiple sessions (First session and Second session)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [
                {
                    label: "Morning",
                    scheduledStartTime: "08:00",
                    fullDTR: [{ type: "work", startTime: "08:45", status: "done" }] // 45m late -> 1h
                },
                {
                    label: "Afternoon",
                    scheduledStartTime: "13:00",
                    fullDTR: [{ type: "work", startTime: "13:40", status: "done" }] // 40m late -> 1h
                }
            ]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 2, "Should sum up deductions from both sessions (1+1=2)");
    }

    // Test Case 5: Empty/Invalid Data
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: []
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 0, "Empty sessions should have 0 deduction");
    }

    // Test Case 6: Exact 60 mins late (1 hour deduction)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "09:00", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 1, "60 mins late should be 1 hour deduction");
    }

    // Test Case 7: 61 mins late (2 hours deduction)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "09:01", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.totalLateHours === 2, "61 mins late should be 2 hours deduction");
    }

    // Test Case 8: Breakdown Verification
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "08:45", status: "done" }]
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.breakdown.length === 1, "Breakdown should have 1 item");
        assert(result.breakdown[0].lateMinutes === 45, "Breakdown should record 45 mins late");
        assert(result.breakdown[0].deductionHours === 1, "Breakdown should record 1 hour deduction");
    }

    // Test Case 9: Early arrival (should not count as late)
    {
        const dtrs: any[] = [{
            date: "2024-01-01",
            sessions: [{
                scheduledStartTime: "08:00",
                fullDTR: [{ type: "work", startTime: "07:57", status: "done" }] // Early 3 minutes
            }]
        }];
        const result = calculateLateDeduction(dtrs as DTRDocLite[], 100);
        assert(result.deductionAmount === 0, "Early arrival should have 0 deduction");
        assert(result.occurrences === 0, "Early arrival should have 0 occurrences");
    }

    console.log(`%cTest Summary: ${passed} Passed, ${failed} Failed`, "font-weight: bold;");
};
