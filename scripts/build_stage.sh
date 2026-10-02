# #!/bin/bash
# VERSION=$(npm pkg get version | xargs echo)_$(git rev-parse --short HEAD)

# # 1. Build the main images
# buildah bud \
#   -t cisti/gancio:"$VERSION" \
#   -t cisti/gancio:stage \
#   .

# # 2. Extract the artifact using a mount (No need to run/create a container)
# # We build the 'artifact' stage and get a working container ID
# container=$(buildah from --target artifact .)
# mountpoint=$(buildah mount $container)

# # Copy the files directly from the mounted filesystem
# mkdir -p ./releases
# cp -R $mountpoint/. ./releases/

# # Cleanup
# buildah unmount $container
# buildah rm $container
# get the git version
VERSION=$(npm pkg get version | xargs echo)_$(git rev-parse --short HEAD)

echo "$VERSION"
podman build \
  -t cisti/gancio:"$VERSION" \
  -t cisti/gancio:stage \
  --load .

# docker buildx build \
#   --target artifact \
#   --output type=local,dest=./releases \
#   .
