Floodsub Benchmarks
==========

Benchmark for the `libp2p-floodsub` implementation.

This simple benchmark calculates the number of messages we are able to send from one peer to another.

## Testing

For running the benchmarks, it is required to install the dependencies of the `libp2p-floodsub`. With those installed, you only need to run the `index.js` file as follows:

```sh
$ npm install
$ cd benchmarks
$ node index.js
publish and receive x 781 ops/sec ±11.96% (64 runs sampled)
```
