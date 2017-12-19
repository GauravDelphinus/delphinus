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

mkdir ${PROJECT_ROOT}/../data;
mkdir ${PROJECT_ROOT}/../data/db;
mkdir ${PROJECT_ROOT}/../data/tmp; 
mkdir ${PROJECT_ROOT}/../data/log; 
mkdir ${PROJECT_ROOT}/../data/cacheImages;
mkdir ${PROJECT_ROOT}/../data/cacheImagesRaw;
mkdir ${PROJECT_ROOT}/../data/contentImages; 
mkdir ${PROJECT_ROOT}/../data/contentImages/challenges; 
mkdir ${PROJECT_ROOT}/../data/contentImages/entries; 
mkdir ${PROJECT_ROOT}/../data/contentImages/users;
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw; 
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw/challenges; 
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw/entries; 
mkdir ${PROJECT_ROOT}/../data/contentImagesRaw/users;

mkdir ${PROJECT_ROOT}/../public; 
mkdir ${PROJECT_ROOT}/../public/js; 
mkdir ${PROJECT_ROOT}/../public/css; 

ln -s ${PROJECT_ROOT}/../data/contentImages ${PROJECT_ROOT}/../public/contentImages; 
ln -s ${PROJECT_ROOT}/../data/cacheImages ${PROJECT_ROOT}/../public/cacheImages; 
ln -s ${PROJECT_ROOT}/../current/src/client/web/public/images ${PROJECT_ROOT}/../public/images; 
ln -s ${PROJECT_ROOT}/../current/src/client/web/public/third-party ${PROJECT_ROOT}/../public/third-party;
ln -s ${PROJECT_ROOT}/../current/src/client/web/public/pages ${PROJECT_ROOT}/../public/pages;