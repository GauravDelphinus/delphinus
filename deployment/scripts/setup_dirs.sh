#Create necessary directories, links, etc.

#pass one argument using the --projectroot parameter.  This is the directory that
#represents the project root folder (which has src, assets, etc. folders)

pushd `dirname $0` > /dev/null
SCRIPT_PATH="$( cd "$(dirname "$0")" ; pwd -P )"
popd > /dev/null
PROJECT_ROOT="${SCRIPT_PATH}/../../"	

if [ ! -L "${PROJECT_ROOT}/../current" ]; then
	if [ -d "${PROJECT_ROOT}/../source" ]; then
		ln -s ${PROJECT_ROOT}/../source ${PROJECT_ROOT}/../current;
	elif [ -d "${PROJECT_ROOT}/../delphinus" ]; then
		ln -s ${PROJECT_ROOT}/../delphinus ${PROJECT_ROOT}/../current;
	fi
fi

# Typically, ${PROJECT_ROOT} => /var/www/production (prod) or /var/www/staging (stage)

#####################################################
#
# data directory
# --------------
#
# Typical mappings:
# /var/www/production/data -> Production Server
# /var/www/staging/data -> Staging server
#
# This is the Main Storage location for all images, both raw and processed, used by Captionify.com
# Make sure there is sufficient space.  On Prod, it should be a EBS volume mounted on this folder (/var/www/production/data)
# 

mkdir ${PROJECT_ROOT}/../data;
mkdir ${PROJECT_ROOT}/../data/db; # holds the Neo4j db files
mkdir ${PROJECT_ROOT}/../data/tmp; # temporary storage
mkdir ${PROJECT_ROOT}/../data/log;  # all application logs (refer logger.js)
mkdir ${PROJECT_ROOT}/../data/cacheImages; # all cache images.  By its very nature, this can be deleted/purged if we run out of space.
mkdir ${PROJECT_ROOT}/../data/cacheImagesRaw; # cache images that don't have watermarks (e.g., intermediate filter steps)
mkdir ${PROJECT_ROOT}/../data/contentImages; # all content images that have watermarks (for public use)
mkdir ${PROJECT_ROOT}/../data/contentImages/challenges; # challenge images
mkdir ${PROJECT_ROOT}/../data/contentImages/entries; # entry images
mkdir ${PROJECT_ROOT}/../data/contentImages/users; # user images
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw; # all content images without watermark, should not be accessible publicly
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw/challenges; # raw challenge images
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw/entries; # raw entry images
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw/users; # raw user images

####################################################
#
# public directory
# ----------------
#
# This is the public directory that maps to https://www.captionify.com/ root path
#
# Some items, such as minified js and css files are directly copied here as part of every new build
# Other items, such as images, are mapped (soft linked) from other locations

mkdir ${PROJECT_ROOT}/../public;
mkdir ${PROJECT_ROOT}/../public/js; # minified js files are copied here at build/deploy time (not linked)
mkdir ${PROJECT_ROOT}/../public/css; # minified css files are copied here at build/deploy time (not linked)

### Generate soft links

ln -s ${PROJECT_ROOT}/../data/contentImages ${PROJECT_ROOT}/../public/contentImages; # maps to /contentImages/...
ln -s ${PROJECT_ROOT}/../data/cacheImages ${PROJECT_ROOT}/../public/cacheImages; # maps to /cacheImages/...
ln -s ${PROJECT_ROOT}/../current/src/client/web/public/images ${PROJECT_ROOT}/../public/images; # static images, maps to /images
ln -s ${PROJECT_ROOT}/../current/src/client/web/public/third-party ${PROJECT_ROOT}/../public/third-party; # third-party js/css/font files, maps to /third-party/...
ln -s ${PROJECT_ROOT}/../current/src/client/web/public/pages ${PROJECT_ROOT}/../public/pages; # static pages, maps to /pages/...


######################################################
#
# IMPORTANT MAPPINGS
#
#
# Public Access Point			Serving location 							Actual (internal) Location
# -------------------			-----------------							--------------------------
#
# /js							${PROJECT_ROOT}/../public/js				same - minified js files are copied to this location (overwritten on every setup/build)
# /css							${PROJECT_ROOT}/../public/css 				same - minified css files are copid to this location (overwritten on every setup/build)
# /contentImages 				${PROJECT_ROOT}/../public/contentImages		${PROJECT_ROOT}/../data/contentImages
# /cacheImages  				${PROJECT_ROOT}/../public/cacheImages		${PROJECT_ROOT}/../data/cacheImages
# /images 						${PROJECT_ROOT}/../public/images 			${PROJECT_ROOT}/../current/src/client/web/public/images
# /third-party					${PROJECT_ROOT}/../public/third-party 		${PROJECT_ROOT}/../current/src/client/web/public/third-party
# /pages 						${PROJECT_ROOT}/../public/pages 			${PROJECT_ROOT}/../current/src/client/web/public/pages





