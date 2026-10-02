#!/usr/bin/env -S sh -e -u

# Generate openapi.json before building docs

pnpx swagger-jsdoc -d openapiDef.yaml 'server/api/**/*' -o openapi.json
vitepress $1 docs
