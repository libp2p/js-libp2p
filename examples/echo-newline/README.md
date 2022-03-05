# Echo-newline example with libp2p

This is similar to the 'echo' example except that it also uses a newline character to signify an end of message.

Optionally pass in an `-insecure` cmd line param to use the 'Plaintext' channel.

It performs a simple echo from the listener to the dialer.

## Setup
1. Install the modules from libp2p root, `npm install`.
2. Open 2 terminal windows in the `./src` directory.

## Running
1. Run the listener in window 1, `node listener.js`
2. Run the dialer in window 2, `node dialer.js`
3. You should see console logs showing the dial, and the received echo of _hey_{index} five times
4. If you look at the listener window, you will see it receiving the dial
