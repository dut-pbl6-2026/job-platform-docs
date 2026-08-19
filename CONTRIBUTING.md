# Contributing to job-platform-docs

This repository is the **documentation and governance hub** of the Vietnam Job Platform (`pbl6`) project. It does not contain application source code.

## Where changes go

| Type of change | Repository |
|:---------------|:-----------|
| Master plan, SRS, meeting notes, governance, templates | This repository (`job-platform-docs`) |
| Application / service code | The respective `job-platform-*` repository (see [README](README.md)) |
| Docker Compose, Kubernetes manifests, deployment scripts | `job-platform-infra` |

## Process

1. Branch off `main`: `feature/<description>` or `docs/<description>`.
2. Make changes and keep both English and Vietnamese documents in sync.
3. Open a pull request against `main` following the PR template in `.github/git-strategy.md`.
4. Follow the commit format `<type>(<scope>): <subject>` (e.g. `docs(srs): ...`).

Documentation changes affecting multiple parts of the system should reference the relevant section numbers in the master plan and SRS.