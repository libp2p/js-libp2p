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
)

# Second tier - packages that depend on tier 1
TIER_2=(
    "interface-compliance-tests"
    "logger"
    "tcp"
)

# Third tier - everything else
TIER_3=(
    "webrtc"
    "webtransport"
    "upnp-nat"
)

publish_tier() {
    local tier=("$@")
    for pkg in "${tier[@]}"; do
        if [ -d "packages/$pkg" ]; then
            echo "Building and publishing @devlux76/$pkg..."
            cd "packages/$pkg"
            
            # Get version from package.json
            version=$(node -p "require('./package.json').version")
            
            # Check if already published
            if check_package_published "$pkg" "$version"; then
                echo "@devlux76/$pkg@$version already published, skipping..."
            else
                # First, link all local dependencies
                echo "Installing dependencies for @devlux76/$pkg..."
                for dep in ../*/; do
                    if [ -f "$dep/package.json" ]; then
                        dep_name=$(node -p "require('$dep/package.json').name")
                        if [[ $dep_name == @libp2p/* ]]; then
                            echo "Linking local dependency $dep_name..."
                            (cd "$dep" && npm link)
                            npm link "${dep_name//@libp2p/@devlux76}"
                        fi
                    fi
                done

                # Now install remaining dependencies
                npm install
                npm run build
                npm publish --registry https://npm.pkg.github.com
            fi
            cd ../..
        fi
    done
}

# First, build all packages
for pkg in packages/*/; do
    if [ -f "$pkg/package.json" ]; then
        echo "Building $pkg..."
        (cd "$pkg" && npm install && npm run build)
    fi
done

echo "Publishing Tier 1 packages..."
publish_tier "${TIER_1[@]}"

echo "Publishing Tier 2 packages..."
publish_tier "${TIER_2[@]}"

echo "Publishing Tier 3 packages..."
publish_tier "${TIER_3[@]}"