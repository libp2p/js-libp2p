## [@libp2p/interface-v3.2.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v3.1.0...@libp2p/interface-v3.2.0) (2023-05-19)


### Features

* add start/stop events to libp2p interface ([#407](https://github.com/libp2p/js-libp2p-interfaces/issues/407)) ([016c1e8](https://github.com/libp2p/js-libp2p-interfaces/commit/016c1e82b060c93c80546cd8c493ec6e6c97cbec))

## [1.1.3](https://github.com/libp2p/js-libp2p/compare/interface-v1.1.2...interface-v1.1.3) (2024-02-07)


### Bug Fixes

* update patch versions of deps ([#2397](https://github.com/libp2p/js-libp2p/issues/2397)) ([0321812](https://github.com/libp2p/js-libp2p/commit/0321812e731515558f35ae2d53242035a343a21a))

## [1.1.2](https://github.com/libp2p/js-libp2p/compare/interface-v1.1.1...interface-v1.1.2) (2024-01-16)


### Bug Fixes

* align dependency versions and update project config ([#2357](https://github.com/libp2p/js-libp2p/issues/2357)) ([8bbd436](https://github.com/libp2p/js-libp2p/commit/8bbd43628343f995804eea3102d0571ddcebc5c4))
* mark all packages side-effect free ([#2360](https://github.com/libp2p/js-libp2p/issues/2360)) ([3c96210](https://github.com/libp2p/js-libp2p/commit/3c96210cf6343b21199996918bae3a0f60220046))

## [1.1.1](https://github.com/libp2p/js-libp2p/compare/interface-v1.1.0...interface-v1.1.1) (2024-01-06)


### Bug Fixes

* remove extra deps ([#2340](https://github.com/libp2p/js-libp2p/issues/2340)) ([53e83ee](https://github.com/libp2p/js-libp2p/commit/53e83eea50410391ec9cff4cd8097210b93894ff))
* replace p-queue with less restrictive queue ([#2339](https://github.com/libp2p/js-libp2p/issues/2339)) ([528d737](https://github.com/libp2p/js-libp2p/commit/528d73781f416ea97af044bb49d9701f97c9eeec))

## [1.1.0](https://github.com/libp2p/js-libp2p/compare/interface-v1.0.2...interface-v1.1.0) (2023-12-28)


### Features

* add `negotiateFully` option when opening streams ([#2331](https://github.com/libp2p/js-libp2p/issues/2331)) ([5d1f68e](https://github.com/libp2p/js-libp2p/commit/5d1f68e9257820c34aec07cf5c94b8f71ed8a69e))


### Bug Fixes

* make peerid optional in peerid.equals ([#2335](https://github.com/libp2p/js-libp2p/issues/2335)) ([f1c1167](https://github.com/libp2p/js-libp2p/commit/f1c116746ab82b15b93a7875ed1b05861b8c0d32))

## [1.0.2](https://github.com/libp2p/js-libp2p/compare/interface-v1.0.1...interface-v1.0.2) (2023-12-10)


### Bug Fixes

* react native adjustments ([#2229](https://github.com/libp2p/js-libp2p/issues/2229)) ([3415811](https://github.com/libp2p/js-libp2p/commit/341581166fd5bd2ead6b9d9db1ffda84051b6262))

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/interface-v1.0.0...interface-v1.0.1) (2023-11-30)


### Bug Fixes

* add status property ([#2269](https://github.com/libp2p/js-libp2p/issues/2269)) ([a32e70b](https://github.com/libp2p/js-libp2p/commit/a32e70bac126a0746dff9f7c87a4d6211a00fa7a))
* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))

## [1.0.0](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.6...interface-v1.0.0) (2023-11-28)


### ⚠ BREAKING CHANGES

* the `minSendBytes` option has been removed from Mplex since the transport can now decide how to optimise sending data
* removed EventEmitter re-export - please use TypedEventEmitter instead
* imports from `libp2p/dcutr` now need to be from `@libp2p/dcutr`
* imports from `libp2p/identify` need to change to `@libp2p/identify`
* imports from `libp2p/upnp-nat` should be updated to `@libp2p/upnp-nat`
* the `isStarted` method has been removed from the `Startable` interface
* the `.protocols` property has been removed from the `PeerInfo` interface
* move autonat into separate package (#2107)
* remove libp2p.keychain (#2084)
* remove min/max from topologies (#2158)

### Features

* allow stream muxers and connection encrypters to yield lists ([#2256](https://www.github.com/libp2p/js-libp2p/issues/2256)) ([4a474d5](https://www.github.com/libp2p/js-libp2p/commit/4a474d54d3299e0ac30fa143b57436b3cf45e426))
* support streaming hashes for key sign/verify ([#2255](https://www.github.com/libp2p/js-libp2p/issues/2255)) ([ac7bc38](https://www.github.com/libp2p/js-libp2p/commit/ac7bc3839ae3d8253e9141c52be2c7c0c66a1d60))


### Bug Fixes

* allow keys to do sync sign/verify ([#2258](https://www.github.com/libp2p/js-libp2p/issues/2258)) ([dd7d17c](https://www.github.com/libp2p/js-libp2p/commit/dd7d17cc478dfcba02211a47789439b7d7ab9627))
* remove event emitter type from interfaces ([#2196](https://www.github.com/libp2p/js-libp2p/issues/2196)) ([f3ec538](https://www.github.com/libp2p/js-libp2p/commit/f3ec538451afe105a5a4513d66832965ad63debe))
* remove min/max from topologies ([#2158](https://www.github.com/libp2p/js-libp2p/issues/2158)) ([511359a](https://www.github.com/libp2p/js-libp2p/commit/511359a86235e7abe65887dce7262b34a53bad5a))
* remove protocols from PeerInfo ([#2166](https://www.github.com/libp2p/js-libp2p/issues/2166)) ([5468cd1](https://www.github.com/libp2p/js-libp2p/commit/5468cd13a76281e46b221fdbd7d4005c0d3f2252))


### Code Refactoring

* extract DCUtR into separate module ([#2220](https://www.github.com/libp2p/js-libp2p/issues/2220)) ([d2c3e72](https://www.github.com/libp2p/js-libp2p/commit/d2c3e7235b64558c6cace414c54a42659fee2970))
* extract identify service into separate module ([#2219](https://www.github.com/libp2p/js-libp2p/issues/2219)) ([72c2f77](https://www.github.com/libp2p/js-libp2p/commit/72c2f775bd85bd4928048dda0fd14740d6fb6a69))
* extract UPnP NAT into separate module ([#2217](https://www.github.com/libp2p/js-libp2p/issues/2217)) ([f29b73f](https://www.github.com/libp2p/js-libp2p/commit/f29b73f781afcea36cba0589aafdd81e1852e194))
* move autonat into separate package ([#2107](https://www.github.com/libp2p/js-libp2p/issues/2107)) ([b0e8f06](https://www.github.com/libp2p/js-libp2p/commit/b0e8f06f0dcdbda0e367186b093e42e8bff3ee27))
* remove isStarted method from Startable ([#2145](https://www.github.com/libp2p/js-libp2p/issues/2145)) ([fca208f](https://www.github.com/libp2p/js-libp2p/commit/fca208f3763af041aa37b1cb915d2bc777acb96d))
* remove libp2p.keychain ([#2084](https://www.github.com/libp2p/js-libp2p/issues/2084)) ([125c84b](https://www.github.com/libp2p/js-libp2p/commit/125c84bb8a30ac986fb5aed0a4de23bc806d3aea))

### [0.1.6](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.5...interface-v0.1.6) (2023-11-07)


### Features

* add component logger ([#2198](https://www.github.com/libp2p/js-libp2p/issues/2198)) ([fb8a6f1](https://www.github.com/libp2p/js-libp2p/commit/fb8a6f1887e71852217355f65c2b22566dd26749)), closes [#2105](https://www.github.com/libp2p/js-libp2p/issues/2105)

### [0.1.5](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.4...interface-v0.1.5) (2023-11-03)


### Bug Fixes

* opt-in to toplogy notifications on transient connections ([#2049](https://www.github.com/libp2p/js-libp2p/issues/2049)) ([346ff5a](https://www.github.com/libp2p/js-libp2p/commit/346ff5a2b81bded9f9b26051501ab9d25246961c))

### [0.1.4](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.3...interface-v0.1.4) (2023-10-25)


### Bug Fixes

* rename event emitter class ([#2173](https://www.github.com/libp2p/js-libp2p/issues/2173)) ([50f912c](https://www.github.com/libp2p/js-libp2p/commit/50f912c2608caecc09acbcb0f46b4df4af073080))
* revert "refactor: rename event emitter class" ([#2172](https://www.github.com/libp2p/js-libp2p/issues/2172)) ([0ef5f7f](https://www.github.com/libp2p/js-libp2p/commit/0ef5f7f62d9c6d822e0a4b99cc203a1516b11f2f))

### [0.1.3](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.2...interface-v0.1.3) (2023-10-06)


### Bug Fixes

* close webrtc streams without data loss ([#2073](https://www.github.com/libp2p/js-libp2p/issues/2073)) ([7d8b155](https://www.github.com/libp2p/js-libp2p/commit/7d8b15517a480e01a8ebd427ab0093509b78d5b0))

### [0.1.2](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.1...interface-v0.1.2) (2023-08-14)


### Bug Fixes

* remove stream add/remove methods from connection interface ([#1912](https://www.github.com/libp2p/js-libp2p/issues/1912)) ([e26848b](https://www.github.com/libp2p/js-libp2p/commit/e26848b06e77bfcff4063139c9ed816f37f05cb6))
* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))

### [0.1.1](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.1.0...interface-v0.1.1) (2023-08-05)


### Bug Fixes

* do not send duplicate close read/write ([#1935](https://www.github.com/libp2p/js-libp2p/issues/1935)) ([446fff8](https://www.github.com/libp2p/js-libp2p/commit/446fff878477c771634578f0a8e84737aad3d4d3))

## [0.1.0](https://www.github.com/libp2p/js-libp2p/compare/interface-v0.0.1...interface-v0.1.0) (2023-07-31)


### ⚠ BREAKING CHANGES

* the `.close`, `closeRead` and `closeWrite` methods on the `Stream` interface are now asynchronous
* `stream.stat.*` and `conn.stat.*` properties are now accessed via `stream.*` and `conn.*`
* consolidate interface modules (#1833)

### Features

* mark connections with limits as transient ([#1890](https://www.github.com/libp2p/js-libp2p/issues/1890)) ([a1ec46b](https://www.github.com/libp2p/js-libp2p/commit/a1ec46b5f5606b7bdf3e5b085013fb88e26439f9))
* merge stat properties into stream/connection objects ([#1856](https://www.github.com/libp2p/js-libp2p/issues/1856)) ([e9cafd3](https://www.github.com/libp2p/js-libp2p/commit/e9cafd3d8ab0f8e0655ff44e04aa41fccc912b51)), closes [#1849](https://www.github.com/libp2p/js-libp2p/issues/1849)


### Bug Fixes

* add pubsub interfaces to @libp2p/interface ([#1857](https://www.github.com/libp2p/js-libp2p/issues/1857)) ([2e561fe](https://www.github.com/libp2p/js-libp2p/commit/2e561fe9d2d3a4e7c38bd0bf4baf41978c4d9438))
* close streams gracefully ([#1864](https://www.github.com/libp2p/js-libp2p/issues/1864)) ([b36ec7f](https://www.github.com/libp2p/js-libp2p/commit/b36ec7f24e477af21cec31effc086a6c611bf271)), closes [#1793](https://www.github.com/libp2p/js-libp2p/issues/1793) [#656](https://www.github.com/libp2p/js-libp2p/issues/656)
* consolidate interface modules ([#1833](https://www.github.com/libp2p/js-libp2p/issues/1833)) ([4255b1e](https://www.github.com/libp2p/js-libp2p/commit/4255b1e2485d31e00c33efa029b6426246ea23e3))

## [@libp2p/interface-v3.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v3.0.1...@libp2p/interface-v3.1.0) (2023-05-05)


### Features

* add peer:identify event to libp2p ([#395](https://github.com/libp2p/js-libp2p-interfaces/issues/395)) ([6aee82a](https://github.com/libp2p/js-libp2p-interfaces/commit/6aee82ad81a752f204ec27838ccd6de4908aeb0e))

## [@libp2p/interface-v3.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v3.0.0...@libp2p/interface-v3.0.1) (2023-05-04)


### Dependencies

* bump aegir from 38.1.8 to 39.0.5 ([#393](https://github.com/libp2p/js-libp2p-interfaces/issues/393)) ([31f3797](https://github.com/libp2p/js-libp2p-interfaces/commit/31f3797b24f7c23f3f16e9db3a230bd5f7cd5175))

## [@libp2p/interface-v3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v2.0.0...@libp2p/interface-v3.0.0) (2023-04-27)


### ⚠ BREAKING CHANGES

* pubsub, dht, ping, fetch and identify have been removed - re-enable these by passing them as services

### Features

* allow user defined services ([#375](https://github.com/libp2p/js-libp2p-interfaces/issues/375)) ([13cf442](https://github.com/libp2p/js-libp2p-interfaces/commit/13cf442ff29acbe28cf75431dee02bfefd9a4e40))


### Documentation

* fix typos in docs ([#386](https://github.com/libp2p/js-libp2p-interfaces/issues/386)) ([8ec2cdc](https://github.com/libp2p/js-libp2p-interfaces/commit/8ec2cdcc5deed76e0c673a75c27bf7a2e931eea1))

## [@libp2p/interface-v2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.3.2...@libp2p/interface-v2.0.0) (2023-04-21)


### ⚠ BREAKING CHANGES

* add libp2p events (#373)

### Features

* add libp2p events ([#373](https://github.com/libp2p/js-libp2p-interfaces/issues/373)) ([071c718](https://github.com/libp2p/js-libp2p-interfaces/commit/071c718808902858818ca86167b51b242b67a5a5))


### Dependencies

* update sibling dependencies ([17ed429](https://github.com/libp2p/js-libp2p-interfaces/commit/17ed429d57e83cb38484ac52a0e0975a7d8af963))
* update sibling dependencies ([4421374](https://github.com/libp2p/js-libp2p-interfaces/commit/4421374d85ac7d4e9cf0b1a4c5072e881e091b31))

## [@libp2p/interface-v1.3.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.3.1...@libp2p/interface-v1.3.2) (2023-04-21)


### Dependencies

* update sibling dependencies ([bc1588c](https://github.com/libp2p/js-libp2p-interfaces/commit/bc1588c70ffa35c1ba9c954090a7ac8087a22b0c))

## [@libp2p/interface-v1.3.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.3.0...@libp2p/interface-v1.3.1) (2023-04-18)


### Dependencies

* update sibling dependencies ([3d23367](https://github.com/libp2p/js-libp2p-interfaces/commit/3d233676a17299bfa1b59d309543598176826523))
* update sibling dependencies ([2f52a28](https://github.com/libp2p/js-libp2p-interfaces/commit/2f52a284b59c0a88b040f86da1f5d3f044727f2c))

## [@libp2p/interface-v1.3.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.2.0...@libp2p/interface-v1.3.0) (2023-04-17)


### Features

* expose dial queue inspection method ([#374](https://github.com/libp2p/js-libp2p-interfaces/issues/374)) ([973263f](https://github.com/libp2p/js-libp2p-interfaces/commit/973263f582d39a5b727c9fd90abeea7ed72a9aff))

## [@libp2p/interface-v1.2.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.1.2...@libp2p/interface-v1.2.0) (2023-04-11)


### Features

* support batch dialling ([#351](https://github.com/libp2p/js-libp2p-interfaces/issues/351)) ([e46b72b](https://github.com/libp2p/js-libp2p-interfaces/commit/e46b72b1731ff935a1f0d755cbaf6f3159060ed3))


### Dependencies

* update sibling dependencies ([b034810](https://github.com/libp2p/js-libp2p-interfaces/commit/b0348102e41dc18166e70063f4708a2b3544f4b6))

## [@libp2p/interface-v1.1.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.1.1...@libp2p/interface-v1.1.2) (2023-03-17)


### Dependencies

* update @multiformats/multiaddr to 12.0.0 ([#354](https://github.com/libp2p/js-libp2p-interfaces/issues/354)) ([e0f327b](https://github.com/libp2p/js-libp2p-interfaces/commit/e0f327b5d54e240feabadce21a841629d633ec5e))

## [@libp2p/interface-v1.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.1.0...@libp2p/interface-v1.1.1) (2023-01-18)


### Dependencies

* bump aegir from 37.12.1 to 38.1.0 ([#335](https://github.com/libp2p/js-libp2p-interfaces/issues/335)) ([7368a36](https://github.com/libp2p/js-libp2p-interfaces/commit/7368a363423a08e8fa247dcb76ea13e4cf030d65))

## [@libp2p/interface-v1.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.0.2...@libp2p/interface-v1.1.0) (2023-01-07)


### Features

* add register and unregister methods to libp2p type ([#332](https://github.com/libp2p/js-libp2p-interfaces/issues/332)) ([e37c55a](https://github.com/libp2p/js-libp2p-interfaces/commit/e37c55a62b1b4a927996ca9ea2a311651640de7f))


### Trivial Changes

* remove lerna ([#330](https://github.com/libp2p/js-libp2p-interfaces/issues/330)) ([6678592](https://github.com/libp2p/js-libp2p-interfaces/commit/6678592dd0cf601a2671852f9d2a0aff5dee2b18))

## [@libp2p/interface-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.0.1...@libp2p/interface-v1.0.2) (2023-01-06)


### Dependencies

* update sibling dependencies ([acf0058](https://github.com/libp2p/js-libp2p-interfaces/commit/acf0058696e343f3330e63e45a85a520424d0bd8))
* update sibling dependencies ([29515c6](https://github.com/libp2p/js-libp2p-interfaces/commit/29515c65f84203cdbdd5f5562acc0e8cbbda6664))
* update sibling dependencies ([b599221](https://github.com/libp2p/js-libp2p-interfaces/commit/b599221d9044a0c573bac40c57e70a842930b253))
* update sibling dependencies ([b50e621](https://github.com/libp2p/js-libp2p-interfaces/commit/b50e621d31a8b32affc3fadb9f97c4883d577f93))

## [@libp2p/interface-v1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-v1.0.0...@libp2p/interface-v1.0.1) (2022-12-21)


### Bug Fixes

* add getProtocols method, events, and identify service ([#326](https://github.com/libp2p/js-libp2p-interfaces/issues/326)) ([b036505](https://github.com/libp2p/js-libp2p-interfaces/commit/b036505100d32742065190e47d1803cbd8f61f4a))

## @libp2p/interface-v1.0.0 (2022-12-19)


### Features

* add libp2p interface ([#325](https://github.com/libp2p/js-libp2p-interfaces/issues/325)) ([79a474d](https://github.com/libp2p/js-libp2p-interfaces/commit/79a474d8eda95ad3ff3bcdb2a15bfcf778f51772))

## [@libp2p/interface-metrics-v4.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.3...@libp2p/interface-metrics-v4.0.4) (2022-12-16)


### Documentation

* update project config ([#323](https://github.com/libp2p/js-libp2p-interfaces/issues/323)) ([0fc6a08](https://github.com/libp2p/js-libp2p-interfaces/commit/0fc6a08e9cdcefe361fe325281a3a2a03759ff59))

## [@libp2p/interface-metrics-v4.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.2...@libp2p/interface-metrics-v4.0.3) (2022-12-14)


### Bug Fixes

* generate docs for all packages ([#321](https://github.com/libp2p/js-libp2p-interfaces/issues/321)) ([b6f8b32](https://github.com/libp2p/js-libp2p-interfaces/commit/b6f8b32a920c15a28fe021e6050e31aaae89d518))

## [@libp2p/interface-metrics-v4.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.1...@libp2p/interface-metrics-v4.0.2) (2022-11-05)


### Bug Fixes

* metrics only need numbers ([#312](https://github.com/libp2p/js-libp2p-interfaces/issues/312)) ([0076c1f](https://github.com/libp2p/js-libp2p-interfaces/commit/0076c1f354ebc1106b6ac42d48688c0209866084))

## [@libp2p/interface-metrics-v4.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v4.0.0...@libp2p/interface-metrics-v4.0.1) (2022-11-05)


### Bug Fixes

* update project config ([#311](https://github.com/libp2p/js-libp2p-interfaces/issues/311)) ([27dd0ce](https://github.com/libp2p/js-libp2p-interfaces/commit/27dd0ce3c249892ac69cbb24ddaf0b9f32385e37))

## [@libp2p/interface-metrics-v4.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v3.0.0...@libp2p/interface-metrics-v4.0.0) (2022-11-05)


### ⚠ BREAKING CHANGES

* the global/per-peer moving average tracking has been removed from the interface as it's expensive and requires lots of timers - this functionality can be replicated by implementations if it's desirable.  It's better to have simple counters instead and let an external system like Prometheus or Graphana calculate the values over time

### Features

* return metrics objects from register instead of updating with an options object ([#310](https://github.com/libp2p/js-libp2p-interfaces/issues/310)) ([3b106ce](https://github.com/libp2p/js-libp2p-interfaces/commit/3b106ce799b5d84a82a66238995e09970ed8116c))

## [@libp2p/interface-metrics-v3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v2.0.0...@libp2p/interface-metrics-v3.0.0) (2022-08-07)


### ⚠ BREAKING CHANGES

* change stream muxer interface (#279)

### Features

* change stream muxer interface ([#279](https://github.com/libp2p/js-libp2p-interfaces/issues/279)) ([1ebe269](https://github.com/libp2p/js-libp2p-interfaces/commit/1ebe26988b6a286f36a4fc5177f502cfb60368a1))


### Trivial Changes

* update project config ([#271](https://github.com/libp2p/js-libp2p-interfaces/issues/271)) ([59c0bf5](https://github.com/libp2p/js-libp2p-interfaces/commit/59c0bf5e0b05496fca2e4902632b61bb41fad9e9))

## [@libp2p/interface-metrics-v2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.3...@libp2p/interface-metrics-v2.0.0) (2022-07-01)


### ⚠ BREAKING CHANGES

* the return type of `metrics.getComponentMetrics` has been changed to include optional labels/help text and also is now a function that returns a single or group value

### Features

* add metrics groups ([#267](https://github.com/libp2p/js-libp2p-interfaces/issues/267)) ([b9d898a](https://github.com/libp2p/js-libp2p-interfaces/commit/b9d898abdb551ebe2e0e961ec325d5e6abcf4fab)), closes [#257](https://github.com/libp2p/js-libp2p-interfaces/issues/257) [#258](https://github.com/libp2p/js-libp2p-interfaces/issues/258)

## [@libp2p/interface-metrics-v1.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.2...@libp2p/interface-metrics-v1.0.3) (2022-06-27)


### Trivial Changes

* update deps ([#262](https://github.com/libp2p/js-libp2p-interfaces/issues/262)) ([51edf7d](https://github.com/libp2p/js-libp2p-interfaces/commit/51edf7d9b3765a6f75c915b1483ea345d0133a41))

## [@libp2p/interface-metrics-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.1...@libp2p/interface-metrics-v1.0.2) (2022-06-14)


### Trivial Changes

* update aegir ([#234](https://github.com/libp2p/js-libp2p-interfaces/issues/234)) ([3e03895](https://github.com/libp2p/js-libp2p-interfaces/commit/3e038959ecab6cfa3585df9ee179c0af7a61eda5))

## [@libp2p/interface-metrics-v1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-metrics-v1.0.0...@libp2p/interface-metrics-v1.0.1) (2022-06-14)


### Trivial Changes

* update readmes ([#233](https://github.com/libp2p/js-libp2p-interfaces/issues/233)) ([ee7da38](https://github.com/libp2p/js-libp2p-interfaces/commit/ee7da38dccc08160d26c8436df8739ce7e0b340e))

## @libp2p/interface-metrics-v1.0.0 (2022-06-14)


### ⚠ BREAKING CHANGES

* most modules have been split out of the `@libp2p/interfaces` and `@libp2p/interface-compliance-tests` packages

### Trivial Changes

* break modules apart ([#232](https://github.com/libp2p/js-libp2p-interfaces/issues/232)) ([385614e](https://github.com/libp2p/js-libp2p-interfaces/commit/385614e772329052ab17415c8bd421f65b01a61b)), closes [#226](https://github.com/libp2p/js-libp2p-interfaces/issues/226)
