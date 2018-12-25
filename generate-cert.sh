#!/bin/bash

mkdir cert && cd cert

### Create ca.key, use a password phrase when asked
### Use "localhost.ssl" for hostname
openssl genrsa -aes128 -out ca.key 2048
openssl req -new -key ca.key -out ca.csr
openssl x509 -req -days 365 -in ca.csr -out ca.crt -signkey ca.key

### Create server certificate
openssl genrsa -aes128 -out server.key 2048
openssl req -new -key server.key -out server.csr

### Remove password from the certificate
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key

### Generate self-siged certificate
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
