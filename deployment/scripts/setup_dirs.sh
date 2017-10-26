#Create necessary directories, links, etc.

#pass one argument using the --projectroot parameter.  This is the directory that
#represents the project root folder (which has src, assets, etc. folders)

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --projectroot)
    PROJECT_ROOT="$2"
    shift # past argument
    shift # past value
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

if [ -z ${PROJECT_ROOT+x} ];
	then echo "Missing parameter --projectroot"; exit 1;
fi

mkdir ${PROJECT_ROOT}/../data; 
mkdir ${PROJECT_ROOT}/../data/tmp; 
mkdir ${PROJECT_ROOT}/../data/log; 
mkdir ${PROJECT_ROOT}/../data/contentImages; 
mkdir ${PROJECT_ROOT}/../data/cacheImages; 
mkdir ${PROJECT_ROOT}/../data/contentImages/challenges; 
mkdir ${PROJECT_ROOT}/../data/contentImages/entries; 
mkdir ${PROJECT_ROOT}/../data/contentImages/users; 
mkdir ${PROJECT_ROOT}/../data/contentImages/designs; 
mkdir ${PROJECT_ROOT}/../data/db; 
mkdir ${PROJECT_ROOT}/../public; 
mkdir ${PROJECT_ROOT}/../public/js; 
mkdir ${PROJECT_ROOT}/../public/css; 
ln -s ${PROJECT_ROOT}/../data/contentImages ${PROJECT_ROOT}/../public/contentImages; 
ln -s ${PROJECT_ROOT}/../delphinus/src/client/web/public/images/designs ${PROJECT_ROOT}/../public/designImages; 
ln -s ${PROJECT_ROOT}/../data/cacheImages ${PROJECT_ROOT}/../public/cacheImages; 
ln -s ${PROJECT_ROOT}/../delphinus/src/client/web/public/images ${PROJECT_ROOT}/../public/images; 
ln -s ${PROJECT_ROOT}/../delphinus/src/client/web/public/third-party ${PROJECT_ROOT}/../public/third-party;