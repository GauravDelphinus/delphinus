#Deploy to production - sync code to latest version.
#Call manually only after stage deployment has been successful, and after testing stage
#Note: You should have called setup_prod.sh at least once before this (for one-time setup)

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"

pm2 deploy ${PROJECT_ROOT}/deployment/aws/ecosystem.config.js production