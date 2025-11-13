# Changelog

## [2.0.8](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.7...memory-v2.0.8) (2025-11-13)


### Dependencies

* bump @types/sinon from 17.0.4 to 20.0.0 ([#3349](https://github.com/libp2p/js-libp2p/issues/3349)) ([10d54c1](https://github.com/libp2p/js-libp2p/commit/10d54c1ef36d22a4c7cd1585eacab9e6fcb9fdc7))
* bump delay from 6.0.0 to 7.0.0 ([#3345](https://github.com/libp2p/js-libp2p/issues/3345)) ([ea43a57](https://github.com/libp2p/js-libp2p/commit/ea43a57180dc63178602782e7589fca48b40e3a3))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.7 to ^7.0.8
  * devDependencies
    * @libp2p/logger bumped from ^6.2.0 to ^6.2.1

## [2.0.7](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.6...memory-v2.0.7) (2025-10-29)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.2 to ^3.1.0
    * @libp2p/utils bumped from ^7.0.6 to ^7.0.7
  * devDependencies
    * @libp2p/logger bumped from ^6.1.0 to ^6.2.0
    * @libp2p/peer-id bumped from ^6.0.3 to ^6.0.4

## [2.0.6](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.5...memory-v2.0.6) (2025-10-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.5 to ^7.0.6
  * devDependencies
    * @libp2p/logger bumped from ^6.0.5 to ^6.1.0

## [2.0.5](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.4...memory-v2.0.5) (2025-10-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.4 to ^7.0.5
  * devDependencies
    * @libp2p/logger bumped from ^6.0.4 to ^6.0.5

## [2.0.4](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.3...memory-v2.0.4) (2025-10-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.1 to ^3.0.2
    * @libp2p/utils bumped from ^7.0.3 to ^7.0.4
  * devDependencies
    * @libp2p/logger bumped from ^6.0.3 to ^6.0.4
    * @libp2p/peer-id bumped from ^6.0.2 to ^6.0.3

## [2.0.3](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.2...memory-v2.0.3) (2025-10-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.0 to ^3.0.1
    * @libp2p/utils bumped from ^7.0.2 to ^7.0.3
  * devDependencies
    * @libp2p/logger bumped from ^6.0.2 to ^6.0.3
    * @libp2p/peer-id bumped from ^6.0.1 to ^6.0.2

## [2.0.2](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.1...memory-v2.0.2) (2025-09-27)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.1 to ^7.0.2
  * devDependencies
    * @libp2p/logger bumped from ^6.0.1 to ^6.0.2

## [2.0.1](https://github.com/libp2p/js-libp2p/compare/memory-v2.0.0...memory-v2.0.1) (2025-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.0 to ^7.0.1
  * devDependencies
    * @libp2p/logger bumped from ^6.0.0 to ^6.0.1
    * @libp2p/peer-id bumped from ^6.0.0 to ^6.0.1

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.14...memory-v2.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/utils bumped from ^6.7.2 to ^7.0.0
  * devDependencies
    * @libp2p/logger bumped from ^5.2.0 to ^6.0.0
    * @libp2p/peer-id bumped from ^5.1.9 to ^6.0.0

## [1.1.14](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.13...memory-v1.1.14) (2025-08-19)


### Bug Fixes

* scope logging to connection and stream ([#3215](https://github.com/libp2p/js-libp2p/issues/3215)) ([ce6b542](https://github.com/libp2p/js-libp2p/commit/ce6b542a8ea3d42e2238f910cf2a113370515058))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.5 to ^2.11.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.21 to ^5.2.0
    * @libp2p/peer-id bumped from ^5.1.8 to ^5.1.9

## [1.1.13](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.12...memory-v1.1.13) (2025-07-07)


### Dependencies

* update @multiformats/multiaddr-matcher dep to 2.x.x ([#3208](https://github.com/libp2p/js-libp2p/issues/3208)) ([57e7fa4](https://github.com/libp2p/js-libp2p/commit/57e7fa4413a0e19799b5917bad6743800c77e1f7))

## [1.1.12](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.11...memory-v1.1.12) (2025-06-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.4 to ^2.10.5
  * devDependencies
    * @libp2p/logger bumped from ^5.1.20 to ^5.1.21
    * @libp2p/peer-id bumped from ^5.1.7 to ^5.1.8

## [1.1.11](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.10...memory-v1.1.11) (2025-06-16)


### Bug Fixes

* update multiaddr ([#3184](https://github.com/libp2p/js-libp2p/issues/3184)) ([6c42ea6](https://github.com/libp2p/js-libp2p/commit/6c42ea64a6e22028a87ecb3422e418e99ff09279))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.3 to ^2.10.4
  * devDependencies
    * @libp2p/logger bumped from ^5.1.19 to ^5.1.20
    * @libp2p/peer-id bumped from ^5.1.6 to ^5.1.7

## [1.1.10](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.9...memory-v1.1.10) (2025-06-03)


### Bug Fixes

* deduplicate typed event target ([#3170](https://github.com/libp2p/js-libp2p/issues/3170)) ([cc7b34c](https://github.com/libp2p/js-libp2p/commit/cc7b34c0fe3ac5745fd082ae0198b8742371a412))


### Documentation

* update typedoc config ([#3146](https://github.com/libp2p/js-libp2p/issues/3146)) ([14dbebe](https://github.com/libp2p/js-libp2p/commit/14dbebea8bd17addadac730afec0fa3b1cc6334a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.2 to ^2.10.3
  * devDependencies
    * @libp2p/logger bumped from ^5.1.18 to ^5.1.19
    * @libp2p/peer-id bumped from ^5.1.5 to ^5.1.6

## [1.1.9](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.8...memory-v1.1.9) (2025-05-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.1 to ^2.10.2
  * devDependencies
    * @libp2p/logger bumped from ^5.1.17 to ^5.1.18
    * @libp2p/peer-id bumped from ^5.1.4 to ^5.1.5

## [1.1.8](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.7...memory-v1.1.8) (2025-05-20)


### Dependencies

* bump sinon from 19.0.5 to 20.0.0 ([#3112](https://github.com/libp2p/js-libp2p/issues/3112)) ([d1ce677](https://github.com/libp2p/js-libp2p/commit/d1ce6774d8f7c338f15a05f80d09e361d21e7586))
* update aegir, fix all linting issues ([#3110](https://github.com/libp2p/js-libp2p/issues/3110)) ([510b033](https://github.com/libp2p/js-libp2p/commit/510b033f6b15358c7fae21486c3b09e730aa26cd))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.0 to ^2.10.1
  * devDependencies
    * @libp2p/logger bumped from ^5.1.16 to ^5.1.17
    * @libp2p/peer-id bumped from ^5.1.3 to ^5.1.4

## [1.1.7](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.6...memory-v1.1.7) (2025-05-19)


### Bug Fixes

* increase signal listeners ([#3101](https://github.com/libp2p/js-libp2p/issues/3101)) ([4b8c0a6](https://github.com/libp2p/js-libp2p/commit/4b8c0a6bd289c0a0d5002ee34efc696feb349caf))


### Documentation

* remove tcp header from memory transport ([#3098](https://github.com/libp2p/js-libp2p/issues/3098)) ([9b33d20](https://github.com/libp2p/js-libp2p/commit/9b33d202e31920a22aaca74f0a8d81c47b980ef8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.9.0 to ^2.10.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.15 to ^5.1.16
    * @libp2p/peer-id bumped from ^5.1.2 to ^5.1.3

## [1.1.6](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.5...memory-v1.1.6) (2025-04-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.8.0 to ^2.9.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.14 to ^5.1.15
    * @libp2p/peer-id bumped from ^5.1.1 to ^5.1.2

## [1.1.5](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.4...memory-v1.1.5) (2025-04-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.7.0 to ^2.8.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.13 to ^5.1.14
    * @libp2p/peer-id bumped from ^5.1.0 to ^5.1.1

## [1.1.4](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.3...memory-v1.1.4) (2025-03-12)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/logger bumped from ^5.1.12 to ^5.1.13
    * @libp2p/peer-id bumped from ^5.0.16 to ^5.1.0

## [1.1.3](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.2...memory-v1.1.3) (2025-03-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.6.1 to ^2.7.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.11 to ^5.1.12
    * @libp2p/peer-id bumped from ^5.0.15 to ^5.0.16

## [1.1.2](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.1...memory-v1.1.2) (2025-03-03)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/logger bumped from ^5.1.10 to ^5.1.11
    * @libp2p/peer-id bumped from ^5.0.14 to ^5.0.15

## [1.1.1](https://github.com/libp2p/js-libp2p/compare/memory-v1.1.0...memory-v1.1.1) (2025-02-25)


### Bug Fixes

* ensure that the upgrader applies timeouts to incoming dials ([#3000](https://github.com/libp2p/js-libp2p/issues/3000)) ([90cca82](https://github.com/libp2p/js-libp2p/commit/90cca822b4cb112fc71bf9ad954023de685a9040))


### Documentation

* update spell check ([#2999](https://github.com/libp2p/js-libp2p/issues/2999)) ([6f8cfea](https://github.com/libp2p/js-libp2p/commit/6f8cfeafb2f6ddc231a85ca369fb33cf759940f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.6.0 to ^2.6.1
  * devDependencies
    * @libp2p/logger bumped from ^5.1.9 to ^5.1.10
    * @libp2p/peer-id bumped from ^5.0.13 to ^5.0.14

## [1.1.0](https://github.com/libp2p/js-libp2p/compare/memory-v1.0.5...memory-v1.1.0) (2025-02-20)


### Features

* allow transports to modify announce addresses ([#2978](https://github.com/libp2p/js-libp2p/issues/2978)) ([8331c8e](https://github.com/libp2p/js-libp2p/commit/8331c8ea8feef1d642b6667213409dbe8293b606))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.5.0 to ^2.6.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.8 to ^5.1.9
    * @libp2p/peer-id bumped from ^5.0.12 to ^5.0.13

## [1.0.5](https://github.com/libp2p/js-libp2p/compare/memory-v1.0.4...memory-v1.0.5) (2025-02-10)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.4.1 to ^2.5.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.7 to ^5.1.8
    * @libp2p/peer-id bumped from ^5.0.11 to ^5.0.12

## [1.0.4](https://github.com/libp2p/js-libp2p/compare/memory-v1.0.3...memory-v1.0.4) (2025-02-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.4.0 to ^2.4.1
  * devDependencies
    * @libp2p/logger bumped from ^5.1.6 to ^5.1.7
    * @libp2p/peer-id bumped from ^5.0.10 to ^5.0.11

## [1.0.3](https://github.com/libp2p/js-libp2p/compare/memory-v1.0.2...memory-v1.0.3) (2025-01-07)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.3.0 to ^2.4.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.5 to ^5.1.6
    * @libp2p/peer-id bumped from ^5.0.9 to ^5.0.10

## [1.0.2](https://github.com/libp2p/js-libp2p/compare/memory-v1.0.1...memory-v1.0.2) (2024-12-09)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.2.1 to ^2.3.0
  * devDependencies
    * @libp2p/logger bumped from ^5.1.4 to ^5.1.5
    * @libp2p/peer-id bumped from ^5.0.8 to ^5.0.9

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/memory-v1.0.0...memory-v1.0.1) (2024-11-18)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.2.0 to ^2.2.1
  * devDependencies
    * @libp2p/logger bumped from ^5.1.3 to ^5.1.4
    * @libp2p/peer-id bumped from ^5.0.7 to ^5.0.8

## 1.0.0 (2024-11-16)


### Features

* add latency option to memory transport ([#2810](https://github.com/libp2p/js-libp2p/issues/2810)) ([050b01f](https://github.com/libp2p/js-libp2p/commit/050b01f05265eccc0d4cd9e0bd5706852d8d142b))
* add memory transport ([#2802](https://github.com/libp2p/js-libp2p/issues/2802)) ([adc7678](https://github.com/libp2p/js-libp2p/commit/adc767899d3fcf186a2bfb37a4d53decadc3a93f))
