'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

function startProcess (name, args = []) {
    return execa('node', [path.join(__dirname, name), ...args], {
        cwd: path.resolve(__dirname),
        all: true
    })
}

async function test () {
    let listenerOutput = ''
    let listenerAddr

    const listenerProcReady = pDefer()

    // Step 1, listener process
    process.stdout.write('listener.js\n')

    const listenerProc = startProcess('listener.js')
    listenerProc.all.on('data', async (data) => {
        process.stdout.write(data)

        listenerOutput += uint8ArrayToString(data)
        if (listenerOutput.includes('Listening on:') && listenerOutput.includes('/p2p/')) {
            listenerAddr = listenerOutput.trim().split('Listening on:\n')[1].split('\n')[0]
            //TODO What is the recommended way to paste `listenerAddr` into the `dialer.js`?
            listenerProcReady.resolve()
        }
    })

    await listenerProcReady.promise
    process.stdout.write('==================================================================\n')



    await Promise.all([
        listenerProc,
    ]).catch((err) => {
        if (err.signal !== 'SIGTERM') {
            throw err
        }
    })
}

module.exports = test
