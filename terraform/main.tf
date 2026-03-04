terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    cloudflare = {
      source   = "cloudflare/cloudflare"
      version  = "~> 4.0"
    }
  }
  cloud {
    organization = "entrata"
    workspaces {
      name = var.TFC_WORKSPACE_NAME
    }
  }
}

provider "aws" {
  region = var.region
  assume_role {
    role_arn     = "arn:aws:iam::${var.account_number}:role/terraform-cloud"
    session_name = "${var.proj}-terraform"
  }
}
provider "cloudflare" {}

module "deploy-microfrontend" {
  source  = "app.terraform.io/entrata/deploy-microfrontend/entrata"
  version = "1.0.2"

  providers = {
    cloudflare = cloudflare
  }

  region               = var.region
  account_number       = var.account_number
  proj                 = var.proj
  stack                = var.stack
  bucket               = "${var.account_number}-oxp-prototype"
  environment          = var.environment
  acm_certificate_arn  = var.acm_certificate_arn
  cname                = var.cname
  dns_provider         = var.dns_provider
  TFC_WORKSPACE_NAME   = var.TFC_WORKSPACE_NAME
  tag_owner-department = var.tag_owner_department
  tag_owner-contact    = var.tag_owner_contact
  tag_owner-name       = var.tag_owner_name
}
