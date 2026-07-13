# Helper PowerShell script to build & deploy readchill-go-backend to Cloud Run
# Prereqs: gcloud CLI installed and logged in (gcloud auth login), Docker not required (using Cloud Build)

param(
  [string]$ProjectId,
  [string]$SlipokApiUrl,
  [string]$SlipokApiKey,
  [string]$AllowedReceiverAccount = "2303193273",
  [string]$AllowedReceiverName = "KITTIPAN",
  [string]$Region = "asia-southeast1"
)

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Error "gcloud CLI not found. Install and run 'gcloud auth login' first."; exit 1
}

if (-not $ProjectId) {
  $ProjectId = Read-Host "Enter GCP Project ID"
}

Write-Host "Using project: $ProjectId" -ForegroundColor Cyan
gcloud config set project $ProjectId

Push-Location .\readchill-go-backend

Write-Host "Submitting build to Cloud Build..." -ForegroundColor Green
gcloud builds submit --tag gcr.io/$ProjectId/readchill-go-backend:latest
if ($LASTEXITCODE -ne 0) { Write-Error "Cloud Build failed"; Pop-Location; exit 1 }

Write-Host "Deploying to Cloud Run..." -ForegroundColor Green
$envArgs = "ALLOWED_ORIGINS=https://read-chill.vercel.app,PORT=8080,SLIPOK_API_URL=$SlipokApiUrl,SLIPOK_API_KEY=$SlipokApiKey,ALLOWED_RECEIVER_ACCOUNT=$AllowedReceiverAccount,ALLOWED_RECEIVER_NAME=$AllowedReceiverName"

gcloud run deploy readchill-go-backend --image gcr.io/$ProjectId/readchill-go-backend:latest --region $Region --platform managed --allow-unauthenticated --set-env-vars "$envArgs"
if ($LASTEXITCODE -ne 0) { Write-Error "gcloud run deploy failed"; Pop-Location; exit 1 }

$serviceUrl = gcloud run services describe readchill-go-backend --region=$Region --platform=managed --format='value(status.url)'
Write-Host "Deployed service URL: $serviceUrl" -ForegroundColor Green

Pop-Location
Write-Host "Done." -ForegroundColor Cyan
