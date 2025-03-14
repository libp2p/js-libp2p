#!/bin/bash

echo "Testing individual proto files..."
cd packages/protocol-http

# Test each proto file individually
for proto in src/protobuf/split/*.proto; do
  echo "Testing $proto..."
  npx protons $proto
  if [ $? -eq 0 ]; then
    echo "✅ Success: $proto compiles correctly"
  else
    echo "❌ Error: $proto failed to compile"
  fi
done
