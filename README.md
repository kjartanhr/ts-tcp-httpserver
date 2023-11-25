# ts-tcp-httpserver

## What is this

This is an _extremely_ simple HTTP/1.1 server written in TypeScript using node:net to open a TCP socket to listen for and respond to HTTP requests.

## Goals

- [x] Receive and respond to HTTP requests purely by reading and writing data to and from a TCP socket.
- [x] With the above, support transmission of non-text formats (e.g. images, binaries, etc.)
- [ ] Use tests on a finished codebase to effectively test whether code behaviour stays consistent with feature changes.
- [x] Implement 'quality of life' features such as index pages at the root and in directories.
- [x] Code in a mostly functional+procedural style, avoiding nesting, and emphasising readable code.

## What I've learned

- More about how HTTP/1.1 works as a standard in practical terms.
- Expanded knowledge of how to work with sockets as well as how they work.
- Expanded knowledge of buffers in nodejs, how they work and how to work with them.
- Using hexdump to diagnose problems in data transmission by examining data before and after being transmitted.

## Running

- `yarn dev` will run `tsc` in watch mode concurrently with `nodemon` to restart the server when changes are made.
- `yarn build` will run `tsc` to compile to the `build/` directory.
- `yarn start` will run `tsc` to compile to the `build/` directory and immediately run the built server.