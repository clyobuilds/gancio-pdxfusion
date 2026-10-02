#!/usr/bin/env sh

# this script prepares the `.pack` folder used to:
# - build the docker image
# - pack the npm package

set -eu

ROOT_DIR="$(pwd)"
STAGING_DIR="$ROOT_DIR/.pack"

echo "Cleaning staging directory..."
rm -rf "$STAGING_DIR"

pnpm install --frozen-lockfile

# clean past artifacts
npx nuxi cleanup

# build web UI
npx nuxi build

# echo "Building webcomponent"
# pnpm build:wc

cp -R .output/ "$STAGING_DIR/"

echo "Copying static resources...(mail templates, rss template, opensearch template, i18n email locales)"
cp -ra ./server/static "$STAGING_DIR/server/static/"
cp -ra ./server/migrations "$STAGING_DIR/server/migrations/"
cp -ra ./plugins "$STAGING_DIR/plugins/"
cp -ra ./i18n "$STAGING_DIR/i18n/"

echo "Building CLI"
pnpm build:cli
cp .cli/index.js "$STAGING_DIR/server/gancio"

# not needed in the final package as npm will install it
rm -fr "$STAGING_DIR/server/node_modules"

cp .env.example "$STAGING_DIR/.env.example"
# cp docs/gancio.service "$STAGING_DIR/gancio.service"
