# Getting Started

Setup and development instructions for the HRMS Frontend.

## Prerequisites
- **Node.js**: Version 18+ (check `.nvmrc` if available).
- **npm**: Version 9+.

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Create a `.env` file based on `.env.example`.
   - Set `VITE_API_BASE_URL` and `VITE_SOCKET_URL`.

## Development

Start the development server:
```bash
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

## Production Build

Build the project for production:
```bash
npm run build
```
The optimized files will be in the `dist/` directory.

## Progressive Web App (PWA)
The project is configured for PWA. After building, the service worker will handle caching and offline access.

## Linting
Maintain code quality with ESLint:
```bash
npm run lint
```
