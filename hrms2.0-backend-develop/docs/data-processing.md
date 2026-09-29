# Data Processing

The HRMS Backend handles complex data transformations and automated processes critical to business operations.

## Attendance & DTR Logic
- **DTR Calculation**: (`src/utils/global/dtr/dtr-calculation.ts`) Logic for calculating hours worked, overtime, and attendance status.
- **Automated Processing**: (`src/dtr.cron.ts`) Scheduled tasks that process daily time records and generate reports at specific intervals.
- **Geo-fencing Validation**: Backend verification of location data submitted during clock-in/out events.

## Payroll Engine
- **Payroll Service**: (`src/services/hr/payroll/payroll.service.ts`) Orchestrates the generation of payroll records based on DTR data and employee contracts.
- **Deductions & Benefits**: Calculation of mandatory deductions and company-specific benefits.
- **Auditing**: (`payroll-audit.model.ts`) Tracking changes and adjustments made to payroll records for compliance.

## Scheduling System
- **Auto-Scheduling**: (`src/services/global/schedule/autoSchedule.service.ts`) Algorithms to automatically assign shifts based on workplace requirements and employee availability.
- **Validation**: Ensures no overlapping shifts and adheres to labor regulations.

## Messaging & Notifications
- **Real-time Delivery**: Using Socket.io to push messages and notifications instantly to connected clients.
- **Persistence**: Messages and notifications are stored in the database for history and offline retrieval.

## File & Image Handling
- **Secure Uploads**: Processing files through `upload.middleware.ts` to validate types and sizes.
- **Storage Integration**: (Likely) Integration with cloud storage (like AWS S3) or local storage for resumes, IDs, and profile photos.

## Email Automation
- **Templates**: Standardized email templates for various triggers (Welcome, Application Accepted, Password Reset).
- **Service**: Centralized mailing utility (`src/utils/global/mail/mail.ts`) to handle SMTP communication.
