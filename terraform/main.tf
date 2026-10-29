import {
  to = github_repository.this
  id = "demo-site"
}

resource "github_repository" "this" {
  name       = "demo-site"
  visibility = "public"

  # Squash only: one commit per PR on main
  allow_squash_merge     = true
  allow_merge_commit     = false
  allow_rebase_merge     = false
  delete_branch_on_merge = true

  # Features we don't use
  has_wiki     = false
  has_projects = false
  has_issues   = true

  # Security scanning
  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }

  # Guard against accidental deletion
  archive_on_destroy = true
  lifecycle {
    prevent_destroy = true
  }
}

resource "github_repository_vulnerability_alerts" "this" {
  repository = github_repository.this.name
  enabled    = true
}