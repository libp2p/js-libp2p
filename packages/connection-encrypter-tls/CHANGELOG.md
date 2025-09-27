# Changelog

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.3.0 to ^5.3.1

## [3.0.2](https://github.com/libp2p/js-libp2p/compare/tls-v3.0.1...tls-v3.0.2) (2025-09-27)


### Bug Fixes

* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.1 to ^7.0.2
  * devDependencies
    * @libp2p/logger bumped from ^6.0.1 to ^6.0.2

## [3.0.1](https://github.com/libp2p/js-libp2p/compare/tls-v3.0.0...tls-v3.0.1) (2025-09-24)


### Dependencies

* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.9 to ^5.1.10
    * @libp2p/peer-id bumped from ^6.0.0 to ^6.0.1
    * @libp2p/utils bumped from ^7.0.0 to ^7.0.1
  * devDependencies
    * @libp2p/logger bumped from ^6.0.0 to ^6.0.1

## [3.0.0](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.7...tls-v3.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.8 to ^5.1.9
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/peer-id bumped from ^5.1.9 to ^6.0.0
    * @libp2p/utils bumped from ^6.7.2 to ^7.0.0
  * devDependencies
    * @libp2p/logger bumped from ^5.2.0 to ^6.0.0

## [2.2.7](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.6...tls-v2.2.7) (2025-08-19)


### Bug Fixes

* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.7 to ^5.1.8
    * @libp2p/interface bumped from ^2.10.5 to ^2.11.0
    * @libp2p/peer-id bumped from ^5.1.8 to ^5.1.9
  * devDependencies
    * @libp2p/logger bumped from ^5.1.21 to ^5.2.0

## [2.2.6](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.5...tls-v2.2.6) (2025-06-25)


### Bug Fixes

