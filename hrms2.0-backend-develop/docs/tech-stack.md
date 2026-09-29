# Tech Stack

The HRMS Backend is a robust API built with modern technologies to handle complex business logic, real-time communication, and secure data management.

## Core Technologies
- **Node.js**: A JavaScript runtime built on Chrome's V8 engine.
- **Express**: A fast, unopinionated, minimalist web framework for Node.js.
- **TypeScript**: Used throughout the backend to ensure type safety and improve developer productivity.
- **MongoDB & Mongoose**: (Likely) Used as the primary database and ODM (Object Data Modeling) library for managing schemas and relationships.

## Real-time Communication
- **Socket.io**: Powers real-time features like instant messaging, live notifications, and status updates across the system.

## Build & Runtime
- **Esbuild**: Used for fast bundling and transpilation of TypeScript code.
- **PM2**: (Via `ecosystem.config.js`) For process management, ensuring the API is always running and can scale.
- **Node Version Manager (NVM)**: Project environment consistency via `.nvmrc`.

## Communication & Mail
- **Nodemailer**: (Implied by `mail.ts`) For sending system emails such as password resets, application updates, and notifications.

## Testing
- **Jest**: The primary testing framework for unit and integration tests, particularly for complex logic like payroll and scheduling.

## Utilities & Tools
- **Cron**: For scheduled tasks like daily DTR processing (`dtr.cron.ts`).
- **Multer**: (Implied by `upload.middleware.ts`) For handling file and image uploads.
- **JWT (JSON Web Tokens)**: For secure authentication and authorization.
