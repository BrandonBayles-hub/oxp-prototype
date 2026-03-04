variable "region" {
  type        = string
  description = "The AWS region to deploy to"
  default     = "set aws region"
}

variable "TFC_WORKSPACE_NAME" {
  type        = string
  description = "The Workspace on Terraform Cloud"
  default     = "set terraform workspace"
}

variable "account_number" {
  type        = string
  description = "The AWS Account Number"
  default     = "set aws account number"
}

variable "aws_role_to_assume" {
  type        = string
  description = "The AWS role assumed"
  default     = "set aws assume role"
}

variable "proj" {
  type        = string
  description = "The repository/product configured for"
  default     = "proj-jc-bose"
}

variable "environment" {
  type        = string
  description = "Deployed environment"
  default     = "dev"
}

variable "stack" {
  type        = string
  description = "Deployed stack"
  default     = "d05d0001"
}

variable "acm_certificate_arn" {
  description = "Certificate ARN to associate with the CloudFront TLS traffic."
  type        = string
}

variable "cname" {
  description = "The cname, this is what you will set the DNS to, and what the certificate will use"
  type        = string
}

variable "dns_provider" {
  description = "DNS provider for the microfrontend"
  type        = string
  default     = "route53"
}

variable "tag_owner_department" {
  description = "Owner department tag"
  type        = string
  default     = "OXP-Lead-List-MF"
}

variable "tag_owner_contact" {
  description = "Owner contact tag"
  type        = string
}

variable "tag_owner_name" {
  description = "Owner name tag"
  type        = string
}