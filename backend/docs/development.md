# Development Guide

Standards and practices for developers contributing to the HRMS Backend.

## General Principles
- **Type Everything**: Avoid the `any` type. Use interfaces and types in `src/types/`.
- **Service-First Logic**: Controllers should be thin; business logic belongs in services.
- **Error Handling**: Use the centralized error utility (`src/utils/global/error.ts`) to throw and handle exceptions consistently.

## Coding Standards
- **Naming Conventions**:
  - Controllers/Services/Models: PascalCase (e.g., `PayrollService.ts`).
  - Routes/Utils: camelCase (e.g., `auth.route.ts`).
  - Variables/Functions: camelCase.
- **Async/Await**: Use `async/await` for asynchronous operations; avoid callback hell.

## Workflow
1. **Database Changes**: Update models in `src/models/` and reflect changes in TypeScript types.
2. **Service Implementation**: Implement the logic in a new or existing service.
3. **Controller & Route**: Expose the service method through a controller and map it to a route.
4. **Testing**: Write tests in Jest, especially for logic-heavy services (e.g., `payroll.service.test.ts`).

## Testing with Jest
- Place test files alongside the code they test with a `.test.ts` extension.
- Use mocks for database operations and external services to keep tests isolated and fast.
- Run tests using `npm test`.

## Build & Run
- **Development**: `npm run dev` (starts the server with hot-reloading).
- **Production**: `npm run build` followed by `npm start` (or using PM2).

## Documentation
- Keep the `docs/` folder updated with any major architectural or logic changes.
- Document complex utility functions using JSDoc comments.
