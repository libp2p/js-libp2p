#!/bin/bash

set -e

# Function to check if a package has been published
check_package_published() {
    local pkg_name=$1
    local pkg_version=$2
    npm view "@devlux76/$pkg_name@$pkg_version" version >/dev/null 2>&1
    return $?
}

# First tier - packages with no internal dependencies
TIER_1=(
    "crypto"
    "interface"
    "interface-internal"
    "peer-id"
    "utils"
    "logger"
)

# Second tier - packages that depend only on tier 1
TIER_2=(
    "interface-compliance-tests"
    "keychain"
    "peer-collections"
    "peer-record"
    "record"
)

# Third tier - packages that depend on tier 1 and 2
TIER_3=(
    "config"
    "connection-encrypter-plaintext"
    "connection-encrypter-tls"
    "peer-store"
    "pnet"
    "transport-tcp"
    "transport-websockets"
)

# Fourth tier - everything else
TIER_4=(
    "transport-webrtc"
    "transport-webtransport"
    "upnp-nat"
    "protocol-ping"
    "pubsub"
    "pubsub-floodsub"
)

publish_tier() {
    local tier=("$@")
    local success=true

    for pkg in "${tier[@]}"; do
        if [ -d "packages/$pkg" ]; then
            echo "Processing @devlux76/$pkg..."
            pushd "packages/$pkg" >/dev/null
            
            # Get version from package.json
            version=$(node -p "require('./package.json').version")
            
            # Check if already published
            if check_package_published "$pkg" "$version"; then
                echo "@devlux76/$pkg@$version already published, skipping..."
                popd >/dev/null
                continue
            fi

            # Clean install and build
            echo "Installing dependencies for @devlux76/$pkg..."
            rm -rf node_modules package-lock.json
            if ! npm install --force; then
                echo "Failed to install dependencies for @devlux76/$pkg"
                success=false
                popd >/dev/null
                continue
            fi

            if ! npm run build; then
                echo "Failed to build @devlux76/$pkg"
                success=false
                popd >/dev/null
                continue
            fi

            # Publish
            echo "Publishing @devlux76/$pkg@$version..."
            if ! npm publish --registry https://npm.pkg.github.com --force; then
                echo "Failed to publish @devlux76/$pkg"
                success=false
                popd >/dev/null
                continue
            fi
            
            # Wait a bit to ensure the package is available
            sleep 10
            
            popd >/dev/null
        fi
    done

    return $([ "$success" = true ] && echo 0 || echo 1)
}

echo "Publishing Tier 1 packages..."
if ! publish_tier "${TIER_1[@]}"; then
    echo "Failed to publish some Tier 1 packages"
    exit 1
fi

echo "Publishing Tier 2 packages..."
if ! publish_tier "${TIER_2[@]}"; then
    echo "Failed to publish some Tier 2 packages"
    exit 1
fi

echo "Publishing Tier 3 packages..."
if ! publish_tier "${TIER_3[@]}"; then
    echo "Failed to publish some Tier 3 packages"
    exit 1
fi

echo "Publishing Tier 4 packages..."
if ! publish_tier "${TIER_4[@]}"; then
    echo "Failed to publish some Tier 4 packages"
    exit 1
fi