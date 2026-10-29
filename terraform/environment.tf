data "github_user" "it" {
  username = "synthojames"
}

import {
  to = github_repository_environment.production
  id = "demo-site:production"
}

resource "github_repository_environment" "production" {
  repository          = github_repository.this.name
  environment         = "production"
  can_admins_bypass   = false
  prevent_self_review = false # demo only; production would be true, with at least two approvers

  reviewers {
    users = [data.github_user.it.id]
  }

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

import {
  to = github_repository_environment_deployment_policy.main
  id = "demo-site:production:64749269"
}

resource "github_repository_environment_deployment_policy" "main" {
  repository     = github_repository.this.name
  environment    = github_repository_environment.production.environment
  branch_pattern = "main"
}