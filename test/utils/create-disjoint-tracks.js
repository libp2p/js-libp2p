'use strict'

const {
  convertPeerId,
  sortClosestPeers
} = require('../../src/utils')

/*
 * Given an array of peerInfos, decide on a target, start peers, and
 * "next", a successor function for the query to use. See comment
 * where this is called for details.
 */
async function createDisjointTracks (peerInfos, goodLength) {
  const ids = peerInfos.map((info) => info.id)
  const us = ids[0]

  const ourId = await convertPeerId(us)
  let sorted = await sortClosestPeers(ids, ourId)

  const target = sorted[sorted.length - 1]
  sorted = sorted.slice(1) // remove our id
  const goodTrack = sorted.slice(0, goodLength)
  goodTrack.push(target) // push on target
  const badTrack = sorted.slice(goodLength, -1)

  if (badTrack.length <= goodTrack.length) {
    throw new Error(`insufficient number of peers; good length: ${goodTrack.length}, bad length: ${badTrack.length}`)
  }

  const tracks = [goodTrack, badTrack] // array of arrays of nodes
  const next = (peer, trackNum) => {
    const track = tracks[trackNum]
    const pos = track.indexOf(peer)
    if (pos < 0) {
      return null // peer not on expected track
    }

    const nextPos = pos + 1
    // if we're at the end of the track
    if (nextPos === track.length) {
      if (trackNum === 0) { // good track; pathComplete
        return {
          end: true,
          pathComplete: true
        }
      } else { // bad track; dead end
        return {
          end: true,
          closerPeers: []
        }
      }
    } else {
      const infoIdx = ids.indexOf(track[nextPos])
      return {
        closerPeers: [peerInfos[infoIdx]]
      }
    }
  }

  return {
    targetId: target.id,
    starts: [goodTrack[0], badTrack[0]],
    getResponse: next
  }
}

module.exports = createDisjointTracks
