# HearMeRead Testing Environment CLI Runner for Windows (PowerShell)
param (
    [Parameter(Position=0)]
    [ValidateSet("all", "frontend", "backend", "e2e", "seed", "reset", "help")]
    [string]$Target = "all"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " HearMeRead Testing Runner (Branch: testing)" -ForegroundColor Cyan
Write-Host " Database: Dev Database (.env explicitly loaded)" -ForegroundColor Cyan
Write-Host " Safety: Test data isolated with [TEST] prefix" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

switch ($Target) {
    "frontend" {
        Write-Host "`n>>> Running Frontend Vitest Unit/Component Tests..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\frontend"
        npm test
        Set-Location "$PSScriptRoot"
    }
    "backend" {
        Write-Host "`n>>> Running Backend Pytest Suite (using .env)..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\Backend"
        $env:ENV_FILE = ".env"
        .\venv\Scripts\python -m pytest tests -v --tb=short
        Set-Location "$PSScriptRoot"
    }
    "e2e" {
        Write-Host "`n>>> Running Playwright End-to-End Tests..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\frontend"
        npm run test:e2e
        Set-Location "$PSScriptRoot"
    }
    "seed" {
        Write-Host "`n>>> Seeding Sample Test Data (pre-tagged [TEST])..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\Backend"
        $env:ENV_FILE = ".env"
        .\venv\Scripts\python -m app.scripts.seed_test_data
        Set-Location "$PSScriptRoot"
    }
    "reset" {
        Write-Host "`n>>> Safely Resetting Test Data..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\Backend"
        $env:ENV_FILE = ".env"
        .\venv\Scripts\python -m app.scripts.reset_test_data
        Set-Location "$PSScriptRoot"
    }
    "all" {
        Write-Host "`n>>> [1/3] Running Backend Tests..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\Backend"
        $env:ENV_FILE = ".env"
        .\venv\Scripts\python -m pytest tests -v --tb=short

        Write-Host "`n>>> [2/3] Running Frontend Vitest Tests..." -ForegroundColor Yellow
        Set-Location "$PSScriptRoot\frontend"
        npm test

        Write-Host "`n>>> [3/3] Running Playwright E2E Tests..." -ForegroundColor Yellow
        npm run test:e2e
        Set-Location "$PSScriptRoot"
        Write-Host "`n>>> All test suites executed successfully!" -ForegroundColor Green
    }
    "help" {
        Write-Host "Usage: .\run-tests.ps1 [all|frontend|backend|e2e|seed|reset]" -ForegroundColor Gray
    }
}
