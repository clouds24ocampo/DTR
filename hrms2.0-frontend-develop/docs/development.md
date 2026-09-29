# Development Guide

Best practices and standards for the HRMS Frontend.

## Store Organization
Zustand stores are strictly organized by domain:
- `src/stores/auth/`: Authentication state.
- `src/stores/hr/`: HR-specific management state.
- `src/stores/workforce/`: Workforce and scheduling state.
- `src/stores/global/`: Shared features like messaging and notifications.

## Component Standards
- **Compound Components**: Used for complex elements like `DataTable` and `Modal`.
- **Custom Hooks**: Business logic should be extracted into hooks (`src/hooks/`) to keep components clean.
- **Lazy Loading**: Use `React.lazy` for route-based code splitting to improve initial load time.

## Style Guidelines
- Follow the established Tailwind utility patterns.
- Use `src/styles/animations.css` for complex global animations.
- Ensure components are responsive and accessible.

## Contribution Workflow
1. **Feature Scoping**: Understand which role(s) the feature affects.
2. **API Alignment**: Ensure TypeScript types match the backend API response.
3. **State Integration**: Add state to the appropriate domain store.
4. **UI Implementation**: Use existing components from `src/components/common/` where possible.
5. **Testing**: Add unit tests for critical utility functions (especially in payroll and DTR).
