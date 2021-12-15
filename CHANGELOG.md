## [0.35.5](https://github.com/libp2p/js-libp2p/compare/v0.35.4...v0.35.5) (2021-12-15)



## [0.35.4](https://github.com/libp2p/js-libp2p/compare/v0.35.3...v0.35.4) (2021-12-15)


### Features

* allow per-component metrics to be collected ([#1061](https://github.com/libp2p/js-libp2p/issues/1061)) ([2f0b311](https://github.com/libp2p/js-libp2p/commit/2f0b311df7127aa44512c2008142d4ca30268986)), closes [#1060](https://github.com/libp2p/js-libp2p/issues/1060)



## [0.35.3](https://github.com/libp2p/js-libp2p/compare/v0.35.2...v0.35.3) (2021-12-13)


### Bug Fixes

* clean up pending dial targets ([#1059](https://github.com/libp2p/js-libp2p/issues/1059)) ([bdc9f16](https://github.com/libp2p/js-libp2p/commit/bdc9f16d0cbe56ccf26822f11068e7795bcef046))
* fix uncaught promise rejection when finding peers ([#1044](https://github.com/libp2p/js-libp2p/issues/1044)) ([3b683e7](https://github.com/libp2p/js-libp2p/commit/3b683e715686163e229b7b5c3a892327dfd4fc63))
* make error codes consistent ([#1054](https://github.com/libp2p/js-libp2p/issues/1054)) ([b25e0fe](https://github.com/libp2p/js-libp2p/commit/b25e0fe5312db58a06c39500ae84c50fed3a93bd))



## [0.35.2](https://github.com/libp2p/js-libp2p/compare/v0.33.0...v0.35.2) (2021-12-06)


### Bug Fixes

* do not let closest peers run forever ([#1047](https://github.com/libp2p/js-libp2p/issues/1047)) ([91c2ec9](https://github.com/libp2p/js-libp2p/commit/91c2ec9856a3e972b7b2c9c4d9a4eda1d431c7ef))
* increase maxlisteners on event target ([#1050](https://github.com/libp2p/js-libp2p/issues/1050)) ([b70fb43](https://github.com/libp2p/js-libp2p/commit/b70fb43427b47df079b55929ec8956f69cbda966)), closes [#900](https://github.com/libp2p/js-libp2p/issues/900)
* private ip ts compile has no call signatures ([#1020](https://github.com/libp2p/js-libp2p/issues/1020)) ([77d7cb8](https://github.com/libp2p/js-libp2p/commit/77d7cb8f0815f2cdd3bfdfa8b641a7a186fe9520))
* stop dht before connection manager ([#1041](https://github.com/libp2p/js-libp2p/issues/1041)) ([3a9d5f6](https://github.com/libp2p/js-libp2p/commit/3a9d5f64d96719ebb4d3b083c4f5832db4fa0816)), closes [#1039](https://github.com/libp2p/js-libp2p/issues/1039)


### chore

* update peer id and libp2p crypto ([#1042](https://github.com/libp2p/js-libp2p/issues/1042)) ([9cbf36f](https://github.com/libp2p/js-libp2p/commit/9cbf36fcb54099e6fed35ceccc4a2376f0926c1f))


### Features

* update dht ([#1009](https://github.com/libp2p/js-libp2p/issues/1009)) ([2f598eb](https://github.com/libp2p/js-libp2p/commit/2f598eba09cff4301474af08196158065e3602d8))


### BREAKING CHANGES

* requires node 15+
* libp2p-kad-dht has a new event-based API which is exposed as `_dht`



## [0.35.1](https://github.com/libp2p/js-libp2p/compare/v0.35.0...v0.35.1) (2021-12-03)


### Bug Fixes

* do not let closest peers run forever ([#1047](https://github.com/libp2p/js-libp2p/issues/1047)) ([91c2ec9](https://github.com/libp2p/js-libp2p/commit/91c2ec9856a3e972b7b2c9c4d9a4eda1d431c7ef))



# [0.35.0](https://github.com/libp2p/js-libp2p/compare/v0.34.0...v0.35.0) (2021-12-02)


### Bug Fixes

* stop dht before connection manager ([#1041](https://github.com/libp2p/js-libp2p/issues/1041)) ([3a9d5f6](https://github.com/libp2p/js-libp2p/commit/3a9d5f64d96719ebb4d3b083c4f5832db4fa0816)), closes [#1039](https://github.com/libp2p/js-libp2p/issues/1039)


### chore

* update peer id and libp2p crypto ([#1042](https://github.com/libp2p/js-libp2p/issues/1042)) ([9cbf36f](https://github.com/libp2p/js-libp2p/commit/9cbf36fcb54099e6fed35ceccc4a2376f0926c1f))


### BREAKING CHANGES

* requires node 15+



# [0.34.0](https://github.com/libp2p/js-libp2p/compare/v0.33.0...v0.34.0) (2021-11-25)


### Bug Fixes

* private ip ts compile has no call signatures ([#1020](https://github.com/libp2p/js-libp2p/issues/1020)) ([77d7cb8](https://github.com/libp2p/js-libp2p/commit/77d7cb8f0815f2cdd3bfdfa8b641a7a186fe9520))


### Features

* update dht ([#1009](https://github.com/libp2p/js-libp2p/issues/1009)) ([2f598eb](https://github.com/libp2p/js-libp2p/commit/2f598eba09cff4301474af08196158065e3602d8))


### BREAKING CHANGES

* libp2p-kad-dht has a new event-based API which is exposed as `_dht`



# [0.33.0](https://github.com/libp2p/js-libp2p/compare/v0.32.5...v0.33.0) (2021-09-24)


### chore

* update datastore ([#990](https://github.com/libp2p/js-libp2p/issues/990)) ([83734ef](https://github.com/libp2p/js-libp2p/commit/83734ef52061ad61ddb5ca49aae27e3a8b937058))


### BREAKING CHANGES

* datastore implementations provided to libp2p must be compliant with interface-datastore@6.0.0



## [0.32.5](https://github.com/libp2p/js-libp2p/compare/v0.32.4...v0.32.5) (2021-09-21)


### Bug Fixes

* move abortable-iterator to dependencies ([#992](https://github.com/libp2p/js-libp2p/issues/992)) ([122c89d](https://github.com/libp2p/js-libp2p/commit/122c89dd0df55a59edaae078e3dc7c31b5603715)), closes [#986](https://github.com/libp2p/js-libp2p/issues/986)



## [0.32.4](https://github.com/libp2p/js-libp2p/compare/v0.32.3...v0.32.4) (2021-08-20)



## [0.32.3](https://github.com/libp2p/js-libp2p/compare/v0.32.2...v0.32.3) (2021-08-16)


### Bug Fixes

* uint8arrays is a dep ([#964](https://github.com/libp2p/js-libp2p/issues/964)) ([ba2b4d4](https://github.com/libp2p/js-libp2p/commit/ba2b4d4b28f1d9940b457de344aed44537f9eabd))



## [0.32.2](https://github.com/libp2p/js-libp2p/compare/v0.32.1...v0.32.2) (2021-08-13)


### Bug Fixes

* browser example ci ([3b33fb4](https://github.com/libp2p/js-libp2p/commit/3b33fb4b73ba8065e432fb59f758fe138fd23d9e))


### Features

* custom protocol name ([#962](https://github.com/libp2p/js-libp2p/issues/962)) ([ef24fab](https://github.com/libp2p/js-libp2p/commit/ef24fabf0269fd079888e92eedb458e23ef1c733))



## [0.32.1](https://github.com/libp2p/js-libp2p/compare/v0.32.0...v0.32.1) (2021-07-22)


### Bug Fixes

* turn compliance tests into devDependency ([#960](https://github.com/libp2p/js-libp2p/issues/960)) ([0701de4](https://github.com/libp2p/js-libp2p/commit/0701de40b1ebdf319959846d8c4fdd30b3cf34a4))



# [0.32.0](https://github.com/libp2p/js-libp2p/compare/v0.32.0-rc.0...v0.32.0) (2021-07-15)



# [0.32.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.31.7...v0.32.0-rc.0) (2021-07-09)


### Bug Fixes

* do not allow dial to large number of multiaddrs ([#954](https://github.com/libp2p/js-libp2p/issues/954)) ([af723b3](https://github.com/libp2p/js-libp2p/commit/af723b355e1ddf4aecf439f81c3aa67613d45fa4))


### chore

* update to new multiformats ([#948](https://github.com/libp2p/js-libp2p/issues/948)) ([13cf476](https://github.com/libp2p/js-libp2p/commit/13cf4761489d59b22924bb8ec2ec6dbe207b280c))


### BREAKING CHANGES

* uses the CID class from the new multiformats module

Co-authored-by: Vasco Santos <vasco.santos@moxy.studio>



## [0.31.7](https://github.com/libp2p/js-libp2p/compare/v0.31.6...v0.31.7) (2021-06-14)


### Bug Fixes

* chat example with new multiaddr ([#946](https://github.com/libp2p/js-libp2p/issues/946)) ([d8ba284](https://github.com/libp2p/js-libp2p/commit/d8ba2848833d9fb8a963d1b7c8d27062c6f829da))
* dialer leaking resources after stopping ([#947](https://github.com/libp2p/js-libp2p/issues/947)) ([b291bc0](https://github.com/libp2p/js-libp2p/commit/b291bc06ec13feeb6e010730edfad754a3b2dc1b))



## [0.31.6](https://github.com/libp2p/js-libp2p/compare/v0.31.5...v0.31.6) (2021-05-27)


### Features

* keychain rotate passphrase ([#944](https://github.com/libp2p/js-libp2p/issues/944)) ([478963a](https://github.com/libp2p/js-libp2p/commit/478963ad2d195444494c0acc54cb3847a29e117c))



## [0.31.5](https://github.com/libp2p/js-libp2p/compare/v0.31.4...v0.31.5) (2021-05-12)


### Bug Fixes

* store remote agent and protocol version during identify ([#943](https://github.com/libp2p/js-libp2p/issues/943)) ([818d2b2](https://github.com/libp2p/js-libp2p/commit/818d2b2a98736f4242694479089396f6070cdad5))



## [0.31.4](https://github.com/libp2p/js-libp2p/compare/v0.31.3...v0.31.4) (2021-05-12)


### Bug Fixes

* peerRouting.findPeer() trying to find self ([#941](https://github.com/libp2p/js-libp2p/issues/941)) ([a79c6b5](https://github.com/libp2p/js-libp2p/commit/a79c6b50d7fddbcdb1af53efae922cecad4c9a83))



## [0.31.3](https://github.com/libp2p/js-libp2p/compare/v0.31.2...v0.31.3) (2021-05-04)



## [0.31.2](https://github.com/libp2p/js-libp2p/compare/v0.31.1...v0.31.2) (2021-04-30)


### Bug Fixes

* moving averages record types ([#935](https://github.com/libp2p/js-libp2p/issues/935)) ([b5a9eb2](https://github.com/libp2p/js-libp2p/commit/b5a9eb208763efa027d0b4caae87c515b6f5869b))



## [0.31.1](https://github.com/libp2p/js-libp2p/compare/v0.31.0...v0.31.1) (2021-04-30)


### Bug Fixes

* event emitter and interfaces types for discovery and routing ([#934](https://github.com/libp2p/js-libp2p/issues/934)) ([302bb90](https://github.com/libp2p/js-libp2p/commit/302bb9005891aa06b70a5f354bfac6b2d5a3c3b8))



# [0.31.0](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.7...v0.31.0) (2021-04-28)



# [0.31.0-rc.7](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.6...v0.31.0-rc.7) (2021-04-27)


### Bug Fixes

* address book guarantees no replicated entries are added ([#927](https://github.com/libp2p/js-libp2p/issues/927)) ([ac370fc](https://github.com/libp2p/js-libp2p/commit/ac370fc9679b51da8cee3791b6dd268d0695d136))



# [0.31.0-rc.6](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.5...v0.31.0-rc.6) (2021-04-22)


### Bug Fixes

* keychain optional pw and use interfaces for validators and selectors instead ([#924](https://github.com/libp2p/js-libp2p/issues/924)) ([88b0415](https://github.com/libp2p/js-libp2p/commit/88b04156bf614650c2b14d49b12e969c5eecf04d))



# [0.31.0-rc.5](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.4...v0.31.0-rc.5) (2021-04-21)


### Bug Fixes

* address book should not emit peer event if no addresses are known ([b4fb9b7](https://github.com/libp2p/js-libp2p/commit/b4fb9b7bf266ba03c4462c0a41b1c2691e4e88d4))
* demand pubsub subclass instead of pubsub instance ([#922](https://github.com/libp2p/js-libp2p/issues/922)) ([086b0ec](https://github.com/libp2p/js-libp2p/commit/086b0ec0df2fac93845d0a0a6b2e2464e869afcd))
* dht configuration selectors and validators ([#919](https://github.com/libp2p/js-libp2p/issues/919)) ([cc1f4af](https://github.com/libp2p/js-libp2p/commit/cc1f4af879a58e94538591851d0085ff98cd2641))



# [0.31.0-rc.4](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.3...v0.31.0-rc.4) (2021-04-20)


### Bug Fixes

* add clientMode dht arg and upgrade interface-datastore ([#918](https://github.com/libp2p/js-libp2p/issues/918)) ([975e779](https://github.com/libp2p/js-libp2p/commit/975e77991e67dd9bff790b83df7bd6fa5ddcfc67))
* do not add abort signals to useless addresses ([#913](https://github.com/libp2p/js-libp2p/issues/913)) ([06e8f3d](https://github.com/libp2p/js-libp2p/commit/06e8f3dd42432e4b37ab7904b02abde7d1cadda3))
* specify pbjs root ([#917](https://github.com/libp2p/js-libp2p/issues/917)) ([b043bca](https://github.com/libp2p/js-libp2p/commit/b043bca607565cf534771e6cf975288a8ff3030b))



# [0.31.0-rc.3](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.2...v0.31.0-rc.3) (2021-04-19)


### Bug Fixes

* remove inline arg types from function definitions ([#916](https://github.com/libp2p/js-libp2p/issues/916)) ([2af692f](https://github.com/libp2p/js-libp2p/commit/2af692fb4de572168524ae684608fc6526de4ef7))



# [0.31.0-rc.2](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.1...v0.31.0-rc.2) (2021-04-16)


### Bug Fixes

* metrics stats and moving averages types ([#915](https://github.com/libp2p/js-libp2p/issues/915)) ([3d0a79e](https://github.com/libp2p/js-libp2p/commit/3d0a79eff3bc34a5bdc8ffa31e9b09345a02ad9d))



# [0.31.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.31.0-rc.0...v0.31.0-rc.1) (2021-04-16)


### Bug Fixes

* dial protocol should throw if no protocol is provided ([#914](https://github.com/libp2p/js-libp2p/issues/914)) ([21c9aee](https://github.com/libp2p/js-libp2p/commit/21c9aeecb13440238aa6b0fb5a6731d2f87d4938))


### BREAKING CHANGES

* dialProtocol does not return connection when no protocols are provided



# [0.31.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.30.12...v0.31.0-rc.0) (2021-04-15)



## [0.30.12](https://github.com/libp2p/js-libp2p/compare/v0.30.11...v0.30.12) (2021-03-27)


### Bug Fixes

* the API of es6-promisify is not the same as promisify-es6 ([#905](https://github.com/libp2p/js-libp2p/issues/905)) ([a7128f0](https://github.com/libp2p/js-libp2p/commit/a7128f07ec8d4b729145ecfc6ad1d585ffddea46))



## [0.30.11](https://github.com/libp2p/js-libp2p/compare/v0.30.10...v0.30.11) (2021-03-23)


### Bug Fixes

* connection direction should be only inbound or outbound ([9504f19](https://github.com/libp2p/js-libp2p/commit/9504f1951a3cca55bb7b4e25e4934e4024034ee8))
* interface-datastore update ([f5c1cd1](https://github.com/libp2p/js-libp2p/commit/f5c1cd1fb07bc73cf9d9da3c2eb4327bed4279a4))



## [0.30.10](https://github.com/libp2p/js-libp2p/compare/v0.30.9...v0.30.10) (2021-03-09)


### Bug Fixes

* conn mgr access to moving averages record object ([#897](https://github.com/libp2p/js-libp2p/issues/897)) ([5f702f3](https://github.com/libp2p/js-libp2p/commit/5f702f3481afd4ad4fbc89f0e9b75a6d56b03520))



## [0.30.9](https://github.com/libp2p/js-libp2p/compare/v0.30.8...v0.30.9) (2021-02-25)


### Bug Fixes

* transport manager fault tolerance should include tolerance to transport listen fail ([#893](https://github.com/libp2p/js-libp2p/issues/893)) ([3f314d5](https://github.com/libp2p/js-libp2p/commit/3f314d5e90f74583b721386d0c9c5d8363cd4de7))



## [0.30.8](https://github.com/libp2p/js-libp2p/compare/v0.30.7...v0.30.8) (2021-02-11)


### Bug Fixes

* routers should only use dht if enabled ([#885](https://github.com/libp2p/js-libp2p/issues/885)) ([a34d2bb](https://github.com/libp2p/js-libp2p/commit/a34d2bbcc3d69ec3006137a909a7e8c53b9d378e))



## [0.30.7](https://github.com/libp2p/js-libp2p/compare/v0.30.6...v0.30.7) (2021-02-01)


### Bug Fixes

* do not add observed address received from peers ([#882](https://github.com/libp2p/js-libp2p/issues/882)) ([a36b211](https://github.com/libp2p/js-libp2p/commit/a36b2112aafcee309a02de0cff5440cf69cd53a7))



## [0.30.6](https://github.com/libp2p/js-libp2p/compare/v0.30.5...v0.30.6) (2021-01-29)


### Bug Fixes

* peer discovery type in config ([#878](https://github.com/libp2p/js-libp2p/issues/878)) ([3e7594f](https://github.com/libp2p/js-libp2p/commit/3e7594f69733bf374b374a6065458fa6cae81c5f))
* unref nat manager retries ([#877](https://github.com/libp2p/js-libp2p/issues/877)) ([ce2a624](https://github.com/libp2p/js-libp2p/commit/ce2a624a09b3107c0b2b4752e666804ecea54fb5))



## [0.30.5](https://github.com/libp2p/js-libp2p/compare/v0.30.4...v0.30.5) (2021-01-28)


### Bug Fixes

* create has optional peer id type ([#875](https://github.com/libp2p/js-libp2p/issues/875)) ([eeda056](https://github.com/libp2p/js-libp2p/commit/eeda05688330c17b810bf47544ef977386623317))



## [0.30.4](https://github.com/libp2p/js-libp2p/compare/v0.30.3...v0.30.4) (2021-01-27)


### Features

* add UPnP NAT manager ([#810](https://github.com/libp2p/js-libp2p/issues/810)) ([0a6bc0d](https://github.com/libp2p/js-libp2p/commit/0a6bc0d1013dfd80ab600e8f74c1544b433ece29))



## [0.30.3](https://github.com/libp2p/js-libp2p/compare/v0.30.2...v0.30.3) (2021-01-27)



## [0.30.2](https://github.com/libp2p/js-libp2p/compare/v0.30.1...v0.30.2) (2021-01-21)


### Bug Fixes

* store multiaddrs during content and peer routing queries ([#865](https://github.com/libp2p/js-libp2p/issues/865)) ([45c3367](https://github.com/libp2p/js-libp2p/commit/45c33675a7412c66d0fd4e113ef8506077b6f492))



## [0.30.1](https://github.com/libp2p/js-libp2p/compare/v0.30.0...v0.30.1) (2021-01-18)


### Bug Fixes

* event emitter types with local types ([#864](https://github.com/libp2p/js-libp2p/issues/864)) ([6c41e30](https://github.com/libp2p/js-libp2p/commit/6c41e3045608bcae8061d20501be5751dad8157a))



# [0.30.0](https://github.com/libp2p/js-libp2p/compare/v0.29.4...v0.30.0) (2020-12-16)


### Bug Fixes

* remove test/dialing/utils extra file ([689c35e](https://github.com/libp2p/js-libp2p/commit/689c35ed1c68e514293a9895d496e2e8440454e9))
* types from ipfs integration ([#832](https://github.com/libp2p/js-libp2p/issues/832)) ([9ae1b75](https://github.com/libp2p/js-libp2p/commit/9ae1b758e99e3fc9067e26b4eae4c15ccb1ba303))


### chore

* update pubsub ([#801](https://github.com/libp2p/js-libp2p/issues/801)) ([e50c6ab](https://github.com/libp2p/js-libp2p/commit/e50c6abcf2ebc80ebf2dfadd015ab21a20cffadc))


### Features

* auto relay ([#723](https://github.com/libp2p/js-libp2p/issues/723)) ([caf66ea](https://github.com/libp2p/js-libp2p/commit/caf66ea1439f6b75a0c321a16bd5c5d7d6a2bd47))
* auto relay network query for new relays ([0bf0b7c](https://github.com/libp2p/js-libp2p/commit/0bf0b7cf8968d55002ac4c559ffb59985feeb092))
* custom announce filter ([ef9d3ca](https://github.com/libp2p/js-libp2p/commit/ef9d3ca2c6f35d692d6079e74088c5146d46eebe))
* custom dialer addr sorter ([#792](https://github.com/libp2p/js-libp2p/issues/792)) ([585ad52](https://github.com/libp2p/js-libp2p/commit/585ad52b4c71dd7514e99a287e0318b2b837ec48))
* discover and connect to closest peers ([#798](https://github.com/libp2p/js-libp2p/issues/798)) ([baedf3f](https://github.com/libp2p/js-libp2p/commit/baedf3fe5ab946e938db1415d1662452cdfc0cc1))


### BREAKING CHANGES

* pubsub signing policy properties were changed according to libp2p-interfaces changes to a single property. The emitSelf option default value was also modified to match the routers value



# [0.30.0-rc.2](https://github.com/libp2p/js-libp2p/compare/v0.30.0-rc.1...v0.30.0-rc.2) (2020-12-15)



# [0.30.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.30.0-rc.0...v0.30.0-rc.1) (2020-12-11)


### Bug Fixes

* types from ipfs integration ([#832](https://github.com/libp2p/js-libp2p/issues/832)) ([216eb97](https://github.com/libp2p/js-libp2p/commit/216eb9730ef473f73a974c3dbaf306ecdc815c8b))



# [0.30.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.29.4...v0.30.0-rc.0) (2020-12-10)


### Bug Fixes

* remove test/dialing/utils extra file ([3f1dc20](https://github.com/libp2p/js-libp2p/commit/3f1dc20caf1c80078f403deb9174cd06d08567ab))


### chore

* update pubsub ([#801](https://github.com/libp2p/js-libp2p/issues/801)) ([9205fce](https://github.com/libp2p/js-libp2p/commit/9205fce34d0cd8dd5d32988be34c110fc0a5b6e2))


### Features

* auto relay ([#723](https://github.com/libp2p/js-libp2p/issues/723)) ([65ec267](https://github.com/libp2p/js-libp2p/commit/65ec267e7f4826caacd042213c3fbacce589ab5b))
* auto relay network query for new relays ([9faf1bf](https://github.com/libp2p/js-libp2p/commit/9faf1bfcf61581acc715b9be78b71dc14501835a))
* custom announce filter ([48476d5](https://github.com/libp2p/js-libp2p/commit/48476d504a98b7b51b3e2dc64eab93670fde0c7b))
* custom dialer addr sorter ([#792](https://github.com/libp2p/js-libp2p/issues/792)) ([91b15b6](https://github.com/libp2p/js-libp2p/commit/91b15b6790952b4db11264961d9c6f2a96d1fe43))
* discover and connect to closest peers ([#798](https://github.com/libp2p/js-libp2p/issues/798)) ([b73106e](https://github.com/libp2p/js-libp2p/commit/b73106eba2d559621f427f7aa788e9b0ef47d135))


### BREAKING CHANGES

* pubsub signing policy properties were changed according to libp2p-interfaces changes to a single property. The emitSelf option default value was also modified to match the routers value



<a name="0.29.4"></a>
## [0.29.4](https://github.com/libp2p/js-libp2p/compare/v0.29.3...v0.29.4) (2020-12-09)


### Bug Fixes

* dial self ([#826](https://github.com/libp2p/js-libp2p/issues/826)) ([6350a18](https://github.com/libp2p/js-libp2p/commit/6350a18))


### Features

* custom and store self agent version + store self protocol version ([#800](https://github.com/libp2p/js-libp2p/issues/800)) ([d0a9fad](https://github.com/libp2p/js-libp2p/commit/d0a9fad))
* support custom listener options ([#822](https://github.com/libp2p/js-libp2p/issues/822)) ([8691465](https://github.com/libp2p/js-libp2p/commit/8691465))



<a name="0.29.3"></a>
## [0.29.3](https://github.com/libp2p/js-libp2p/compare/v0.29.2...v0.29.3) (2020-11-04)


### Features

* resolve multiaddrs before dial ([#782](https://github.com/libp2p/js-libp2p/issues/782)) ([093c0ea](https://github.com/libp2p/js-libp2p/commit/093c0ea))



<a name="0.29.2"></a>
## [0.29.2](https://github.com/libp2p/js-libp2p/compare/v0.29.1...v0.29.2) (2020-10-23)


### Bug Fixes

* cleanup open streams on conn close ([#791](https://github.com/libp2p/js-libp2p/issues/791)) ([06f26e5](https://github.com/libp2p/js-libp2p/commit/06f26e5))



<a name="0.29.1"></a>
## [0.29.1](https://github.com/libp2p/js-libp2p/compare/v0.29.0...v0.29.1) (2020-10-22)


### Bug Fixes

* catch error in upgrader close call ([e04224a](https://github.com/libp2p/js-libp2p/commit/e04224a))
* ensure streams are closed on connection close ([4c6be91](https://github.com/libp2p/js-libp2p/commit/4c6be91))
* flakey identify test firefox ([#774](https://github.com/libp2p/js-libp2p/issues/774)) ([60d437f](https://github.com/libp2p/js-libp2p/commit/60d437f))



<a name="0.29.0"></a>
# [0.29.0](https://github.com/libp2p/js-libp2p/compare/v0.28.10...v0.29.0) (2020-08-27)


### Bug Fixes

* do not return self on peerstore.peers ([15613cc](https://github.com/libp2p/js-libp2p/commit/15613cc))
* peer record interop with go ([#739](https://github.com/libp2p/js-libp2p/issues/739)) ([93dda74](https://github.com/libp2p/js-libp2p/commit/93dda74))
* replace node buffers with uint8arrays ([#730](https://github.com/libp2p/js-libp2p/issues/730)) ([1e86971](https://github.com/libp2p/js-libp2p/commit/1e86971))
* revert new identify protocol versions ([3158366](https://github.com/libp2p/js-libp2p/commit/3158366))
* signature compliant with spec ([4ab125e](https://github.com/libp2p/js-libp2p/commit/4ab125e))


### Chores

* update travis to use node lts and stable ([098f3d1](https://github.com/libp2p/js-libp2p/commit/098f3d1))


### Features

* cerified addressbook ([8f2e690](https://github.com/libp2p/js-libp2p/commit/8f2e690))
* create self peer record in identify ([8a97dde](https://github.com/libp2p/js-libp2p/commit/8a97dde))
* exchange signed peer records in identify ([e50f0ee](https://github.com/libp2p/js-libp2p/commit/e50f0ee))
* gossipsub 1.1 ([#733](https://github.com/libp2p/js-libp2p/issues/733)) ([55c9bfa](https://github.com/libp2p/js-libp2p/commit/55c9bfa))
* signed peer records record manager ([3e5d450](https://github.com/libp2p/js-libp2p/commit/3e5d450))


### Reverts

* reapply "fix: throw if no conn encryption module provided ([#665](https://github.com/libp2p/js-libp2p/issues/665))" ([689f90a](https://github.com/libp2p/js-libp2p/commit/689f90a))


### BREAKING CHANGES

* pubsub implementation is now directly exposed and its API was updated according to the new pubsub interface in js-libp2p-interfaces repo

* chore: use gossipsub branch with src added

* fix: add pubsub handlers adapter

* chore: fix deps

* chore: update pubsub docs and examples

* chore: apply suggestions from code review

Co-authored-by: Jacob Heun <jacobheun@gmail.com>

* chore: use new floodsub

* chore: change validator doc set

Co-authored-by: Jacob Heun <jacobheun@gmail.com>

* chore: add new gossipsub src

Co-authored-by: Jacob Heun <jacobheun@gmail.com>
* - All deps used by this module now use Uint8Arrays in place of node Buffers

* chore: browser fixes

* chore: remove .only

* chore: stringify uint8array before parsing

* chore: update interop suite

* chore: remove ts from build command

* chore: update deps

* fix: update records to use uint8array

* chore: fix lint

* chore: update deps

Co-authored-by: Jacob Heun <jacobheun@gmail.com>
* this drops testing support in node 10.



<a name="0.29.0-rc.1"></a>
# [0.29.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.29.0-rc.0...v0.29.0-rc.1) (2020-08-27)


### Bug Fixes

* peer record interop with go ([#739](https://github.com/libp2p/js-libp2p/issues/739)) ([c4c7ef9](https://github.com/libp2p/js-libp2p/commit/c4c7ef9))



<a name="0.29.0-rc.0"></a>
# [0.29.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.28.10...v0.29.0-rc.0) (2020-08-25)


### Bug Fixes

* do not return self on peerstore.peers ([e1b8edc](https://github.com/libp2p/js-libp2p/commit/e1b8edc))
* replace node buffers with uint8arrays ([#730](https://github.com/libp2p/js-libp2p/issues/730)) ([507f8c4](https://github.com/libp2p/js-libp2p/commit/507f8c4))
* revert new identify protocol versions ([a798c65](https://github.com/libp2p/js-libp2p/commit/a798c65))
* signature compliant with spec ([97b5d2a](https://github.com/libp2p/js-libp2p/commit/97b5d2a))


### Chores

* update travis to use node lts and stable ([c272288](https://github.com/libp2p/js-libp2p/commit/c272288))


### Features

* cerified addressbook ([e0ed258](https://github.com/libp2p/js-libp2p/commit/e0ed258))
* create self peer record in identify ([83922a7](https://github.com/libp2p/js-libp2p/commit/83922a7))
* exchange signed peer records in identify ([f835457](https://github.com/libp2p/js-libp2p/commit/f835457))
* gossipsub 1.1 ([#733](https://github.com/libp2p/js-libp2p/issues/733)) ([e14ce40](https://github.com/libp2p/js-libp2p/commit/e14ce40))
* signed peer records record manager ([f95edf1](https://github.com/libp2p/js-libp2p/commit/f95edf1))


### Reverts

* reapply "fix: throw if no conn encryption module provided ([#665](https://github.com/libp2p/js-libp2p/issues/665))" ([ad7f02e](https://github.com/libp2p/js-libp2p/commit/ad7f02e))


### BREAKING CHANGES

* pubsub implementation is now directly exposed and its API was updated according to the new pubsub interface in js-libp2p-interfaces repo

* chore: use gossipsub branch with src added

* fix: add pubsub handlers adapter

* chore: fix deps

* chore: update pubsub docs and examples

* chore: apply suggestions from code review

Co-authored-by: Jacob Heun <jacobheun@gmail.com>

* chore: use new floodsub

* chore: change validator doc set

Co-authored-by: Jacob Heun <jacobheun@gmail.com>

* chore: add new gossipsub src

Co-authored-by: Jacob Heun <jacobheun@gmail.com>
* - All deps used by this module now use Uint8Arrays in place of node Buffers

* chore: browser fixes

* chore: remove .only

* chore: stringify uint8array before parsing

* chore: update interop suite

* chore: remove ts from build command

* chore: update deps

* fix: update records to use uint8array

* chore: fix lint

* chore: update deps

Co-authored-by: Jacob Heun <jacobheun@gmail.com>
* this drops testing support in node 10.



<a name="0.28.10"></a>
## [0.28.10](https://github.com/libp2p/js-libp2p/compare/v0.28.9...v0.28.10) (2020-08-05)


### Bug Fixes

* allow certain keychain operations without a password ([#726](https://github.com/libp2p/js-libp2p/issues/726)) ([8c56ec0](https://github.com/libp2p/js-libp2p/commit/8c56ec0))
* **identify:** make agentversion dynamic and add it to the peerstore ([#724](https://github.com/libp2p/js-libp2p/issues/724)) ([726a746](https://github.com/libp2p/js-libp2p/commit/726a746))


### Features

* **keychain:** add support for ed25519 and secp keys ([#725](https://github.com/libp2p/js-libp2p/issues/725)) ([51d7ca4](https://github.com/libp2p/js-libp2p/commit/51d7ca4))



<a name="0.28.9"></a>
## [0.28.9](https://github.com/libp2p/js-libp2p/compare/v0.28.8...v0.28.9) (2020-07-27)


### Bug Fixes

* ping multiaddr from peer not previously stored in peerstore ([#719](https://github.com/libp2p/js-libp2p/issues/719)) ([2440c87](https://github.com/libp2p/js-libp2p/commit/2440c87))



<a name="0.28.8"></a>
## [0.28.8](https://github.com/libp2p/js-libp2p/compare/v0.28.7...v0.28.8) (2020-07-20)


### Bug Fixes

* create dial target for peer with no known addrs ([#715](https://github.com/libp2p/js-libp2p/issues/715)) ([7da9ad4](https://github.com/libp2p/js-libp2p/commit/7da9ad4))



<a name="0.28.7"></a>
## [0.28.7](https://github.com/libp2p/js-libp2p/compare/v0.28.6...v0.28.7) (2020-07-14)


### Bug Fixes

* retimer reschedule does not work as interval ([#710](https://github.com/libp2p/js-libp2p/issues/710)) ([999c1b7](https://github.com/libp2p/js-libp2p/commit/999c1b7))



<a name="0.28.6"></a>
## [0.28.6](https://github.com/libp2p/js-libp2p/compare/v0.28.5...v0.28.6) (2020-07-14)


### Bug Fixes

* not dial all known peers in parallel on startup ([#698](https://github.com/libp2p/js-libp2p/issues/698)) ([9ccab40](https://github.com/libp2p/js-libp2p/commit/9ccab40))



<a name="0.28.5"></a>
## [0.28.5](https://github.com/libp2p/js-libp2p/compare/v0.28.4...v0.28.5) (2020-07-10)


### Bug Fixes

* pass libp2p to the dht ([#700](https://github.com/libp2p/js-libp2p/issues/700)) ([5a84dd5](https://github.com/libp2p/js-libp2p/commit/5a84dd5))



<a name="0.28.4"></a>
## [0.28.4](https://github.com/libp2p/js-libp2p/compare/v0.28.3...v0.28.4) (2020-07-03)



<a name="0.28.3"></a>
## [0.28.3](https://github.com/libp2p/js-libp2p/compare/v0.28.2...v0.28.3) (2020-06-18)


### Bug Fixes

* catch pipe errors ([#678](https://github.com/libp2p/js-libp2p/issues/678)) ([a8219e6](https://github.com/libp2p/js-libp2p/commit/a8219e6))



<a name="0.28.2"></a>
## [0.28.2](https://github.com/libp2p/js-libp2p/compare/v0.28.1...v0.28.2) (2020-06-15)


### Reverts

* "fix: throw if no conn encryption module provided ([#665](https://github.com/libp2p/js-libp2p/issues/665))" ([b621fbd](https://github.com/libp2p/js-libp2p/commit/b621fbd))



<a name="0.28.1"></a>
## [0.28.1](https://github.com/libp2p/js-libp2p/compare/v0.28.0...v0.28.1) (2020-06-12)


### Bug Fixes

* throw if no conn encryption module provided ([#665](https://github.com/libp2p/js-libp2p/issues/665)) ([c038550](https://github.com/libp2p/js-libp2p/commit/c038550))


### Features

* add ConnectionManager#getAll ([8f680e2](https://github.com/libp2p/js-libp2p/commit/8f680e2))



<a name="0.28.0"></a>
# [0.28.0](https://github.com/libp2p/js-libp2p/compare/v0.28.0-rc.0...v0.28.0) (2020-06-05)



<a name="0.28.0-rc.0"></a>
# [0.28.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.27.8...v0.28.0-rc.0) (2020-05-28)


### Bug Fixes

* always emit when a connection is made ([72f37ac](https://github.com/libp2p/js-libp2p/commit/72f37ac))
* expose the muxed stream interface on inbound streams ([52a615f](https://github.com/libp2p/js-libp2p/commit/52a615f))
* libp2p connections getter ([aaf62a4](https://github.com/libp2p/js-libp2p/commit/aaf62a4))
* onConnect should not add addr to the addressBook ([2b45fee](https://github.com/libp2p/js-libp2p/commit/2b45fee))
* use libp2p.multiaddrs instead of listen ([7fbd155](https://github.com/libp2p/js-libp2p/commit/7fbd155))
* **example:** rename misleading variable ([#645](https://github.com/libp2p/js-libp2p/issues/645)) ([b781911](https://github.com/libp2p/js-libp2p/commit/b781911))


### Chores

* deprecate old peer store api ([#598](https://github.com/libp2p/js-libp2p/issues/598)) ([ed6d5bb](https://github.com/libp2p/js-libp2p/commit/ed6d5bb))
* remove peer-info usage ([12e48ad](https://github.com/libp2p/js-libp2p/commit/12e48ad))


### Features

* address and proto books ([#590](https://github.com/libp2p/js-libp2p/issues/590)) ([e9d225c](https://github.com/libp2p/js-libp2p/commit/e9d225c))
* address manager ([2a7967c](https://github.com/libp2p/js-libp2p/commit/2a7967c))
* keybook ([ce38033](https://github.com/libp2p/js-libp2p/commit/ce38033))
* metadata book ([#638](https://github.com/libp2p/js-libp2p/issues/638)) ([84b935f](https://github.com/libp2p/js-libp2p/commit/84b935f))
* peerStore persistence ([5123a83](https://github.com/libp2p/js-libp2p/commit/5123a83))
* support dial only on transport manager to tolerate errors ([#643](https://github.com/libp2p/js-libp2p/issues/643)) ([698c1df](https://github.com/libp2p/js-libp2p/commit/698c1df))


### BREAKING CHANGES

* all API methods with peer-info parameters or return values were changed. You can check the API.md document, in order to check the new values to use
* the peer-store api changed. Check the API docs for the new specification.

* chore: apply suggestions from code review

Co-Authored-By: Jacob Heun <jacobheun@gmail.com>

* chore: apply suggestions from code review

Co-Authored-By: Jacob Heun <jacobheun@gmail.com>

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



<a name="0.27.8"></a>
## [0.27.8](https://github.com/libp2p/js-libp2p/compare/v0.27.7...v0.27.8) (2020-05-06)


### Bug Fixes

* reset discovery services upon stop ([#618](https://github.com/libp2p/js-libp2p/issues/618)) ([ea0621b](https://github.com/libp2p/js-libp2p/commit/ea0621b))



<a name="0.27.7"></a>
## [0.27.7](https://github.com/libp2p/js-libp2p/compare/v0.27.6...v0.27.7) (2020-04-24)


### Bug Fixes

* remove node global ([#587](https://github.com/libp2p/js-libp2p/issues/587)) ([9b13fe3](https://github.com/libp2p/js-libp2p/commit/9b13fe3))



<a name="0.27.6"></a>
## [0.27.6](https://github.com/libp2p/js-libp2p/compare/v0.27.5...v0.27.6) (2020-04-16)


### Bug Fixes

* add null check in libp2p.hangUp() ([c940f2d](https://github.com/libp2p/js-libp2p/commit/c940f2d))
* make circuit relay listening addresses more forgiving ([#604](https://github.com/libp2p/js-libp2p/issues/604)) ([e192eb6](https://github.com/libp2p/js-libp2p/commit/e192eb6))



<a name="0.27.5"></a>
## [0.27.5](https://github.com/libp2p/js-libp2p/compare/v0.27.4...v0.27.5) (2020-04-06)


### Bug Fixes

* await peer discovery start in libp2p start ([#600](https://github.com/libp2p/js-libp2p/issues/600)) ([bd7fd0f](https://github.com/libp2p/js-libp2p/commit/bd7fd0f))



<a name="0.27.4"></a>
## [0.27.4](https://github.com/libp2p/js-libp2p/compare/v0.27.3...v0.27.4) (2020-03-31)


### Bug Fixes

* only use a single export ([#596](https://github.com/libp2p/js-libp2p/issues/596)) ([3072875](https://github.com/libp2p/js-libp2p/commit/3072875))
* pass libp2p to discovery services ([#597](https://github.com/libp2p/js-libp2p/issues/597)) ([9e35fbc](https://github.com/libp2p/js-libp2p/commit/9e35fbc))
* **test:** improve flakey random walk discovery test ([#574](https://github.com/libp2p/js-libp2p/issues/574)) ([f4ec355](https://github.com/libp2p/js-libp2p/commit/f4ec355))
* remove use of assert module ([#561](https://github.com/libp2p/js-libp2p/issues/561)) ([a8984c6](https://github.com/libp2p/js-libp2p/commit/a8984c6))



<a name="0.27.3"></a>
## [0.27.3](https://github.com/libp2p/js-libp2p/compare/v0.27.2...v0.27.3) (2020-02-11)


### Bug Fixes

* dont allow multiaddr dials without a peer id ([#558](https://github.com/libp2p/js-libp2p/issues/558)) ([a317a8b](https://github.com/libp2p/js-libp2p/commit/a317a8b))



<a name="0.27.2"></a>
## [0.27.2](https://github.com/libp2p/js-libp2p/compare/v0.27.1...v0.27.2) (2020-02-05)


### Bug Fixes

* ensure identify streams are closed ([#551](https://github.com/libp2p/js-libp2p/issues/551)) ([f662fdc](https://github.com/libp2p/js-libp2p/commit/f662fdc))



<a name="0.27.1"></a>
## [0.27.1](https://github.com/libp2p/js-libp2p/compare/v0.27.0...v0.27.1) (2020-02-03)


### Bug Fixes

* stop stream after first pong received ([#545](https://github.com/libp2p/js-libp2p/issues/545)) ([be8fc9d](https://github.com/libp2p/js-libp2p/commit/be8fc9d))



<a name="0.27.0"></a>
# [0.27.0](https://github.com/libp2p/js-libp2p/compare/v0.26.2...v0.27.0) (2020-01-28)


### Bug Fixes

* clean up peer discovery flow ([#494](https://github.com/libp2p/js-libp2p/issues/494)) ([12fc069](https://github.com/libp2p/js-libp2p/commit/12fc069))
* clean up pending dials abort per feedback ([633b0c2](https://github.com/libp2p/js-libp2p/commit/633b0c2))
* conn mngr min/max connection values ([#528](https://github.com/libp2p/js-libp2p/issues/528)) ([ba4681b](https://github.com/libp2p/js-libp2p/commit/ba4681b))
* correct release readme ([ce8e60b](https://github.com/libp2p/js-libp2p/commit/ce8e60b))
* examples readme typos ([#481](https://github.com/libp2p/js-libp2p/issues/481)) ([35ac02d](https://github.com/libp2p/js-libp2p/commit/35ac02d))
* make dialer configurable ([#521](https://github.com/libp2p/js-libp2p/issues/521)) ([4ca481b](https://github.com/libp2p/js-libp2p/commit/4ca481b))
* performance bottleneck in stat.js ([#463](https://github.com/libp2p/js-libp2p/issues/463)) ([93a1e42](https://github.com/libp2p/js-libp2p/commit/93a1e42))
* registrar should filter the disconnected conn ([#532](https://github.com/libp2p/js-libp2p/issues/532)) ([bb2e56e](https://github.com/libp2p/js-libp2p/commit/bb2e56e))
* release tokens as soon as they are available ([2570a1b](https://github.com/libp2p/js-libp2p/commit/2570a1b))
* replace peerInfo addresses with listen addresses ([#485](https://github.com/libp2p/js-libp2p/issues/485)) ([1999606](https://github.com/libp2p/js-libp2p/commit/1999606))
* stop discoveries ([#530](https://github.com/libp2p/js-libp2p/issues/530)) ([4222c49](https://github.com/libp2p/js-libp2p/commit/4222c49))
* token release logic ([90ecc57](https://github.com/libp2p/js-libp2p/commit/90ecc57))
* upgrader should not need muxers ([#517](https://github.com/libp2p/js-libp2p/issues/517)) ([5d7ee50](https://github.com/libp2p/js-libp2p/commit/5d7ee50))
* use toB58String everywhere to be consistent ([#537](https://github.com/libp2p/js-libp2p/issues/537)) ([c1038be](https://github.com/libp2p/js-libp2p/commit/c1038be))


### Features

* abort all pending dials on stop ([ba02764](https://github.com/libp2p/js-libp2p/commit/ba02764))
* add early token recycling in ([a5b54a7](https://github.com/libp2p/js-libp2p/commit/a5b54a7))
* add libp2p.connections getter ([#522](https://github.com/libp2p/js-libp2p/issues/522)) ([6445fda](https://github.com/libp2p/js-libp2p/commit/6445fda))
* add token based dialer ([e445a17](https://github.com/libp2p/js-libp2p/commit/e445a17))
* allow transport options to be passed on creation ([#524](https://github.com/libp2p/js-libp2p/issues/524)) ([c339be1](https://github.com/libp2p/js-libp2p/commit/c339be1))
* coalescing dial support ([#518](https://github.com/libp2p/js-libp2p/issues/518)) ([15f7c2a](https://github.com/libp2p/js-libp2p/commit/15f7c2a))
* discovery modules ([#486](https://github.com/libp2p/js-libp2p/issues/486)) ([18a062e](https://github.com/libp2p/js-libp2p/commit/18a062e))
* discovery modules from transports should be added ([#510](https://github.com/libp2p/js-libp2p/issues/510)) ([f1eb373](https://github.com/libp2p/js-libp2p/commit/f1eb373))
* peer store ([#470](https://github.com/libp2p/js-libp2p/issues/470)) ([582094a](https://github.com/libp2p/js-libp2p/commit/582094a))
* registrar ([#471](https://github.com/libp2p/js-libp2p/issues/471)) ([9d52b80](https://github.com/libp2p/js-libp2p/commit/9d52b80))
* support peer-id instances in peer store operations ([#491](https://github.com/libp2p/js-libp2p/issues/491)) ([8da9fc9](https://github.com/libp2p/js-libp2p/commit/8da9fc9))



<a name="0.27.0-rc.0"></a>
# [0.27.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.27.0-pre.2...v0.27.0-rc.0) (2020-01-24)


### Bug Fixes

* registrar should filter the disconnected conn ([#532](https://github.com/libp2p/js-libp2p/issues/532)) ([83409de](https://github.com/libp2p/js-libp2p/commit/83409de))
* stop discoveries ([#530](https://github.com/libp2p/js-libp2p/issues/530)) ([c44e6e3](https://github.com/libp2p/js-libp2p/commit/c44e6e3))
* use toB58String everywhere to be consistent ([#537](https://github.com/libp2p/js-libp2p/issues/537)) ([31d1b23](https://github.com/libp2p/js-libp2p/commit/31d1b23))



<a name="0.27.0-pre.2"></a>
# [0.27.0-pre.2](https://github.com/libp2p/js-libp2p/compare/v0.27.0-pre.1...v0.27.0-pre.2) (2020-01-07)


### Bug Fixes

* conn mngr min/max connection values ([#528](https://github.com/libp2p/js-libp2p/issues/528)) ([a1717da](https://github.com/libp2p/js-libp2p/commit/a1717da))
* make dialer configurable ([#521](https://github.com/libp2p/js-libp2p/issues/521)) ([24c3ce6](https://github.com/libp2p/js-libp2p/commit/24c3ce6))
* upgrader should not need muxers ([#517](https://github.com/libp2p/js-libp2p/issues/517)) ([56a1825](https://github.com/libp2p/js-libp2p/commit/56a1825))


### Features

* add libp2p.connections getter ([#522](https://github.com/libp2p/js-libp2p/issues/522)) ([6ca19c5](https://github.com/libp2p/js-libp2p/commit/6ca19c5))
* allow transport options to be passed on creation ([#524](https://github.com/libp2p/js-libp2p/issues/524)) ([0d4b2bd](https://github.com/libp2p/js-libp2p/commit/0d4b2bd))



<a name="0.27.0-pre.1"></a>
# [0.27.0-pre.1](https://github.com/libp2p/js-libp2p/compare/v0.27.0-pre.0...v0.27.0-pre.1) (2019-12-15)


### Features

* coalescing dial support ([#518](https://github.com/libp2p/js-libp2p/issues/518)) ([4a871bb](https://github.com/libp2p/js-libp2p/commit/4a871bb))



<a name="0.27.0-pre.0"></a>
# [0.27.0-pre.0](https://github.com/libp2p/js-libp2p/compare/v0.26.2...v0.27.0-pre.0) (2019-12-12)


### Bug Fixes

* clean up peer discovery flow ([#494](https://github.com/libp2p/js-libp2p/issues/494)) ([f3eb1f1](https://github.com/libp2p/js-libp2p/commit/f3eb1f1))
* clean up pending dials abort per feedback ([7c3371b](https://github.com/libp2p/js-libp2p/commit/7c3371b))
* correct release readme ([c4bc00b](https://github.com/libp2p/js-libp2p/commit/c4bc00b))
* examples readme typos ([#481](https://github.com/libp2p/js-libp2p/issues/481)) ([35ac02d](https://github.com/libp2p/js-libp2p/commit/35ac02d))
* performance bottleneck in stat.js ([#463](https://github.com/libp2p/js-libp2p/issues/463)) ([93a1e42](https://github.com/libp2p/js-libp2p/commit/93a1e42))
* release tokens as soon as they are available ([43440aa](https://github.com/libp2p/js-libp2p/commit/43440aa))
* replace peerInfo addresses with listen addresses ([#485](https://github.com/libp2p/js-libp2p/issues/485)) ([acbbc0f](https://github.com/libp2p/js-libp2p/commit/acbbc0f))
* token release logic ([1838a64](https://github.com/libp2p/js-libp2p/commit/1838a64))


### Features

* abort all pending dials on stop ([754fbc2](https://github.com/libp2p/js-libp2p/commit/754fbc2))
* add early token recycling in ([24c6037](https://github.com/libp2p/js-libp2p/commit/24c6037))
* add token based dialer ([f8540fa](https://github.com/libp2p/js-libp2p/commit/f8540fa))
* discovery modules ([#486](https://github.com/libp2p/js-libp2p/issues/486)) ([997ee16](https://github.com/libp2p/js-libp2p/commit/997ee16))
* discovery modules from transports should be added ([#510](https://github.com/libp2p/js-libp2p/issues/510)) ([af96dcc](https://github.com/libp2p/js-libp2p/commit/af96dcc))
* peer store ([#470](https://github.com/libp2p/js-libp2p/issues/470)) ([f3e276e](https://github.com/libp2p/js-libp2p/commit/f3e276e))
* registrar ([#471](https://github.com/libp2p/js-libp2p/issues/471)) ([797d8f0](https://github.com/libp2p/js-libp2p/commit/797d8f0))
* support peer-id instances in peer store operations ([#491](https://github.com/libp2p/js-libp2p/issues/491)) ([11ed6bd](https://github.com/libp2p/js-libp2p/commit/11ed6bd))



<a name="0.26.2"></a>
## [0.26.2](https://github.com/libp2p/js-libp2p/compare/v0.26.1...v0.26.2) (2019-09-24)


### Bug Fixes

* pubsub promisify ([#456](https://github.com/libp2p/js-libp2p/issues/456)) ([ae6af20](https://github.com/libp2p/js-libp2p/commit/ae6af20))



<a name="0.26.1"></a>
## [0.26.1](https://github.com/libp2p/js-libp2p/compare/v0.26.0...v0.26.1) (2019-08-21)


### Bug Fixes

* avoid using superstruct interface ([aa95ab9](https://github.com/libp2p/js-libp2p/commit/aa95ab9))
* improve config defaults ([#409](https://github.com/libp2p/js-libp2p/issues/409)) ([3eef695](https://github.com/libp2p/js-libp2p/commit/3eef695)), closes [#406](https://github.com/libp2p/js-libp2p/issues/406)
* pubsub configuration ([#404](https://github.com/libp2p/js-libp2p/issues/404)) ([b0f124b](https://github.com/libp2p/js-libp2p/commit/b0f124b)), closes [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401) [#401](https://github.com/libp2p/js-libp2p/issues/401)
* reference files directly to avoid npm install failures ([#408](https://github.com/libp2p/js-libp2p/issues/408)) ([b3deb35](https://github.com/libp2p/js-libp2p/commit/b3deb35))
* reject rather than throw in get peer info ([#410](https://github.com/libp2p/js-libp2p/issues/410)) ([60b0cbc](https://github.com/libp2p/js-libp2p/commit/60b0cbc)), closes [#400](https://github.com/libp2p/js-libp2p/issues/400)



<a name="0.26.0"></a>
# [0.26.0](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.3...v0.26.0) (2019-08-07)



<a name="0.26.0-rc.3"></a>
# [0.26.0-rc.3](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.2...v0.26.0-rc.3) (2019-08-06)


### Bug Fixes

* promisified methods ([#398](https://github.com/libp2p/js-libp2p/issues/398)) ([ff7a6c8](https://github.com/libp2p/js-libp2p/commit/ff7a6c8))



<a name="0.26.0-rc.2"></a>
# [0.26.0-rc.2](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.1...v0.26.0-rc.2) (2019-08-01)


### Bug Fixes

* dont override methods of created instance ([#394](https://github.com/libp2p/js-libp2p/issues/394)) ([3e95e6f](https://github.com/libp2p/js-libp2p/commit/3e95e6f))
* pubsub default config ([#393](https://github.com/libp2p/js-libp2p/issues/393)) ([f4f3f0f](https://github.com/libp2p/js-libp2p/commit/f4f3f0f))


### Chores

* update switch ([#395](https://github.com/libp2p/js-libp2p/issues/395)) ([684f283](https://github.com/libp2p/js-libp2p/commit/684f283))


### BREAKING CHANGES

* switch configuration has changed.
'blacklistTTL' is now 'denyTTL' and 'blackListAttempts' is now 'denyAttempts'



<a name="0.26.0-rc.1"></a>
# [0.26.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.26.0-rc.0...v0.26.0-rc.1) (2019-07-31)



<a name="0.26.0-rc.0"></a>
# [0.26.0-rc.0](https://github.com/libp2p/js-libp2p/compare/v0.25.5...v0.26.0-rc.0) (2019-07-31)


### Bug Fixes

* make subscribe comply with ipfs interface ([#389](https://github.com/libp2p/js-libp2p/issues/389)) ([9554b05](https://github.com/libp2p/js-libp2p/commit/9554b05))


### Features

* integrate gossipsub by default ([#365](https://github.com/libp2p/js-libp2p/issues/365)) ([791f39a](https://github.com/libp2p/js-libp2p/commit/791f39a))
* promisify all api methods that accept callbacks ([#381](https://github.com/libp2p/js-libp2p/issues/381)) ([df6ef45](https://github.com/libp2p/js-libp2p/commit/df6ef45))


### BREAKING CHANGES

* new configuration for deciding the implementation of pubsub to be used.
In this context, the experimental flags were also removed. See the README for the latest usage.
* The ipfs interface specified that options
should be provided after the handler, not before.
https://github.com/ipfs/interface-js-ipfs-core/blob/v0.109.0/SPEC/PUBSUB.md#pubsubsubscribe

This corrects the order of parameters. See the jsdocs examples
for subscribe to see how it should be used.



<a name="0.25.5"></a>
## [0.25.5](https://github.com/libp2p/js-libp2p/compare/v0.25.4...v0.25.5) (2019-07-12)


### Bug Fixes

* peer routing for delegate router ([#377](https://github.com/libp2p/js-libp2p/issues/377)) ([905c911](https://github.com/libp2p/js-libp2p/commit/905c911)), closes [/github.com/libp2p/go-libp2p-core/blob/6e566d10f4a5447317a66d64c7459954b969bdab/routing/query.go#L15-L24](https://github.com//github.com/libp2p/go-libp2p-core/blob/6e566d10f4a5447317a66d64c7459954b969bdab/routing/query.go/issues/L15-L24)



<a name="0.25.4"></a>
## [0.25.4](https://github.com/libp2p/js-libp2p/compare/v0.25.3...v0.25.4) (2019-06-07)


### Features

* add createLibp2p to generate a PeerInfo instance ([#367](https://github.com/libp2p/js-libp2p/issues/367)) ([04faf18](https://github.com/libp2p/js-libp2p/commit/04faf18))
* pass libp2p as option to transport creation ([#363](https://github.com/libp2p/js-libp2p/issues/363)) ([b06ca1b](https://github.com/libp2p/js-libp2p/commit/b06ca1b))



<a name="0.25.3"></a>
## [0.25.3](https://github.com/libp2p/js-libp2p/compare/v0.25.2...v0.25.3) (2019-05-07)


### Features

* sign pubsub messages ([#362](https://github.com/libp2p/js-libp2p/issues/362)) ([40978a1](https://github.com/libp2p/js-libp2p/commit/40978a1))



<a name="0.25.2"></a>
## [0.25.2](https://github.com/libp2p/js-libp2p/compare/v0.25.1...v0.25.2) (2019-04-17)


### Bug Fixes

* dht config ([#359](https://github.com/libp2p/js-libp2p/issues/359)) ([f3801f0](https://github.com/libp2p/js-libp2p/commit/f3801f0))



<a name="0.25.1"></a>
## [0.25.1](https://github.com/libp2p/js-libp2p/compare/v0.25.0...v0.25.1) (2019-04-16)


### Bug Fixes

* bail when discovering self ([#357](https://github.com/libp2p/js-libp2p/issues/357)) ([f28dffb](https://github.com/libp2p/js-libp2p/commit/f28dffb))



<a name="0.25.0"></a>
# [0.25.0](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.6...v0.25.0) (2019-04-12)


### Bug Fixes

* allow switch to be configured ([#354](https://github.com/libp2p/js-libp2p/issues/354)) ([eb5aa03](https://github.com/libp2p/js-libp2p/commit/eb5aa03))



<a name="0.25.0-rc.6"></a>
# [0.25.0-rc.6](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.5...v0.25.0-rc.6) (2019-04-11)


### Bug Fixes

* connection emits ([#352](https://github.com/libp2p/js-libp2p/issues/352)) ([313b1ea](https://github.com/libp2p/js-libp2p/commit/313b1ea))
* remove unneeded peerbook puts ([#348](https://github.com/libp2p/js-libp2p/issues/348)) ([e5f19e8](https://github.com/libp2p/js-libp2p/commit/e5f19e8))


### Features

* auto dial discovered peers ([#349](https://github.com/libp2p/js-libp2p/issues/349)) ([01aa447](https://github.com/libp2p/js-libp2p/commit/01aa447))



<a name="0.25.0-rc.5"></a>
# [0.25.0-rc.5](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.4...v0.25.0-rc.5) (2019-03-21)


### Bug Fixes

* disable dht by default [#338](https://github.com/libp2p/js-libp2p/issues/338) ([#339](https://github.com/libp2p/js-libp2p/issues/339)) ([e52ce66](https://github.com/libp2p/js-libp2p/commit/e52ce66))


### Features

* update to the latest switch ([#336](https://github.com/libp2p/js-libp2p/issues/336)) ([eee60ed](https://github.com/libp2p/js-libp2p/commit/eee60ed))



<a name="0.25.0-rc.4"></a>
# [0.25.0-rc.4](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.3...v0.25.0-rc.4) (2019-03-06)



<a name="0.25.0-rc.3"></a>
# [0.25.0-rc.3](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.2...v0.25.0-rc.3) (2019-02-26)



<a name="0.25.0-rc.2"></a>
# [0.25.0-rc.2](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.1...v0.25.0-rc.2) (2019-02-26)


### Bug Fixes

* make the config less restrictive ([#329](https://github.com/libp2p/js-libp2p/issues/329)) ([5f92acd](https://github.com/libp2p/js-libp2p/commit/5f92acd))



<a name="0.25.0-rc.1"></a>
# [0.25.0-rc.1](https://github.com/libp2p/js-libp2p/compare/v0.25.0-rc.0...v0.25.0-rc.1) (2019-02-21)


### Bug Fixes

* bundle-size ([#298](https://github.com/libp2p/js-libp2p/issues/298)) ([d497961](https://github.com/libp2p/js-libp2p/commit/d497961))
* emit peer discovery for dht discovery ([9e7a080](https://github.com/libp2p/js-libp2p/commit/9e7a080))


### Features

* support unsubscribe all for pubsub ([#321](https://github.com/libp2p/js-libp2p/issues/321)) ([6e76aad](https://github.com/libp2p/js-libp2p/commit/6e76aad))



<a name="0.24.4"></a>
## [0.24.4](https://github.com/libp2p/js-libp2p/compare/v0.24.3...v0.24.4) (2019-01-04)



<a name="0.24.3"></a>
## [0.24.3](https://github.com/libp2p/js-libp2p/compare/v0.24.2...v0.24.3) (2018-12-14)


### Bug Fixes

* not started yet ([#297](https://github.com/libp2p/js-libp2p/issues/297)) ([fdfb7b4](https://github.com/libp2p/js-libp2p/commit/fdfb7b4))



<a name="0.24.2"></a>
## [0.24.2](https://github.com/libp2p/js-libp2p/compare/v0.24.1...v0.24.2) (2018-12-04)


### Bug Fixes

* use symbol instead of constructor name ([#292](https://github.com/libp2p/js-libp2p/issues/292)) ([53ed3bd](https://github.com/libp2p/js-libp2p/commit/53ed3bd))



<a name="0.24.1"></a>
## [0.24.1](https://github.com/libp2p/js-libp2p/compare/v0.24.0...v0.24.1) (2018-12-03)


### Features

* allow configurable validators and selectors to the dht ([#288](https://github.com/libp2p/js-libp2p/issues/288)) ([7d12eb9](https://github.com/libp2p/js-libp2p/commit/7d12eb9))



<a name="0.24.0"></a>
# [0.24.0](https://github.com/libp2p/js-libp2p/compare/v0.24.0-rc.3...v0.24.0) (2018-11-16)

### Bug Fixes

* add maxtimeout to dht get ([#248](https://github.com/libp2p/js-libp2p/issues/248)) ([69f7264](https://github.com/libp2p/js-libp2p/commit/69f7264))
* dht get options ([4460e82](https://github.com/libp2p/js-libp2p/commit/4460e82))
* dont call callback before it's properly set ([17b5f73](https://github.com/libp2p/js-libp2p/commit/17b5f73))
* improve get peer info errors ([714b6ec](https://github.com/libp2p/js-libp2p/commit/714b6ec))
* start kad dht random walk ([#251](https://github.com/libp2p/js-libp2p/issues/251)) ([dd934b9](https://github.com/libp2p/js-libp2p/commit/dd934b9))

### Features

* add datastore to config ([40e840d](https://github.com/libp2p/js-libp2p/commit/40e840d))
* add delegated peer and content routing support ([#242](https://github.com/libp2p/js-libp2p/issues/242)) ([a95389a](https://github.com/libp2p/js-libp2p/commit/a95389a))
* add maxNumProviders to findprovs ([#283](https://github.com/libp2p/js-libp2p/issues/283)) ([970deec](https://github.com/libp2p/js-libp2p/commit/970deec))
* conditionally emit errors ([f71fdfd](https://github.com/libp2p/js-libp2p/commit/f71fdfd))
* enable relay by default (no hop) ([#254](https://github.com/libp2p/js-libp2p/issues/254)) ([686379e](https://github.com/libp2p/js-libp2p/commit/686379e))
* make libp2p a state machine ([#257](https://github.com/libp2p/js-libp2p/issues/257)) ([0b75f99](https://github.com/libp2p/js-libp2p/commit/0b75f99))
* use package-table vs custom script ([a63432e](https://github.com/libp2p/js-libp2p/commit/a63432e))

<a name="0.23.1"></a>
## [0.23.1](https://github.com/libp2p/js-libp2p/compare/v0.23.0...v0.23.1) (2018-08-13)


### Bug Fixes

* callback with error for invalid or non-peer multiaddr ([#232](https://github.com/libp2p/js-libp2p/issues/232)) ([c8a86db](https://github.com/libp2p/js-libp2p/commit/c8a86db))



<a name="0.23.0"></a>
# [0.23.0](https://github.com/libp2p/js-libp2p/compare/v0.22.0...v0.23.0) (2018-07-27)


### Bug Fixes

* start and stop connection manager with libp2p ([6106915](https://github.com/libp2p/js-libp2p/commit/6106915))


### Features

* add check for protector and enforced pnet ([2b7cc55](https://github.com/libp2p/js-libp2p/commit/2b7cc55))



<a name="0.22.0"></a>
# [0.22.0](https://github.com/libp2p/js-libp2p/compare/v0.21.0...v0.22.0) (2018-06-29)


### Bug Fixes

* add null property guards ([80f0b60](https://github.com/libp2p/js-libp2p/commit/80f0b60))
* do not mutate the config object ([ac5cacb](https://github.com/libp2p/js-libp2p/commit/ac5cacb))
* remove .only ([be9eafe](https://github.com/libp2p/js-libp2p/commit/be9eafe))
* remove peer discovery module config checks ([4ad70ef](https://github.com/libp2p/js-libp2p/commit/4ad70ef))
* typo in fixture and fail for correct reason ([1af5ba9](https://github.com/libp2p/js-libp2p/commit/1af5ba9))


### Features

* enable peer discovery modules by default ([e320854](https://github.com/libp2p/js-libp2p/commit/e320854))



<a name="0.21.0"></a>
# [0.21.0](https://github.com/libp2p/js-libp2p/compare/v0.20.4...v0.21.0) (2018-06-28)


### Bug Fixes

* lock wrtc to 0.1.1 ([6507379](https://github.com/libp2p/js-libp2p/commit/6507379))


### Features

* (BREAKING CHANGE) overhaul libp2p config and constructor ([6905f1b](https://github.com/libp2p/js-libp2p/commit/6905f1b))
* set and hook up libp2p-connection-manager ([#184](https://github.com/libp2p/js-libp2p/issues/184)) ([d597204](https://github.com/libp2p/js-libp2p/commit/d597204))



<a name="0.20.4"></a>
## [0.20.4](https://github.com/libp2p/js-libp2p/compare/v0.20.2...v0.20.4) (2018-04-30)



<a name="0.20.3"></a>
## [0.20.3](https://github.com/libp2p/js-libp2p/compare/v0.20.2...v0.20.3) (2018-04-30)



<a name="0.20.2"></a>
## [0.20.2](https://github.com/libp2p/js-libp2p/compare/v0.20.1...v0.20.2) (2018-04-10)



<a name="0.20.1"></a>
## [0.20.1](https://github.com/libp2p/js-libp2p/compare/v0.20.0...v0.20.1) (2018-04-10)



<a name="0.20.0"></a>
# [0.20.0](https://github.com/libp2p/js-libp2p/compare/v0.19.2...v0.20.0) (2018-04-06)


### Features

* use class-is for type checks ([bb0c990](https://github.com/libp2p/js-libp2p/commit/bb0c990))



<a name="0.19.2"></a>
## [0.19.2](https://github.com/libp2p/js-libp2p/compare/v0.19.0...v0.19.2) (2018-03-28)



<a name="0.19.1"></a>
## [0.19.1](https://github.com/libp2p/js-libp2p/compare/v0.19.0...v0.19.1) (2018-03-28)



<a name="0.19.0"></a>
# [0.19.0](https://github.com/libp2p/js-libp2p/compare/v0.18.0...v0.19.0) (2018-03-15)



<a name="0.18.0"></a>
# [0.18.0](https://github.com/libp2p/js-libp2p/compare/v0.17.0...v0.18.0) (2018-02-19)



<a name="0.17.0"></a>
# [0.17.0](https://github.com/libp2p/js-libp2p/compare/v0.16.5...v0.17.0) (2018-02-16)


### Bug Fixes

* use correct reference to floodSub ([947eaf1](https://github.com/libp2p/js-libp2p/commit/947eaf1))


### Features

* add pubsub to libp2p ([0c543b7](https://github.com/libp2p/js-libp2p/commit/0c543b7))



<a name="0.16.5"></a>
## [0.16.5](https://github.com/libp2p/js-libp2p/compare/v0.16.4...v0.16.5) (2018-02-14)



<a name="0.16.4"></a>
## [0.16.4](https://github.com/libp2p/js-libp2p/compare/v0.16.3...v0.16.4) (2018-02-09)



<a name="0.16.3"></a>
## [0.16.3](https://github.com/libp2p/js-libp2p/compare/v0.16.2...v0.16.3) (2018-02-08)



<a name="0.16.2"></a>
## [0.16.2](https://github.com/libp2p/js-libp2p/compare/v0.16.1...v0.16.2) (2018-02-07)



<a name="0.16.1"></a>
## [0.16.1](https://github.com/libp2p/js-libp2p/compare/v0.16.0...v0.16.1) (2018-02-07)



<a name="0.16.0"></a>
# [0.16.0](https://github.com/libp2p/js-libp2p/compare/v0.15.2...v0.16.0) (2018-02-07)


### Features

* add explicit error for case peer id not included in multiaddr ([#155](https://github.com/libp2p/js-libp2p/issues/155)) ([bd8a35a](https://github.com/libp2p/js-libp2p/commit/bd8a35a))
* dialProtocol and small refactor ([6651401](https://github.com/libp2p/js-libp2p/commit/6651401))
* use libp2p-switch ([23e8293](https://github.com/libp2p/js-libp2p/commit/23e8293))



<a name="0.15.2"></a>
## [0.15.2](https://github.com/libp2p/js-libp2p/compare/v0.15.1...v0.15.2) (2018-01-28)



<a name="0.15.1"></a>
## [0.15.1](https://github.com/libp2p/js-libp2p/compare/v0.15.0...v0.15.1) (2018-01-16)


### Bug Fixes

* typo in DHT setup ([#151](https://github.com/libp2p/js-libp2p/issues/151)) ([61bebd1](https://github.com/libp2p/js-libp2p/commit/61bebd1))



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p/compare/v0.14.3...v0.15.0) (2018-01-07)



<a name="0.14.3"></a>
## [0.14.3](https://github.com/libp2p/js-libp2p/compare/v0.14.2...v0.14.3) (2017-12-15)



<a name="0.14.2"></a>
## [0.14.2](https://github.com/libp2p/js-libp2p/compare/v0.14.1...v0.14.2) (2017-12-15)



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p/compare/v0.14.0...v0.14.1) (2017-12-15)


### Bug Fixes

* prevent "The libp2p node is not started yet" when stopping ([#138](https://github.com/libp2p/js-libp2p/issues/138)) ([c88eaf4](https://github.com/libp2p/js-libp2p/commit/c88eaf4))



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p/compare/v0.13.3...v0.14.0) (2017-12-14)


### Bug Fixes

* remove innactive multiaddrs ([#131](https://github.com/libp2p/js-libp2p/issues/131)) ([1b7360f](https://github.com/libp2p/js-libp2p/commit/1b7360f))



<a name="0.13.3"></a>
## [0.13.3](https://github.com/libp2p/js-libp2p/compare/v0.13.2...v0.13.3) (2017-12-01)



<a name="0.13.2"></a>
## [0.13.2](https://github.com/libp2p/js-libp2p/compare/v0.13.1...v0.13.2) (2017-11-27)


### Features

* Bring libp2p-websocket-star to the Transports family! 🌟 ([#122](https://github.com/libp2p/js-libp2p/issues/122)) ([95f029e](https://github.com/libp2p/js-libp2p/commit/95f029e))



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p/compare/v0.13.0...v0.13.1) (2017-11-12)



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p/compare/v0.12.4...v0.13.0) (2017-10-26)


### Features

* enable and test Circuit Relay ([29cc0af](https://github.com/libp2p/js-libp2p/commit/29cc0af))



<a name="0.12.4"></a>
## [0.12.4](https://github.com/libp2p/js-libp2p/compare/v0.12.3...v0.12.4) (2017-09-07)



<a name="0.12.3"></a>
## [0.12.3](https://github.com/libp2p/js-libp2p/compare/v0.12.2...v0.12.3) (2017-09-07)



<a name="0.12.2"></a>
## [0.12.2](https://github.com/libp2p/js-libp2p/compare/v0.12.0...v0.12.2) (2017-09-07)



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p/compare/v0.12.0...v0.12.1) (2017-09-07)



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p/compare/v0.11.0...v0.12.0) (2017-09-03)


### Features

* p2p addrs situation ([#119](https://github.com/libp2p/js-libp2p/issues/119)) ([cad173e](https://github.com/libp2p/js-libp2p/commit/cad173e))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p/compare/v0.10.2...v0.11.0) (2017-07-22)



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p/compare/v0.10.1...v0.10.2) (2017-07-21)


### Bug Fixes

* circle ci, thanks victor! ([4224c1f](https://github.com/libp2p/js-libp2p/commit/4224c1f))



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p/compare/v0.10.0...v0.10.1) (2017-07-10)



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p/compare/v0.9.1...v0.10.0) (2017-07-07)


### Bug Fixes

* added missing dep async ([45b0f61](https://github.com/libp2p/js-libp2p/commit/45b0f61))


### Features

* state events and query changes ([#100](https://github.com/libp2p/js-libp2p/issues/100)) ([73f2f6d](https://github.com/libp2p/js-libp2p/commit/73f2f6d))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p/compare/v0.9.0...v0.9.1) (2017-04-16)


### Bug Fixes

* do not use assert in async funcs ([#88](https://github.com/libp2p/js-libp2p/issues/88)) ([2e326e1](https://github.com/libp2p/js-libp2p/commit/2e326e1))



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p/compare/v0.8.0...v0.9.0) (2017-04-06)



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p/compare/v0.7.0...v0.8.0) (2017-03-31)


### Bug Fixes

* addition of ipfs id appendix must come before transport filtering ([291e79f](https://github.com/libp2p/js-libp2p/commit/291e79f))
* avoid deleting nodes from peerBook ([300936f](https://github.com/libp2p/js-libp2p/commit/300936f))
* correct method on peer-book ([031ecb3](https://github.com/libp2p/js-libp2p/commit/031ecb3))


### Features

* append peer id to multiaddr if not there ([59ea9c3](https://github.com/libp2p/js-libp2p/commit/59ea9c3))
* not remove peer from peerBook on disconnect ([a4b41b0](https://github.com/libp2p/js-libp2p/commit/a4b41b0))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p/compare/v0.6.2...v0.7.0) (2017-03-29)


### Features

* update events to conform with [#74](https://github.com/libp2p/js-libp2p/issues/74) ([f73c045](https://github.com/libp2p/js-libp2p/commit/f73c045))



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p/compare/v0.6.1...v0.6.2) (2017-03-28)



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p/compare/v0.6.0...v0.6.1) (2017-03-27)



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p/compare/v0.5.5...v0.6.0) (2017-03-27)


### Bug Fixes

* last touches ([2c23d9a](https://github.com/libp2p/js-libp2p/commit/2c23d9a))


### Features

* new super simplified API ([a6623c1](https://github.com/libp2p/js-libp2p/commit/a6623c1))



<a name="0.5.5"></a>
## [0.5.5](https://github.com/libp2p/js-libp2p/compare/v0.5.4...v0.5.5) (2017-03-21)



