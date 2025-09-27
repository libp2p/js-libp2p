## [@libp2p/daemon-server-v8.0.6](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-8.0.5...@libp2p/daemon-server-8.0.6) (2025-08-13)

### Dependencies

* bump aegir from 46.0.5 to 47.0.21 ([#343](https://github.com/libp2p/js-libp2p-daemon/issues/343)) ([704c22f](https://github.com/libp2p/js-libp2p-daemon/commit/704c22f102362c6036642a73979d262e1214baa5))

## [9.0.4](https://github.com/libp2p/js-libp2p/compare/daemon-server-v9.0.3...daemon-server-v9.0.4) (2025-09-27)


### Bug Fixes

* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/gossipsub bumped from ^15.0.3 to ^15.0.4
    * @libp2p/kad-dht bumped from ^16.0.1 to ^16.0.2
    * @libp2p/logger bumped from ^6.0.1 to ^6.0.2
    * @libp2p/tcp bumped from ^11.0.1 to ^11.0.2
    * @libp2p/utils bumped from ^7.0.1 to ^7.0.2

## [9.0.3](https://github.com/libp2p/js-libp2p/compare/daemon-server-v9.0.2...daemon-server-v9.0.3) (2025-09-26)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/gossipsub bumped from ^15.0.2 to ^15.0.3

## [9.0.2](https://github.com/libp2p/js-libp2p/compare/daemon-server-v9.0.1...daemon-server-v9.0.2) (2025-09-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/gossipsub bumped from ^15.0.1 to ^15.0.2

## [9.0.1](https://github.com/libp2p/js-libp2p/compare/daemon-server-v9.0.0...daemon-server-v9.0.1) (2025-09-24)


### Dependencies

* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/gossipsub bumped from ^15.0.0 to ^15.0.1
    * @libp2p/crypto bumped from ^5.1.9 to ^5.1.10
    * @libp2p/kad-dht bumped from ^16.0.0 to ^16.0.1
    * @libp2p/logger bumped from ^6.0.0 to ^6.0.1
    * @libp2p/peer-id bumped from ^6.0.0 to ^6.0.1
    * @libp2p/tcp bumped from ^11.0.0 to ^11.0.1
    * @libp2p/utils bumped from ^7.0.0 to ^7.0.1

## [9.0.0](https://github.com/libp2p/js-libp2p/compare/daemon-server-v8.0.6...daemon-server-v9.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* the `@libp2p/pubsub` module has been removed
* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* remove pubsub ([#3291](https://github.com/libp2p/js-libp2p/issues/3291)) ([9a9b11f](https://github.com/libp2p/js-libp2p/commit/9a9b11fd44cf91a67a85805882e210ab1bff7ef2))
* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/gossipsub bumped from ^14.1.1 to ^15.0.0
    * @libp2p/crypto bumped from ^5.1.8 to ^5.1.9
    * @libp2p/daemon-protocol bumped from ^7.0.6 to ^8.0.0
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/kad-dht bumped from ^15.1.11 to ^16.0.0
    * @libp2p/logger bumped from ^5.2.0 to ^6.0.0
    * @libp2p/peer-id bumped from ^5.1.9 to ^6.0.0
    * @libp2p/tcp bumped from ^10.1.19 to ^11.0.0
    * @libp2p/utils bumped from ^6.7.2 to ^7.0.0

## [@libp2p/daemon-server-v8.0.5](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-8.0.4...@libp2p/daemon-server-8.0.5) (2025-05-19)

### Dependencies

* bump aegir from 45.2.1 to 46.0.2 ([#297](https://github.com/libp2p/js-libp2p-daemon/issues/297)) ([09c1457](https://github.com/libp2p/js-libp2p-daemon/commit/09c1457ce93a45cab43869892cd9174617a34c29))

## [@libp2p/daemon-server-v8.0.4](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-8.0.3...@libp2p/daemon-server-8.0.4) (2025-02-24)

### Bug Fixes

* pass abort signal to dial ([#285](https://github.com/libp2p/js-libp2p-daemon/issues/285)) ([a739825](https://github.com/libp2p/js-libp2p-daemon/commit/a7398251d9c77f357ffcacb83fa7ebcd1039b114))

### Dependencies

* bump it-length-prefixed from 9.1.1 to 10.0.1 ([#284](https://github.com/libp2p/js-libp2p-daemon/issues/284)) ([48dcb19](https://github.com/libp2p/js-libp2p-daemon/commit/48dcb19cc8db772509cc709298610484c186a142))

## [@libp2p/daemon-server-v8.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-8.0.2...@libp2p/daemon-server-8.0.3) (2024-11-08)

### Bug Fixes

* fix mismatched versions ([c6d619f](https://github.com/libp2p/js-libp2p-daemon/commit/c6d619f9af99a5a28089aeec2f047ca1fca1f2e1))
* mismatched versions ([98500b8](https://github.com/libp2p/js-libp2p-daemon/commit/98500b8a150c1ebb19c1f51efdfa1836136f3726))
* update project config ([4cf3a98](https://github.com/libp2p/js-libp2p-daemon/commit/4cf3a98dd76f8a41ef7f70d9e1696f2a06049f69))

## @libp2p/daemon-server [7.0.6](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-7.0.5...@libp2p/daemon-server-7.0.6) (2024-08-01)


### Bug Fixes

* use "limited" instead of "transient" ([#272](https://github.com/libp2p/js-libp2p-daemon/issues/272)) ([d43c177](https://github.com/libp2p/js-libp2p-daemon/commit/d43c177a355bd02c719c7644519ebef54a81386f))

## @libp2p/daemon-server [7.0.5](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-7.0.4...@libp2p/daemon-server-7.0.5) (2024-04-29)


### Dependencies

* bump @chainsafe/libp2p-gossipsub from 11.2.1 to 13.0.0 ([#265](https://github.com/libp2p/js-libp2p-daemon/issues/265)) ([bcd5041](https://github.com/libp2p/js-libp2p-daemon/commit/bcd504110f58f32977f31ec38989180187ab8bc2))

## @libp2p/daemon-server [7.0.4](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-7.0.3...@libp2p/daemon-server-7.0.4) (2024-02-07)


### Dependencies

* bump @libp2p/kad-dht from 11.0.8 to 12.0.5 ([#261](https://github.com/libp2p/js-libp2p-daemon/issues/261)) ([1cbaa23](https://github.com/libp2p/js-libp2p-daemon/commit/1cbaa23c0071e8d599fcef0859de41ac04f2606d))
* bump uint8arrays from 4.0.10 to 5.0.1 ([#263](https://github.com/libp2p/js-libp2p-daemon/issues/263)) ([b5eb311](https://github.com/libp2p/js-libp2p-daemon/commit/b5eb3114be41176f47fd49164322285aaa8549c1))

## @libp2p/daemon-server [7.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v7.0.2...@libp2p/daemon-server-7.0.3) (2024-02-07)


### Dependencies

* bump aegir from 41.3.5 to 42.2.3 ([#262](https://github.com/libp2p/js-libp2p-daemon/issues/262)) ([2bb9733](https://github.com/libp2p/js-libp2p-daemon/commit/2bb97338d76e4cc48490326083fb13bd9ae60a74))



### Dependencies

* **@libp2p/daemon-protocol:** upgraded to 6.0.2

## [@libp2p/daemon-server-v7.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v7.0.1...@libp2p/daemon-server-v7.0.2) (2024-02-07)


### Dependencies

* bump multiformats from 12.1.3 to 13.0.1 ([#253](https://github.com/libp2p/js-libp2p-daemon/issues/253)) ([aebd43a](https://github.com/libp2p/js-libp2p-daemon/commit/aebd43ac1e7abae209ce4cc198989c8161a1b022))
* bump uint8arrays from 4.0.10 to 5.0.1 ([#248](https://github.com/libp2p/js-libp2p-daemon/issues/248)) ([290bb2a](https://github.com/libp2p/js-libp2p-daemon/commit/290bb2ac7c3bf1cdb5174b60010888fbd91a2f17))

## [@libp2p/daemon-server-v7.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v7.0.0...@libp2p/daemon-server-v7.0.1) (2023-12-04)


### Dependencies

* bump @chainsafe/libp2p-gossipsub from 10.1.1 to 11.0.0 ([#244](https://github.com/libp2p/js-libp2p-daemon/issues/244)) ([6cc8c3c](https://github.com/libp2p/js-libp2p-daemon/commit/6cc8c3c96316fcb4dc32f24dc7d25414dec5f80d))

## [@libp2p/daemon-server-v7.0.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v6.0.3...@libp2p/daemon-server-v7.0.0) (2023-11-30)


### ⚠ BREAKING CHANGES

* updates js-libp2p to v1

### Trivial Changes

* update sibling dependencies ([865cb8a](https://github.com/libp2p/js-libp2p-daemon/commit/865cb8a7bf165092f90455dcc895ffa7e97df432))


### Dependencies

* update libp2p to v1 ([#235](https://github.com/libp2p/js-libp2p-daemon/issues/235)) ([6f2917b](https://github.com/libp2p/js-libp2p-daemon/commit/6f2917b714756e3632ff6c522668f7c2166d4389))

## [@libp2p/daemon-server-v6.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v6.0.2...@libp2p/daemon-server-v6.0.3) (2023-11-10)


### Bug Fixes

* add logger field ([#234](https://github.com/libp2p/js-libp2p-daemon/issues/234)) ([6f4728c](https://github.com/libp2p/js-libp2p-daemon/commit/6f4728c447859db17aaee613060b67271922fc2a))

## [@libp2p/daemon-server-v6.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v6.0.1...@libp2p/daemon-server-v6.0.2) (2023-11-02)


### Bug Fixes

* add additional logging ([94d21cb](https://github.com/libp2p/js-libp2p-daemon/commit/94d21cbde3f22898d1f9e261c243283e9bae3dd6))


### Dependencies

* bump aegir from 40.0.13 to 41.1.6 ([#232](https://github.com/libp2p/js-libp2p-daemon/issues/232)) ([653c74b](https://github.com/libp2p/js-libp2p-daemon/commit/653c74b6272fd6d11d686bf7bb44b49b6757b633))
* **dev:** bump sinon-ts from 1.0.2 to 2.0.0 ([#233](https://github.com/libp2p/js-libp2p-daemon/issues/233)) ([de13473](https://github.com/libp2p/js-libp2p-daemon/commit/de13473ffd981c0488c27402e16c134f49e4b526))

## [@libp2p/daemon-server-v6.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v6.0.0...@libp2p/daemon-server-v6.0.1) (2023-08-04)


### Dependencies

* bump @chainsafe/libp2p-gossipsub from 9.1.0 to 10.0.0 ([#214](https://github.com/libp2p/js-libp2p-daemon/issues/214)) ([0308811](https://github.com/libp2p/js-libp2p-daemon/commit/0308811a2ea29d20de3f6a43db32720f21fb9b3f))

## [@libp2p/daemon-server-v6.0.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v5.0.2...@libp2p/daemon-server-v6.0.0) (2023-07-31)


### ⚠ BREAKING CHANGES

* stream close methods are now asyc, requires libp2p@0.46.x or later

### Features

* close streams gracefully ([#213](https://github.com/libp2p/js-libp2p-daemon/issues/213)) ([92eebfa](https://github.com/libp2p/js-libp2p-daemon/commit/92eebfa12ba1fb42ae6c9e164fb0d69647e62074))


### Dependencies

* bump aegir from 38.1.8 to 39.0.1 ([#202](https://github.com/libp2p/js-libp2p-daemon/issues/202)) ([3bf4027](https://github.com/libp2p/js-libp2p-daemon/commit/3bf402752a92c3ebb96435eaa7923ce22ef76ea0))
* update sibling dependencies ([ba4dd19](https://github.com/libp2p/js-libp2p-daemon/commit/ba4dd190e0e4101291195d5ffdf6bd3f982ee457))

## [@libp2p/daemon-server-v5.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v5.0.1...@libp2p/daemon-server-v5.0.2) (2023-04-27)


### Bug Fixes

* use interface-libp2p to ensure the correct services are set ([#203](https://github.com/libp2p/js-libp2p-daemon/issues/203)) ([8602a70](https://github.com/libp2p/js-libp2p-daemon/commit/8602a704e45cfa768ad55974d025b2d4be6f42a9))

## [@libp2p/daemon-server-v5.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v5.0.0...@libp2p/daemon-server-v5.0.1) (2023-04-24)


### Dependencies

* bump @libp2p/interface-peer-store from 1.2.9 to 2.0.0 ([#201](https://github.com/libp2p/js-libp2p-daemon/issues/201)) ([9b146a8](https://github.com/libp2p/js-libp2p-daemon/commit/9b146a8c38c30a13401be6da5259cd9da6bdc25c))

## [@libp2p/daemon-server-v5.0.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.1.4...@libp2p/daemon-server-v5.0.0) (2023-04-19)


### ⚠ BREAKING CHANGES

* the type of the source/sink properties have changed

### Dependencies

* update it-stream-types to 2.x.x ([#196](https://github.com/libp2p/js-libp2p-daemon/issues/196)) ([a09f6d5](https://github.com/libp2p/js-libp2p-daemon/commit/a09f6d58942033b08b579735aaa1537b3a324776))
* update sibling dependencies ([e0ec5ec](https://github.com/libp2p/js-libp2p-daemon/commit/e0ec5ecf5bfd7f801274d37d51c3dcce652de2ba))

## [@libp2p/daemon-server-v4.1.4](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.1.3...@libp2p/daemon-server-v4.1.4) (2023-04-12)


### Dependencies

* bump @libp2p/interface-connection from 3.1.1 to 4.0.0 ([#195](https://github.com/libp2p/js-libp2p-daemon/issues/195)) ([798ecc5](https://github.com/libp2p/js-libp2p-daemon/commit/798ecc594bc64c8e34aad13e1b9884011f0b1f29))

## [@libp2p/daemon-server-v4.1.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.1.2...@libp2p/daemon-server-v4.1.3) (2023-04-03)


### Dependencies

* update all it-* deps to the latest versions ([#193](https://github.com/libp2p/js-libp2p-daemon/issues/193)) ([cb0aa85](https://github.com/libp2p/js-libp2p-daemon/commit/cb0aa85bbbad651db088594622a9438a127d2a10))

## [@libp2p/daemon-server-v4.1.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.1.1...@libp2p/daemon-server-v4.1.2) (2023-03-31)


### Dependencies

* bump it-drain from 2.0.1 to 3.0.1 ([#190](https://github.com/libp2p/js-libp2p-daemon/issues/190)) ([306bdc4](https://github.com/libp2p/js-libp2p-daemon/commit/306bdc4fc139c3af429314d7b7d78d0a2238d6f4))

## [@libp2p/daemon-server-v4.1.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.1.0...@libp2p/daemon-server-v4.1.1) (2023-03-17)


### Dependencies

* bump @multiformats/multiaddr from 11.6.1 to 12.0.0 ([#189](https://github.com/libp2p/js-libp2p-daemon/issues/189)) ([aaf7e2e](https://github.com/libp2p/js-libp2p-daemon/commit/aaf7e2e37423cae78cd16d8e16e06db40fdcd1e3))

## [@libp2p/daemon-server-v4.1.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.0.3...@libp2p/daemon-server-v4.1.0) (2023-02-23)


### Features

* add get subscribers for pubsub topics ([#184](https://github.com/libp2p/js-libp2p-daemon/issues/184)) ([c8be43e](https://github.com/libp2p/js-libp2p-daemon/commit/c8be43e5acd6a74cfdd01857343af6f6d8210d5d))

## [@libp2p/daemon-server-v4.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.0.2...@libp2p/daemon-server-v4.0.3) (2023-02-22)


### Dependencies

* bump aegir from 37.12.1 to 38.1.6 ([#183](https://github.com/libp2p/js-libp2p-daemon/issues/183)) ([6725a0a](https://github.com/libp2p/js-libp2p-daemon/commit/6725a0aeba9acb56a7530dece6c65a0f3eadfec5))

## [@libp2p/daemon-server-v4.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.0.1...@libp2p/daemon-server-v4.0.2) (2023-02-22)


### Trivial Changes

* remove lerna ([#171](https://github.com/libp2p/js-libp2p-daemon/issues/171)) ([367f912](https://github.com/libp2p/js-libp2p-daemon/commit/367f9122f2fe1c31c8de7a136cda18d024ff08d7))


### Dependencies

* **dev:** bump sinon from 14.0.2 to 15.0.1 ([#166](https://github.com/libp2p/js-libp2p-daemon/issues/166)) ([1702efb](https://github.com/libp2p/js-libp2p-daemon/commit/1702efb4248bea4cb9ec19c694c1caae1c0ff16d))

## [@libp2p/daemon-server-v4.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v4.0.0...@libp2p/daemon-server-v4.0.1) (2023-01-07)


### Dependencies

* bump @libp2p/tcp from 5.0.2 to 6.0.8 ([#165](https://github.com/libp2p/js-libp2p-daemon/issues/165)) ([fb676ab](https://github.com/libp2p/js-libp2p-daemon/commit/fb676ab66348b3c704d2385b4da0d7173bc4a04d))

## [@libp2p/daemon-server-v4.0.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v3.0.5...@libp2p/daemon-server-v4.0.0) (2023-01-07)


### ⚠ BREAKING CHANGES

* Update multiformats and related dependencies (#170)

### Dependencies

* Update multiformats and related dependencies ([#170](https://github.com/libp2p/js-libp2p-daemon/issues/170)) ([06744a7](https://github.com/libp2p/js-libp2p-daemon/commit/06744a77006dc77dcfb7bd860e4dc6f36a535603))

## [@libp2p/daemon-server-v3.0.5](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v3.0.4...@libp2p/daemon-server-v3.0.5) (2022-10-17)


### Dependencies

* bump it-drain from 1.0.5 to 2.0.0 ([#147](https://github.com/libp2p/js-libp2p-daemon/issues/147)) ([56663f8](https://github.com/libp2p/js-libp2p-daemon/commit/56663f83255a0720b4bf4c7e3805ee4ced8dc86d))

## [@libp2p/daemon-server-v3.0.4](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v3.0.3...@libp2p/daemon-server-v3.0.4) (2022-10-14)


### Dependencies

* **dev:** bump sinon-ts from 0.0.2 to 1.0.0 ([#144](https://github.com/libp2p/js-libp2p-daemon/issues/144)) ([cfc8755](https://github.com/libp2p/js-libp2p-daemon/commit/cfc8755aa1280ac4fc2aae67cf47d7b0b93f605d))

## [@libp2p/daemon-server-v3.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v3.0.2...@libp2p/daemon-server-v3.0.3) (2022-10-13)


### Dependencies

* update uint8arrays, protons and multiformats ([#143](https://github.com/libp2p/js-libp2p-daemon/issues/143)) ([661139c](https://github.com/libp2p/js-libp2p-daemon/commit/661139c674c9994724e32227d7d9ae2c5da1cea2))

## [@libp2p/daemon-server-v3.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v3.0.1...@libp2p/daemon-server-v3.0.2) (2022-10-07)


### Dependencies

* bump @libp2p/interface-transport from 1.0.4 to 2.0.0 ([#132](https://github.com/libp2p/js-libp2p-daemon/issues/132)) ([1a7b2cc](https://github.com/libp2p/js-libp2p-daemon/commit/1a7b2cc653dfb51e92edb1f652452e3c793156c3))
* bump @libp2p/tcp from 3.0.0 to 4.0.1 ([4e64dce](https://github.com/libp2p/js-libp2p-daemon/commit/4e64dce5e6d18dadaa54a20fff7b2da8bbca11ae))

## [@libp2p/daemon-server-v3.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v3.0.0...@libp2p/daemon-server-v3.0.1) (2022-09-21)


### Dependencies

* update @multiformats/multiaddr to 11.0.0 ([#128](https://github.com/libp2p/js-libp2p-daemon/issues/128)) ([885d901](https://github.com/libp2p/js-libp2p-daemon/commit/885d9013d82a62e6756b06350932df1242a13296))

## [@libp2p/daemon-server-v3.0.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v2.0.4...@libp2p/daemon-server-v3.0.0) (2022-09-09)


### ⚠ BREAKING CHANGES

* the stream type returned by `client.openStream` has changed

### Bug Fixes

* allow opening remote streams ([#126](https://github.com/libp2p/js-libp2p-daemon/issues/126)) ([361cc57](https://github.com/libp2p/js-libp2p-daemon/commit/361cc5750de505ab0381ae43609c67d5d4f659a7))


### Dependencies

* update sibling dependencies ([c3ebd58](https://github.com/libp2p/js-libp2p-daemon/commit/c3ebd588abc36ef45667e8e4e4c0e220303b7510))

## [@libp2p/daemon-server-v2.0.4](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v2.0.3...@libp2p/daemon-server-v2.0.4) (2022-08-10)


### Bug Fixes

* update all deps ([#124](https://github.com/libp2p/js-libp2p-daemon/issues/124)) ([5e46e1e](https://github.com/libp2p/js-libp2p-daemon/commit/5e46e1e26c23428046a6007ab158420d3d830145))


### Documentation

* readme update ([f569ffc](https://github.com/libp2p/js-libp2p-daemon/commit/f569ffc5c3956248e685d99904408fd3f4d868f4))

## [@libp2p/daemon-server-v2.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v2.0.2...@libp2p/daemon-server-v2.0.3) (2022-07-31)


### Trivial Changes

* update project config ([#111](https://github.com/libp2p/js-libp2p-daemon/issues/111)) ([345e663](https://github.com/libp2p/js-libp2p-daemon/commit/345e663e34278e780fc2f3a6b595294f925c4521))


### Dependencies

* update uint8arraylist and protons deps ([#115](https://github.com/libp2p/js-libp2p-daemon/issues/115)) ([34a8334](https://github.com/libp2p/js-libp2p-daemon/commit/34a83340ba855a9c08319ae1cd735dfa8b71c248))

## [@libp2p/daemon-server-v2.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v2.0.1...@libp2p/daemon-server-v2.0.2) (2022-06-17)


### Trivial Changes

* update deps ([#105](https://github.com/libp2p/js-libp2p-daemon/issues/105)) ([0bdab0e](https://github.com/libp2p/js-libp2p-daemon/commit/0bdab0ee254e32d6dca0e5fe239d4ef16db41b87))

## [@libp2p/daemon-server-v2.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v2.0.0...@libp2p/daemon-server-v2.0.1) (2022-06-15)


### Trivial Changes

* update deps ([#103](https://github.com/libp2p/js-libp2p-daemon/issues/103)) ([2bfaa37](https://github.com/libp2p/js-libp2p-daemon/commit/2bfaa37e2f056dcd5de5a3882b77f52553c595d4))

## [@libp2p/daemon-server-v2.0.0](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v1.0.5...@libp2p/daemon-server-v2.0.0) (2022-06-15)


### ⚠ BREAKING CHANGES

* uses new single-issue libp2p interface modules

### Features

* update to latest libp2p interfaces ([#102](https://github.com/libp2p/js-libp2p-daemon/issues/102)) ([f5e9121](https://github.com/libp2p/js-libp2p-daemon/commit/f5e91210654ab3c411e316c1c657356c037a0f6a))

## [@libp2p/daemon-server-v1.0.5](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v1.0.4...@libp2p/daemon-server-v1.0.5) (2022-05-25)


### Trivial Changes

* update docs ([#91](https://github.com/libp2p/js-libp2p-daemon/issues/91)) ([5b072ff](https://github.com/libp2p/js-libp2p-daemon/commit/5b072ff89f30fd6cf55a3387bf0961c8ad78a22f)), closes [#83](https://github.com/libp2p/js-libp2p-daemon/issues/83)

## [@libp2p/daemon-server-v1.0.4](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v1.0.3...@libp2p/daemon-server-v1.0.4) (2022-05-23)


### Bug Fixes

* update deps ([#90](https://github.com/libp2p/js-libp2p-daemon/issues/90)) ([b50eba3](https://github.com/libp2p/js-libp2p-daemon/commit/b50eba3770e47969dbc30cbcf87c41672cd9c175))

## [@libp2p/daemon-server-v1.0.3](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v1.0.2...@libp2p/daemon-server-v1.0.3) (2022-05-10)


### Bug Fixes

* encode enums correctly ([#86](https://github.com/libp2p/js-libp2p-daemon/issues/86)) ([6ce4633](https://github.com/libp2p/js-libp2p-daemon/commit/6ce4633f3db41ab66f9b8b1abbe84955dde3e9be))

## [@libp2p/daemon-server-v1.0.2](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v1.0.1...@libp2p/daemon-server-v1.0.2) (2022-04-20)


### Bug Fixes

* update interfaces and deps ([#84](https://github.com/libp2p/js-libp2p-daemon/issues/84)) ([25173d5](https://github.com/libp2p/js-libp2p-daemon/commit/25173d5b2edf0e9dd9132707d349cdc862caecdb))

## [@libp2p/daemon-server-v1.0.1](https://github.com/libp2p/js-libp2p-daemon/compare/@libp2p/daemon-server-v1.0.0...@libp2p/daemon-server-v1.0.1) (2022-04-07)


### Bug Fixes

* remove protobufjs and replace with protons ([#81](https://github.com/libp2p/js-libp2p-daemon/issues/81)) ([78dd02a](https://github.com/libp2p/js-libp2p-daemon/commit/78dd02a679e55f22c7e24c1ee2b6f92a4679a0b9))


### Trivial Changes

* update aegir to latest version ([#80](https://github.com/libp2p/js-libp2p-daemon/issues/80)) ([3a98959](https://github.com/libp2p/js-libp2p-daemon/commit/3a98959617d9c19bba9fb064defee3d51acfcc29))

## @libp2p/daemon-server-v1.0.0 (2022-03-28)


### ⚠ BREAKING CHANGES

* This module is now ESM only

### Features

* convert to typescript ([#78](https://github.com/libp2p/js-libp2p-daemon/issues/78)) ([f18b2a4](https://github.com/libp2p/js-libp2p-daemon/commit/f18b2a45871a2704db51b03e8583eefdcd13554c))
