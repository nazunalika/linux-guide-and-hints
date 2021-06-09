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
RUN pip3 install -U --user -r requirements.txt
COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./
RUN make html SPHINXOPTS=-Ea

FROM alpine:edge

WORKDIR /app

COPY --from=builder /app/build/html .
