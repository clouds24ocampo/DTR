# Payroll Calculation Logic Documentation

## Overview
This document outlines the logic used in the `calculatePayroll` service. The system processes attendance records (DTRs) over a given date range to compute gross and net pay, applying specific rules for weekends, overtime, and absenteeism.

## Date Processing
The system iterates through every date in the requested payroll period (Start Date to End Date). For each date, it checks if a Daily Time Record (DTR) exists for the user.

## Classification Rules

### 1. Weekdays (Monday - Friday)
*   **Regular Hours**: The first 8 hours of work are classified as Regular Hours.
*   **Overtime**: Any work exceeding 8 hours is classified as Weekday Overtime.
*   **Multiplier**:
    *   Regular Hours: 1.0x (Base Rate)
    *   Overtime Hours: 1.25x (Base Rate)
*   **Lateness**: If the actual start time is later than the scheduled start time by 30 minutes or more, it is counted as a "Late" occurrence.
*   **Absenteeism**: If no DTR is found for a weekday, it is counted as an Absent Day.

### 2. Weekends (Saturday - Sunday)
*   **Classification**: All hours worked on weekends are classified as Weekend Overtime. There are no "Regular Hours" on weekends for the purpose of base pay calculation in this model (unless specified otherwise in contract, but currently treated as premium time).
*   **Multiplier**:
    *   Weekend Overtime Hours: 1.30x (Base Rate)
*   **Lateness**: Lateness checks are **disabled** for weekends.
*   **Absenteeism**: If no DTR is found for a weekend, it is **NOT** counted as an Absent Day. Weekends are excluded from absenteeism penalties.

## Formulas

### Hourly Rate Calculation
```
Hourly Rate = Monthly Salary / Total Working Days in Month / 8
```
*Total Working Days in Month* refers to the count of weekdays (Monday-Friday) in the month of the payroll start date.

### Gross Pay
```
Base Pay = Total Regular Hours * Hourly Rate
Weekday OT Pay = Total Weekday OT Hours * Hourly Rate * 1.25
Weekend OT Pay = Total Weekend OT Hours * Hourly Rate * 1.30

Gross Pay = Base Pay + Weekday OT Pay + Weekend OT Pay
```

### Net Pay
```
Net Pay = Gross Pay - (Late Deduction Amount + Other Deductions)
```

## Audit Logging
Every payroll calculation generates a `PayrollAudit` entry containing:
*   **Base Pay**: Amount earned from regular hours.
*   **OT Pay**: Total overtime earnings (split by Weekday/Weekend hours).
*   **Late Deduction**: Amount deducted for lateness.
*   **Absent Days**: Count of absent weekdays.
*   **Net Pay**: Final payout amount.

## Edge Cases
*   **Partial Absences**: Covered by "Regular Hours" being less than 8 if the employee leaves early or arrives late (though currently logic focuses on total work minutes).
*   **Cross-Midnight Shifts**: The system relies on `DTRTotalWork` calculated by the DTR service. If the DTR service handles cross-midnight correctly, the payroll service will use the total minutes provided.
*   **Holidays**: (Currently not implemented - pending Holiday Model integration).
