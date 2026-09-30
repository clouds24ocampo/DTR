# Configuration

Detailed configuration settings for the HRMS Frontend.

## Environment Variables
- `VITE_API_BASE_URL`: Backend API endpoint.
- `VITE_SOCKET_URL`: WebSocket server endpoint for real-time features.
- `VITE_APP_ENV`: Deployment environment (development, staging, production).

## Virtual Office Configuration (`src/config/virtualOffice.config.ts`)
Settings for the virtual office integration, including:
- Room configurations.
- User presence settings.
- Integration endpoints.

## Vite & Plugins (`vite.config.ts`)
- **PWA Configuration**: Defines manifest, icons, and caching strategies.
- **Path Aliases**: Standardizes imports with `@/` prefixes.

## Tailwind CSS (`tailwind.config.js`)
- **Theme Extensions**: Custom color palettes for different dashboard roles.
- **Animations**: Custom keyframes for dashboard transitions and loading states.

## TypeScript Configuration
- **tsconfig.app.json**: Compiler options for the main application.
- **tsconfig.node.json**: Options for Vite's configuration environment.
