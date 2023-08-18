## [@libp2p/interface-compliance-tests-v3.0.7](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.6...@libp2p/interface-compliance-tests-v3.0.7) (2023-05-04)


### Dependencies

* bump aegir from 38.1.8 to 39.0.5 ([#393](https://github.com/libp2p/js-libp2p-interfaces/issues/393)) ([31f3797](https://github.com/libp2p/js-libp2p-interfaces/commit/31f3797b24f7c23f3f16e9db3a230bd5f7cd5175))

### [4.0.4](https://www.github.com/libp2p/js-libp2p/compare/interface-compliance-tests-v4.0.3...interface-compliance-tests-v4.0.4) (2023-08-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.3 to ^0.1.4

### [4.0.3](https://www.github.com/libp2p/js-libp2p/compare/interface-compliance-tests-v4.0.2...interface-compliance-tests-v4.0.3) (2023-08-14)


### Bug Fixes

* remove stream add/remove methods from connection interface ([#1912](https://www.github.com/libp2p/js-libp2p/issues/1912)) ([e26848b](https://www.github.com/libp2p/js-libp2p/commit/e26848b06e77bfcff4063139c9ed816f37f05cb6))
* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.1 to ^0.1.2
    * @libp2p/interface-internal bumped from ^0.1.2 to ^0.1.3
    * @libp2p/logger bumped from ^3.0.1 to ^3.0.2
    * @libp2p/multistream-select bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-collections bumped from ^4.0.2 to ^4.0.3
    * @libp2p/peer-id bumped from ^3.0.1 to ^3.0.2
    * @libp2p/peer-id-factory bumped from ^3.0.2 to ^3.0.3

### [4.0.2](https://www.github.com/libp2p/js-libp2p/compare/interface-compliance-tests-v4.0.1...interface-compliance-tests-v4.0.2) (2023-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.0 to ^0.1.1
    * @libp2p/interface-internal bumped from ^0.1.1 to ^0.1.2
    * @libp2p/logger bumped from ^3.0.0 to ^3.0.1
    * @libp2p/multistream-select bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-collections bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-id bumped from ^3.0.0 to ^3.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.1 to ^3.0.2

### [4.0.1](https://www.github.com/libp2p/js-libp2p/compare/interface-compliance-tests-v4.0.0...interface-compliance-tests-v4.0.1) (2023-08-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.0 to ^0.1.1
    * @libp2p/peer-collections bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.0 to ^3.0.1

## [4.0.0](https://www.github.com/libp2p/js-libp2p/compare/interface-compliance-tests-v3.0.7...interface-compliance-tests-v4.0.0) (2023-07-31)


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


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ~0.0.1 to ^0.1.0
    * @libp2p/interface-internal bumped from ~0.0.1 to ^0.1.0
    * @libp2p/logger bumped from ^2.0.0 to ^3.0.0
    * @libp2p/multistream-select bumped from ^3.0.0 to ^4.0.0
    * @libp2p/peer-collections bumped from ^3.0.0 to ^4.0.0
    * @libp2p/peer-id bumped from ^2.0.0 to ^3.0.0
    * @libp2p/peer-id-factory bumped from ^2.0.0 to ^3.0.0

## [@libp2p/interface-compliance-tests-v3.0.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.5...@libp2p/interface-compliance-tests-v3.0.6) (2023-01-18)


### Trivial Changes

* remove lerna ([#330](https://github.com/libp2p/js-libp2p-interfaces/issues/330)) ([6678592](https://github.com/libp2p/js-libp2p-interfaces/commit/6678592dd0cf601a2671852f9d2a0aff5dee2b18))


### Dependencies

* bump aegir from 37.12.1 to 38.1.0 ([#335](https://github.com/libp2p/js-libp2p-interfaces/issues/335)) ([7368a36](https://github.com/libp2p/js-libp2p-interfaces/commit/7368a363423a08e8fa247dcb76ea13e4cf030d65))

## [@libp2p/interface-compliance-tests-v3.0.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.4...@libp2p/interface-compliance-tests-v3.0.5) (2022-12-16)


### Documentation

* update project config ([#323](https://github.com/libp2p/js-libp2p-interfaces/issues/323)) ([0fc6a08](https://github.com/libp2p/js-libp2p-interfaces/commit/0fc6a08e9cdcefe361fe325281a3a2a03759ff59))

## [@libp2p/interface-compliance-tests-v3.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.3...@libp2p/interface-compliance-tests-v3.0.4) (2022-12-14)


### Bug Fixes

* generate docs for all packages ([#321](https://github.com/libp2p/js-libp2p-interfaces/issues/321)) ([b6f8b32](https://github.com/libp2p/js-libp2p-interfaces/commit/b6f8b32a920c15a28fe021e6050e31aaae89d518))

## [@libp2p/interface-compliance-tests-v3.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.2...@libp2p/interface-compliance-tests-v3.0.3) (2022-11-05)


### Bug Fixes

* update project config ([#311](https://github.com/libp2p/js-libp2p-interfaces/issues/311)) ([27dd0ce](https://github.com/libp2p/js-libp2p-interfaces/commit/27dd0ce3c249892ac69cbb24ddaf0b9f32385e37))


### Trivial Changes

* update project config ([#271](https://github.com/libp2p/js-libp2p-interfaces/issues/271)) ([59c0bf5](https://github.com/libp2p/js-libp2p-interfaces/commit/59c0bf5e0b05496fca2e4902632b61bb41fad9e9))

## [@libp2p/interface-compliance-tests-v3.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.1...@libp2p/interface-compliance-tests-v3.0.2) (2022-06-27)


### Trivial Changes

* update deps ([#262](https://github.com/libp2p/js-libp2p-interfaces/issues/262)) ([51edf7d](https://github.com/libp2p/js-libp2p-interfaces/commit/51edf7d9b3765a6f75c915b1483ea345d0133a41))

## [@libp2p/interface-compliance-tests-v3.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v3.0.0...@libp2p/interface-compliance-tests-v3.0.1) (2022-06-14)


### Trivial Changes

* update readmes ([#233](https://github.com/libp2p/js-libp2p-interfaces/issues/233)) ([ee7da38](https://github.com/libp2p/js-libp2p-interfaces/commit/ee7da38dccc08160d26c8436df8739ce7e0b340e))

## [@libp2p/interface-compliance-tests-v3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v2.0.3...@libp2p/interface-compliance-tests-v3.0.0) (2022-06-14)


### ⚠ BREAKING CHANGES

* most modules have been split out of the `@libp2p/interfaces` and `@libp2p/interface-compliance-tests` packages

### Trivial Changes

* break modules apart ([#232](https://github.com/libp2p/js-libp2p-interfaces/issues/232)) ([385614e](https://github.com/libp2p/js-libp2p-interfaces/commit/385614e772329052ab17415c8bd421f65b01a61b)), closes [#226](https://github.com/libp2p/js-libp2p-interfaces/issues/226)

## [@libp2p/interface-compliance-tests-v2.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v2.0.2...@libp2p/interface-compliance-tests-v2.0.3) (2022-05-24)


### Bug Fixes

* only close muxed stream for reading ([#220](https://github.com/libp2p/js-libp2p-interfaces/issues/220)) ([f2f7141](https://github.com/libp2p/js-libp2p-interfaces/commit/f2f7141f01af715e600201ac9e7e52fbbb5c7e1b))

## [@libp2p/interface-compliance-tests-v2.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v2.0.1...@libp2p/interface-compliance-tests-v2.0.2) (2022-05-24)


### Bug Fixes

* accept abort options in connection.newStream ([#219](https://github.com/libp2p/js-libp2p-interfaces/issues/219)) ([8bfcbc9](https://github.com/libp2p/js-libp2p-interfaces/commit/8bfcbc9ee883336f213cdfc83e477549ca368df5))
* chunk data in mock muxer ([#218](https://github.com/libp2p/js-libp2p-interfaces/issues/218)) ([14604f6](https://github.com/libp2p/js-libp2p-interfaces/commit/14604f69a858bf8c16ce118420c5e49f3f5331ea))

## [@libp2p/interface-compliance-tests-v2.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v2.0.0...@libp2p/interface-compliance-tests-v2.0.1) (2022-05-23)


### Bug Fixes

* make stream return types synchronous ([#217](https://github.com/libp2p/js-libp2p-interfaces/issues/217)) ([2fe61b7](https://github.com/libp2p/js-libp2p-interfaces/commit/2fe61b7fbeda2e549edf095a927d623aa8eb476b))

## [@libp2p/interface-compliance-tests-v2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.34...@libp2p/interface-compliance-tests-v2.0.0) (2022-05-20)


### ⚠ BREAKING CHANGES

* This adds closeWrite and closeRead checks in the tests, which will cause test failures for muxers that don't implement those

### Bug Fixes

* close streams when connection is closed ([#214](https://github.com/libp2p/js-libp2p-interfaces/issues/214)) ([88fcd58](https://github.com/libp2p/js-libp2p-interfaces/commit/88fcd586276e03dd740c7095f05e21754ac1f3b5)), closes [#90](https://github.com/libp2p/js-libp2p-interfaces/issues/90)
* update interfaces ([#215](https://github.com/libp2p/js-libp2p-interfaces/issues/215)) ([72e6890](https://github.com/libp2p/js-libp2p-interfaces/commit/72e6890826dadbd6e7cbba5536bde350ca4286e6))

## [@libp2p/interface-compliance-tests-v1.1.34](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.33...@libp2p/interface-compliance-tests-v1.1.34) (2022-05-10)


### Trivial Changes

* **deps:** bump sinon from 13.0.2 to 14.0.0 ([#211](https://github.com/libp2p/js-libp2p-interfaces/issues/211)) ([8859f70](https://github.com/libp2p/js-libp2p-interfaces/commit/8859f70943c0bcdb210f54a338ae901739e5e6f2))

## [@libp2p/interface-compliance-tests-v1.1.33](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.32...@libp2p/interface-compliance-tests-v1.1.33) (2022-05-06)


### Bug Fixes

* add tag to peer discovery interface ([#210](https://github.com/libp2p/js-libp2p-interfaces/issues/210)) ([f99c833](https://github.com/libp2p/js-libp2p-interfaces/commit/f99c833c8436f8434f380d890ec5d267279312d7))

## [@libp2p/interface-compliance-tests-v1.1.32](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.31...@libp2p/interface-compliance-tests-v1.1.32) (2022-05-04)


### Bug Fixes

* move startable and events interfaces ([#209](https://github.com/libp2p/js-libp2p-interfaces/issues/209)) ([8ce8a08](https://github.com/libp2p/js-libp2p-interfaces/commit/8ce8a08c94b0738aa32da516558977b195ddd8ed))

## [@libp2p/interface-compliance-tests-v1.1.31](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.30...@libp2p/interface-compliance-tests-v1.1.31) (2022-05-03)


### Bug Fixes

* only send handled protocols ([#207](https://github.com/libp2p/js-libp2p-interfaces/issues/207)) ([1f7afc2](https://github.com/libp2p/js-libp2p-interfaces/commit/1f7afc29d72fde708064ec6479011dbc0a225962))

## [@libp2p/interface-compliance-tests-v1.1.30](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.29...@libp2p/interface-compliance-tests-v1.1.30) (2022-05-01)


### Bug Fixes

* move connection manager mock to connection manager module ([#205](https://github.com/libp2p/js-libp2p-interfaces/issues/205)) ([a367375](https://github.com/libp2p/js-libp2p-interfaces/commit/a367375accc690d7b4608c9a3313f91df700efd8))

## [@libp2p/interface-compliance-tests-v1.1.29](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.28...@libp2p/interface-compliance-tests-v1.1.29) (2022-04-28)


### Bug Fixes

* pubsub should not be startable ([#204](https://github.com/libp2p/js-libp2p-interfaces/issues/204)) ([59bd924](https://github.com/libp2p/js-libp2p-interfaces/commit/59bd9245a207268525bdd26a05c5306fe436fcc4))

## [@libp2p/interface-compliance-tests-v1.1.28](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.27...@libp2p/interface-compliance-tests-v1.1.28) (2022-04-28)


### Bug Fixes

* pubsub and dht are always set ([#203](https://github.com/libp2p/js-libp2p-interfaces/issues/203)) ([86860c1](https://github.com/libp2p/js-libp2p-interfaces/commit/86860c1836a2464b2ad380b09542e3f3271ae287))

## [@libp2p/interface-compliance-tests-v1.1.27](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.26...@libp2p/interface-compliance-tests-v1.1.27) (2022-04-26)


### Bug Fixes

* add delays for gossipsub ([#202](https://github.com/libp2p/js-libp2p-interfaces/issues/202)) ([cf85799](https://github.com/libp2p/js-libp2p-interfaces/commit/cf85799fdd0d4848ad2187bbbb0dd6ac5e8cb254))

## [@libp2p/interface-compliance-tests-v1.1.26](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.25...@libp2p/interface-compliance-tests-v1.1.26) (2022-04-25)


### Bug Fixes

* stop pubsub after test ([#200](https://github.com/libp2p/js-libp2p-interfaces/issues/200)) ([2d2650c](https://github.com/libp2p/js-libp2p-interfaces/commit/2d2650cb8cabce137665aafd55a2fb14cbd5dacd))

## [@libp2p/interface-compliance-tests-v1.1.25](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.24...@libp2p/interface-compliance-tests-v1.1.25) (2022-04-22)


### Bug Fixes

* update pubsub interface in line with gossipsub ([#199](https://github.com/libp2p/js-libp2p-interfaces/issues/199)) ([3f55596](https://github.com/libp2p/js-libp2p-interfaces/commit/3f555965cddea3ef03e7217b755c82aa4107e093))

## [@libp2p/interface-compliance-tests-v1.1.24](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.23...@libp2p/interface-compliance-tests-v1.1.24) (2022-04-21)


### Bug Fixes

* test PubSub interface and not PubSubBaseProtocol ([#198](https://github.com/libp2p/js-libp2p-interfaces/issues/198)) ([96c15c9](https://github.com/libp2p/js-libp2p-interfaces/commit/96c15c9780821a3cb763e48854d64377bf562692))

## [@libp2p/interface-compliance-tests-v1.1.23](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.22...@libp2p/interface-compliance-tests-v1.1.23) (2022-04-20)


### Bug Fixes

* emit pubsub messages using 'message' event ([#197](https://github.com/libp2p/js-libp2p-interfaces/issues/197)) ([df9b685](https://github.com/libp2p/js-libp2p-interfaces/commit/df9b685cea30653109f2fa2cb5583a3bca7b09bb))

## [@libp2p/interface-compliance-tests-v1.1.22](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.21...@libp2p/interface-compliance-tests-v1.1.22) (2022-04-19)


### Bug Fixes

* move dev deps to prod ([#195](https://github.com/libp2p/js-libp2p-interfaces/issues/195)) ([3e1ffc7](https://github.com/libp2p/js-libp2p-interfaces/commit/3e1ffc7b174e74be483943ad4e5fcab823ae3f6d))

## [@libp2p/interface-compliance-tests-v1.1.21](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.20...@libp2p/interface-compliance-tests-v1.1.21) (2022-04-08)


### Bug Fixes

* swap protobufjs for protons ([#191](https://github.com/libp2p/js-libp2p-interfaces/issues/191)) ([d72b30c](https://github.com/libp2p/js-libp2p-interfaces/commit/d72b30cfca4b9145e0b31db28e8fa3329a180e83))


### Trivial Changes

* update aegir ([#192](https://github.com/libp2p/js-libp2p-interfaces/issues/192)) ([41c1494](https://github.com/libp2p/js-libp2p-interfaces/commit/41c14941e8b67d6601a90b4d48a2776573d55e60))

## [@libp2p/interface-compliance-tests-v1.1.20](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.19...@libp2p/interface-compliance-tests-v1.1.20) (2022-03-24)


### Bug Fixes

* rename peer data to peer info ([#187](https://github.com/libp2p/js-libp2p-interfaces/issues/187)) ([dfea342](https://github.com/libp2p/js-libp2p-interfaces/commit/dfea3429bad57abde040397e4e7a58539829e9c2))

## [@libp2p/interface-compliance-tests-v1.1.19](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.18...@libp2p/interface-compliance-tests-v1.1.19) (2022-03-22)


### Bug Fixes

* add method for startable lifecyle ([#186](https://github.com/libp2p/js-libp2p-interfaces/issues/186)) ([2730e29](https://github.com/libp2p/js-libp2p-interfaces/commit/2730e2947bbd231db3f7f82951b51ee534733ab2))

## [@libp2p/interface-compliance-tests-v1.1.18](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.17...@libp2p/interface-compliance-tests-v1.1.18) (2022-03-20)


### Bug Fixes

* update pubsub types ([#183](https://github.com/libp2p/js-libp2p-interfaces/issues/183)) ([7ef4baa](https://github.com/libp2p/js-libp2p-interfaces/commit/7ef4baad0fe30f783f3eecd5199ef92af08b7f57))

## [@libp2p/interface-compliance-tests-v1.1.17](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.16...@libp2p/interface-compliance-tests-v1.1.17) (2022-03-15)


### Bug Fixes

* use custom event instead of error event ([#181](https://github.com/libp2p/js-libp2p-interfaces/issues/181)) ([71ab242](https://github.com/libp2p/js-libp2p-interfaces/commit/71ab2424dfbf6337111d6d9d994f27c7967c20f1))

## [@libp2p/interface-compliance-tests-v1.1.16](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.15...@libp2p/interface-compliance-tests-v1.1.16) (2022-03-15)


### Bug Fixes

* simplify transport interface, update interfaces for use with libp2p ([#180](https://github.com/libp2p/js-libp2p-interfaces/issues/180)) ([ec81622](https://github.com/libp2p/js-libp2p-interfaces/commit/ec81622e5b7c6d256e0f8aed6d3695642473293b))

## [@libp2p/interface-compliance-tests-v1.1.15](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.14...@libp2p/interface-compliance-tests-v1.1.15) (2022-02-27)


### Bug Fixes

* rename crypto to connection-encrypter ([#179](https://github.com/libp2p/js-libp2p-interfaces/issues/179)) ([d197f55](https://github.com/libp2p/js-libp2p-interfaces/commit/d197f554d7cdadb3b05ed2d6c69fda2c4362b1eb))

## [@libp2p/interface-compliance-tests-v1.1.14](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.13...@libp2p/interface-compliance-tests-v1.1.14) (2022-02-27)


### Bug Fixes

* update package config and add connection gater interface ([#178](https://github.com/libp2p/js-libp2p-interfaces/issues/178)) ([c6079a6](https://github.com/libp2p/js-libp2p-interfaces/commit/c6079a6367f004788062df3e30ad2e26330d947b))

## [@libp2p/interface-compliance-tests-v1.1.13](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.12...@libp2p/interface-compliance-tests-v1.1.13) (2022-02-21)


### Bug Fixes

* increase stream test timeout ([#175](https://github.com/libp2p/js-libp2p-interfaces/issues/175)) ([568aefb](https://github.com/libp2p/js-libp2p-interfaces/commit/568aefb5c099ba0161ffecf86bda238b92d396b0))

## [@libp2p/interface-compliance-tests-v1.1.12](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.11...@libp2p/interface-compliance-tests-v1.1.12) (2022-02-21)


### Bug Fixes

* update muxer to pass transport tests ([#174](https://github.com/libp2p/js-libp2p-interfaces/issues/174)) ([466ed53](https://github.com/libp2p/js-libp2p-interfaces/commit/466ed53192aa196ac2dbdb83df3c8db9cd5b1e07))

## [@libp2p/interface-compliance-tests-v1.1.11](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.10...@libp2p/interface-compliance-tests-v1.1.11) (2022-02-18)


### Bug Fixes

* remove delays from pubsub tests ([#173](https://github.com/libp2p/js-libp2p-interfaces/issues/173)) ([5c8fe09](https://github.com/libp2p/js-libp2p-interfaces/commit/5c8fe09294f0cbd8add1406a61fa7dbc5b4e788b))

## [@libp2p/interface-compliance-tests-v1.1.10](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.9...@libp2p/interface-compliance-tests-v1.1.10) (2022-02-18)


### Bug Fixes

* simpler pubsub ([#172](https://github.com/libp2p/js-libp2p-interfaces/issues/172)) ([98715ed](https://github.com/libp2p/js-libp2p-interfaces/commit/98715ed73183b32e4fda3d878a462389548358d9))

## [@libp2p/interface-compliance-tests-v1.1.9](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.8...@libp2p/interface-compliance-tests-v1.1.9) (2022-02-17)


### Bug Fixes

* update deps ([#171](https://github.com/libp2p/js-libp2p-interfaces/issues/171)) ([d0d2564](https://github.com/libp2p/js-libp2p-interfaces/commit/d0d2564a84a0722ab587a3aa6ec01e222442b100))

## [@libp2p/interface-compliance-tests-v1.1.8](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.7...@libp2p/interface-compliance-tests-v1.1.8) (2022-02-17)


### Bug Fixes

* add multistream-select and update pubsub types ([#170](https://github.com/libp2p/js-libp2p-interfaces/issues/170)) ([b9ecb2b](https://github.com/libp2p/js-libp2p-interfaces/commit/b9ecb2bee8f2abc0c41bfcf7bf2025894e37ddc2))

## [@libp2p/interface-compliance-tests-v1.1.7](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.6...@libp2p/interface-compliance-tests-v1.1.7) (2022-02-16)


### Bug Fixes

* test muxer ([#169](https://github.com/libp2p/js-libp2p-interfaces/issues/169)) ([574723d](https://github.com/libp2p/js-libp2p-interfaces/commit/574723d11007e875e7adfa5c32819445f9b8def7))

## [@libp2p/interface-compliance-tests-v1.1.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.5...@libp2p/interface-compliance-tests-v1.1.6) (2022-02-12)


### Bug Fixes

* return registered topologies in mock ([#168](https://github.com/libp2p/js-libp2p-interfaces/issues/168)) ([1583019](https://github.com/libp2p/js-libp2p-interfaces/commit/158301982384a694ac3fb8f9df67c71b7b776b47))

## [@libp2p/interface-compliance-tests-v1.1.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.4...@libp2p/interface-compliance-tests-v1.1.5) (2022-02-12)


### Bug Fixes

* hide implementations behind factory methods ([#167](https://github.com/libp2p/js-libp2p-interfaces/issues/167)) ([2fba080](https://github.com/libp2p/js-libp2p-interfaces/commit/2fba0800c9896af6dcc49da4fa904bb4a3e3e40d))

## [@libp2p/interface-compliance-tests-v1.1.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.3...@libp2p/interface-compliance-tests-v1.1.4) (2022-02-11)


### Bug Fixes

* simpler topologies ([#164](https://github.com/libp2p/js-libp2p-interfaces/issues/164)) ([45fcaa1](https://github.com/libp2p/js-libp2p-interfaces/commit/45fcaa10a6a3215089340ff2eff117d7fd1100e7))

## [@libp2p/interface-compliance-tests-v1.1.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.2...@libp2p/interface-compliance-tests-v1.1.3) (2022-02-10)


### Bug Fixes

* make registrar simpler ([#163](https://github.com/libp2p/js-libp2p-interfaces/issues/163)) ([d122f3d](https://github.com/libp2p/js-libp2p-interfaces/commit/d122f3daaccc04039d90814960da92b513265644))

## [@libp2p/interface-compliance-tests-v1.1.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.1...@libp2p/interface-compliance-tests-v1.1.2) (2022-02-10)


### Bug Fixes

* remove args from listener events ([#162](https://github.com/libp2p/js-libp2p-interfaces/issues/162)) ([011ac89](https://github.com/libp2p/js-libp2p-interfaces/commit/011ac891ec7d44625cb4342f068bcd9f241a5b45))

## [@libp2p/interface-compliance-tests-v1.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.1.0...@libp2p/interface-compliance-tests-v1.1.1) (2022-02-10)


### Bug Fixes

* remove node event emitters ([#161](https://github.com/libp2p/js-libp2p-interfaces/issues/161)) ([221fb6a](https://github.com/libp2p/js-libp2p-interfaces/commit/221fb6a024430dc56288d73d8b8ce1aa88427701))

## [@libp2p/interface-compliance-tests-v1.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.8...@libp2p/interface-compliance-tests-v1.1.0) (2022-02-09)


### Features

* add peer store/records, and streams are just streams ([#160](https://github.com/libp2p/js-libp2p-interfaces/issues/160)) ([8860a0c](https://github.com/libp2p/js-libp2p-interfaces/commit/8860a0cd46b359a5648402d83870f7ff957222fe))

## [@libp2p/interface-compliance-tests-v1.0.8](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.7...@libp2p/interface-compliance-tests-v1.0.8) (2022-02-05)


### Bug Fixes

* fix muxer tests ([#157](https://github.com/libp2p/js-libp2p-interfaces/issues/157)) ([7233c44](https://github.com/libp2p/js-libp2p-interfaces/commit/7233c4438479dff56a682f45209ef7a938d63857))

## [@libp2p/interface-compliance-tests-v1.0.7](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.6...@libp2p/interface-compliance-tests-v1.0.7) (2022-01-31)


### Trivial Changes

* **deps:** bump sinon from 12.0.1 to 13.0.0 ([#154](https://github.com/libp2p/js-libp2p-interfaces/issues/154)) ([3fc8812](https://github.com/libp2p/js-libp2p-interfaces/commit/3fc8812897fa197e7b62f77614abaea4a5563404))

## [@libp2p/interface-compliance-tests-v1.0.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.5...@libp2p/interface-compliance-tests-v1.0.6) (2022-01-29)


### Bug Fixes

* remove extra fields ([#153](https://github.com/libp2p/js-libp2p-interfaces/issues/153)) ([ccd7cf3](https://github.com/libp2p/js-libp2p-interfaces/commit/ccd7cf3f5ac71337baf516d3b0f6fc724ee0d3b4))

## [@libp2p/interface-compliance-tests-v1.0.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.4...@libp2p/interface-compliance-tests-v1.0.5) (2022-01-15)


### Bug Fixes

* remove abort controller dep ([#151](https://github.com/libp2p/js-libp2p-interfaces/issues/151)) ([518bce1](https://github.com/libp2p/js-libp2p-interfaces/commit/518bce1f9bd1f8b2922338e0c65c9934af7da3af))

## [@libp2p/interface-compliance-tests-v1.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.3...@libp2p/interface-compliance-tests-v1.0.4) (2022-01-15)


### Trivial Changes

* update project config ([#149](https://github.com/libp2p/js-libp2p-interfaces/issues/149)) ([6eb8556](https://github.com/libp2p/js-libp2p-interfaces/commit/6eb85562c0da167d222808da10a7914daf12970b))

## [@libp2p/interface-compliance-tests-v1.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.2...@libp2p/interface-compliance-tests-v1.0.3) (2022-01-14)


### Bug Fixes

* update it-* deps to ts versions ([#148](https://github.com/libp2p/js-libp2p-interfaces/issues/148)) ([7a6fdd7](https://github.com/libp2p/js-libp2p-interfaces/commit/7a6fdd7622ce2870b89dbb849ab421d0dd714b43))

## [@libp2p/interface-compliance-tests-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-compliance-tests-v1.0.1...@libp2p/interface-compliance-tests-v1.0.2) (2022-01-08)


### Trivial Changes

* add semantic release config ([#141](https://github.com/libp2p/js-libp2p-interfaces/issues/141)) ([5f0de59](https://github.com/libp2p/js-libp2p-interfaces/commit/5f0de59136b6343d2411abb2d6a4dd2cd0b7efe4))
* update package versions ([#140](https://github.com/libp2p/js-libp2p-interfaces/issues/140)) ([cd844f6](https://github.com/libp2p/js-libp2p-interfaces/commit/cd844f6e39f4ee50d006e86eac8dadf696900eb5))

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.2.0 (2022-01-04)


### Features

* add auto-publish ([7aede5d](https://github.com/libp2p/js-libp2p-interfaces/commit/7aede5df39ea6b5f243348ec9a212b3e33c16a81))
* update package names ([#133](https://github.com/libp2p/js-libp2p-interfaces/issues/133)) ([337adc9](https://github.com/libp2p/js-libp2p-interfaces/commit/337adc9a9bc0278bdae8cbce9c57d07a83c8b5c2))





## [3.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@3.1.0...libp2p-interfaces-compliance-tests@3.1.1) (2022-01-02)


### Bug Fixes

* move errors ([#132](https://github.com/libp2p/js-libp2p-interfaces/issues/132)) ([21d282a](https://github.com/libp2p/js-libp2p-interfaces/commit/21d282a6d77bd7d1a12daa1cc8b3a3fed8635dad))





# [3.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@3.0.0...libp2p-interfaces-compliance-tests@3.1.0) (2022-01-02)


### Bug Fixes

* update dialer tests ([#116](https://github.com/libp2p/js-libp2p-interfaces/issues/116)) ([c679729](https://github.com/libp2p/js-libp2p-interfaces/commit/c679729113feb963ff27815fcafd7af51f722df7))


### Features

* simpler peer id ([#117](https://github.com/libp2p/js-libp2p-interfaces/issues/117)) ([fa2c4f5](https://github.com/libp2p/js-libp2p-interfaces/commit/fa2c4f5be74a5cfc11489771881e57b4e53bf174))





# [3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@2.0.0...libp2p-interfaces-compliance-tests@3.0.0) (2021-12-02)


### chore

* update libp2p-crypto and peer-id ([c711e8b](https://github.com/libp2p/js-libp2p-interfaces/commit/c711e8bd4d606f6974b13fad2eeb723f93cebb87))


### BREAKING CHANGES

* requires node 15+





# [2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@1.1.2...libp2p-interfaces-compliance-tests@2.0.0) (2021-11-22)


### Features

* split out code, convert to typescript ([#111](https://github.com/libp2p/js-libp2p-interfaces/issues/111)) ([e174bba](https://github.com/libp2p/js-libp2p-interfaces/commit/e174bba889388269b806643c79a6b53c8d6a0f8c)), closes [#110](https://github.com/libp2p/js-libp2p-interfaces/issues/110) [#101](https://github.com/libp2p/js-libp2p-interfaces/issues/101)


### BREAKING CHANGES

* not all fields from concrete classes have been added to the interfaces, some adjustment may be necessary as this gets rolled out





## [1.1.2](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@1.1.1...libp2p-interfaces-compliance-tests@1.1.2) (2021-10-18)

**Note:** Version bump only for package libp2p-interfaces-compliance-tests





## [1.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@1.1.0...libp2p-interfaces-compliance-tests@1.1.1) (2021-09-20)

**Note:** Version bump only for package libp2p-interfaces-compliance-tests





# [1.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@1.0.1...libp2p-interfaces-compliance-tests@1.1.0) (2021-08-20)


### Features

* update uint8arrays ([#105](https://github.com/libp2p/js-libp2p-interfaces/issues/105)) ([9297a9c](https://github.com/libp2p/js-libp2p-interfaces/commit/9297a9c379276d03c8da849af6108b38e581b4a6))





## [1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/libp2p-interfaces-compliance-tests@1.0.0...libp2p-interfaces-compliance-tests@1.0.1) (2021-07-08)


### Bug Fixes

* make tests more reliable ([#103](https://github.com/libp2p/js-libp2p-interfaces/issues/103)) ([cd4c409](https://github.com/libp2p/js-libp2p-interfaces/commit/cd4c40908efe2e9ffc14aa61aace5176a43fd70a))
* remove timeouts ([#104](https://github.com/libp2p/js-libp2p-interfaces/issues/104)) ([3699c17](https://github.com/libp2p/js-libp2p-interfaces/commit/3699c17f022da40a87ab24adc3b2081df7a0ddcd))





# 1.0.0 (2021-07-07)


### chore

* monorepo separating interfaces and compliance tests ([#97](https://github.com/libp2p/js-libp2p-interfaces/issues/97)) ([946348f](https://github.com/libp2p/js-libp2p-interfaces/commit/946348f7f8acc1ff7bc9cd0ab4c2602d41106f76))


### BREAKING CHANGES

* the tests now live in the libp2p-interfaces-compliance-tests module
