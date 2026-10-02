VERSION=$(npm pkg get version | xargs echo)
DATE=$(date "+%d %B %Y")
npm pkg set date="$DATE"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t cisti/gancio:"$VERSION" \
  -t cisti/gancio:beta \
  --push .

docker buildx build \
  --target artifact \
  --output type=local,dest=./releases \
  .

gpg --pinentry-mode loopback --passphrase `pass underscore/pgp`  --detach-sign --local-user 5DAC477D5441B7A15ACBF680BBEB4DD39AC6CCA9 "./releases/gancio-$VERSION.tgz"
mv ./releases/* "./docs/public/releases/"

# symlink the latest release to beta
rm -f "./docs/public/beta.tgz"
rm -f "./docs/public/beta.tgz.sig"
ln -s "./releases/gancio-$VERSION.tgz" "./docs/public/beta.tgz"
ln -s "./releases/gancio-$VERSION.tgz.sig" "./docs/public/beta.tgz.sig"

pnpm docs:build
rsync -avz docs/.vitepress/dist/ cisti.web:/var/www/gancio/
