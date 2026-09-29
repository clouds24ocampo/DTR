# Data Processing

How the HRMS Frontend handles complex data operations.

## Attendance & DTR
- **Calculations**: Logic in `src/utils/dtr/dtr.utils.ts` handles work hours, late arrivals, and overtime.
- **Geo-fencing**: Location data is processed to verify attendance within designated zones.
- **Trip Approvals**: Specialized workflow for handling off-site work requests.

## Payroll Processing
- **Payroll Calculator**: Located in `src/utils/hr/payroll/payrollCalculator.ts`.
- **Logic**: Handles tax deductions, bonuses, leave adjustments, and net pay calculations based on DTR data.
- **Verification**: Includes test utilities (`testPayrollCalculator.ts`) to ensure accuracy.

## Real-time Updates
- **Socket Event Handling**: Centralized in `src/socket.ts` and `src/hooks/useWebSocketMessaging.ts`.
- **State Sync**: Incoming socket events trigger updates in specific Zustand stores (e.g., Messaging, Notifications).

## Document Generation
- **HTML to PDF**: Uses `src/utils/document/htmlToPdf.tsx` to convert dashboard views (like payslips) into downloadable PDF files.
- **Rich Text**: Document management utilizes a rich text editor for content creation, stored as HTML/JSON.

## File Management
- **Chunked Uploads**: Reuses the common chunk uploader for handling large attachments in messaging and document management.
- **Exporting**: Utilities for exporting data tables to CSV or PDF formats.
