#!/usr/bin/env bash

TEMP_DIR=`mktemp -d`

docker run -it $1 sh -c 'find /usr/src/app -type f | sort  | xargs -I{} sha512sum {}' > $TEMP_DIR/dockerfiles.first.txt
docker run -it $2 sh -c 'find /usr/src/app -type f | sort  | xargs -I{} sha512sum {}' > $TEMP_DIR/dockerfiles.second.txt

meld $TEMP_DIR/dockerfiles*
