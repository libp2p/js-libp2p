'use strict'

import path from 'path'
import execa from 'execa'
import pDefer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const stdout = [
  {
    topic: 'banana',
    messageCount: 2
  },
  {
    topic: 'apple',
    messageCount: 2
  },
  {
    topic: 'car',
    messageCount: 0
  },
  {
    topic: 'orange',
    messageCount: 2
  },
]

async function test () {
  const defer = pDefer()
  let topicCount = 0
  let topicMessageCount = 0

  process.stdout.write('message-filtering/1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    // End
    if (topicCount === stdout.length) {
      defer.resolve()
      proc.all.removeAllListeners('data')
    }

    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (stdout[topicCount] && line.includes(stdout[topicCount].topic)) {
      // Validate previous number of messages
      if (topicCount > 0 && topicMessageCount > stdout[topicCount - 1].messageCount) {
        defer.reject()
        throw new Error(`topic ${stdout[topicCount - 1].topic} had ${topicMessageCount} messages instead of ${stdout[topicCount - 1].messageCount}`)
      }

      topicCount++
      topicMessageCount = 0
    } else {
      topicMessageCount++
    }
  })

  await defer.promise
  proc.kill()
}

module.exports = test
