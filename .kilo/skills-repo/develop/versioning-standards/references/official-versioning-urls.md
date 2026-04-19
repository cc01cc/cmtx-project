# Official Versioning URLs

Use these links as first-party references. Prefer official specs over blog posts.

## Local Offline First

先使用以下本地文档，再按本文链接在线抓取：

- `README.md`
- `semver-core-and-practice.md`
- `python-pep440-practice.md`
- `dependency-range-cheatsheet.md`
- `non-semver-ecosystems.md`
- `versioning-decision-playbook.md`

## Core Standards

- SemVer home: <https://semver.org/>
- SemVer 2.0.0 spec: <https://semver.org/spec/v2.0.0.html>
- RFC 2119 keywords: <https://datatracker.ietf.org/doc/html/rfc2119>
- RFC 8174 update to RFC 2119 usage: <https://datatracker.ietf.org/doc/html/rfc8174>

## Python

- PyPA version specifiers (canonical current): <https://packaging.python.org/en/latest/specifications/version-specifiers/>
- PEP 440 (historical source): <https://peps.python.org/pep-0440/>
- Python versions status (release lifecycle): <https://devguide.python.org/versions/>

## npm / JavaScript

- npm about semantic versioning: <https://docs.npmjs.com/about-semantic-versioning>
- npm version command behavior: <https://docs.npmjs.com/cli/v11/commands/npm-version>
- node-semver implementation and range grammar: <https://github.com/npm/node-semver>

## Go

- Go module version numbering: <https://go.dev/doc/modules/version-numbers>

## Rust

- Cargo dependency version requirements: <https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html>
- Rust semver crate docs (Cargo flavor): <https://docs.rs/semver/latest/semver/>

## Maven / Java

- Maven version order specification: <https://maven.apache.org/pom.html#version-order-specification>

## Debian / dpkg

- Debian policy version field: <https://www.debian.org/doc/debian-policy/ch-controlfields.html#version>
- dpkg deb-version man page: <https://manpages.debian.org/unstable/dpkg-dev/deb-version.7.en.html>

## RPM

- RPM dependencies and versioning basics: <https://rpm.org/docs/4.20.x/manual/dependencies.html>
- RPM spec Version/Release/Epoch: <https://rpm.org/docs/4.20.x/manual/spec.html#version>

## Calendar Versioning

- CalVer home: <https://calver.org/>
- CalVer overview: <https://calver.org/overview.html>

## Optional / If User Provides Content

- GNU versioning page (may not always be reachable from tooling): <https://www.gnu.org/prep/standards/html_node/Versioning.html>

## Fetch Guidance

When local references are insufficient or latest wording is required, fetch the exact section before finalizing:

- Sorting/precedence rules
- Pre-release handling
- Build metadata handling
- Epoch semantics
- Dependency range grammar and edge-cases
