$lines = Get-Content "src\components\Analytics.jsx"
$keep = $lines[0..631] + $lines[671..($lines.Length-1)]
$keep | Set-Content "src\components\Analytics.jsx"
Write-Host "Done. Total lines: $($keep.Length)"
