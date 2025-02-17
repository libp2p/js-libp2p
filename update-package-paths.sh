#!/bin/bash

# Exit on any error
set -e

# Create a temporary array of all package names
PACKAGES=()
for pkg in packages/*/package.json; do
    name=$(jq -r '.name' "$pkg" | sed 's/@libp2p\///')
    PACKAGES+=("$name")
done

for pkg in packages/*/package.json; do
    echo "Processing $pkg..."
    
    # Update the package name to use your scope
    sed -i 's/"@libp2p\//"@devlux76\//g' "$pkg" || exit 1
    
    # Update repository URL
    sed -i 's|"url": "git+https://github.com/libp2p/js-libp2p|"url": "git+https://github.com/devlux76/js-libp2p|g' "$pkg" || exit 1
    
    # Only update dependencies that are internal packages
    for internal_pkg in "${PACKAGES[@]}"; do
        escaped_pkg=$(echo "$internal_pkg" | sed 's/[\/&]/\\&/g')
        sed -i "s/\"@libp2p\/${escaped_pkg}/\"@devlux76\/${escaped_pkg}/g" "$pkg" || exit 1
    done
done