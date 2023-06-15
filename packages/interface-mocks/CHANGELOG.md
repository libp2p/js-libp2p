## [@libp2p/interface-mocks-v12.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v12.0.0...@libp2p/interface-mocks-v12.0.1) (2023-05-10)


### Bug Fixes

* emit peer:connect events from mock connection manager ([#399](https://github.com/libp2p/js-libp2p-interfaces/issues/399)) ([836dcf3](https://github.com/libp2p/js-libp2p-interfaces/commit/836dcf3d0fbdd00686f662260940c5600db25c09))

## [@libp2p/interface-mocks-v12.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v11.0.3...@libp2p/interface-mocks-v12.0.0) (2023-05-04)


### ⚠ BREAKING CHANGES

* the `symbol` export is now named `peerDiscovery` and the getter with that name should return an instance of `PeerDiscovery`

### Features

* rename peer discovery symbol to peerDiscovery ([#394](https://github.com/libp2p/js-libp2p-interfaces/issues/394)) ([5957c77](https://github.com/libp2p/js-libp2p-interfaces/commit/5957c77718df6e6336ca22386d8c03a045fd1d89))


### Dependencies

* update sibling dependencies ([45cf513](https://github.com/libp2p/js-libp2p-interfaces/commit/45cf513090d2a069bb6752ad2e231df65c76df36))

## [@libp2p/interface-mocks-v11.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v11.0.2...@libp2p/interface-mocks-v11.0.3) (2023-05-04)


### Dependencies

* bump aegir from 38.1.8 to 39.0.5 ([#393](https://github.com/libp2p/js-libp2p-interfaces/issues/393)) ([31f3797](https://github.com/libp2p/js-libp2p-interfaces/commit/31f3797b24f7c23f3f16e9db3a230bd5f7cd5175))

## [@libp2p/interface-mocks-v11.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v11.0.1...@libp2p/interface-mocks-v11.0.2) (2023-04-27)


### Dependencies

* update sibling dependencies ([6aa5ee8](https://github.com/libp2p/js-libp2p-interfaces/commit/6aa5ee87f9e431cabd4081cf8bc76b8f5180f344))

## [@libp2p/interface-mocks-v11.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v11.0.0...@libp2p/interface-mocks-v11.0.1) (2023-04-24)


### Bug Fixes

* make events optional in mock upgrader ([#385](https://github.com/libp2p/js-libp2p-interfaces/issues/385)) ([51f4aae](https://github.com/libp2p/js-libp2p-interfaces/commit/51f4aaea6ab216a1f60b899ecc25b7a325de988d))

## [@libp2p/interface-mocks-v11.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v10.0.3...@libp2p/interface-mocks-v11.0.0) (2023-04-21)


### ⚠ BREAKING CHANGES

* add libp2p events (#373)

### Features

* add libp2p events ([#373](https://github.com/libp2p/js-libp2p-interfaces/issues/373)) ([071c718](https://github.com/libp2p/js-libp2p-interfaces/commit/071c718808902858818ca86167b51b242b67a5a5))


### Dependencies

* update sibling dependencies ([a1b72f9](https://github.com/libp2p/js-libp2p-interfaces/commit/a1b72f90414536308befd07df2a003985951ceb7))
* update sibling dependencies ([17ed429](https://github.com/libp2p/js-libp2p-interfaces/commit/17ed429d57e83cb38484ac52a0e0975a7d8af963))
* update sibling dependencies ([6c18790](https://github.com/libp2p/js-libp2p-interfaces/commit/6c18790f6178053c69a8cd6bd289fd749d4e9633))

## [@libp2p/interface-mocks-v10.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v10.0.2...@libp2p/interface-mocks-v10.0.3) (2023-04-19)


### Bug Fixes

* update mock duplex type ([#380](https://github.com/libp2p/js-libp2p-interfaces/issues/380)) ([5260314](https://github.com/libp2p/js-libp2p-interfaces/commit/52603142bc91aaeb192ebf9b3a7559e8a270b7bf))

## [@libp2p/interface-mocks-v10.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v10.0.1...@libp2p/interface-mocks-v10.0.2) (2023-04-18)


### Dependencies

* update abortable iterator to 5.x.x ([#379](https://github.com/libp2p/js-libp2p-interfaces/issues/379)) ([d405e5b](https://github.com/libp2p/js-libp2p-interfaces/commit/d405e5b5db624d97f47588ef55c379debccfd160))

## [@libp2p/interface-mocks-v10.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v10.0.0...@libp2p/interface-mocks-v10.0.1) (2023-04-18)


### Bug Fixes

* specify stream sink return type ([#378](https://github.com/libp2p/js-libp2p-interfaces/issues/378)) ([e0641fc](https://github.com/libp2p/js-libp2p-interfaces/commit/e0641fcc2f2a6562e7f7d8e064ebd98c5cc6dccb))

## [@libp2p/interface-mocks-v10.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.4.0...@libp2p/interface-mocks-v10.0.0) (2023-04-18)


### ⚠ BREAKING CHANGES

* bump it-stream-types from 1.0.5 to 2.0.1 (#362)

### Dependencies

* bump it-stream-types from 1.0.5 to 2.0.1 ([#362](https://github.com/libp2p/js-libp2p-interfaces/issues/362)) ([cdc7747](https://github.com/libp2p/js-libp2p-interfaces/commit/cdc774792beead63e0ded96bd6c23de0335a49e3))
* update sibling dependencies ([4972cc6](https://github.com/libp2p/js-libp2p-interfaces/commit/4972cc6c4c43319730305b58f329d6cf4591517a))
* update sibling dependencies ([a5b7b33](https://github.com/libp2p/js-libp2p-interfaces/commit/a5b7b33dccee52d03fce788d2876a398d6fd6d99))
* update sibling dependencies ([99a862b](https://github.com/libp2p/js-libp2p-interfaces/commit/99a862baed66d4e83ba006a70c33561855c9682e))
* update sibling dependencies ([e95dcc2](https://github.com/libp2p/js-libp2p-interfaces/commit/e95dcc28f0a8b42457a44155eb0dfb3d813b03c8))
* update sibling dependencies ([3d23367](https://github.com/libp2p/js-libp2p-interfaces/commit/3d233676a17299bfa1b59d309543598176826523))
* update sibling dependencies ([2b9ddda](https://github.com/libp2p/js-libp2p-interfaces/commit/2b9ddda88d2655d389bf5142f7131f333ab9f780))
* update sibling dependencies ([bed9f4c](https://github.com/libp2p/js-libp2p-interfaces/commit/bed9f4c7b7044e974a70678762a51e79e018cf9b))
* update sibling dependencies ([2f52a28](https://github.com/libp2p/js-libp2p-interfaces/commit/2f52a284b59c0a88b040f86da1f5d3f044727f2c))

## [@libp2p/interface-mocks-v9.4.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.3.4...@libp2p/interface-mocks-v9.4.0) (2023-04-14)


### Features

* expose get connection map method of connection manager ([#372](https://github.com/libp2p/js-libp2p-interfaces/issues/372)) ([fc7245b](https://github.com/libp2p/js-libp2p-interfaces/commit/fc7245b63764562f5ec66a5a0ba334caea80ed66))
* expose get dial queue method of connection manager ([#371](https://github.com/libp2p/js-libp2p-interfaces/issues/371)) ([0c407aa](https://github.com/libp2p/js-libp2p-interfaces/commit/0c407aa0772c171bf6650e31fb20a3433df40b6b))

## [@libp2p/interface-mocks-v9.3.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.3.3...@libp2p/interface-mocks-v9.3.4) (2023-04-14)


### Dependencies

* update sibling dependencies ([34b1627](https://github.com/libp2p/js-libp2p-interfaces/commit/34b1627458b2ada5e94e00cf4bcba41a77232090))

## [@libp2p/interface-mocks-v9.3.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.3.2...@libp2p/interface-mocks-v9.3.3) (2023-04-14)


### Dependencies

* update sibling dependencies ([3e743bb](https://github.com/libp2p/js-libp2p-interfaces/commit/3e743bba3d8ebd081907e74f02728a1e8476a147))

## [@libp2p/interface-mocks-v9.3.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.3.1...@libp2p/interface-mocks-v9.3.2) (2023-04-13)


### Dependencies

* update any-signal to 4.x.x ([#369](https://github.com/libp2p/js-libp2p-interfaces/issues/369)) ([72be911](https://github.com/libp2p/js-libp2p-interfaces/commit/72be91176509f619e5d621463cb4ecc014fde0b7))

## [@libp2p/interface-mocks-v9.3.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.3.0...@libp2p/interface-mocks-v9.3.1) (2023-04-13)


### Dependencies

* bump it-map from 2.0.1 to 3.0.2 ([#361](https://github.com/libp2p/js-libp2p-interfaces/issues/361)) ([c016269](https://github.com/libp2p/js-libp2p-interfaces/commit/c01626912eae85969bf2b1027b68a5242a4ae4d4))

## [@libp2p/interface-mocks-v9.3.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.2.4...@libp2p/interface-mocks-v9.3.0) (2023-04-11)


### Features

* support batch dialling ([#351](https://github.com/libp2p/js-libp2p-interfaces/issues/351)) ([e46b72b](https://github.com/libp2p/js-libp2p-interfaces/commit/e46b72b1731ff935a1f0d755cbaf6f3159060ed3))


### Dependencies

* update sibling dependencies ([b034810](https://github.com/libp2p/js-libp2p-interfaces/commit/b0348102e41dc18166e70063f4708a2b3544f4b6))

## [@libp2p/interface-mocks-v9.2.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.2.3...@libp2p/interface-mocks-v9.2.4) (2023-04-04)


### Dependencies

* bump it-pipe from 2.0.5 to 3.0.1 ([#363](https://github.com/libp2p/js-libp2p-interfaces/issues/363)) ([625817b](https://github.com/libp2p/js-libp2p-interfaces/commit/625817b0bbbee276983c40a0604c8810a25abe8f))

## [@libp2p/interface-mocks-v9.2.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.2.2...@libp2p/interface-mocks-v9.2.3) (2023-03-17)


### Bug Fixes

* update project settings ([2aa4f95](https://github.com/libp2p/js-libp2p-interfaces/commit/2aa4f9583fb8ff9b53c51ebb6b81f72d69a1748d))

## [@libp2p/interface-mocks-v9.2.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.2.1...@libp2p/interface-mocks-v9.2.2) (2023-03-17)


### Dependencies

* update @multiformats/multiaddr to 12.0.0 ([#354](https://github.com/libp2p/js-libp2p-interfaces/issues/354)) ([e0f327b](https://github.com/libp2p/js-libp2p-interfaces/commit/e0f327b5d54e240feabadce21a841629d633ec5e))

## [@libp2p/interface-mocks-v9.2.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.2.0...@libp2p/interface-mocks-v9.2.1) (2023-03-10)


### Bug Fixes

* filter closed connections properly ([#349](https://github.com/libp2p/js-libp2p-interfaces/issues/349)) ([21021c3](https://github.com/libp2p/js-libp2p-interfaces/commit/21021c366579db5b45b93ea4446118f32aca0428))

## [@libp2p/interface-mocks-v9.2.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.1.3...@libp2p/interface-mocks-v9.2.0) (2023-03-09)


### Features

* split connection gater out into module ([#347](https://github.com/libp2p/js-libp2p-interfaces/issues/347)) ([1824744](https://github.com/libp2p/js-libp2p-interfaces/commit/18247442aa64c809d9e101ccbd0067ce48bdb80f))


### Bug Fixes

* update @libp2p/interface-connection-gater depdendency ([e53cf8b](https://github.com/libp2p/js-libp2p-interfaces/commit/e53cf8b26b83dcca553b934f171d07d817df15ca))


### Dependencies

* update sibling dependencies ([e72292f](https://github.com/libp2p/js-libp2p-interfaces/commit/e72292fe1e37ac55b041a09058365fb74de0e629))

## [@libp2p/interface-mocks-v9.1.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.1.2...@libp2p/interface-mocks-v9.1.3) (2023-03-07)


### Bug Fixes

* dispatch connection event from mock upgrader ([#345](https://github.com/libp2p/js-libp2p-interfaces/issues/345)) ([b691b1f](https://github.com/libp2p/js-libp2p-interfaces/commit/b691b1fa28e23b549c32e89d6b7c98d6a50c7b8f))

## [@libp2p/interface-mocks-v9.1.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.1.1...@libp2p/interface-mocks-v9.1.2) (2023-02-22)


### Bug Fixes

* replace err-code with CodeError ([#334](https://github.com/libp2p/js-libp2p-interfaces/issues/334)) ([a909d41](https://github.com/libp2p/js-libp2p-interfaces/commit/a909d418ce1128c771b682dc78bb48789d4b319a)), closes [js-libp2p#1269](https://github.com/libp2p/js-libp2p/issues/1269)

## [@libp2p/interface-mocks-v9.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.1.0...@libp2p/interface-mocks-v9.1.1) (2023-01-18)


### Dependencies

* bump aegir from 37.12.1 to 38.1.0 ([#335](https://github.com/libp2p/js-libp2p-interfaces/issues/335)) ([7368a36](https://github.com/libp2p/js-libp2p-interfaces/commit/7368a363423a08e8fa247dcb76ea13e4cf030d65))

## [@libp2p/interface-mocks-v9.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.0.1...@libp2p/interface-mocks-v9.1.0) (2023-01-17)


### Features

* safe dispatch event ([#319](https://github.com/libp2p/js-libp2p-interfaces/issues/319)) ([8caeee8](https://github.com/libp2p/js-libp2p-interfaces/commit/8caeee8221e78c2412d8aeb9a7db7cc43abfdf1b)), closes [#317](https://github.com/libp2p/js-libp2p-interfaces/issues/317)

## [@libp2p/interface-mocks-v9.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v9.0.0...@libp2p/interface-mocks-v9.0.1) (2023-01-14)


### Bug Fixes

* accept multiaddr param when opening connections ([#336](https://github.com/libp2p/js-libp2p-interfaces/issues/336)) ([fef9c26](https://github.com/libp2p/js-libp2p-interfaces/commit/fef9c26847cf63cb95f5fcb51ee40cbc679cc6bf))


### Trivial Changes

* remove lerna ([#330](https://github.com/libp2p/js-libp2p-interfaces/issues/330)) ([6678592](https://github.com/libp2p/js-libp2p-interfaces/commit/6678592dd0cf601a2671852f9d2a0aff5dee2b18))

## [@libp2p/interface-mocks-v9.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v8.0.5...@libp2p/interface-mocks-v9.0.0) (2023-01-06)


### ⚠ BREAKING CHANGES

* update peer-id dep to pull in new multiformats (#331)

### Bug Fixes

* update peer-id dep to pull in new multiformats ([#331](https://github.com/libp2p/js-libp2p-interfaces/issues/331)) ([fb8b7ba](https://github.com/libp2p/js-libp2p-interfaces/commit/fb8b7ba654a30a08da0652e2833e36dd3bb85e90))


### Dependencies

* update sibling dependencies ([667082f](https://github.com/libp2p/js-libp2p-interfaces/commit/667082f7070ec28a2f19c356fe44fd7499958f2e))

## [@libp2p/interface-mocks-v8.0.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v8.0.4...@libp2p/interface-mocks-v8.0.5) (2023-01-06)


### Dependencies

* update sibling dependencies ([b50e621](https://github.com/libp2p/js-libp2p-interfaces/commit/b50e621d31a8b32affc3fadb9f97c4883d577f93))

## [@libp2p/interface-mocks-v8.0.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v8.0.3...@libp2p/interface-mocks-v8.0.4) (2022-12-16)


### Documentation

* update project config ([#323](https://github.com/libp2p/js-libp2p-interfaces/issues/323)) ([0fc6a08](https://github.com/libp2p/js-libp2p-interfaces/commit/0fc6a08e9cdcefe361fe325281a3a2a03759ff59))

## [@libp2p/interface-mocks-v8.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v8.0.2...@libp2p/interface-mocks-v8.0.3) (2022-12-14)


### Bug Fixes

* generate docs for all packages ([#321](https://github.com/libp2p/js-libp2p-interfaces/issues/321)) ([b6f8b32](https://github.com/libp2p/js-libp2p-interfaces/commit/b6f8b32a920c15a28fe021e6050e31aaae89d518))

## [@libp2p/interface-mocks-v8.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v8.0.1...@libp2p/interface-mocks-v8.0.2) (2022-12-07)


### Bug Fixes

* add missing dependency ([e2168e8](https://github.com/libp2p/js-libp2p-interfaces/commit/e2168e8f863d6a488e4117800b5143dce1122b0b))

## [@libp2p/interface-mocks-v8.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v8.0.0...@libp2p/interface-mocks-v8.0.1) (2022-11-05)


### Bug Fixes

* metrics only need numbers ([#312](https://github.com/libp2p/js-libp2p-interfaces/issues/312)) ([0076c1f](https://github.com/libp2p/js-libp2p-interfaces/commit/0076c1f354ebc1106b6ac42d48688c0209866084))

## [@libp2p/interface-mocks-v8.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v7.1.0...@libp2p/interface-mocks-v8.0.0) (2022-11-05)


### ⚠ BREAKING CHANGES

* the global/per-peer moving average tracking has been removed from the interface as it's expensive and requires lots of timers - this functionality can be replicated by implementations if it's desirable.  It's better to have simple counters instead and let an external system like Prometheus or Graphana calculate the values over time

### Features

* return metrics objects from register instead of updating with an options object ([#310](https://github.com/libp2p/js-libp2p-interfaces/issues/310)) ([3b106ce](https://github.com/libp2p/js-libp2p-interfaces/commit/3b106ce799b5d84a82a66238995e09970ed8116c))


### Bug Fixes

* update project config ([#311](https://github.com/libp2p/js-libp2p-interfaces/issues/311)) ([27dd0ce](https://github.com/libp2p/js-libp2p-interfaces/commit/27dd0ce3c249892ac69cbb24ddaf0b9f32385e37))


### Dependencies

* update sibling dependencies ([6f41152](https://github.com/libp2p/js-libp2p-interfaces/commit/6f41152cc10e9babd338fe0c0d3c9bfff6eee960))

## [@libp2p/interface-mocks-v7.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v7.0.3...@libp2p/interface-mocks-v7.1.0) (2022-11-05)


### Features

* allow passing muxer factory to mock upgrader ([#309](https://github.com/libp2p/js-libp2p-interfaces/issues/309)) ([b2a4d92](https://github.com/libp2p/js-libp2p-interfaces/commit/b2a4d9231580e4cfc7b662e4cdae72f43e1c1011))

## [@libp2p/interface-mocks-v7.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v7.0.2...@libp2p/interface-mocks-v7.0.3) (2022-10-18)


### Dependencies

* bump it-ndjson from 0.1.1 to 1.0.0 ([#308](https://github.com/libp2p/js-libp2p-interfaces/issues/308)) ([54db8a4](https://github.com/libp2p/js-libp2p-interfaces/commit/54db8a45c8e533b832c0b7b0f6847c28d7185676))

## [@libp2p/interface-mocks-v7.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v7.0.1...@libp2p/interface-mocks-v7.0.2) (2022-10-17)


### Dependencies

* bump it-map from 1.0.6 to 2.0.0 ([#304](https://github.com/libp2p/js-libp2p-interfaces/issues/304)) ([8a1f7f4](https://github.com/libp2p/js-libp2p-interfaces/commit/8a1f7f4241d3acf250ee81a2265a00f58e80e6ed))

## [@libp2p/interface-mocks-v7.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v7.0.0...@libp2p/interface-mocks-v7.0.1) (2022-10-12)


### Bug Fixes

* export network components type ([79a5d8f](https://github.com/libp2p/js-libp2p-interfaces/commit/79a5d8fc57ae47274ff9ad9c3969c5898f07eb1d))
* update mock network components use ([c760e95](https://github.com/libp2p/js-libp2p-interfaces/commit/c760e95f07b6199f08adb20c1e3a4265649fdda0))


### Trivial Changes

* fix linting ([a8ab192](https://github.com/libp2p/js-libp2p-interfaces/commit/a8ab19295452c388d6556ea7847c490035455c99))

## [@libp2p/interface-mocks-v7.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v6.1.0...@libp2p/interface-mocks-v7.0.0) (2022-10-12)


### ⚠ BREAKING CHANGES

* modules no longer implement `Initializable` instead switching to constructor injection

### Bug Fixes

* remove @libp2p/components ([#301](https://github.com/libp2p/js-libp2p-interfaces/issues/301)) ([1d37dc6](https://github.com/libp2p/js-libp2p-interfaces/commit/1d37dc6d3197838a71895d5769ad8bba6eb38fd3))


### Dependencies

* update sibling dependencies ([99330b2](https://github.com/libp2p/js-libp2p-interfaces/commit/99330b20842b2aff7530d1b9d373e8dce1ec3699))
* update sibling dependencies ([6f26d1b](https://github.com/libp2p/js-libp2p-interfaces/commit/6f26d1b0343f4b41c064fab3ef87f308fc0c652d))
* update sibling dependencies ([2ad1fa3](https://github.com/libp2p/js-libp2p-interfaces/commit/2ad1fa37c46b4c472570d79a592e798f20ed0cc8))

## [@libp2p/interface-mocks-v6.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v6.0.1...@libp2p/interface-mocks-v6.1.0) (2022-10-11)


### Features

* add afterUpgradeInbound method ([#300](https://github.com/libp2p/js-libp2p-interfaces/issues/300)) ([fbdf5f5](https://github.com/libp2p/js-libp2p-interfaces/commit/fbdf5f54277735a26df0a28099eeae9d57159978))

## [@libp2p/interface-mocks-v6.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v6.0.0...@libp2p/interface-mocks-v6.0.1) (2022-10-07)


### Dependencies

* bump @libp2p/components from 2.1.1 to 3.0.0 ([#299](https://github.com/libp2p/js-libp2p-interfaces/issues/299)) ([b3f493c](https://github.com/libp2p/js-libp2p-interfaces/commit/b3f493c5e260f697f66de54b56379d036ca3db59))

## [@libp2p/interface-mocks-v6.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v5.1.0...@libp2p/interface-mocks-v6.0.0) (2022-10-06)


### ⚠ BREAKING CHANGES

* the return type of StreamMuxer.newStream can now return a promise

Co-authored-by: Marco Munizaga <marco@marcopolo.io>

### Features

* add upgrader options ([#290](https://github.com/libp2p/js-libp2p-interfaces/issues/290)) ([c502b66](https://github.com/libp2p/js-libp2p-interfaces/commit/c502b66d87020eb8e2768c49be17392c55503f69))


### Dependencies

* update sibling dependencies ([0fae3ee](https://github.com/libp2p/js-libp2p-interfaces/commit/0fae3ee43fab43293fb290654a927b5c5c5759fc))
* update sibling dependencies ([8a89a05](https://github.com/libp2p/js-libp2p-interfaces/commit/8a89a054e95827dd8cccc033669e17ae58059fbc))
* update sibling dependencies ([66b4993](https://github.com/libp2p/js-libp2p-interfaces/commit/66b49938a09eeb12bf8ec8d78938d5cffd6ec134))

## [@libp2p/interface-mocks-v5.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v5.0.0...@libp2p/interface-mocks-v5.1.0) (2022-10-04)


### Features

* add acceptIncomingConnection to ConnectionManager ([#295](https://github.com/libp2p/js-libp2p-interfaces/issues/295)) ([5d460e8](https://github.com/libp2p/js-libp2p-interfaces/commit/5d460e8815a8b49915da7ffabccc4a8b96a61acc))

## [@libp2p/interface-mocks-v5.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v4.0.3...@libp2p/interface-mocks-v5.0.0) (2022-10-04)


### ⚠ BREAKING CHANGES

* Add remoteExtensions to connection-encrypter (#293)

### Features

* Add remoteExtensions to connection-encrypter ([#293](https://github.com/libp2p/js-libp2p-interfaces/issues/293)) ([501c684](https://github.com/libp2p/js-libp2p-interfaces/commit/501c684d792cd910de7cb9bfbda349db257ee2ca))


### Dependencies

* update sibling dependencies ([419f947](https://github.com/libp2p/js-libp2p-interfaces/commit/419f9479e8bba5d0555fe20a6fb9f0cf12a82cf9))

## [@libp2p/interface-mocks-v4.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v4.0.2...@libp2p/interface-mocks-v4.0.3) (2022-09-21)


### Dependencies

* update @multiformats/multiaddr to 11.0.0 ([#288](https://github.com/libp2p/js-libp2p-interfaces/issues/288)) ([57b2ad8](https://github.com/libp2p/js-libp2p-interfaces/commit/57b2ad88edfc7807311143791bc49270b1a81eaf))

## [@libp2p/interface-mocks-v4.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v4.0.1...@libp2p/interface-mocks-v4.0.2) (2022-08-11)


### Bug Fixes

* update marshal type ([#282](https://github.com/libp2p/js-libp2p-interfaces/issues/282)) ([2c04ff9](https://github.com/libp2p/js-libp2p-interfaces/commit/2c04ff98097ba33dc64878b788c6b9318d2ea98b))

## [@libp2p/interface-mocks-v4.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v4.0.0...@libp2p/interface-mocks-v4.0.1) (2022-08-10)


### Bug Fixes

* revert connection encryption change to accept Uint8ArrayLists ([#280](https://github.com/libp2p/js-libp2p-interfaces/issues/280)) ([03d763c](https://github.com/libp2p/js-libp2p-interfaces/commit/03d763c1a6b168bba001783a1fb59af3f7d4e205))

## [@libp2p/interface-mocks-v4.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v3.0.3...@libp2p/interface-mocks-v4.0.0) (2022-08-07)


### ⚠ BREAKING CHANGES

* change stream muxer interface (#279)
* change connection encryption interface to uint8arraylist (#278)

### Features

* change connection encryption interface to uint8arraylist ([#278](https://github.com/libp2p/js-libp2p-interfaces/issues/278)) ([1fa580c](https://github.com/libp2p/js-libp2p-interfaces/commit/1fa580c5a45325dc9384738e9a78a238eabb81c3))
* change stream muxer interface ([#279](https://github.com/libp2p/js-libp2p-interfaces/issues/279)) ([1ebe269](https://github.com/libp2p/js-libp2p-interfaces/commit/1ebe26988b6a286f36a4fc5177f502cfb60368a1))


### Dependencies

* update sibling dependencies ([f75e927](https://github.com/libp2p/js-libp2p-interfaces/commit/f75e9271345910e812ad600f936f4f774028e3fe))
* update sibling dependencies ([d98a5ea](https://github.com/libp2p/js-libp2p-interfaces/commit/d98a5ea604c817cf6da47d9e86eea1e981b48711))
* update sibling dependencies ([f859920](https://github.com/libp2p/js-libp2p-interfaces/commit/f859920423587ae797ac90ccaa3af8bdf60ae549))
* update sibling dependencies ([93a89b1](https://github.com/libp2p/js-libp2p-interfaces/commit/93a89b1ca6d35fb5f26963ae7bb10026f3f5d45d))

## [@libp2p/interface-mocks-v3.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v3.0.2...@libp2p/interface-mocks-v3.0.3) (2022-07-31)


### Dependencies

* update uint8arraylist and p-wait-for deps ([#274](https://github.com/libp2p/js-libp2p-interfaces/issues/274)) ([c55f12e](https://github.com/libp2p/js-libp2p-interfaces/commit/c55f12e47be0a10e41709b0d6a60dd8bc1209ee5))

## [@libp2p/interface-mocks-v3.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v3.0.1...@libp2p/interface-mocks-v3.0.2) (2022-07-31)


### Bug Fixes

* mock connection manager close reciprocal connection ([#268](https://github.com/libp2p/js-libp2p-interfaces/issues/268)) ([f16dd7b](https://github.com/libp2p/js-libp2p-interfaces/commit/f16dd7bed2735e3a27e8febfe48bac75d4ff009f))


### Trivial Changes

* update project config ([#271](https://github.com/libp2p/js-libp2p-interfaces/issues/271)) ([59c0bf5](https://github.com/libp2p/js-libp2p-interfaces/commit/59c0bf5e0b05496fca2e4902632b61bb41fad9e9))

## [@libp2p/interface-mocks-v3.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v3.0.0...@libp2p/interface-mocks-v3.0.1) (2022-06-27)


### Trivial Changes

* update deps ([#262](https://github.com/libp2p/js-libp2p-interfaces/issues/262)) ([51edf7d](https://github.com/libp2p/js-libp2p-interfaces/commit/51edf7d9b3765a6f75c915b1483ea345d0133a41))

## [@libp2p/interface-mocks-v3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v2.1.0...@libp2p/interface-mocks-v3.0.0) (2022-06-24)


### ⚠ BREAKING CHANGES

* StreamMuxer now has a `close` method

### Features

* add stream muxer close ([#254](https://github.com/libp2p/js-libp2p-interfaces/issues/254)) ([d1f511e](https://github.com/libp2p/js-libp2p-interfaces/commit/d1f511e4b5857769c4eddf902288dc69fcb667b4))


### Trivial Changes

* update sibling dependencies [skip ci] ([7f7fb67](https://github.com/libp2p/js-libp2p-interfaces/commit/7f7fb67b054688bfbc0cc68b9f2892bee8b41f13))
* update sibling dependencies [skip ci] ([c522241](https://github.com/libp2p/js-libp2p-interfaces/commit/c522241b08cfef3995efb5415104f46521dcd3b7))

## [@libp2p/interface-mocks-v2.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v2.0.1...@libp2p/interface-mocks-v2.1.0) (2022-06-21)


### Features

* add direction to StreamMuxerInit ([#253](https://github.com/libp2p/js-libp2p-interfaces/issues/253)) ([6d34d75](https://github.com/libp2p/js-libp2p-interfaces/commit/6d34d755ff4e798d52945f1f099052bdd6a83f2b))

## [@libp2p/interface-mocks-v2.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v2.0.0...@libp2p/interface-mocks-v2.0.1) (2022-06-17)


### Bug Fixes

* update stream handler args ([#247](https://github.com/libp2p/js-libp2p-interfaces/issues/247)) ([d29e134](https://github.com/libp2p/js-libp2p-interfaces/commit/d29e134bd70295c725bfd627d5887954d1a278ae))

## [@libp2p/interface-mocks-v2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v1.1.0...@libp2p/interface-mocks-v2.0.0) (2022-06-16)


### ⚠ BREAKING CHANGES

* The Connection and Stream APIs have been updated

### Features

* store stream data on the stream, track the stream direction ([#245](https://github.com/libp2p/js-libp2p-interfaces/issues/245)) ([6d74d2f](https://github.com/libp2p/js-libp2p-interfaces/commit/6d74d2f9f344fb4d6741ba0d35263ebe351a4c65))


### Trivial Changes

* update deps ([970a940](https://github.com/libp2p/js-libp2p-interfaces/commit/970a940a2f65b946936a53febdc52527baefbd34))
* update deps ([219e60e](https://github.com/libp2p/js-libp2p-interfaces/commit/219e60ec6f886b95803457fe48dfcdb4ed57e34c))
* update deps ([545264f](https://github.com/libp2p/js-libp2p-interfaces/commit/545264f87a58394d2a7da77e93f3a596e889238f))

## [@libp2p/interface-mocks-v1.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v1.0.1...@libp2p/interface-mocks-v1.1.0) (2022-06-16)


### Features

* define stream limits as input/output ([#240](https://github.com/libp2p/js-libp2p-interfaces/issues/240)) ([554fe95](https://github.com/libp2p/js-libp2p-interfaces/commit/554fe95865c4851fcef3b311d80d44f82a613969))

## [@libp2p/interface-mocks-v1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-mocks-v1.0.0...@libp2p/interface-mocks-v1.0.1) (2022-06-14)


### Bug Fixes

* remove components from muxer factory function ([#238](https://github.com/libp2p/js-libp2p-interfaces/issues/238)) ([e4dab30](https://github.com/libp2p/js-libp2p-interfaces/commit/e4dab306d9bf406b9bb3cb92644e28cf81f7bda6))


### Trivial Changes

* update components module ([#235](https://github.com/libp2p/js-libp2p-interfaces/issues/235)) ([5844207](https://github.com/libp2p/js-libp2p-interfaces/commit/58442070af59aa852c83ec3aecdbd1d2c646b018))
* update it-pushable dep ([#237](https://github.com/libp2p/js-libp2p-interfaces/issues/237)) ([2e16465](https://github.com/libp2p/js-libp2p-interfaces/commit/2e164658df344b5ec475be2a571df5d6f20ee086))

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
