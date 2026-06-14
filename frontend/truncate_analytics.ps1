$lines = Get-Content "src\components\Analytics.jsx"
$lines[0..671] | Set-Content "src\components\Analytics.jsx"
Write-Host "Truncated to line 672. Lines now: $(($lines[0..671]).Length)"
