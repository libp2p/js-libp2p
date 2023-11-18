# @libp2p/multidim-interop <!-- omit in toc -->

[![libp2p.io](https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square)](http://libp2p.io/)
[![Discuss](https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg?style=flat-square)](https://discuss.libp2p.io)
[![codecov](https://img.shields.io/codecov/c/github/libp2p/js-libp2p.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p)
[![CI](https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=main\&style=flat-square)](https://github.com/libp2p/js-libp2p/actions/workflows/main.yml?query=branch%3Amain)

> Multidimensional interop tests

# Install <!-- omit in toc -->

```console
$ npm i @libp2p/multidim-interop
```

## Table of contents <!-- omit in toc -->

- [Usage](#usage)
  - [Build js-libp2p](#build-js-libp2p)
    - [node.js](#nodejs)
    - [Browsers](#browsers)
  - [Build another libp2p implementation](#build-another-libp2p-implementation)
  - [Running Redis](#running-redis)
  - [Start libp2p](#start-libp2p)
    - [node.js](#nodejs-1)
    - [Browsers](#browsers-1)
  - [Start another libp2p implementation](#start-another-libp2p-implementation)
- [License](#license)
- [Contribution](#contribution)

## Usage

The multidim interop tests use random high ports for listeners. Since you need to know which port will be listened on ahead of time to `EXPOSE` a port in a Docker image to the host machine, this means everything has to be run in Docker.

### Build js-libp2p

This must be repeated every time you make a change to the js-libp2p source code.

#### node.js

```console
$ npm run build
$ docker build . -f ./interop/Dockerfile -t js-libp2p-node
```

#### Browsers

```console
$ npm run build
$ docker build . -f ./interop/BrowserDockerfile -t js-libp2p-browsers
```

### Build another libp2p implementation

1. Clone the test-plans repo somewhere
   ```console
   $ git clone https://github.com/libp2p/test-plans.git
   ```
2. (Optional) If you are running an M1 Mac you may need to override the build platform.
   - Edit `/transport-interop/dockerBuildWrapper.sh`
   - Add `--platform linux/arm64/v8` to the `docker buildx build` command
     ```
     docker buildx build \
       --platform linux/arm64/v8 \    <-- add this line
       --load \
       -t $IMAGE_NAME $CACHING_OPTIONS "$@"
     ```
3. (Optional) Enable some sort of debug output
   - nim-libp2p
     - edit `/transport-interop/impl/nim/$VERSION/Dockerfile`
     - Change `-d:chronicles_log_level=WARN` to `-d:chronicles_log_level=DEBUG`
   - rust-libp2p
     - When starting the docker container add `-e RUST_LOG=debug`
   - go-libp2p
     - When starting the docker container add `-e GOLOG_LOG_LEVEL=debug`
4. Build the version you want to test against
   ```console
   $ cd multidim-interop/impl/$IMPL/$VERSION
   $ make
   ...
   ```

### Running Redis

Redis is used to allow inter-container communication, exchanging listen addresses etc. It must be started as a Docker container:

```console
$ docker run --name redis --rm -p 6379:6379 redis:7-alpine
```

### Start libp2p

#### node.js

```console
$ docker run -e transport=tcp -e muxer=yamux -e security=noise -e is_dialer=true -e redis_addr=redis:6379 --link redis:redis js-libp2p-node
```

#### Browsers

```console
$ docker run -e transport=webtransport -e muxer=yamux -e security=noise -e is_dialer=true -e redis_addr=redis:6379 --link redis:redis js-libp2p-browsers
```

### Start another libp2p implementation

- Change `go-v0.29` to the implementation you wish to use.
- Ensure one docker run has `is_dialer=false` and the other has `is_dialer=true`
- Ensure the `transport` option is the same for both implementations

```console
$ docker run -e transport=tcp -e muxer=yamux -e security=noise -e is_dialer=false -e redis_addr=redis:6379 --link redis:redis go-v0.29
```

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
