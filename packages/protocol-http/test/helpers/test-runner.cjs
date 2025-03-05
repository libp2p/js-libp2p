#!/usr/bin/env node

/**
 * Custom test runner for protocol-http with enhanced debugging
 * 
 * 🦆 Rubber Ducky says: "Module format mismatches can lead to confusing errors!"
 */

// Use CommonJS style requires to avoid ESM/CJS conflicts
const { spawn } = require('child_process')
const { resolve } = require('path')

// __dirname is automatically provided in CommonJS modules

// Set environment variables for testing
process.env.DEBUG = 'libp2p*,aegir*'
process.env.NODE_DEBUG = 'net,http,stream,event'
process.env.AEGIR_TEST_TIMEOUT = '60000' // Increase test timeout to 60 seconds
process.env.AEGIR_FAIL_FAST = 'true' // Stop on first error

// Run the test with all available output
console.log('🔍 Starting test with enhanced debugging')
console.log('📌 Environment variables:')
console.log(' - DEBUG:', process.env.DEBUG)
console.log(' - NODE_DEBUG:', process.env.NODE_DEBUG)
console.log(' - AEGIR_TEST_TIMEOUT:', process.env.AEGIR_TEST_TIMEOUT)

// Run mocha directly with additional options for debugging
const args = [
  '--timeout', '60000',
  '--bail', 
  '--reporter', 'spec',
  '--require', 'source-map-support/register',
  '--ui', 'bdd',
  '--experimental-specifier-resolution=node',
  '--no-warnings',
  '--loader=ts-node/esm',
  'test/index.spec.ts'
]

console.log('📋 Running test with:', 'mocha', args.join(' '))

const child = spawn('mocha', args, {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: resolve(__dirname, '../..')
})

child.on('exit', (code) => {
  console.log(`📊 Test exited with code ${code || 0}`)
  process.exit(code || 0)
})