* check for signal abort in tls during cert generation ([#3203](https://github.com/libp2p/js-libp2p/issues/3203)) ([82ac83c](https://github.com/libp2p/js-libp2p/commit/82ac83c0d532abf95cc17debea7e7b208ee0a8aa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.6 to ^5.1.7
    * @libp2p/interface bumped from ^2.10.4 to ^2.10.5
    * @libp2p/peer-id bumped from ^5.1.7 to ^5.1.8
  * devDependencies
    * @libp2p/logger bumped from ^5.1.20 to ^5.1.21

## [2.2.5](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.4...tls-v2.2.5) (2025-06-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.5 to ^5.1.6
    * @libp2p/interface bumped from ^2.10.3 to ^2.10.4
    * @libp2p/peer-id bumped from ^5.1.6 to ^5.1.7
  * devDependencies
    * @libp2p/logger bumped from ^5.1.19 to ^5.1.20

## [2.2.4](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.3...tls-v2.2.4) (2025-06-03)


### Documentation

* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.4 to ^5.1.5
    * @libp2p/interface bumped from ^2.10.2 to ^2.10.3
    * @libp2p/peer-id bumped from ^5.1.5 to ^5.1.6
  * devDependencies
    * @libp2p/logger bumped from ^5.1.18 to ^5.1.19

## [2.2.3](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.2...tls-v2.2.3) (2025-05-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.3 to ^5.1.4
    * @libp2p/interface bumped from ^2.10.1 to ^2.10.2
    * @libp2p/peer-id bumped from ^5.1.4 to ^5.1.5
  * devDependencies
    * @libp2p/logger bumped from ^5.1.17 to ^5.1.18

## [2.2.2](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.1...tls-v2.2.2) (2025-05-20)


### Dependencies

* bump it-queueless-pushable from 1.0.2 to 2.0.1 in /packages/connection-encrypter-tls ([#3117](https://github.com/libp2p/js-libp2p/issues/3117)) ([923ecc6](https://github.com/libp2p/js-libp2p/commit/923ecc6cd9b5df0dfef4df621dc035aaa36f3c85))
* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.2 to ^5.1.3
    * @libp2p/interface bumped from ^2.10.0 to ^2.10.1
    * @libp2p/peer-id bumped from ^5.1.3 to ^5.1.4
  * devDependencies
    * @libp2p/logger bumped from ^5.1.16 to ^5.1.17

## [2.2.1](https://github.com/libp2p/js-libp2p/compare/tls-v2.2.0...tls-v2.2.1) (2025-05-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.1 to ^5.1.2
    * @libp2p/interface bumped from ^2.9.0 to ^2.10.0
    * @libp2p/peer-id bumped from ^5.1.2 to ^5.1.3
  * devDependencies
    * @libp2p/logger bumped from ^5.1.15 to ^5.1.16

## [2.2.0](https://github.com/libp2p/js-libp2p/compare/tls-v2.1.2...tls-v2.2.0) (2025-04-16)


### Features

* add skip muxer negotiation ([#3081](https://github.com/libp2p/js-libp2p/issues/3081)) ([3833353](https://github.com/libp2p/js-libp2p/commit/3833353bdc936695b17cc836515763ead2137756))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.1.0 to ^5.1.1
    * @libp2p/interface bumped from ^2.8.0 to ^2.9.0
    * @libp2p/peer-id bumped from ^5.1.1 to ^5.1.2
  * devDependencies
    * @libp2p/logger bumped from ^5.1.14 to ^5.1.15

## [2.1.2](https://github.com/libp2p/js-libp2p/compare/tls-v2.1.1...tls-v2.1.2) (2025-04-09)


### Bug Fixes

* add backpressure to tls encryption ([#3054](https://github.com/libp2p/js-libp2p/issues/3054)) ([0712672](https://github.com/libp2p/js-libp2p/commit/071267286c2adc79e03ba47a199bd4c0943f1ae3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.15 to ^5.1.0
    * @libp2p/interface bumped from ^2.7.0 to ^2.8.0
    * @libp2p/peer-id bumped from ^5.1.0 to ^5.1.1
  * devDependencies
    * @libp2p/logger bumped from ^5.1.13 to ^5.1.14

## [2.1.1](https://github.com/libp2p/js-libp2p/compare/tls-v2.1.0...tls-v2.1.1) (2025-03-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/peer-id bumped from ^5.0.16 to ^5.1.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.12 to ^5.1.13

## [2.1.0](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.18...tls-v2.1.0) (2025-03-03)


### Features

* add metrics to tls encrypter ([#3025](https://github.com/libp2p/js-libp2p/issues/3025)) ([3f127b6](https://github.com/libp2p/js-libp2p/commit/3f127b6104339b95d947c7c741e73508a90f0352))
* select muxer early ([#3026](https://github.com/libp2p/js-libp2p/issues/3026)) ([c4b6a37](https://github.com/libp2p/js-libp2p/commit/c4b6a37173bbf4bfd127bdc524c2c00a1a9749e6))


### Bug Fixes

* abort connection on TLS error ([#3027](https://github.com/libp2p/js-libp2p/issues/3027)) ([2c8ecb4](https://github.com/libp2p/js-libp2p/commit/2c8ecb455833074300953270a9d9386386275699))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.14 to ^5.0.15
    * @libp2p/interface bumped from ^2.6.1 to ^2.7.0
    * @libp2p/peer-id bumped from ^5.0.15 to ^5.0.16
  * devDependencies
    * @libp2p/logger bumped from ^5.1.11 to ^5.1.12

## [2.0.18](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.17...tls-v2.0.18) (2025-03-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.13 to ^5.0.14
    * @libp2p/peer-id bumped from ^5.0.14 to ^5.0.15
  * devDependencies
    * @libp2p/logger bumped from ^5.1.10 to ^5.1.11

## [2.0.17](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.16...tls-v2.0.17) (2025-02-25)


### Documentation

* add spellcheck to gh actions ([#2994](https://github.com/libp2p/js-libp2p/issues/2994)) ([5b084e9](https://github.com/libp2p/js-libp2p/commit/5b084e9682a572e82f7907714d7807b3b9856326))
* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.12 to ^5.0.13
    * @libp2p/interface bumped from ^2.6.0 to ^2.6.1
    * @libp2p/peer-id bumped from ^5.0.13 to ^5.0.14
  * devDependencies
    * @libp2p/logger bumped from ^5.1.9 to ^5.1.10

## [2.0.16](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.15...tls-v2.0.16) (2025-02-20)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.11 to ^5.0.12
    * @libp2p/interface bumped from ^2.5.0 to ^2.6.0
    * @libp2p/peer-id bumped from ^5.0.12 to ^5.0.13
  * devDependencies
    * @libp2p/logger bumped from ^5.1.8 to ^5.1.9

## [2.0.15](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.14...tls-v2.0.15) (2025-02-10)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.10 to ^5.0.11
    * @libp2p/interface bumped from ^2.4.1 to ^2.5.0
    * @libp2p/peer-id bumped from ^5.0.11 to ^5.0.12
  * devDependencies
    * @libp2p/logger bumped from ^5.1.7 to ^5.1.8

## [2.0.14](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.13...tls-v2.0.14) (2025-02-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.9 to ^5.0.10
    * @libp2p/interface bumped from ^2.4.0 to ^2.4.1
    * @libp2p/peer-id bumped from ^5.0.10 to ^5.0.11
  * devDependencies
    * @libp2p/logger bumped from ^5.1.6 to ^5.1.7

## [2.0.13](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.12...tls-v2.0.13) (2025-01-07)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.8 to ^5.0.9
    * @libp2p/interface bumped from ^2.3.0 to ^2.4.0
    * @libp2p/peer-id bumped from ^5.0.9 to ^5.0.10
  * devDependencies
    * @libp2p/logger bumped from ^5.1.5 to ^5.1.6

## [2.0.12](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.11...tls-v2.0.12) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.7 to ^5.0.8
    * @libp2p/interface bumped from ^2.2.1 to ^2.3.0
    * @libp2p/peer-id bumped from ^5.0.8 to ^5.0.9
  * devDependencies
    * @libp2p/logger bumped from ^5.1.4 to ^5.1.5

## [2.0.11](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.10...tls-v2.0.11) (2024-11-18)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.6 to ^5.0.7
    * @libp2p/interface bumped from ^2.2.0 to ^2.2.1
    * @libp2p/peer-id bumped from ^5.0.7 to ^5.0.8
  * devDependencies
    * @libp2p/logger bumped from ^5.1.3 to ^5.1.4

## [2.0.10](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.9...tls-v2.0.10) (2024-10-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.5 to ^5.0.6
    * @libp2p/interface bumped from ^2.1.3 to ^2.2.0
    * @libp2p/peer-id bumped from ^5.0.6 to ^5.0.7
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.7 to ^6.1.8
    * @libp2p/logger bumped from ^5.1.2 to ^5.1.3

## [2.0.9](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.8...tls-v2.0.9) (2024-10-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/peer-id bumped from ^5.0.5 to ^5.0.6
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.6 to ^6.1.7
    * @libp2p/logger bumped from ^5.1.1 to ^5.1.2

## [2.0.8](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.7...tls-v2.0.8) (2024-10-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.4 to ^5.0.5
    * @libp2p/interface bumped from ^2.1.2 to ^2.1.3
    * @libp2p/peer-id bumped from ^5.0.4 to ^5.0.5
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.5 to ^6.1.6
    * @libp2p/logger bumped from ^5.1.0 to ^5.1.1

## [2.0.7](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.6...tls-v2.0.7) (2024-10-05)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.4 to ^6.1.5

## [2.0.6](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.5...tls-v2.0.6) (2024-09-27)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.3 to ^6.1.4

## [2.0.5](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.4...tls-v2.0.5) (2024-09-25)


### Bug Fixes

* close tls socket on encryption failure ([#2724](https://github.com/libp2p/js-libp2p/issues/2724)) ([9800384](https://github.com/libp2p/js-libp2p/commit/9800384773597621bb87f4bf0587a9451a152d6f))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.2 to ^6.1.3
    * @libp2p/logger bumped from ^5.0.4 to ^5.1.0

## [2.0.4](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.3...tls-v2.0.4) (2024-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.3 to ^5.0.4
    * @libp2p/interface bumped from ^2.1.1 to ^2.1.2
    * @libp2p/peer-id bumped from ^5.0.3 to ^5.0.4
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.1 to ^6.1.2
    * @libp2p/logger bumped from ^5.0.3 to ^5.0.4

## [2.0.3](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.2...tls-v2.0.3) (2024-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.2 to ^5.0.3
    * @libp2p/interface bumped from ^2.1.0 to ^2.1.1
    * @libp2p/peer-id bumped from ^5.0.2 to ^5.0.3
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.1.0 to ^6.1.1
    * @libp2p/logger bumped from ^5.0.2 to ^5.0.3

## [2.0.2](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.1...tls-v2.0.2) (2024-09-23)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.1 to ^5.0.2
    * @libp2p/interface bumped from ^2.0.1 to ^2.1.0
    * @libp2p/peer-id bumped from ^5.0.1 to ^5.0.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.0.1 to ^6.1.0
    * @libp2p/logger bumped from ^5.0.1 to ^5.0.2

## [2.0.1](https://github.com/libp2p/js-libp2p/compare/tls-v2.0.0...tls-v2.0.1) (2024-09-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^5.0.0 to ^5.0.1
    * @libp2p/interface bumped from ^2.0.0 to ^2.0.1
    * @libp2p/peer-id bumped from ^5.0.0 to ^5.0.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.0.0 to ^6.0.1
    * @libp2p/logger bumped from ^5.0.0 to ^5.0.1

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/tls-v1.1.5...tls-v2.0.0) (2024-09-11)


### ⚠ BREAKING CHANGES

* the `connectionEncryption` option has been renamed `connectionEncrypters`
* - `@libp2p/peer-id-factory` has been removed, use `generateKeyPair` and `peerIdFromPrivateKey` instead
* the final argument to `secureOutbound` and `secureInbound` in the `ConnectionEncrypter` interface is now an options object
* The `.code` property has been removed from most errors, use `.name` instead
* removes `localPeer: PeerId` first parameter from `secureInbound` and `secureOutbound` in `ConnectionEncrypter`

### Features

* use `.name` property instead of `.code` for errors ([#2655](https://github.com/libp2p/js-libp2p/issues/2655)) ([0d20426](https://github.com/libp2p/js-libp2p/commit/0d20426fd5ea19b03345c70289bbd692e4348e1f))


### Bug Fixes

* make connection securing abortable ([#2662](https://github.com/libp2p/js-libp2p/issues/2662)) ([51f7b57](https://github.com/libp2p/js-libp2p/commit/51f7b570c3a5bae8dd7da7edbc4145893328400e))
* remove localPeer from secureInbound and secureOutbound ([#2304](https://github.com/libp2p/js-libp2p/issues/2304)) ([b435a21](https://github.com/libp2p/js-libp2p/commit/b435a214cf342c6015f474d26143fc27f0f673e9))
* remove private key field from peer id ([#2660](https://github.com/libp2p/js-libp2p/issues/2660)) ([3eeb0c7](https://github.com/libp2p/js-libp2p/commit/3eeb0c705bd58285a6e1ec9fcbb6987c5959d504)), closes [#2659](https://github.com/libp2p/js-libp2p/issues/2659)
* rename connectionEncryption option to connectionEncrypters ([#2691](https://github.com/libp2p/js-libp2p/issues/2691)) ([6d72709](https://github.com/libp2p/js-libp2p/commit/6d72709ba5959388777610e2f71b8ba9522139b6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.9 to ^5.0.0
    * @libp2p/interface bumped from ^1.7.0 to ^2.0.0
    * @libp2p/peer-id bumped from ^4.2.4 to ^5.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.12 to ^6.0.0
    * @libp2p/logger bumped from ^4.0.20 to ^5.0.0

## [1.1.5](https://github.com/libp2p/js-libp2p/compare/tls-v1.1.4...tls-v1.1.5) (2024-08-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.8 to ^4.1.9
    * @libp2p/interface bumped from ^1.6.3 to ^1.7.0
    * @libp2p/peer-id bumped from ^4.2.3 to ^4.2.4
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.11 to ^5.4.12
    * @libp2p/logger bumped from ^4.0.19 to ^4.0.20
    * @libp2p/peer-id-factory bumped from ^4.2.3 to ^4.2.4

## [1.1.4](https://github.com/libp2p/js-libp2p/compare/tls-v1.1.3...tls-v1.1.4) (2024-08-02)


### Dependencies

* bump aegir from 43.0.3 to 44.0.1 ([#2603](https://github.com/libp2p/js-libp2p/issues/2603)) ([944935f](https://github.com/libp2p/js-libp2p/commit/944935f8dbcc1083e4cb4a02b49a0aab3083d3d9))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.7 to ^4.1.8
    * @libp2p/interface bumped from ^1.6.2 to ^1.6.3
    * @libp2p/peer-id bumped from ^4.2.2 to ^4.2.3
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.10 to ^5.4.11
    * @libp2p/logger bumped from ^4.0.18 to ^4.0.19
    * @libp2p/peer-id-factory bumped from ^4.2.2 to ^4.2.3

## [1.1.3](https://github.com/libp2p/js-libp2p/compare/tls-v1.1.2...tls-v1.1.3) (2024-07-29)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.6 to ^4.1.7
    * @libp2p/interface bumped from ^1.6.1 to ^1.6.2
    * @libp2p/peer-id bumped from ^4.2.1 to ^4.2.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.9 to ^5.4.10
    * @libp2p/logger bumped from ^4.0.17 to ^4.0.18
    * @libp2p/peer-id-factory bumped from ^4.2.1 to ^4.2.2

## [1.1.2](https://github.com/libp2p/js-libp2p/compare/tls-v1.1.1...tls-v1.1.2) (2024-07-13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.5 to ^4.1.6
    * @libp2p/interface bumped from ^1.6.0 to ^1.6.1
    * @libp2p/peer-id bumped from ^4.2.0 to ^4.2.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.8 to ^5.4.9
    * @libp2p/logger bumped from ^4.0.16 to ^4.0.17
    * @libp2p/peer-id-factory bumped from ^4.2.0 to ^4.2.1

## [1.1.1](https://github.com/libp2p/js-libp2p/compare/tls-v1.1.0...tls-v1.1.1) (2024-07-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.4 to ^4.1.5
    * @libp2p/interface bumped from ^1.5.0 to ^1.6.0
    * @libp2p/peer-id bumped from ^4.1.4 to ^4.2.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.7 to ^5.4.8
    * @libp2p/logger bumped from ^4.0.15 to ^4.0.16
    * @libp2p/peer-id-factory bumped from ^4.1.4 to ^4.2.0

## [1.1.0](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.13...tls-v1.1.0) (2024-06-18)


### Features

* check service dependencies on startup ([#2586](https://github.com/libp2p/js-libp2p/issues/2586)) ([d1f1c2b](https://github.com/libp2p/js-libp2p/commit/d1f1c2be78bd195f404e62627c2c9f545845e5f5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.3 to ^4.1.4
    * @libp2p/interface bumped from ^1.4.1 to ^1.5.0
    * @libp2p/peer-id bumped from ^4.1.3 to ^4.1.4
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.6 to ^5.4.7
    * @libp2p/logger bumped from ^4.0.14 to ^4.0.15
    * @libp2p/peer-id-factory bumped from ^4.1.3 to ^4.1.4

## [1.0.13](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.12...tls-v1.0.13) (2024-06-07)


### Dependencies

* bump aegir from 42.2.11 to 43.0.1 ([#2571](https://github.com/libp2p/js-libp2p/issues/2571)) ([757fb26](https://github.com/libp2p/js-libp2p/commit/757fb2674f0a3e06fd46d3ff63f7f461c32d47d2))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.2 to ^4.1.3
    * @libp2p/interface bumped from ^1.4.0 to ^1.4.1
    * @libp2p/peer-id bumped from ^4.1.2 to ^4.1.3
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.5 to ^5.4.6
    * @libp2p/logger bumped from ^4.0.13 to ^4.0.14
    * @libp2p/peer-id-factory bumped from ^4.1.2 to ^4.1.3

## [1.0.12](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.11...tls-v1.0.12) (2024-05-28)


### Bug Fixes

* export tls key as pkcs8 ([#2562](https://github.com/libp2p/js-libp2p/issues/2562)) ([167bf2b](https://github.com/libp2p/js-libp2p/commit/167bf2b3cf0aa741c8118e241c3668e8ef91c549))

## [1.0.11](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.10...tls-v1.0.11) (2024-05-17)


### Bug Fixes

* update project config ([48444f7](https://github.com/libp2p/js-libp2p/commit/48444f750ebe3f03290bf70e84d7590edc030ea4))


### Dependencies

* bump sinon from 17.0.2 to 18.0.0 ([#2548](https://github.com/libp2p/js-libp2p/issues/2548)) ([1eb5b27](https://github.com/libp2p/js-libp2p/commit/1eb5b2713585e0d4dde927ecd307ada0b774d824))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.1 to ^4.1.2
    * @libp2p/interface bumped from ^1.3.1 to ^1.4.0
    * @libp2p/peer-id bumped from ^4.1.1 to ^4.1.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.4 to ^5.4.5
    * @libp2p/logger bumped from ^4.0.12 to ^4.0.13
    * @libp2p/peer-id-factory bumped from ^4.1.1 to ^4.1.2

## [1.0.10](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.9...tls-v1.0.10) (2024-05-14)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.3 to ^5.4.4

## [1.0.9](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.8...tls-v1.0.9) (2024-05-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.1.0 to ^4.1.1
    * @libp2p/interface bumped from ^1.3.0 to ^1.3.1
    * @libp2p/peer-id bumped from ^4.1.0 to ^4.1.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.2 to ^5.4.3
    * @libp2p/logger bumped from ^4.0.11 to ^4.0.12
    * @libp2p/peer-id-factory bumped from ^4.1.0 to ^4.1.1

## [1.0.8](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.7...tls-v1.0.8) (2024-04-24)


### Documentation

* fix broken links in docs site ([#2497](https://github.com/libp2p/js-libp2p/issues/2497)) ([fd1f834](https://github.com/libp2p/js-libp2p/commit/fd1f8343db030d74cd08bca6a0cffda93532765f)), closes [#2423](https://github.com/libp2p/js-libp2p/issues/2423)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.0.6 to ^4.1.0
    * @libp2p/interface bumped from ^1.2.0 to ^1.3.0
    * @libp2p/peer-id bumped from ^4.0.10 to ^4.1.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.1 to ^5.4.2
    * @libp2p/logger bumped from ^4.0.10 to ^4.0.11
    * @libp2p/peer-id-factory bumped from ^4.0.10 to ^4.1.0

## [1.0.7](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.6...tls-v1.0.7) (2024-04-15)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.4.0 to ^5.4.1

## [1.0.6](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.5...tls-v1.0.6) (2024-04-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.0.5 to ^4.0.6
    * @libp2p/interface bumped from ^1.1.6 to ^1.2.0
    * @libp2p/peer-id bumped from ^4.0.9 to ^4.0.10
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.3.4 to ^5.4.0
    * @libp2p/logger bumped from ^4.0.9 to ^4.0.10
    * @libp2p/peer-id-factory bumped from ^4.0.9 to ^4.0.10

## [1.0.5](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.4...tls-v1.0.5) (2024-04-05)


### Bug Fixes

* add @libp2p/record module to monorepo ([#2466](https://github.com/libp2p/js-libp2p/issues/2466)) ([3ffecc5](https://github.com/libp2p/js-libp2p/commit/3ffecc5bfe806a678c1b0228ff830f1811630718))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.0.4 to ^4.0.5
    * @libp2p/interface bumped from ^1.1.5 to ^1.1.6
    * @libp2p/peer-id bumped from ^4.0.8 to ^4.0.9
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.3.3 to ^5.3.4
    * @libp2p/logger bumped from ^4.0.8 to ^4.0.9
    * @libp2p/peer-id-factory bumped from ^4.0.8 to ^4.0.9

## [1.0.4](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.3...tls-v1.0.4) (2024-04-02)


### Bug Fixes

* remove ms from TLS notAfter date ([#2464](https://github.com/libp2p/js-libp2p/issues/2464)) ([ab5f057](https://github.com/libp2p/js-libp2p/commit/ab5f05763148c0767c81c5bc49bfb9b2dee483ee))
* tls serial number causes illegal padding error ([#2459](https://github.com/libp2p/js-libp2p/issues/2459)) ([cae8639](https://github.com/libp2p/js-libp2p/commit/cae863920f5d4652ef983614b6286c9895a8299e))

## [1.0.3](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.2...tls-v1.0.3) (2024-03-28)


### Bug Fixes

* reduce TLS cert validity time ([#2457](https://github.com/libp2p/js-libp2p/issues/2457)) ([bf720c0](https://github.com/libp2p/js-libp2p/commit/bf720c045163c94c94603eb3333c418101c20de0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.0.3 to ^4.0.4
    * @libp2p/interface bumped from ^1.1.4 to ^1.1.5
    * @libp2p/peer-id bumped from ^4.0.7 to ^4.0.8
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.3.2 to ^5.3.3
    * @libp2p/logger bumped from ^4.0.7 to ^4.0.8
    * @libp2p/peer-id-factory bumped from ^4.0.7 to ^4.0.8

## [1.0.2](https://github.com/libp2p/js-libp2p/compare/tls-v1.0.1...tls-v1.0.2) (2024-02-27)


### Documentation

* add doc-check to all modules ([#2419](https://github.com/libp2p/js-libp2p/issues/2419)) ([6cdb243](https://github.com/libp2p/js-libp2p/commit/6cdb24362de9991e749f76b16fcd4c130e8106a0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.0.2 to ^4.0.3
    * @libp2p/interface bumped from ^1.1.3 to ^1.1.4
    * @libp2p/peer-id bumped from ^4.0.6 to ^4.0.7
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.3.1 to ^5.3.2
    * @libp2p/logger bumped from ^4.0.6 to ^4.0.7
    * @libp2p/peer-id-factory bumped from ^4.0.6 to ^4.0.7

## 1.0.0 (2024-02-07)


### Features

* add tls connection encrypter ([#2377](https://github.com/libp2p/js-libp2p/issues/2377)) ([537d356](https://github.com/libp2p/js-libp2p/commit/537d356edf329f244b3b7a76d20a69e66cf3d203))


### Bug Fixes

* remove unused ts-expect-error ([dab5cf7](https://github.com/libp2p/js-libp2p/commit/dab5cf724cf4d3bd6b7d1005b746a944755ee77e))
* update patch versions of deps ([#2397](https://github.com/libp2p/js-libp2p/issues/2397)) ([0321812](https://github.com/libp2p/js-libp2p/commit/0321812e731515558f35ae2d53242035a343a21a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^4.0.1 to ^4.0.2
    * @libp2p/interface bumped from ^1.1.2 to ^1.1.3
    * @libp2p/peer-id bumped from ^4.0.5 to ^4.0.6
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.2.0 to ^5.3.0
    * @libp2p/logger bumped from ^4.0.5 to ^4.0.6
    * @libp2p/peer-id-factory bumped from ^4.0.5 to ^4.0.6
