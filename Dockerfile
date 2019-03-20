FROM alpine:edge AS builder

WORKDIR /app

RUN apk --no-cache add \
    python3 \
    python3-dev \
    py3-setuptools \
    libc6-compat \
    build-base \
    automake \
    autoconf \
    http-parser \
    npm
RUN mkdir -p cert && touch cert/server.key && touch cert/server.crt && touch cert/ca.crt
RUN pip3 install -U sphinx sphinx-sitemap
RUN npm install -g grunt
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./
RUN make html SPHINXOPTS=-Ea
RUN grunt build

FROM alpine:edge

WORKDIR /app

COPY --from=builder /app/build/html .
