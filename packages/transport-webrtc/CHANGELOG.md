## [2.0.10](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.9...v2.0.10) (2023-06-12)


### Bug Fixes

* add browser-to-browser test for bi-directional communication ([#172](https://github.com/libp2p/js-libp2p-webrtc/issues/172)) ([1ec3d8a](https://github.com/libp2p/js-libp2p-webrtc/commit/1ec3d8a8b611d5227f430037e2547fd86d115eaa))

### [3.1.5](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v3.1.4...webrtc-v3.1.5) (2023-08-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.3 to ^0.1.4
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.3 to ^4.0.4
    * @libp2p/websockets bumped from ^7.0.3 to ^7.0.4
    * libp2p bumped from ^0.46.4 to ^0.46.5

### [3.1.4](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v3.1.3...webrtc-v3.1.4) (2023-08-14)


### Bug Fixes

* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.1 to ^0.1.2
    * @libp2p/interface-internal bumped from ^0.1.2 to ^0.1.3
    * @libp2p/logger bumped from ^3.0.1 to ^3.0.2
    * @libp2p/peer-id bumped from ^3.0.1 to ^3.0.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.2 to ^4.0.3
    * @libp2p/peer-id-factory bumped from ^3.0.2 to ^3.0.3
    * @libp2p/websockets bumped from ^7.0.2 to ^7.0.3
    * libp2p bumped from ^0.46.3 to ^0.46.4

### [3.1.3](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v3.1.2...webrtc-v3.1.3) (2023-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.0 to ^0.1.1
    * @libp2p/interface-internal bumped from ^0.1.1 to ^0.1.2
    * @libp2p/logger bumped from ^3.0.0 to ^3.0.1
    * @libp2p/peer-id bumped from ^3.0.0 to ^3.0.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-id-factory bumped from ^3.0.1 to ^3.0.2
    * @libp2p/websockets bumped from ^7.0.1 to ^7.0.2
    * libp2p bumped from ^0.46.2 to ^0.46.3

### [3.1.2](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v3.1.1...webrtc-v3.1.2) (2023-08-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.0 to ^0.1.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.0 to ^3.0.1
    * @libp2p/websockets bumped from ^7.0.0 to ^7.0.1
    * libp2p bumped from ^0.46.1 to ^0.46.2

### [3.1.1](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v3.1.0...webrtc-v3.1.1) (2023-08-01)


### Bug Fixes

* update package config ([#1919](https://www.github.com/libp2p/js-libp2p/issues/1919)) ([8d49602](https://www.github.com/libp2p/js-libp2p/commit/8d49602fb6f0c906f1920d397ff28705bb0bc845))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * libp2p bumped from ^0.46.0 to ^0.46.1

## [3.1.0](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v3.0.0...webrtc-v3.1.0) (2023-07-31)


### Features

* add node.js/electron support for webrtc transport ([#1905](https://www.github.com/libp2p/js-libp2p/issues/1905)) ([72e81dc](https://www.github.com/libp2p/js-libp2p/commit/72e81dc1ab66fe0bbcafe3261ec20e2a28aaad5f))

## [3.0.0](https://www.github.com/libp2p/js-libp2p/compare/webrtc-v2.0.10...webrtc-v3.0.0) (2023-07-31)


### ⚠ BREAKING CHANGES

* the `.close`, `closeRead` and `closeWrite` methods on the `Stream` interface are now asynchronous
* `stream.stat.*` and `conn.stat.*` properties are now accessed via `stream.*` and `conn.*`
* consolidate interface modules (#1833)

### Features

* mark connections with limits as transient ([#1890](https://www.github.com/libp2p/js-libp2p/issues/1890)) ([a1ec46b](https://www.github.com/libp2p/js-libp2p/commit/a1ec46b5f5606b7bdf3e5b085013fb88e26439f9))
* merge stat properties into stream/connection objects ([#1856](https://www.github.com/libp2p/js-libp2p/issues/1856)) ([e9cafd3](https://www.github.com/libp2p/js-libp2p/commit/e9cafd3d8ab0f8e0655ff44e04aa41fccc912b51)), closes [#1849](https://www.github.com/libp2p/js-libp2p/issues/1849)


### Bug Fixes

* close streams gracefully ([#1864](https://www.github.com/libp2p/js-libp2p/issues/1864)) ([b36ec7f](https://www.github.com/libp2p/js-libp2p/commit/b36ec7f24e477af21cec31effc086a6c611bf271)), closes [#1793](https://www.github.com/libp2p/js-libp2p/issues/1793) [#656](https://www.github.com/libp2p/js-libp2p/issues/656)
* consolidate interface modules ([#1833](https://www.github.com/libp2p/js-libp2p/issues/1833)) ([4255b1e](https://www.github.com/libp2p/js-libp2p/commit/4255b1e2485d31e00c33efa029b6426246ea23e3))
* update max message size SDP attribute ([#1909](https://www.github.com/libp2p/js-libp2p/issues/1909)) ([e6a41f7](https://www.github.com/libp2p/js-libp2p/commit/e6a41f7e9b8c06babfdec9852f0e5355d3405fd0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ~0.0.1 to ^0.1.0
    * @libp2p/interface-internal bumped from ~0.0.1 to ^0.1.0
    * @libp2p/logger bumped from ^2.0.0 to ^3.0.0
    * @libp2p/peer-id bumped from ^2.0.0 to ^3.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^3.0.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^2.0.0 to ^3.0.0
    * @libp2p/websockets bumped from ^6.0.0 to ^7.0.0
    * libp2p bumped from ^0.45.0 to ^0.46.0

## [2.0.9](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.8...v2.0.9) (2023-06-12)


### Dependencies

* **dev:** bump delay from 5.0.0 to 6.0.0 ([#169](https://github.com/libp2p/js-libp2p-webrtc/issues/169)) ([104cbf0](https://github.com/libp2p/js-libp2p-webrtc/commit/104cbf0e2009961656cda530925089dc126b19a8))

## [2.0.8](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.7...v2.0.8) (2023-06-12)


### Tests

* add a test for large transfers ([#175](https://github.com/libp2p/js-libp2p-webrtc/issues/175)) ([0f60060](https://github.com/libp2p/js-libp2p-webrtc/commit/0f60060c9ceaf2bf2142df25f32174112edf6ec9))

## [2.0.7](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.6...v2.0.7) (2023-06-07)


### Tests

* actually run firefox tests on firefox ([#176](https://github.com/libp2p/js-libp2p-webrtc/issues/176)) ([386a607](https://github.com/libp2p/js-libp2p-webrtc/commit/386a6071923e6cb1d89c51b73dada306b7cc243f))

## [2.0.6](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.5...v2.0.6) (2023-06-04)


### Documentation

* update README.md example ([#178](https://github.com/libp2p/js-libp2p-webrtc/issues/178)) ([1264875](https://github.com/libp2p/js-libp2p-webrtc/commit/1264875ebd40b057e70aa47bebde45bfbe80facb))

## [2.0.5](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.4...v2.0.5) (2023-06-01)


### Bug Fixes

* Update splitAddr function to correctly parse multiaddrs ([#174](https://github.com/libp2p/js-libp2p-webrtc/issues/174)) ([22a7029](https://github.com/libp2p/js-libp2p-webrtc/commit/22a7029caab7601cfc1f1d1051bc218ebe4dfce0))

## [2.0.4](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.3...v2.0.4) (2023-05-17)


### Bug Fixes

* use abstract stream class from muxer interface module ([#165](https://github.com/libp2p/js-libp2p-webrtc/issues/165)) ([32f68de](https://github.com/libp2p/js-libp2p-webrtc/commit/32f68de455d2f0b136553aa41caf06adaf1f09d1)), closes [#164](https://github.com/libp2p/js-libp2p-webrtc/issues/164)

## [2.0.3](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.2...v2.0.3) (2023-05-17)


### Bug Fixes

* restrict message sizes to 16kb ([#147](https://github.com/libp2p/js-libp2p-webrtc/issues/147)) ([aca4422](https://github.com/libp2p/js-libp2p-webrtc/commit/aca4422f5d4b81576d8c3cc5531cef7b7491abd2)), closes [#144](https://github.com/libp2p/js-libp2p-webrtc/issues/144) [#158](https://github.com/libp2p/js-libp2p-webrtc/issues/158)

## [2.0.2](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.1...v2.0.2) (2023-05-15)


### Bug Fixes

* use transport manager getListeners to get listen addresses ([#166](https://github.com/libp2p/js-libp2p-webrtc/issues/166)) ([2e144f9](https://github.com/libp2p/js-libp2p-webrtc/commit/2e144f977a2025aa3adce1816d5f7d0dc3aaa477))

## [2.0.1](https://github.com/libp2p/js-libp2p-webrtc/compare/v2.0.0...v2.0.1) (2023-05-12)


### Bug Fixes

* remove protobuf-ts and split code into two folders ([#162](https://github.com/libp2p/js-libp2p-webrtc/issues/162)) ([64723a7](https://github.com/libp2p/js-libp2p-webrtc/commit/64723a726302edcdc7ec958a759c3c587a184d69))

## [2.0.0](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.2.0...v2.0.0) (2023-05-11)


### ⚠ BREAKING CHANGES

* must be used with libp2p@0.45.x

### Dependencies

* update all libp2p deps for compat with libp2p@0.45.x ([#160](https://github.com/libp2p/js-libp2p-webrtc/issues/160)) ([b20875d](https://github.com/libp2p/js-libp2p-webrtc/commit/b20875d9f73e5cad05376db2d1228363dd1bce7d))

## [1.2.0](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.11...v1.2.0) (2023-05-09)


### Features

* export metrics ([#71](https://github.com/libp2p/js-libp2p-webrtc/issues/71)) ([b3cb445](https://github.com/libp2p/js-libp2p-webrtc/commit/b3cb445e226d6d4ddba092cf961d6178d9a19ac1))

## [1.1.11](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.10...v1.1.11) (2023-05-06)


### Dependencies

* upgrade transport interface to 4.0.1 ([#150](https://github.com/libp2p/js-libp2p-webrtc/issues/150)) ([dc61fa2](https://github.com/libp2p/js-libp2p-webrtc/commit/dc61fa27a2f53568b1f3b320971de166b5b243f9))

## [1.1.10](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.9...v1.1.10) (2023-05-03)


### Bug Fixes

* Fetch local fingerprint from SDP ([#109](https://github.com/libp2p/js-libp2p-webrtc/issues/109)) ([3673d6c](https://github.com/libp2p/js-libp2p-webrtc/commit/3673d6c2637c21e488e684cdff4eedbb7f5b3692))

## [1.1.9](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.8...v1.1.9) (2023-04-26)


### Documentation

* update import in README example ([#141](https://github.com/libp2p/js-libp2p-webrtc/issues/141)) ([42275df](https://github.com/libp2p/js-libp2p-webrtc/commit/42275df0727cd729006cbf3fae300fc428c9ca51))

## [1.1.8](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.7...v1.1.8) (2023-04-25)


### Bug Fixes

* added peer connection state listener to emit closed events ([#134](https://github.com/libp2p/js-libp2p-webrtc/issues/134)) ([16e8503](https://github.com/libp2p/js-libp2p-webrtc/commit/16e85030e78ed9edb2ebecf81bac3ad33d622111)), closes [#138](https://github.com/libp2p/js-libp2p-webrtc/issues/138) [#138](https://github.com/libp2p/js-libp2p-webrtc/issues/138) [#138](https://github.com/libp2p/js-libp2p-webrtc/issues/138)

## [1.1.7](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.6...v1.1.7) (2023-04-24)


### Dependencies

* bump @libp2p/interface-peer-store from 1.2.9 to 2.0.0 ([#135](https://github.com/libp2p/js-libp2p-webrtc/issues/135)) ([2fc8399](https://github.com/libp2p/js-libp2p-webrtc/commit/2fc839912a65c310ca7c8935d1901cc56849a21d))

## [1.1.6](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.5...v1.1.6) (2023-04-21)


### Bug Fixes

* readme: Remove confusing section ([#122](https://github.com/libp2p/js-libp2p-webrtc/issues/122)) ([dc78154](https://github.com/libp2p/js-libp2p-webrtc/commit/dc781543b8175c6c40c6745029a4ba53587aef29))

## [1.1.5](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.4...v1.1.5) (2023-04-13)


### Dependencies

* bump it-pipe from 2.0.5 to 3.0.1 ([#111](https://github.com/libp2p/js-libp2p-webrtc/issues/111)) ([7e593a3](https://github.com/libp2p/js-libp2p-webrtc/commit/7e593a34b44b7a2cf4758df2218b3ba9ebacfce9))
* bump protons-runtime from 4.0.2 to 5.0.0 ([#117](https://github.com/libp2p/js-libp2p-webrtc/issues/117)) ([87cbb19](https://github.com/libp2p/js-libp2p-webrtc/commit/87cbb193e2a45642333498d9317ab17eb527d34d))
* **dev:** bump protons from 6.1.3 to 7.0.2 ([#119](https://github.com/libp2p/js-libp2p-webrtc/issues/119)) ([fd20f4f](https://github.com/libp2p/js-libp2p-webrtc/commit/fd20f4f7a182a8edca5a511fe747885d24a60652))

## [1.1.4](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.3...v1.1.4) (2023-04-13)


### Dependencies

* Update multiaddr to 12.1.1 and multiformats 11.0.2 ([#123](https://github.com/libp2p/js-libp2p-webrtc/issues/123)) ([e069784](https://github.com/libp2p/js-libp2p-webrtc/commit/e069784229f2495b3cebc2c2a85969f23f0e7acf))

## [1.1.3](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.2...v1.1.3) (2023-04-12)


### Dependencies

* bump @libp2p/interface-connection from 3.1.1 to 4.0.0 ([#124](https://github.com/libp2p/js-libp2p-webrtc/issues/124)) ([4146761](https://github.com/libp2p/js-libp2p-webrtc/commit/4146761226118268d510c8834f894083ba5408d3))

## [1.1.2](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.1...v1.1.2) (2023-04-11)


### Bug Fixes

* update multiaddr in webrtc connection to include webRTC ([#121](https://github.com/libp2p/js-libp2p-webrtc/issues/121)) ([6ea04db](https://github.com/libp2p/js-libp2p-webrtc/commit/6ea04db9800259963affcb3101ea542de79271c0))

## [1.1.1](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.1.0...v1.1.1) (2023-04-10)


### Dependencies

* bump it-pb-stream from 2.0.4 to 3.2.1 ([#118](https://github.com/libp2p/js-libp2p-webrtc/issues/118)) ([7e2ac67](https://github.com/libp2p/js-libp2p-webrtc/commit/7e2ac6795ea096b3cf5dc2c4077f6f39821e0502))

## [1.1.0](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.0.5...v1.1.0) (2023-04-07)


### Features

* Browser to Browser ([#90](https://github.com/libp2p/js-libp2p-webrtc/issues/90)) ([add5c46](https://github.com/libp2p/js-libp2p-webrtc/commit/add5c467a2d02058933e6e11751af0c850568eaf))

## [1.0.5](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.0.4...v1.0.5) (2023-03-30)


### Bug Fixes

* correction package.json exports types path ([#103](https://github.com/libp2p/js-libp2p-webrtc/issues/103)) ([c78851f](https://github.com/libp2p/js-libp2p-webrtc/commit/c78851fe71f6a6ca79a146a7022e818378ea6721))


### Trivial Changes

* replace err-code with CodeError ([#82](https://github.com/libp2p/js-libp2p-webrtc/issues/82)) ([cfa6494](https://github.com/libp2p/js-libp2p-webrtc/commit/cfa6494c43c4edb977e70abe81a260bf0e03de73))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([f0ae5e7](https://github.com/libp2p/js-libp2p-webrtc/commit/f0ae5e78a0469bd1129d7b242e4fb41f0b2ed49e))
* Update .github/workflows/semantic-pull-request.yml [skip ci] ([4c8806c](https://github.com/libp2p/js-libp2p-webrtc/commit/4c8806c6d2a1a8eff48f0e2248203d48bd84c065))

## [1.0.4](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.0.3...v1.0.4) (2023-02-22)


### Dependencies

* **dev:** bump aegir from 37.12.1 to 38.1.6 ([#94](https://github.com/libp2p/js-libp2p-webrtc/issues/94)) ([2ee8a5e](https://github.com/libp2p/js-libp2p-webrtc/commit/2ee8a5e4bb03377214ff3c12744c2e153a3f69b4))


### Trivial Changes

* Update .github/workflows/semantic-pull-request.yml [skip ci] ([7e0b1c0](https://github.com/libp2p/js-libp2p-webrtc/commit/7e0b1c00b28cae7249a506f06f18bf3537bf3476))

## [1.0.3](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.0.2...v1.0.3) (2023-01-30)


### Tests

* add stream transition test ([#72](https://github.com/libp2p/js-libp2p-webrtc/issues/72)) ([27ec3da](https://github.com/libp2p/js-libp2p-webrtc/commit/27ec3da4ef66cf07c1452c6f987cb55d313c1a03))

## [1.0.2](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.0.1...v1.0.2) (2023-01-04)


### Dependencies

* bump multiformats from 10.0.3 to 11.0.0 ([#70](https://github.com/libp2p/js-libp2p-webrtc/issues/70)) ([7dafe5a](https://github.com/libp2p/js-libp2p-webrtc/commit/7dafe5a126ca0ce2b6d887f6a84fabe55e36229d))

## [1.0.1](https://github.com/libp2p/js-libp2p-webrtc/compare/v1.0.0...v1.0.1) (2023-01-03)


### Bug Fixes

* remove uuid dependency ([#68](https://github.com/libp2p/js-libp2p-webrtc/issues/68)) ([fb14b88](https://github.com/libp2p/js-libp2p-webrtc/commit/fb14b880d1b1b278e1e826bb0d9939db358e6ccc))

## 1.0.0 (2022-12-13)


### Bug Fixes

* update project config ([#65](https://github.com/libp2p/js-libp2p-webrtc/issues/65)) ([09c33cc](https://github.com/libp2p/js-libp2p-webrtc/commit/09c33ccfff97059eab001e46a662467dea670ce1))


### Dependencies

* update libp2p to release version ([dbd0237](https://github.com/libp2p/js-libp2p-webrtc/commit/dbd0237e9f8500ac13948e3a35d912df257968a4))


### Trivial Changes

* Update .github/workflows/stale.yml [skip ci] ([43c70bc](https://github.com/libp2p/js-libp2p-webrtc/commit/43c70bcd3c63388ed44d76703ce9a32e51d9ef30))


### Documentation

* fix 'browser to server' build config ([#66](https://github.com/libp2p/js-libp2p-webrtc/issues/66)) ([b54132c](https://github.com/libp2p/js-libp2p-webrtc/commit/b54132cecac180f0577a1b7905f79b20207c3647))
