# Architecture

The HRMS Backend follows a highly modular Controller-Service-Model architecture designed for scalability, maintainability, and clear separation of concerns.

## Project Structure
- `src/controllers/`: Handles incoming HTTP requests, validates input, and interacts with services.
- `src/services/`: Contains the core business logic. Services are decoupled from the transport layer (HTTP/WebSockets).
- `src/models/`: Defines data schemas and interacts with the database using Mongoose.
- `src/routes/`: Maps HTTP endpoints to controller methods, organized by domain.
- `src/middleware/`: Global and route-specific middleware for authentication, file uploads, and bot detection.
- `src/utils/`: Shared utility functions for calculations, mailing, and common tasks.
- `src/types/`: Centralized TypeScript definitions and interfaces.

## Domain Modules
The system is divided into several key domains:
- **Auth**: Authentication and password management.
- **HR**: Job postings, applicant tracking, payroll, and performance reviews.
- **Workforce**: User management, scheduling, and workplace assignments.
- **Global**: Cross-cutting features like messaging, notifications, DTR, and reporting.

## Key Patterns
- **Service Layer Pattern**: Business logic is encapsulated in services, making it reusable across different controllers or even cron jobs.
- **Modular Routing**: Routes are grouped by domain and sub-domain (e.g., `hr/job`, `hr/payroll`) for better organization.
- **Middleware Chain**: Sequential processing of requests for security (Auth), data parsing (Uploads), and protection (Bot Detection).

## Data Flow
1. **Request**: An HTTP request hits a route defined in `src/routes/`.
2. **Middleware**: Auth and validation middleware process the request.
3. **Controller**: The controller extracts data and calls the appropriate service method.
4. **Service**: The service executes business logic, potentially interacting with multiple models.
5. **Model**: Database operations are performed.
6. **Response**: The controller sends a standardized JSON response back to the client.
