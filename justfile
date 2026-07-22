# Workspace automation for CI-like validation

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

ext_dir := "chrome-multi-site-inventree-export"

# Show available recipes
@default:
	just --list

# Install extension dependencies and Playwright Chromium
ci-install:
	Set-Location "{{ext_dir}}"; if (Test-Path "package-lock.json") { npm ci } else { npm install }
	Set-Location "{{ext_dir}}"; npx playwright install chromium

# Run integration tests (same command used by CI on Windows)
ci-test:
	Set-Location "{{ext_dir}}"; npm run test:integration

# Validate extension using the package validate script
validate:
	Set-Location "{{ext_dir}}"; npm run validate

# Full CI-like workflow: install + test
ci: ci-install ci-test
