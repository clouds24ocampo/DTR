# Architecture

The HRMS Frontend is architected as a modular, role-based dashboard designed for performance and scalability.

## Project Structure
- `src/api/`: Module-based API services (auth, hr, workforce, workplace, global).
- `src/components/`: Extensive library of components, from generic UI elements to complex module-specific views.
- `src/pages/`: Organized by function (Auth, Dashboard, Main, Management, Public).
- `src/stores/`: Zustand stores segmented by domain (admin, auth, global, hr, workforce).
- `src/types/`: Centralized type definitions for all business entities and API contracts.
- `src/utils/`: Domain-specific utilities (dtr calculations, payroll, geo-fencing, etc.).

## Key Architectural Patterns
- **Role-Based Routing & Views**: The dashboard dynamically adapts its layout and features based on the user's role (HR, Employee, Workforce, etc.).
- **Modular State Management**: Zustand stores are isolated by module to prevent state bloat and ensure clear data ownership.
- **WebSocket Integration**: A centralized socket management system handles real-time events across the application.
- **API Encapsulation**: Consistent use of service layers to abstract backend communication.

## Data Flow
1. User logs in; Auth state is initialized and persisted.
2. The application determines the user's role and redirects to the appropriate dashboard.
3. Components fetch initial data via Axios or subscribe to real-time updates via WebSockets.
4. State is updated in the respective Zustand stores.
5. UI updates reactively to state changes, providing a seamless experience.
