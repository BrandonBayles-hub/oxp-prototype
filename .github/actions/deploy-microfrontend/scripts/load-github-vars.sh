#!/bin/bash
# Load GitHub repository and environment variables
# Usage: load-github-vars.sh <REPO> <TOKEN> <ENVIRONMENT> <JSON_INPUT>

set -e

REPO="$1"
TOKEN="$2"
ENVIRONMENT="$3"
JSON_INPUT="$4"

if [ -z "$REPO" ] || [ -z "$TOKEN" ]; then
  echo "Error: REPO and TOKEN are required"
  exit 1
fi

echo "Loading variables from GitHub..."
if [ -n "$ENVIRONMENT" ]; then
  echo "Environment specified: $ENVIRONMENT (will load environment-specific variables)"
else
  echo "No environment specified (loading repository-level variables only)"
fi

# Step 1: Load repository-level variables (available to all environments)
echo "Loading repository-level variables..."
PAGE=1
PER_PAGE=100

while true; do
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/actions/variables?per_page=$PER_PAGE&page=$PAGE" 2>/dev/null || echo -e "\n000")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" != "200" ]; then
    if [ "$HTTP_CODE" = "403" ]; then
      echo "Warning: Failed to fetch repository variables (HTTP 403 Forbidden)"
      echo "  → This usually means the workflow lacks 'variables: read' permission"
      echo "  → Add 'variables: read' to your workflow's permissions block"
      echo "  → Continuing without repository variables..."
    elif [ "$HTTP_CODE" = "401" ]; then
      echo "Warning: Failed to fetch repository variables (HTTP 401 Unauthorized)"
      echo "  → Check that GITHUB_TOKEN has proper permissions"
      echo "  → Continuing without repository variables..."
    elif [ "$HTTP_CODE" != "000" ]; then
      echo "Warning: Failed to fetch repository variables (HTTP $HTTP_CODE), continuing..."
    fi
    break
  fi
  
  # Parse and set repository variables
  echo "$BODY" | jq -r '.variables[]? | "\(.name)=\(.value)"' | while IFS='=' read -r name value; do
    if [ -n "$name" ] && [ -n "$value" ]; then
      # Store original value for display (before escaping)
      display_value="$value"
      # Escape any single quotes in the value for shell safety
      escaped_value=$(echo "$value" | sed "s/'/'\\\\''/g")
      echo "$name=$escaped_value" >> $GITHUB_ENV
      echo "Loaded repository variable: $name=$display_value"
    fi
  done
  
  TOTAL_COUNT=$(echo "$BODY" | jq -r '.total_count // 0')
  CURRENT_COUNT=$((PAGE * PER_PAGE))
  if [ "$CURRENT_COUNT" -ge "$TOTAL_COUNT" ] || [ -z "$BODY" ] || [ "$(echo "$BODY" | jq '.variables | length')" -eq 0 ]; then
    break
  fi
  
  PAGE=$((PAGE + 1))
done

# Step 2: Load environment-specific variables (if ENVIRONMENT is provided)
# Environment variables override repository variables with the same name
if [ -n "$ENVIRONMENT" ]; then
  echo "Loading environment-specific variables for: $ENVIRONMENT..."
  PAGE=1
  PER_PAGE=100
  
  while true; do
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -H "Authorization: token $TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/repos/$REPO/environments/$ENVIRONMENT/variables?per_page=$PER_PAGE&page=$PAGE" 2>/dev/null || echo -e "\n000")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" != "200" ]; then
      if [ "$HTTP_CODE" = "404" ]; then
        echo "Environment '$ENVIRONMENT' not found or has no variables (this is OK)"
      elif [ "$HTTP_CODE" = "403" ]; then
        echo "Warning: Failed to fetch environment variables (HTTP 403 Forbidden)"
        echo "  → This usually means the workflow lacks 'environments: read' permission"
        echo "  → Add 'environments: read' to your workflow's permissions block"
        echo "  → Continuing without environment variables..."
      elif [ "$HTTP_CODE" = "401" ]; then
        echo "Warning: Failed to fetch environment variables (HTTP 401 Unauthorized)"
        echo "  → Check that GITHUB_TOKEN has proper permissions"
        echo "  → Continuing without environment variables..."
      elif [ "$HTTP_CODE" != "000" ]; then
        echo "Warning: Failed to fetch environment variables (HTTP $HTTP_CODE), continuing..."
      fi
      break
    fi
    
    # Parse and set environment variables (these override repository variables)
    echo "$BODY" | jq -r '.variables[]? | "\(.name)=\(.value)"' | while IFS='=' read -r name value; do
      if [ -n "$name" ] && [ -n "$value" ]; then
        # Store original value for display (before escaping)
        display_value="$value"
        # Escape any single quotes in the value for shell safety
        escaped_value=$(echo "$value" | sed "s/'/'\\\\''/g")
        echo "$name=$escaped_value" >> $GITHUB_ENV
        echo "Loaded environment variable (overrides repo var if exists): $name=$display_value"
      fi
    done
    
    TOTAL_COUNT=$(echo "$BODY" | jq -r '.total_count // 0')
    CURRENT_COUNT=$((PAGE * PER_PAGE))
    if [ "$CURRENT_COUNT" -ge "$TOTAL_COUNT" ] || [ -z "$BODY" ] || [ "$(echo "$BODY" | jq '.variables | length')" -eq 0 ]; then
      break
    fi
    
    PAGE=$((PAGE + 1))
  done
fi

# Step 3: Note about secrets
# Note: Environment secrets cannot be enumerated via API
# They should be passed via JSON input (CUSTOM_VARS) or explicitly referenced in workflow
if [ -n "$ENVIRONMENT" ]; then
  echo "Note: Environment secrets for '$ENVIRONMENT' should be passed via CUSTOM_VARS JSON input"
else
  echo "Note: Secrets should be passed via JSON input or explicitly referenced in workflow"
fi

# Step 4: Override with JSON input if provided (no prefix filter)
# Note: Values from JSON input are masked as they may contain secrets
if [ -n "$JSON_INPUT" ] && [ "$JSON_INPUT" != "{}" ]; then
  echo "Loading values from JSON input (CUSTOM_VARS)..."
  echo "$JSON_INPUT" | jq -r 'to_entries[] | "\(.key)=\(.value)"' | while IFS='=' read -r name value; do
    if [ -n "$name" ]; then
      # Escape any single quotes in the value for shell safety
      escaped_value=$(echo "$value" | sed "s/'/'\\\\''/g")
      echo "$name=$escaped_value" >> $GITHUB_ENV
      # Mask the value for display (may contain secrets)
      echo "Loaded from JSON input (may contain secrets): $name=***"
    fi
  done
fi

echo ""
echo "Finished loading environment variables"
echo "Summary:"
echo "  - Repository variables: Loaded (values visible above)"
if [ -n "$ENVIRONMENT" ]; then
  echo "  - Environment variables ($ENVIRONMENT): Loaded (values visible above)"
fi
echo "  - JSON input (CUSTOM_VARS): Loaded (values masked for security)"

