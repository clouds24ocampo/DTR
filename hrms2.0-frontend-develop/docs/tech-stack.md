# Tech Stack

The HRMS Frontend is a comprehensive dashboard built with a modern, scalable stack to handle complex HR and workforce management tasks.

## Core Technologies
- **React**: For building a dynamic and interactive user interface.
- **Vite**: Providing a fast and optimized build environment.
- **TypeScript**: Ensuring type safety and robust code across the large codebase.
- **Tailwind CSS**: For consistent, utility-first styling.

## State Management
- **Zustand**: Powering the application's global state, organized by module:
  - Auth, DTR, Leave, Messaging, Notifications, Payroll, etc.

## Real-time Communication
- **Socket.io-client**: Enables real-time messaging, notifications, and live updates across the dashboard.

## UI & Experience
- **Shadcn UI**: For accessible, high-quality dashboard components.
- **Framer Motion**: For smooth transitions and interactive UI elements.
- **Rich Text Editor**: Used in document creation and management.

## Document & Reporting
- **jspdf / html2canvas**: For generating PDF documents like payslips and reports.
- **Chart.js / Recharts**: (Likely used) for data visualization in analytics dashboards.

## Networking & API
- **Axios**: Centralized API management with custom instances and interceptors.
- **Service Workers**: For PWA support and offline capabilities.
