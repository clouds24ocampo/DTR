# Security

The HRMS Frontend implements multiple layers of security to protect sensitive HR and employee data.

## Authentication & Authorization
- **Layout Protection**: `IsAuthenticated` and `IsUnAuthenticated` components wrap routes to enforce login status.
- **Role-Based Access Control (RBAC)**: Features and API calls are restricted based on the user's role (HR, Admin, Employee, etc.).
- **Token Management**: Secure storage and handling of authentication tokens with automatic logout on expiration.

## Location Security
- **Geo-fencing**: Verification of user location during clock-in/out to ensure physical presence in authorized areas.
- **Map Integration**: Secure handling of coordinates for DTR tracking.

## Communication Security
- **WebSocket Auth**: Socket connections are authenticated to prevent unauthorized access to messaging and notifications.
- **Encrypted Transfers**: All API communication is conducted over HTTPS.

## Data Privacy
- **Personal Data Handling**: Strict controls on who can view sensitive employee information (SSN, Salary, etc.).
- **Audit Trails**: (If applicable) Logging of administrative actions in the management modules.

## Error & Session Management
- **Error Modals**: Centralized error handling to provide feedback without exposing system internals.
- **Session Persistence**: Securely persisting necessary state while ensuring sensitive data is cleared on logout.
