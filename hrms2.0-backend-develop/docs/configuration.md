# Configuration

The backend application is configured using environment variables and specialized configuration modules.

## Environment Variables
The application relies on a `.env` file for sensitive and environment-specific settings. Key variables include:
- `PORT`: The port the server listens on.
- `MONGODB_URI`: The connection string for the MongoDB database.
- `JWT_SECRET`: Secret key used for signing and verifying JSON Web Tokens.
- `MAIL_CONFIG`: Credentials and settings for the SMTP server (Gmail, Outlook, etc.).
- `CLIENT_URL`: The URL of the frontend application (for CORS and email links).

## Application Config (`src/config/`)
- **Mail Configuration**: (`mail.config.ts`) Centralizes settings for the mailing service.
- **Database Connection**: (`src/db/db.connect.ts`) Handles the initialization and management of the database connection.

## Process Management (`ecosystem.config.js`)
Configures PM2 for production environments:
- Instance scaling.
- Log management.
- Environment-specific runtime configurations.

## Build Configuration
- **esbuild.config.js**: Defines how the TypeScript source code is bundled and transpiled for production.
- **tsconfig.json**: TypeScript compiler settings, including path aliases and target environment.

## Git Hooks (`.githooks/`)
Automated scripts that run during git operations:
- `pre-commit`: Runs linting or tests before allowing a commit.
- `commit-msg`: Validates commit message formats.
