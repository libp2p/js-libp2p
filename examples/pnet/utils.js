'use strict'
const fs from 'fs')
import path from 'path'

/**
 * mkdirp recursively creates needed folders for the given dir path
 * @param {string} dir
 * @returns {string} The path that was created
 */
module.exports.mkdirp = (dir) => {
  return path
    .resolve(dir)
    .split(path.sep)
    .reduce((acc, cur) => {
      const currentPath = path.normalize(acc + path.sep + cur)

      try {
        fs.statSync(currentPath)
      } catch (e) {
        if (e.code === 'ENOENT') {
          fs.mkdirSync(currentPath)
        } else {
          throw e
        }
      }
      return currentPath
    }, '')
}
