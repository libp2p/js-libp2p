## [0.28.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.28.4...v0.28.5) (2022-01-19)


### Bug Fixes

* update component metric API use ([#293](https://github.com/libp2p/js-libp2p-kad-dht/issues/293)) ([c026f03](https://github.com/libp2p/js-libp2p-kad-dht/commit/c026f0389373718131ee26424b786e55285c1c5e))



## [0.28.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.28.3...v0.28.4) (2022-01-17)



## [0.28.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.28.2...v0.28.3) (2022-01-17)


### Bug Fixes

* catch not found errors ([#291](https://github.com/libp2p/js-libp2p-kad-dht/issues/291)) ([f0a4307](https://github.com/libp2p/js-libp2p-kad-dht/commit/f0a430731d5b026d80495ec1c8fc457d77c29451))



## [0.28.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.28.1...v0.28.2) (2022-01-15)


### Bug Fixes

* remove abort controller deps ([#276](https://github.com/libp2p/js-libp2p-kad-dht/issues/276)) ([26cd857](https://github.com/libp2p/js-libp2p-kad-dht/commit/26cd8571a0e050f4ef524f2672d604dcd1288b14))



## [0.28.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.28.0...v0.28.1) (2021-12-31)


### Bug Fixes

* catch errors from setMaxListeners ([#275](https://github.com/libp2p/js-libp2p-kad-dht/issues/275)) ([de2c601](https://github.com/libp2p/js-libp2p-kad-dht/commit/de2c601632bac41cc8b85b2d3a122f4ed24a7aed))



# [0.28.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.6...v0.28.0) (2021-12-30)


### Features

* async peer store ([#272](https://github.com/libp2p/js-libp2p-kad-dht/issues/272)) ([12804e2](https://github.com/libp2p/js-libp2p-kad-dht/commit/12804e260e76ac9b990244ff437e9147795fde3d))


### BREAKING CHANGES

* peerstore methods are now all async



## [0.27.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.5...v0.27.6) (2021-12-29)


### Bug Fixes

* return pk when found ([#273](https://github.com/libp2p/js-libp2p-kad-dht/issues/273)) ([e7d2d7f](https://github.com/libp2p/js-libp2p-kad-dht/commit/e7d2d7ff6744fda4d984bf1ca802027427726809))



## [0.27.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.4...v0.27.5) (2021-12-21)


### Bug Fixes

* silence max listeners exceeded warning ([#270](https://github.com/libp2p/js-libp2p-kad-dht/issues/270)) ([7b6c90f](https://github.com/libp2p/js-libp2p-kad-dht/commit/7b6c90fa76207a028c14609b4f8834ae9be2bf76))



## [0.27.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.3...v0.27.4) (2021-12-15)


### Features

* log component metrics ([#269](https://github.com/libp2p/js-libp2p-kad-dht/issues/269)) ([db4f7f7](https://github.com/libp2p/js-libp2p-kad-dht/commit/db4f7f7e56ff7f146112c06f18ffe93f359b8856))



## [0.27.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.2...v0.27.3) (2021-12-07)


### Bug Fixes

* add default query timeouts ([#266](https://github.com/libp2p/js-libp2p-kad-dht/issues/266)) ([4df2c3f](https://github.com/libp2p/js-libp2p-kad-dht/commit/4df2c3f1f1a8de7583e71acecb64a03e050263d4))



## [0.27.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.1...v0.27.2) (2021-12-03)


### Bug Fixes

* only provide to wan in server mode ([#264](https://github.com/libp2p/js-libp2p-kad-dht/issues/264)) ([79c0bdb](https://github.com/libp2p/js-libp2p-kad-dht/commit/79c0bdb6471adbea69383f3537c73cf8c5797de8))



## [0.27.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.27.0...v0.27.1) (2021-12-02)



# [0.27.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.7...v0.27.0) (2021-12-01)


### Bug Fixes

* do not send messages if the network is not running ([#259](https://github.com/libp2p/js-libp2p-kad-dht/issues/259)) ([50ea7aa](https://github.com/libp2p/js-libp2p-kad-dht/commit/50ea7aaa5b22fc7269ec73bf269abfcf6f35b657))


### chore

* update libp2p-crypto ([#260](https://github.com/libp2p/js-libp2p-kad-dht/issues/260)) ([64f775b](https://github.com/libp2p/js-libp2p-kad-dht/commit/64f775b34397d02eec6eb3c2ccde05abab551722))


### BREAKING CHANGES

* requires node 15+



## [0.26.7](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.6...v0.26.7) (2021-11-26)



## [0.26.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.5...v0.26.6) (2021-11-26)


### Bug Fixes

* increase time between table refresh ([#256](https://github.com/libp2p/js-libp2p-kad-dht/issues/256)) ([1471fb9](https://github.com/libp2p/js-libp2p-kad-dht/commit/1471fb94000c6f80c8a7d64b4a9ca342275a7ec8))



## [0.26.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.4...v0.26.5) (2021-11-25)


### Bug Fixes

* do not pollute routing table with useless peers ([#254](https://github.com/libp2p/js-libp2p-kad-dht/issues/254)) ([4f79899](https://github.com/libp2p/js-libp2p-kad-dht/commit/4f7989900c6239fa449841be90ebe7f0ed517316))



## [0.26.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.3...v0.26.4) (2021-11-25)


### Bug Fixes

* require at least one successful put ([#253](https://github.com/libp2p/js-libp2p-kad-dht/issues/253)) ([f7a2a02](https://github.com/libp2p/js-libp2p-kad-dht/commit/f7a2a02ef49c35bf7de1fc0d7a8256281819a740))



## [0.26.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.2...v0.26.3) (2021-11-25)


### Bug Fixes

* count successful puts ([#252](https://github.com/libp2p/js-libp2p-kad-dht/issues/252)) ([d90f1a6](https://github.com/libp2p/js-libp2p-kad-dht/commit/d90f1a61d8bfd1128312ab5daed3bf831aced74d))



## [0.26.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.1...v0.26.2) (2021-11-24)


### Bug Fixes

* remove trailing slash from datastore prefixes ([#241](https://github.com/libp2p/js-libp2p-kad-dht/issues/241)) ([2d26f9b](https://github.com/libp2p/js-libp2p-kad-dht/commit/2d26f9bbf77ceabf6cdc7904896454b82b2a8b38))



## [0.26.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.26.0...v0.26.1) (2021-11-22)


### Bug Fixes

* prefix records with key, remove disjoint queries ([#239](https://github.com/libp2p/js-libp2p-kad-dht/issues/239)) ([e31696c](https://github.com/libp2p/js-libp2p-kad-dht/commit/e31696c3a4363f2fa7c6a6534d67b57252bafe36))



# [0.26.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.25.0...v0.26.0) (2021-11-18)


### Bug Fixes

* refactor query logic ([#237](https://github.com/libp2p/js-libp2p-kad-dht/issues/237)) ([1f8bc6a](https://github.com/libp2p/js-libp2p-kad-dht/commit/1f8bc6a23d3db592606c789648f13199078e176c))


### Features

* ping old DHT peers before eviction ([#229](https://github.com/libp2p/js-libp2p-kad-dht/issues/229)) ([eff54bf](https://github.com/libp2p/js-libp2p-kad-dht/commit/eff54bf0c40f03dcff03d139d0bb275e2af175b0))



# [0.25.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.24.0...v0.25.0) (2021-09-24)


### Bug Fixes

* browser compatibility ([#226](https://github.com/libp2p/js-libp2p-kad-dht/issues/226)) ([01b7ec1](https://github.com/libp2p/js-libp2p-kad-dht/commit/01b7ec15c059653a83634020bc9668bd7d25c1a9))
* browser override path ([#228](https://github.com/libp2p/js-libp2p-kad-dht/issues/228)) ([3c737c1](https://github.com/libp2p/js-libp2p-kad-dht/commit/3c737c16399ac7e541b417f0e8b76157ed2f86ff))


### chore

* update datastore ([#227](https://github.com/libp2p/js-libp2p-kad-dht/issues/227)) ([64a3044](https://github.com/libp2p/js-libp2p-kad-dht/commit/64a304432ecc69c5a13b2af17781ea8b833295d0))


### BREAKING CHANGES

* provided datastore must implement interface-datastore@6.0.0



## [0.24.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.24.1...v0.24.2) (2021-09-14)


### Bug Fixes

* browser override path ([#228](https://github.com/libp2p/js-libp2p-kad-dht/issues/228)) ([3c737c1](https://github.com/libp2p/js-libp2p-kad-dht/commit/3c737c16399ac7e541b417f0e8b76157ed2f86ff))



## [0.24.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.24.0...v0.24.1) (2021-09-07)


### Bug Fixes

* browser compatibility ([#226](https://github.com/libp2p/js-libp2p-kad-dht/issues/226)) ([01b7ec1](https://github.com/libp2p/js-libp2p-kad-dht/commit/01b7ec15c059653a83634020bc9668bd7d25c1a9))



# [0.24.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.23.4...v0.24.0) (2021-09-03)


### Features

* periodically fill the routing table with KADIds ([#215](https://github.com/libp2p/js-libp2p-kad-dht/issues/215)) ([d812a91](https://github.com/libp2p/js-libp2p-kad-dht/commit/d812a91e7b59589e8f46b60ba23dcbb4db02d75a))


### BREAKING CHANGES

* .start() is now async and random walk has been removed



## [0.23.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.23.3...v0.23.4) (2021-09-03)


### Reverts

* Revert "feat: periodically fill the routing table with KADIds (#215)" ([dd16a28](https://github.com/libp2p/js-libp2p-kad-dht/commit/dd16a28d321e82b8c41ca942a07023b31c23f250)), closes [#215](https://github.com/libp2p/js-libp2p-kad-dht/issues/215)



## [0.23.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.23.2...v0.23.3) (2021-09-03)


### Features

* periodically fill the routing table with KADIds ([#215](https://github.com/libp2p/js-libp2p-kad-dht/issues/215)) ([10f0cc8](https://github.com/libp2p/js-libp2p-kad-dht/commit/10f0cc860b47581019dd8d9ec5b383337708679d))


### BREAKING CHANGES

* .start() is now async and random walk has been removed



## [0.23.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.22.0...v0.23.2) (2021-08-18)


### chore

* update to new multiformats ([#220](https://github.com/libp2p/js-libp2p-kad-dht/issues/220)) ([565eb00](https://github.com/libp2p/js-libp2p-kad-dht/commit/565eb003c0c5d165088d113f8caecc5f7a5a12ad))


### BREAKING CHANGES

* uses new multiformats CID class



## [0.23.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.23.0...v0.23.1) (2021-07-08)



# [0.23.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.22.0...v0.23.0) (2021-07-07)


### chore

* update to new multiformats ([#220](https://github.com/libp2p/js-libp2p-kad-dht/issues/220)) ([565eb00](https://github.com/libp2p/js-libp2p-kad-dht/commit/565eb003c0c5d165088d113f8caecc5f7a5a12ad))


### BREAKING CHANGES

* uses new multiformats CID class



# [0.22.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.21.0...v0.22.0) (2021-04-28)



# [0.21.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.20.6...v0.21.0) (2021-02-16)


### Features

* add types and update all deps ([#214](https://github.com/libp2p/js-libp2p-kad-dht/issues/214)) ([7195282](https://github.com/libp2p/js-libp2p-kad-dht/commit/71952820ef3f737204b7a615db69ae680ef652a8))



<a name="0.20.6"></a>
## [0.20.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.20.5...v0.20.6) (2021-01-26)



<a name="0.20.5"></a>
## [0.20.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.20.4...v0.20.5) (2021-01-21)


### Bug Fixes

* do not throw on empty provider list ([#212](https://github.com/libp2p/js-libp2p-kad-dht/issues/212)) ([3c2096e](https://github.com/libp2p/js-libp2p-kad-dht/commit/3c2096e))



<a name="0.20.4"></a>
## [0.20.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.20.3...v0.20.4) (2020-12-17)


### Features

* adds removeLocal function ([#211](https://github.com/libp2p/js-libp2p-kad-dht/issues/211)) ([d0db16b](https://github.com/libp2p/js-libp2p-kad-dht/commit/d0db16b))



<a name="0.20.3"></a>
## [0.20.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.20.2...v0.20.3) (2020-12-09)


### Features

* adds custom multicodec protocol option ([#206](https://github.com/libp2p/js-libp2p-kad-dht/issues/206)) ([20d57b5](https://github.com/libp2p/js-libp2p-kad-dht/commit/20d57b5))



<a name="0.20.2"></a>
## [0.20.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.20.1...v0.20.2) (2020-12-04)


### Features

* onPut and onRemove events ([#205](https://github.com/libp2p/js-libp2p-kad-dht/issues/205)) ([b28afdd](https://github.com/libp2p/js-libp2p-kad-dht/commit/b28afdd))



<a name="0.20.1"></a>
## [0.20.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.9...v0.20.1) (2020-08-11)


### Bug Fixes

* replace node buffers with uint8arrays ([#202](https://github.com/libp2p/js-libp2p-kad-dht/issues/202)) ([989be87](https://github.com/libp2p/js-libp2p-kad-dht/commit/989be87))


### BREAKING CHANGES

* - Where node Buffers were returned, now Uint8Arrays are

* chore: remove gh dep urls



<a name="0.20.0"></a>
# [0.20.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.9...v0.20.0) (2020-08-10)


### Bug Fixes

* replace node buffers with uint8arrays ([#202](https://github.com/libp2p/js-libp2p-kad-dht/issues/202)) ([989be87](https://github.com/libp2p/js-libp2p-kad-dht/commit/989be87))


### BREAKING CHANGES

* - Where node Buffers were returned, now Uint8Arrays are

* chore: remove gh dep urls



<a name="0.19.9"></a>
## [0.19.9](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.8...v0.19.9) (2020-07-10)


### Bug Fixes

* actually send the add provider rpc with addresses ([#201](https://github.com/libp2p/js-libp2p-kad-dht/issues/201)) ([f3188be](https://github.com/libp2p/js-libp2p-kad-dht/commit/f3188be))


### Features

* add support for client mode ([#200](https://github.com/libp2p/js-libp2p-kad-dht/issues/200)) ([91f6e4f](https://github.com/libp2p/js-libp2p-kad-dht/commit/91f6e4f))



<a name="0.19.8"></a>
## [0.19.8](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.7...v0.19.8) (2020-07-08)


### Bug Fixes

* check for an existing connection before using the dialer ([#199](https://github.com/libp2p/js-libp2p-kad-dht/issues/199)) ([578c5d0](https://github.com/libp2p/js-libp2p-kad-dht/commit/578c5d0))



<a name="0.19.7"></a>
## [0.19.7](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.6...v0.19.7) (2020-06-23)



<a name="0.19.6"></a>
## [0.19.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.5...v0.19.6) (2020-06-16)


### Bug Fixes

* use utils.mapParallel for parallel processing of peers ([#166](https://github.com/libp2p/js-libp2p-kad-dht/issues/166)) ([534a2d9](https://github.com/libp2p/js-libp2p-kad-dht/commit/534a2d9))



<a name="0.19.5"></a>
## [0.19.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.4...v0.19.5) (2020-06-05)


### Bug Fixes

* providers leaking resources on dht construction ([#194](https://github.com/libp2p/js-libp2p-kad-dht/issues/194)) ([59f373a](https://github.com/libp2p/js-libp2p-kad-dht/commit/59f373a))



<a name="0.19.4"></a>
## [0.19.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.3...v0.19.4) (2020-05-20)



<a name="0.19.3"></a>
## [0.19.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.2...v0.19.3) (2020-05-15)



<a name="0.19.2"></a>
## [0.19.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.1...v0.19.2) (2020-04-28)


### Bug Fixes

* add buffer ([#185](https://github.com/libp2p/js-libp2p-kad-dht/issues/185)) ([a28d279](https://github.com/libp2p/js-libp2p-kad-dht/commit/a28d279))



<a name="0.19.1"></a>
## [0.19.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.0...v0.19.1) (2020-04-27)



<a name="0.19.0"></a>
# [0.19.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.19.0-pre.0...v0.19.0) (2020-04-24)


### Chores

* peer-discovery not using peer-info ([#180](https://github.com/libp2p/js-libp2p-kad-dht/issues/180)) ([f0fb212](https://github.com/libp2p/js-libp2p-kad-dht/commit/f0fb212))


### BREAKING CHANGES

* peer event emitted with id and multiaddrs properties instead of peer-info



<a name="0.19.0-pre.0"></a>
# [0.19.0-pre.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.6...v0.19.0-pre.0) (2020-04-16)


### Chores

* use new peer store api ([#179](https://github.com/libp2p/js-libp2p-kad-dht/issues/179)) ([194c701](https://github.com/libp2p/js-libp2p-kad-dht/commit/194c701))


### BREAKING CHANGES

* uses new peer-store api



<a name="0.18.6"></a>
## [0.18.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.5...v0.18.6) (2020-03-26)



<a name="0.18.5"></a>
## [0.18.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.4...v0.18.5) (2020-02-14)


### Bug Fixes

* remove use of assert module ([#173](https://github.com/libp2p/js-libp2p-kad-dht/issues/173)) ([de85eb6](https://github.com/libp2p/js-libp2p-kad-dht/commit/de85eb6))



<a name="0.18.4"></a>
## [0.18.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.3...v0.18.4) (2020-02-05)



<a name="0.18.3"></a>
## [0.18.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.2...v0.18.3) (2019-12-12)


### Bug Fixes

* dont use peer ids in sets ([#165](https://github.com/libp2p/js-libp2p-kad-dht/issues/165)) ([e12e540](https://github.com/libp2p/js-libp2p-kad-dht/commit/e12e540))



<a name="0.18.2"></a>
## [0.18.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.1...v0.18.2) (2019-12-06)


### Bug Fixes

* get many should not fail if found locally ([#161](https://github.com/libp2p/js-libp2p-kad-dht/issues/161)) ([091db13](https://github.com/libp2p/js-libp2p-kad-dht/commit/091db13))



<a name="0.18.1"></a>
## [0.18.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.18.0...v0.18.1) (2019-12-05)


### Bug Fixes

* find providers should yield when found locally ([#160](https://github.com/libp2p/js-libp2p-kad-dht/issues/160)) ([e40834a](https://github.com/libp2p/js-libp2p-kad-dht/commit/e40834a))



<a name="0.18.0"></a>
# [0.18.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.17.1...v0.18.0) (2019-11-30)


### Features

* find providers and closest peers return async iterable ([#157](https://github.com/libp2p/js-libp2p-kad-dht/issues/157)) ([f0e6800](https://github.com/libp2p/js-libp2p-kad-dht/commit/f0e6800))


### BREAKING CHANGES

* API for find providers and closest peers return async iterable instead of an array of PeerInfo



<a name="0.17.1"></a>
## [0.17.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.17.0...v0.17.1) (2019-11-28)


### Bug Fixes

* remove extraneous message size filter ([#156](https://github.com/libp2p/js-libp2p-kad-dht/issues/156)) ([58b6b36](https://github.com/libp2p/js-libp2p-kad-dht/commit/58b6b36))



<a name="0.17.0"></a>
# [0.17.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.16.1...v0.17.0) (2019-11-26)


### Bug Fixes

* stop and start should not fail ([#152](https://github.com/libp2p/js-libp2p-kad-dht/issues/152)) ([eee2f61](https://github.com/libp2p/js-libp2p-kad-dht/commit/eee2f61))


### Code Refactoring

* async await ([#148](https://github.com/libp2p/js-libp2p-kad-dht/issues/148)) ([c49fa92](https://github.com/libp2p/js-libp2p-kad-dht/commit/c49fa92))


### BREAKING CHANGES

* Switch to using async/await and async iterators.

Co-Authored-By: Jacob Heun <jacobheun@gmail.com>



<a name="0.16.1"></a>
## [0.16.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.16.0...v0.16.1) (2019-10-21)



<a name="0.16.0"></a>
# [0.16.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.15.3...v0.16.0) (2019-08-16)


### Code Refactoring

* use async datastore ([#140](https://github.com/libp2p/js-libp2p-kad-dht/issues/140)) ([daf9b00](https://github.com/libp2p/js-libp2p-kad-dht/commit/daf9b00))


### BREAKING CHANGES

* The DHT now requires its datastore to have
a promise based api, instead of callbacks. Datastores that use
ipfs/interface-datastore@0.7 or later should be used.
https://github.com/ipfs/interface-datastore/releases/tag/v0.7.0



<a name="0.15.3"></a>
## [0.15.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.15.2...v0.15.3) (2019-07-29)


### Bug Fixes

* _findNProvidersAsync discarding search results ([#137](https://github.com/libp2p/js-libp2p-kad-dht/issues/137)) ([e656c6b](https://github.com/libp2p/js-libp2p-kad-dht/commit/e656c6b))



<a name="0.15.2"></a>
## [0.15.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.15.1...v0.15.2) (2019-05-31)


### Bug Fixes

* favour providers peerInfo over sender peerInfo in ADD_PROVIDER ([#129](https://github.com/libp2p/js-libp2p-kad-dht/issues/129)) ([6da26b0](https://github.com/libp2p/js-libp2p-kad-dht/commit/6da26b0))



<a name="0.15.1"></a>
## [0.15.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.15.0...v0.15.1) (2019-05-30)


### Bug Fixes

* in _findNProviders correctly calculate pathSize ([5841dfe](https://github.com/libp2p/js-libp2p-kad-dht/commit/5841dfe))
* send correct payload in ADD_PROVIDER RPC ([#127](https://github.com/libp2p/js-libp2p-kad-dht/issues/127)) ([8d92d5a](https://github.com/libp2p/js-libp2p-kad-dht/commit/8d92d5a))


### Features

* use promisify-es6 instead of pify ([1d228e0](https://github.com/libp2p/js-libp2p-kad-dht/commit/1d228e0))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.15...v0.15.0) (2019-05-13)


### Chores

* update cids dependency ([#117](https://github.com/libp2p/js-libp2p-kad-dht/issues/117)) ([04e213a](https://github.com/libp2p/js-libp2p-kad-dht/commit/04e213a))


### BREAKING CHANGES

* v1 CIDs are now encoded in base32 when stringified.

https://github.com/ipfs/js-ipfs/issues/1995

License: MIT
Signed-off-by: Alan Shaw <alan.shaw@protocol.ai>



<a name="0.14.15"></a>
## [0.14.15](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.14...v0.14.15) (2019-05-10)


### Bug Fixes

* query stop with query not initialized ([b29dfde](https://github.com/libp2p/js-libp2p-kad-dht/commit/b29dfde))



<a name="0.14.14"></a>
## [0.14.14](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.13...v0.14.14) (2019-05-08)


### Bug Fixes

* performance improvements ([#107](https://github.com/libp2p/js-libp2p-kad-dht/issues/107)) ([ddf80fe](https://github.com/libp2p/js-libp2p-kad-dht/commit/ddf80fe))



<a name="0.14.13"></a>
## [0.14.13](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.12...v0.14.13) (2019-04-22)


### Bug Fixes

* random walk ([#104](https://github.com/libp2p/js-libp2p-kad-dht/issues/104)) ([9db17eb](https://github.com/libp2p/js-libp2p-kad-dht/commit/9db17eb))


### Features

* add delay support to random walk ([#101](https://github.com/libp2p/js-libp2p-kad-dht/issues/101)) ([7b70fa7](https://github.com/libp2p/js-libp2p-kad-dht/commit/7b70fa7))
* limit scope of queries to k closest peers ([#97](https://github.com/libp2p/js-libp2p-kad-dht/issues/97)) ([f03619e](https://github.com/libp2p/js-libp2p-kad-dht/commit/f03619e))



<a name="0.14.12"></a>
## [0.14.12](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.11...v0.14.12) (2019-04-04)


### Bug Fixes

* stop running queries on shutdown ([#95](https://github.com/libp2p/js-libp2p-kad-dht/issues/95)) ([e137297](https://github.com/libp2p/js-libp2p-kad-dht/commit/e137297))



<a name="0.14.11"></a>
## [0.14.11](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.10...v0.14.11) (2019-03-28)


### Bug Fixes

* ensure queries stop after error or success ([#93](https://github.com/libp2p/js-libp2p-kad-dht/issues/93)) ([0e55b20](https://github.com/libp2p/js-libp2p-kad-dht/commit/0e55b20))
* getMany with nvals=1 now goes out to network if no local val ([#91](https://github.com/libp2p/js-libp2p-kad-dht/issues/91)) ([478ee88](https://github.com/libp2p/js-libp2p-kad-dht/commit/478ee88))



<a name="0.14.10"></a>
## [0.14.10](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.9...v0.14.10) (2019-03-27)


### Bug Fixes

* false discovery ([#92](https://github.com/libp2p/js-libp2p-kad-dht/issues/92)) ([466c992](https://github.com/libp2p/js-libp2p-kad-dht/commit/466c992))



<a name="0.14.9"></a>
## [0.14.9](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.8...v0.14.9) (2019-03-18)


### Bug Fixes

* reduce bundle size ([#90](https://github.com/libp2p/js-libp2p-kad-dht/issues/90)) ([f79eeb2](https://github.com/libp2p/js-libp2p-kad-dht/commit/f79eeb2))



<a name="0.14.8"></a>
## [0.14.8](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.7...v0.14.8) (2019-03-13)


### Bug Fixes

* incoming message should not connect to peers ([#88](https://github.com/libp2p/js-libp2p-kad-dht/issues/88)) ([8c16b81](https://github.com/libp2p/js-libp2p-kad-dht/commit/8c16b81))



<a name="0.14.7"></a>
## [0.14.7](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.6...v0.14.7) (2019-03-04)


### Bug Fixes

* put query for closest peers ([#85](https://github.com/libp2p/js-libp2p-kad-dht/issues/85)) ([84a40cd](https://github.com/libp2p/js-libp2p-kad-dht/commit/84a40cd))



<a name="0.14.6"></a>
## [0.14.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.5...v0.14.6) (2019-02-25)


### Bug Fixes

* specify # of peers for successful put ([#72](https://github.com/libp2p/js-libp2p-kad-dht/issues/72)) ([97e8e60](https://github.com/libp2p/js-libp2p-kad-dht/commit/97e8e60))


### Features

* expose randomwalk parameters in config ([#77](https://github.com/libp2p/js-libp2p-kad-dht/issues/77)) ([dc5a67f](https://github.com/libp2p/js-libp2p-kad-dht/commit/dc5a67f))



<a name="0.14.5"></a>
## [0.14.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.4...v0.14.5) (2019-02-05)


### Features

* emit event on peer connected ([#66](https://github.com/libp2p/js-libp2p-kad-dht/issues/66)) ([ba0a537](https://github.com/libp2p/js-libp2p-kad-dht/commit/ba0a537))



<a name="0.14.4"></a>
## [0.14.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.3...v0.14.4) (2019-01-14)



<a name="0.14.3"></a>
## [0.14.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.2...v0.14.3) (2019-01-04)



<a name="0.14.2"></a>
## [0.14.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.1...v0.14.2) (2019-01-04)



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.14.0...v0.14.1) (2018-12-11)


### Bug Fixes

* typo get many option ([#63](https://github.com/libp2p/js-libp2p-kad-dht/issues/63)) ([de5a9fb](https://github.com/libp2p/js-libp2p-kad-dht/commit/de5a9fb))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.13.0...v0.14.0) (2018-12-11)


### Chores

* update options timeout property ([#62](https://github.com/libp2p/js-libp2p-kad-dht/issues/62)) ([3046b54](https://github.com/libp2p/js-libp2p-kad-dht/commit/3046b54))


### BREAKING CHANGES

* get, getMany, findProviders and findPeer do not accept a timeout number anymore. It must be a property of an object options.

Co-Authored-By: vasco-santos <vasco.santos@ua.pt>



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.12.1...v0.13.0) (2018-12-05)


### Bug Fixes

* make 'find peer query' test reliable ([#58](https://github.com/libp2p/js-libp2p-kad-dht/issues/58)) ([54336dd](https://github.com/libp2p/js-libp2p-kad-dht/commit/54336dd))


### Features

* run queries on disjoint paths ([#37](https://github.com/libp2p/js-libp2p-kad-dht/issues/37)) ([#39](https://github.com/libp2p/js-libp2p-kad-dht/issues/39)) ([742b3fb](https://github.com/libp2p/js-libp2p-kad-dht/commit/742b3fb))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.12.0...v0.12.1) (2018-11-30)


### Features

* allow configurable validators and selectors ([#57](https://github.com/libp2p/js-libp2p-kad-dht/issues/57)) ([b731a1d](https://github.com/libp2p/js-libp2p-kad-dht/commit/b731a1d))



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.11.1...v0.12.0) (2018-11-22)



<a name="0.11.1"></a>
## [0.11.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.11.0...v0.11.1) (2018-11-12)



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.6...v0.11.0) (2018-11-09)


### Bug Fixes

* record outdated local correction ([#49](https://github.com/libp2p/js-libp2p-kad-dht/issues/49)) ([d1869ed](https://github.com/libp2p/js-libp2p-kad-dht/commit/d1869ed))


### Features

* select first record when no selector function ([#51](https://github.com/libp2p/js-libp2p-kad-dht/issues/51)) ([683a903](https://github.com/libp2p/js-libp2p-kad-dht/commit/683a903))



<a name="0.10.6"></a>
## [0.10.6](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.5...v0.10.6) (2018-10-25)



<a name="0.10.5"></a>
## [0.10.5](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.4...v0.10.5) (2018-10-01)


### Features

* start random walk and allow configuration for disabling ([#42](https://github.com/libp2p/js-libp2p-kad-dht/issues/42)) ([abe9407](https://github.com/libp2p/js-libp2p-kad-dht/commit/abe9407))



<a name="0.10.4"></a>
## [0.10.4](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.3...v0.10.4) (2018-09-27)


### Bug Fixes

* find peer and providers options ([#45](https://github.com/libp2p/js-libp2p-kad-dht/issues/45)) ([bba7500](https://github.com/libp2p/js-libp2p-kad-dht/commit/bba7500))



<a name="0.10.3"></a>
## [0.10.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.2...v0.10.3) (2018-09-20)


### Bug Fixes

* dht get options ([#40](https://github.com/libp2p/js-libp2p-kad-dht/issues/40)) ([0a2f9fe](https://github.com/libp2p/js-libp2p-kad-dht/commit/0a2f9fe))



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.0...v0.10.2) (2018-08-29)


### Bug Fixes

* dont read when just doing a write ([7a92139](https://github.com/libp2p/js-libp2p-kad-dht/commit/7a92139))
* make findProviders treat timeout the same as findPeer ([#35](https://github.com/libp2p/js-libp2p-kad-dht/issues/35)) ([fcdb01d](https://github.com/libp2p/js-libp2p-kad-dht/commit/fcdb01d))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.10.0...v0.10.1) (2018-07-13)


### Bug Fixes

* dont read when just doing a write ([7a92139](https://github.com/libp2p/js-libp2p-kad-dht/commit/7a92139))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.9.0...v0.10.0) (2018-04-05)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.8.0...v0.9.0) (2018-03-15)


### Features

* upgrade the discovery service to random-walk ([b8e0f72](https://github.com/libp2p/js-libp2p-kad-dht/commit/b8e0f72))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.7.0...v0.8.0) (2018-02-07)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.0...v0.7.0) (2018-02-07)


### Bug Fixes

* release providers resources ([#23](https://github.com/libp2p/js-libp2p-kad-dht/issues/23)) ([ff87f4b](https://github.com/libp2p/js-libp2p-kad-dht/commit/ff87f4b))


### Features

* use libp2p-switch ([054e5e5](https://github.com/libp2p/js-libp2p-kad-dht/commit/054e5e5))



<a name="0.6.3"></a>
## [0.6.3](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.2...v0.6.3) (2018-01-30)



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.1...v0.6.2) (2018-01-30)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.6.0...v0.6.1) (2018-01-30)


### Bug Fixes

* release providers resources ([#23](https://github.com/libp2p/js-libp2p-kad-dht/issues/23)) ([ff87f4b](https://github.com/libp2p/js-libp2p-kad-dht/commit/ff87f4b))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.5.1...v0.6.0) (2017-11-09)



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.5.0...v0.5.1) (2017-09-07)


### Features

* replace protocol-buffers with protons ([#16](https://github.com/libp2p/js-libp2p-kad-dht/issues/16)) ([de259ff](https://github.com/libp2p/js-libp2p-kad-dht/commit/de259ff))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.4.1...v0.5.0) (2017-09-03)


### Features

* p2p addrs situation ([#15](https://github.com/libp2p/js-libp2p-kad-dht/issues/15)) ([3870dd2](https://github.com/libp2p/js-libp2p-kad-dht/commit/3870dd2))



<a name="0.4.1"></a>
## [0.4.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.4.0...v0.4.1) (2017-07-22)



<a name="0.4.0"></a>
# [0.4.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.3.0...v0.4.0) (2017-07-22)



<a name="0.3.0"></a>
# [0.3.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.2.1...v0.3.0) (2017-07-17)


### Bug Fixes

* no more circular dependency, become a good block of libp2p ([#13](https://github.com/libp2p/js-libp2p-kad-dht/issues/13)) ([810be4d](https://github.com/libp2p/js-libp2p-kad-dht/commit/810be4d))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.2.0...v0.2.1) (2017-07-13)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/v0.1.0...v0.2.0) (2017-07-07)


### Features

* using libp2p new state methods ([#12](https://github.com/libp2p/js-libp2p-kad-dht/issues/12)) ([982f789](https://github.com/libp2p/js-libp2p-kad-dht/commit/982f789))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/libp2p/js-libp2p-kad-dht/compare/4bd1fbc...v0.1.0) (2017-04-07)


### Features

* v0.1.0 ([4bd1fbc](https://github.com/libp2p/js-libp2p-kad-dht/commit/4bd1fbc))



