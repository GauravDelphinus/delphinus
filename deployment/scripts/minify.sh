#!/bin/bash

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --sourcejsfolder)
    SOURCE_JS_FOLDER="$2"
    shift # past argument
    shift # past value
    ;;
    --minjsfolder)
    MIN_JS_FOLDER="$2"
    shift # past argument
    shift # past value
    ;;
    --sourcecssfolder)
    SOURCE_CSS_FOLDER="$2"
    shift # past argument
    shift # past value
    ;;
    --mincssfolder)
    MIN_CSS_FOLDER="$2"
    shift # past argument
    shift # past value
    ;;
    --concatonly)
    CONCAT_ONLY="true"
    shift # past argument
    ;;
    --default)
    DEFAULT=YES
    shift # past argument
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

echo SOURCE JS FOLDER = "${SOURCE_JS_FOLDER}"
echo MIN JS FOLDER = "${MIN_JS_FOLDER}"
echo SOURCE CSS FOLDER = "${SOURCE_CSS_FOLDER}"
echo MIN CSS FOLDER = "${MIN_CSS_FOLDER}"
echo CONCAT_ONLY = "${CONCAT_ONLY}"

MINIFY_FLAGS=" -m -c "
if [ "${CONCAT_ONLY}" == "true" ] 
then
	MINIFY_FLAGS=""
fi

uglifyjs ${SOURCE_JS_FOLDER}/challenge.js -o ${MIN_JS_FOLDER}/challenge.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/challenges.js -o ${MIN_JS_FOLDER}/challenges.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/entry.js -o ${MIN_JS_FOLDER}/entry.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/entries.js -o ${MIN_JS_FOLDER}/entries.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/error.js -o ${MIN_JS_FOLDER}/error.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/header.js -o ${MIN_JS_FOLDER}/header.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/index.js -o ${MIN_JS_FOLDER}/index.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/newchallenge.js -o ${MIN_JS_FOLDER}/newchallenge.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/newentry.js -o ${MIN_JS_FOLDER}/newentry.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/user.js -o ${MIN_JS_FOLDER}/user.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/users.js -o ${MIN_JS_FOLDER}/users.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/utils/comments.js \
	${SOURCE_JS_FOLDER}/utils/container.js \
	${SOURCE_JS_FOLDER}/utils/deletePost.js \
	${SOURCE_JS_FOLDER}/utils/general.js \
	${SOURCE_JS_FOLDER}/utils/menuAndPopup.js \
	${SOURCE_JS_FOLDER}/utils/postElements.js \
	${SOURCE_JS_FOLDER}/utils/sidebar.js \
	${SOURCE_JS_FOLDER}/utils/social.js \
	${SOURCE_JS_FOLDER}/utils/timelapse.js -o ${MIN_JS_FOLDER}/utils.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_CSS_FOLDER}/styles.css -o ${MIN_CSS_FOLDER}/styles.min.css ${MINIFY_FLAGS}
