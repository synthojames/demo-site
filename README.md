# demo-site

**English** | [日本語](README.ja.md)

A demo of a **headless CMS corporate website** with a change-control model that separates *content* changes from *code* changes. Built for a fictional company (株式会社サンプルマーケット) to show how a small IT team can let non-engineers publish text safely while keeping infrastructure and code under review.

**Stack:** [Sanity](https://www.sanity.io/) (CMS) · [Astro](https://astro.build/) (static site) · [Cloudflare](https://developers.cloudflare.com/workers/static-assets/) via Wrangler (hosting) · GitHub Actions (CI/CD) · Terraform (repo governance)

## How it works

```
 Editors ──► Sanity Studio ──publish──► repository_dispatch (sanity-publish)
                                                   │
                                                   ▼
                              deploy-content.yml: rebuild the LAST APPROVED
                              code release with the new content ─► Cloudflare
 Developers ─► PR ─► checks + IT review ─► main ─► deploy.yml
                                          (production approval) ─► Cloudflare
```

- **Content** lives in Sanity and is fetched at build time (`src/lib/sanity.ts`). The site is fully static.
- **Content publishes** deploy automatically, with no reviewer. The control for text is Sanity itself: roles, draft/publish, and field limits in the schema. Content always builds against the last commit that passed a production deploy, so unreviewed code can never ship through the content path.
- **Code changes** go through a pull request, required checks, and CODEOWNERS review, and the production deploy requires environment approval.
- **Integrity monitoring:** every deploy records a SHA-256 manifest of the served files. A scheduled workflow compares the live site against it twice an hour and fails on any mismatch.

## Repository layout

| Path | What it is |
|---|---|
| `src/` | Astro site: `index` (home), `[slug]` (CMS pages), `news` and `news/[id]` |
| `studio/` | Sanity Studio project and schemas (`page`, `newsItem`) |
| `terraform/` | GitHub repo settings, branch rulesets, and deployment environments as code |
| `scripts/` | `make-manifest.sh` and `verify-manifest.sh` for the integrity check |
| `.github/workflows/` | CI/CD pipelines (below) |
| `.github/CODEOWNERS` | Review ownership, with extra lines for sensitive paths |
| `wrangler.jsonc` | Cloudflare deployment config (serves `./dist`) |

## Content model

Defined in `studio/schemaTypes/`. Field limits are the main guardrail for editors.

- **Page** (`page`): admin title, slug, headline (max 60 chars), body (required, max 400 chars). Slugs must be lowercase letters, digits, and hyphens. `news` is reserved, and the slug `home` is served at `/`.
- **News item** (`newsItem`): title (max 80 chars), publish date, optional body. Listed at `/news`, with detail pages at `/news/<id>/`.

The Astro build also validates page slugs (format, duplicates, reserved names) and fails rather than publishing a bad page.

## Local development

Requires Node (see `.nvmrc`; `package.json` requires `>=22.23.4`).

```bash
# Site
npm ci --ignore-scripts
npm run dev        # http://localhost:4321
npm run build      # outputs to ./dist
npm run preview

# Studio (separate project; requires Node >= 24)
cd studio
npm ci
npm run dev        # Sanity Studio on localhost
```

The build reads published content from the Sanity project configured in `src/lib/sanity.ts` and fails if the `home` page doesn't exist.

## CI/CD workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `pr-checks.yml` | Pull request to `main` | `npm audit` (production deps, high severity) and a build. Job name `Build and audit` is a required status check. |
| `deploy.yml` | Push to `main` | Build, then deploy to Cloudflare behind the `production` environment (approval required), then record the integrity manifest. |
| `deploy-content.yml` | `repository_dispatch` (`sanity-publish`) | Find the last successfully deployed commit on `main`, rebuild it with fresh content, deploy via the `content-publish` environment (no reviewer), and record the manifest. |
| `integrity-check.yml` | Every 30 minutes (`:17`, `:47`) and manual | Compare the live site to the recorded manifest; retries once after 90 seconds to tolerate in-progress deploys. |

Supply-chain hardening: actions are pinned to commit SHAs, workflow permissions default to none and are granted per job, and dependencies install with `--ignore-scripts`.

## Governance (Terraform)

`terraform/` manages the GitHub repository itself:

- Squash-merge only; branches deleted on merge.
- Secret scanning, push protection, and vulnerability alerts enabled.
- **`main-hard-rules` ruleset:** no deletion or force-push, PRs required, and the `Build and audit` check must pass with an up-to-date branch. No bypass.
- **`main-review` ruleset:** one approving review from a code owner, with stale approvals dismissed on push. Only the repo admin can bypass, and only via a PR.
- **Environments:** `production` (required reviewer, restricted to `main`) and `content-publish` (no reviewer, restricted to `main`).

> This is a single-person demo, so `prevent_self_review` is off on `production`. In a real deployment it would be on, with at least two approvers and the security team named in CODEOWNERS for sensitive paths.

State files and `*.tfvars` are git-ignored because the repo is public. The GitHub token comes from the `GITHUB_TOKEN` environment variable and must never be committed.

```bash
cd terraform
export GITHUB_TOKEN=...   # token with repo admin scope
terraform init
terraform plan
```

## Required configuration

| Where | Name | Purpose |
|---|---|---|
| GitHub secret | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Wrangler deploys |
| GitHub variable | `SITE_URL` | Base URL for the integrity check |
| Sanity | Webhook to GitHub's dispatches API, event type `sanity-publish` | Triggers `deploy-content.yml` on publish |
