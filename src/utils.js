'use strict'

const multihashing = require('multihashing')
const path = require('path')
const fs = require('fs')

const URL = global.window && (window.URL || window.webkitURL)

// Hashes a key
exports.keyHash = (bytes) => {
  return multihashing(bytes, 'sha2-256')
}

const toBlob = (content) => {
  try {
    let blob
    try {
      // BlobBuilder = Deprecated, but widely implemented
      const BlobBuilder = global.window &&
              (window.BlobBuilder ||
              window.WebKitBlobBuilder ||
              window.MozBlobBuilder ||
              window.MSBlobBuilder)

      blob = new BlobBuilder()
      blob.append(content)
      blob = blob.getBlob()
    } catch (e) {
      // The proposed API
      blob = new window.Blob([content])
    }
    return URL.createObjectURL(blob)
  } catch (e) {
    return 'data:application/javascript,' + encodeURIComponent(content)
  }
}

const rawScript = fs.readFileSync(path.join(__dirname, '../vendor/prime.worker.js'))

exports.workerScript = toBlob(rawScript.toString())
