FROM node:alpine

WORKDIR /app

RUN apk --no-cache add \
    python3 \
    python3-dev \
    py3-setuptools \
    libc6-compat \
    build-base \
    automake \
    autoconf
RUN mkdir -p cert && touch cert/server.key && touch cert/server.crt && touch cert/ca.crt
RUN pip3 install -U sphinx
RUN npm install -g grunt
COPY . ./
RUN npm install
RUN make html SPHINXOPTS=-Ea
RUN grunt build
