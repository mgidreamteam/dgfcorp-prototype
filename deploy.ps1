# deploy.ps1
# Save and enforce the correct Google Cloud Project and Region
gcloud config set project mgi-dream
gcloud config set run/region us-west1

# Extract the API key securely from .env.local
$envLines = Get-Content .env.local | Where-Object { $_ -match '=' }
$apiKey = ""
foreach ($line in $envLines) {
    if ($line.StartsWith("GEMINI_API_KEY=")) {
        $apiKey = $line.Substring("GEMINI_API_KEY=".Length)
        break
    }
}

if ([string]::IsNullOrEmpty($apiKey)) {
    Write-Host "Error: GEMINI_API_KEY not found in .env.local"
    exit 1
}

Write-Host "Deploying dream-giga to Google Cloud Run in us-west1..."

gcloud run deploy dream-giga `
    --source . `
    --allow-unauthenticated `
    --set-env-vars="DREAM_API=$apiKey" `
    --quiet

Write-Host "Deployment process complete."
