#!/bin/bash
#Deploy to staging - sync code
#Called automatically by Circle CI after successful build and tests (refer circle.yml)
#Can also call manually if needed

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"

pm2 deploy ${PROJECT_ROOT}/deployment/aws/ecosystem.config.js staging