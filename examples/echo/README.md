# Echo example with libp2p

This example performs a simple echo from the listener to the dialer.

## Setup
1. Install the modules from libp2p root, `npm install` and `npm run build`.
2. Open 2 terminal windows in the `./src` directory.

## Running
1. Run the listener in window 1, `node listener.js`
2. Run the dialer in window 2, `node dialer.js`
3. You should see console logs showing the dial, and the received echo of _hey_
4. If you look at the listener window, you will see it receiving the dial
