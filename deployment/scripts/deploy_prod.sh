#Deploy to production - sync code to latest version.
#Call manually only after stage deployment has been successful, and after testing stage
#Call from src/server (or similar level) directory
#Note: You should have called setup_prod.sh at least once before this (for one-time setup)

pm2 deploy ../../deployment/aws/ecosystem.config.js production