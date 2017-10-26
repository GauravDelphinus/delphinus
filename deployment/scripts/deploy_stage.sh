#Deploy to staging - sync code
#Called automatically by Circle CI after successful build and tests (refer circle.yml)
#Can also call manually if needed

#Call from src/server (or similar level) directory

pm2 deploy ../../deployment/aws/ecosystem.config.js staging