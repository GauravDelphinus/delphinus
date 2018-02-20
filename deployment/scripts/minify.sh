#!/bin/bash

set -x

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
    --sourcelessfolder)
    SOURCE_LESS_FOLDER="$2"
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

MINIFY_FLAGS=" -m -c "
if [ "${CONCAT_ONLY}" == "true" ] 
then
	MINIFY_FLAGS=""
fi

#UGLIFY JS FILES
uglifyjs ${SOURCE_JS_FOLDER}/challenge.js -o ${MIN_JS_FOLDER}/challenge.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/challenges.js -o ${MIN_JS_FOLDER}/challenges.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/entry.js -o ${MIN_JS_FOLDER}/entry.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/entries.js -o ${MIN_JS_FOLDER}/entries.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/error.js -o ${MIN_JS_FOLDER}/error.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/header.js -o ${MIN_JS_FOLDER}/header.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/index.js -o ${MIN_JS_FOLDER}/index.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/newchallenge.js -o ${MIN_JS_FOLDER}/newchallenge.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/newentry.js -o ${MIN_JS_FOLDER}/newentry.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/share.js -o ${MIN_JS_FOLDER}/share.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/user.js -o ${MIN_JS_FOLDER}/user.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/users.js -o ${MIN_JS_FOLDER}/users.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/contact.js -o ${MIN_JS_FOLDER}/contact.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/utils/comments.js \
	${SOURCE_JS_FOLDER}/utils/deletePost.js \
	${SOURCE_JS_FOLDER}/utils/general.js \
	${SOURCE_JS_FOLDER}/utils/menuAndPopup.js \
	${SOURCE_JS_FOLDER}/utils/postElements.js \
	${SOURCE_JS_FOLDER}/utils/sidebar.js \
	${SOURCE_JS_FOLDER}/utils/social.js \
	${SOURCE_JS_FOLDER}/utils/fetchData.js \
	${SOURCE_JS_FOLDER}/utils/timelapse.js -o ${MIN_JS_FOLDER}/utils.min.js ${MINIFY_FLAGS}
uglifyjs ${SOURCE_JS_FOLDER}/containers/feed.js \
	${SOURCE_JS_FOLDER}/containers/filmstrip.js \
	${SOURCE_JS_FOLDER}/containers/container.js \
	${SOURCE_JS_FOLDER}/containers/tabs.js \
	${SOURCE_JS_FOLDER}/containers/horizontalStrip.js \
	${SOURCE_JS_FOLDER}/containers/thumbnail.js -o ${MIN_JS_FOLDER}/containers.min.js ${MINIFY_FLAGS}

#First Convert LESS to CSS, and then directly minify it
lessc ${SOURCE_LESS_FOLDER}/styles.less | csso -o ${MIN_CSS_FOLDER}/styles.min.css
