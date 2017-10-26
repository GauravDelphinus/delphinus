#Setup on staging - only required once (not for every check-in) for setting up directories, links, etc.
#Call from src/server (or similar level) directory

pm2 deploy ../../deployment/aws/ecosystem.config.js staging setup