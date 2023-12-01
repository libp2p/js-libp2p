# Changelog

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.1 to ^5.0.2

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.11 to ^1.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.2 to ^5.0.3

## [3.0.1](https://github.com/libp2p/js-libp2p/compare/perf-v3.0.0...perf-v3.0.1) (2023-11-30)


### Bug Fixes

* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.0 to ^1.0.1
    * @libp2p/interface-internal bumped from ^0.1.10 to ^0.1.11
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.0 to ^5.0.1
    * @libp2p/logger bumped from ^4.0.0 to ^4.0.1

## [3.0.0](https://www.github.com/libp2p/js-libp2p/compare/perf-v2.0.1...perf-v3.0.0) (2023-11-28)


### ⚠ BREAKING CHANGES

* the `perfService` export is now just `perf`
* imports from `libp2p/plaintext` should be changed to `@libp2p/plaintext`

### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract plaintext into separate module ([#2221](https://www.github.com/libp2p/js-libp2p/issues/2221)) ([a364d95](https://www.github.com/libp2p/js-libp2p/commit/a364d95bbd7b15a5ce6ce508321e7ff2fa40a5e5))
* rename perf exports to remove Service ([#2227](https://www.github.com/libp2p/js-libp2p/issues/2227)) ([1034416](https://www.github.com/libp2p/js-libp2p/commit/10344168fe5f56c08a21d6b35468817e17ab0b25))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.6 to ^1.0.0
    * @libp2p/interface-internal bumped from ^0.1.9 to ^0.1.10
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.1.5 to ^5.0.0
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0

### [2.0.1](https://www.github.com/libp2p/js-libp2p/compare/perf-v2.0.0...perf-v2.0.1) (2023-11-07)


### Bug Fixes

* do not overwrite signal property of options ([#2214](https://www.github.com/libp2p/js-libp2p/issues/2214)) ([70d5efc](https://www.github.com/libp2p/js-libp2p/commit/70d5efc2e901a2c419fe3f82d767f278b6d698fd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.5 to ^0.1.6
    * @libp2p/interface-internal bumped from ^0.1.8 to ^0.1.9
    * @libp2p/logger bumped from ^3.0.5 to ^3.1.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.1.4 to ^4.1.5

## [2.0.0](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.15...perf-v2.0.0) (2023-11-07)


### ⚠ BREAKING CHANGES

* Measures upload/download speed separately and also over time rather than in total.

### Features

* measure transfer perf over time ([#2067](https://www.github.com/libp2p/js-libp2p/issues/2067)) ([78db573](https://www.github.com/libp2p/js-libp2p/commit/78db573f9e8f28cd3d0a89f36094f5d566482b9f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.1.3 to ^4.1.4

### [1.1.15](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.14...perf-v1.1.15) (2023-11-06)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * libp2p bumped from ^0.46.17 to ^0.46.18

### [1.1.14](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.13...perf-v1.1.14) (2023-11-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^2.0.6 to ^2.0.7
    * @libp2p/interface bumped from ^0.1.4 to ^0.1.5
    * @libp2p/interface-compliance-tests bumped from ^4.1.2 to ^4.1.3
    * @libp2p/interface-internal bumped from ^0.1.7 to ^0.1.8
    * @libp2p/logger bumped from ^3.0.4 to ^3.0.5
    * @libp2p/peer-id-factory bumped from ^3.0.6 to ^3.0.7
    * @libp2p/tcp bumped from ^8.0.10 to ^8.0.11
    * libp2p bumped from ^0.46.16 to ^0.46.17

### [1.1.13](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.12...perf-v1.1.13) (2023-10-25)


### Bug Fixes

* rename event emitter class ([#2173](https://www.github.com/libp2p/js-libp2p/issues/2173)) ([50f912c](https://www.github.com/libp2p/js-libp2p/commit/50f912c2608caecc09acbcb0f46b4df4af073080))
* revert "refactor: rename event emitter class" ([#2172](https://www.github.com/libp2p/js-libp2p/issues/2172)) ([0ef5f7f](https://www.github.com/libp2p/js-libp2p/commit/0ef5f7f62d9c6d822e0a4b99cc203a1516b11f2f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^2.0.5 to ^2.0.6
    * @libp2p/interface bumped from ^0.1.3 to ^0.1.4
    * @libp2p/interface-compliance-tests bumped from ^4.1.1 to ^4.1.2
    * @libp2p/interface-internal bumped from ^0.1.6 to ^0.1.7
    * @libp2p/logger bumped from ^3.0.3 to ^3.0.4
    * @libp2p/peer-id-factory bumped from ^3.0.5 to ^3.0.6
    * @libp2p/tcp bumped from ^8.0.9 to ^8.0.10
    * libp2p bumped from ^0.46.15 to ^0.46.16

### [1.1.12](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.11...perf-v1.1.12) (2023-10-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * libp2p bumped from ^0.46.14 to ^0.46.15

### [1.1.11](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.10...perf-v1.1.11) (2023-10-10)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * libp2p bumped from ^0.46.13 to ^0.46.14

### [1.1.10](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.9...perf-v1.1.10) (2023-10-06)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^2.0.4 to ^2.0.5
    * @libp2p/interface bumped from ^0.1.2 to ^0.1.3
    * @libp2p/interface-compliance-tests bumped from ^4.1.0 to ^4.1.1
    * @libp2p/interface-internal bumped from ^0.1.5 to ^0.1.6
    * @libp2p/logger bumped from ^3.0.2 to ^3.0.3
    * @libp2p/peer-id-factory bumped from ^3.0.4 to ^3.0.5
    * @libp2p/tcp bumped from ^8.0.8 to ^8.0.9
    * libp2p bumped from ^0.46.12 to ^0.46.13

### [1.1.9](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.8...perf-v1.1.9) (2023-10-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.6 to ^4.1.0
    * @libp2p/tcp bumped from ^8.0.7 to ^8.0.8
    * libp2p bumped from ^0.46.11 to ^0.46.12

### [1.1.8](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.7...perf-v1.1.8) (2023-09-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^2.0.3 to ^2.0.4
    * @libp2p/interface-compliance-tests bumped from ^4.0.5 to ^4.0.6
    * @libp2p/interface-internal bumped from ^0.1.4 to ^0.1.5
    * @libp2p/peer-id-factory bumped from ^3.0.3 to ^3.0.4
    * @libp2p/tcp bumped from ^8.0.6 to ^8.0.7
    * libp2p bumped from ^0.46.10 to ^0.46.11

### [1.1.7](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.6...perf-v1.1.7) (2023-09-10)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/tcp bumped from ^8.0.5 to ^8.0.6
    * libp2p bumped from ^0.46.9 to ^0.46.10

### [1.1.6](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.5...perf-v1.1.6) (2023-09-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * libp2p bumped from ^0.46.8 to ^0.46.9

### [1.1.5](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.4...perf-v1.1.5) (2023-09-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * libp2p bumped from ^0.46.7 to ^0.46.8

### [1.1.4](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.3...perf-v1.1.4) (2023-08-25)


### Bug Fixes

* **@libp2p/protocol-perf:** use noise for encryption ([#1992](https://www.github.com/libp2p/js-libp2p/issues/1992)) ([24c1c24](https://www.github.com/libp2p/js-libp2p/commit/24c1c2489cd58397c4691d382d6260d56791dbce)), closes [#1991](https://www.github.com/libp2p/js-libp2p/issues/1991)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.4 to ^4.0.5
    * @libp2p/tcp bumped from ^8.0.4 to ^8.0.5
    * libp2p bumped from ^0.46.6 to ^0.46.7

### [1.1.3](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.2...perf-v1.1.3) (2023-08-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * libp2p bumped from ^0.46.5 to ^0.46.6

### [1.1.2](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.1...perf-v1.1.2) (2023-08-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-compliance-tests bumped from ^4.0.3 to ^4.0.4
    * @libp2p/interface-internal bumped from ^0.1.3 to ^0.1.4
    * @libp2p/tcp bumped from ^8.0.3 to ^8.0.4
    * libp2p bumped from ^0.46.4 to ^0.46.5

### [1.1.1](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.1.0...perf-v1.1.1) (2023-08-15)


### Bug Fixes

* **@libp2p/protocol-perf:** ensure only client calls measure performance ([#1960](https://www.github.com/libp2p/js-libp2p/issues/1960)) ([8716555](https://www.github.com/libp2p/js-libp2p/commit/871655515cc89af3eacad855db475d3f1ada2005))

## [1.1.0](https://www.github.com/libp2p/js-libp2p/compare/perf-v1.0.0...perf-v1.1.0) (2023-08-14)


### Features

* **@libp2p/protocol-perf:** Implement perf protocol ([#1604](https://www.github.com/libp2p/js-libp2p/issues/1604)) ([3345f28](https://www.github.com/libp2p/js-libp2p/commit/3345f28b3b13fbe6b4e333466488e9d0bc677322))


### Bug Fixes

* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^2.0.0 to ^2.0.3
    * @libp2p/interface bumped from ^0.1.0 to ^0.1.2
    * @libp2p/interface-compliance-tests bumped from ^4.0.0 to ^4.0.3
    * @libp2p/interface-internal bumped from ^0.1.0 to ^0.1.3
    * @libp2p/logger bumped from ^3.0.0 to ^3.0.2
    * @libp2p/peer-id-factory bumped from 3.0.0 to ^3.0.3
    * @libp2p/tcp bumped from ^8.0.0 to ^8.0.3
    * libp2p bumped from ^0.46.3 to ^0.46.4
