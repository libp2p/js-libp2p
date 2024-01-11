# Changelog

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.1 to ^5.0.2

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.2 to ^5.0.3

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.3 to ^5.0.4
    * @libp2p/peer-id-factory bumped from ^3.0.10 to ^4.0.0

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.5 to ^5.0.6

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.1 to ^1.0.2
    * @libp2p/peer-id bumped from ^4.0.1 to ^4.0.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.6 to ^5.0.7
    * @libp2p/logger bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-id-factory bumped from ^4.0.0 to ^4.0.1

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.7 to ^5.0.8

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.2 to ^1.1.0
    * @libp2p/peer-id bumped from ^4.0.2 to ^4.0.3
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.8 to ^5.1.0
    * @libp2p/logger bumped from ^4.0.2 to ^4.0.3
    * @libp2p/peer-id-factory bumped from ^4.0.1 to ^4.0.2

## [1.0.10](https://github.com/libp2p/js-libp2p/compare/plaintext-v1.0.9...plaintext-v1.0.10) (2024-01-06)


### Bug Fixes

* remove extra deps ([#2340](https://github.com/libp2p/js-libp2p/issues/2340)) ([53e83ee](https://github.com/libp2p/js-libp2p/commit/53e83eea50410391ec9cff4cd8097210b93894ff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.1.0 to ^1.1.1
    * @libp2p/peer-id bumped from ^4.0.3 to ^4.0.4
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.1.0 to ^5.1.1
    * @libp2p/logger bumped from ^4.0.3 to ^4.0.4
    * @libp2p/peer-id-factory bumped from ^4.0.2 to ^4.0.3

## [1.0.5](https://github.com/libp2p/js-libp2p/compare/plaintext-v1.0.4...plaintext-v1.0.5) (2023-12-02)


### Bug Fixes

* do not wait for stream reads and writes at the same time ([#2290](https://github.com/libp2p/js-libp2p/issues/2290)) ([10ea197](https://github.com/libp2p/js-libp2p/commit/10ea19700ae0c464734c88eb5922e2faeb27446a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.4 to ^5.0.5

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/plaintext-v1.0.0...plaintext-v1.0.1) (2023-11-30)


### Bug Fixes

* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.0 to ^1.0.1
    * @libp2p/peer-id bumped from ^4.0.0 to ^4.0.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.0 to ^5.0.1
    * @libp2p/logger bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.9 to ^3.0.10

## 1.0.0 (2023-11-28)


### ⚠ BREAKING CHANGES

* the `minSendBytes` option has been removed from Mplex since the transport can now decide how to optimise sending data
* imports from `libp2p/circuit-relay` should be updated to `@libp2p/circuit-relay-v2`
* imports from `libp2p/plaintext` should be changed to `@libp2p/plaintext`

### Features

* allow stream muxers and connection encrypters to yield lists ([#2256](https://www.github.com/libp2p/js-libp2p/issues/2256)) ([4a474d5](https://www.github.com/libp2p/js-libp2p/commit/4a474d54d3299e0ac30fa143b57436b3cf45e426))


### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract circuit relay v2 to separate module ([#2222](https://www.github.com/libp2p/js-libp2p/issues/2222)) ([24afba3](https://www.github.com/libp2p/js-libp2p/commit/24afba30004fb7f24af1f0180229bb164340f00b))
* extract plaintext into separate module ([#2221](https://www.github.com/libp2p/js-libp2p/issues/2221)) ([a364d95](https://www.github.com/libp2p/js-libp2p/commit/a364d95bbd7b15a5ce6ce508321e7ff2fa40a5e5))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.2 to ^1.0.0
    * @libp2p/peer-id bumped from ^3.0.6 to ^4.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.1.5 to ^5.0.0
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^3.0.8 to ^3.0.9
