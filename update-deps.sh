#!/bin/bash

# Find all package.json files and use sed for the replacement
find . -name "package.json" -type f -exec sed -i -E 's/"@devlux76\/[^"]+"\s*:\s*"(@?latest|[0-9]+\.[0-9]+\.[0-9]+[^"]*)"/"@devlux76\/\1": "*"/g' {} +
