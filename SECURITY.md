# Security policy

## Reporting a vulnerability

Please don't open a public issue for a security problem. Report it privately
through GitHub's [private vulnerability reporting](https://github.com/dpologdvinity/daydaze/security/advisories/new)
or by email to kaitlynbassford@gmail.com.

Include what you found, how to reproduce it, and what it affects. You'll get
a reply within a week. Once a fix ships you can be credited in the advisory if
you'd like.

## Scope

The game client (`src/`), the Cloudflare Worker, Durable Objects and D1 schema
(`server/`), and the build and CI scripts. The threat model and known gaps are
in [`docs/security.md`](docs/security.md).

Daydaze is not deployed yet, so there is only one supported version: `main`.
