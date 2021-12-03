const pipe = require("it-pipe");
const merge = require("it-merge");
const filter = require("it-filter");
const first = require("it-first");

async function findPeer() {
  throw Error("foo");
}

async function main() {
  try {
    const output = await pipe(
      merge(
        ...[undefined].map(router =>
          (async function* () {
            try {
              yield [await findPeer()];
            } catch (err) {
              yield undefined;
            }
          })()
        )
      ),
      (source) => filter(source, Boolean),
      // @ts-ignore findPeer resolves a Promise
      // (source) => storeAddresses(source, this._peerStore),
      (source) => first(source)
    );

    console.log(output)
  } catch (err) {
    console.log(`caught error`, err);
  }
}

main();
