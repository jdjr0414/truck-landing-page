# Word count audit for indexable HTML pages
# Flags pages with fewer than 900 words (target: 900-1000 for SEO)
# Excludes: sitemap, script/style content, JSON-LD

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$minWords = 900
$exclude = @('sitemap.html', '404.html')

$results = @()
Get-ChildItem -Path $root -Filter "*.html" -Recurse | Where-Object {
    $rel = $_.FullName.Replace($root + [IO.Path]::DirectorySeparatorChar, '').Replace('\', '/')
    -not ($exclude -contains $_.Name)
} | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return }
    
    # Remove script and style blocks (including content)
    $content = $content -replace '(?s)<script[^>]*>.*?</script>', ' '
    $content = $content -replace '(?s)<style[^>]*>.*?</style>', ' '
    $content = $content -replace '(?s)<!--.*?-->', ' '
    
    # Strip HTML tags
    $text = $content -replace '<[^>]+>', ' '
    # Normalize whitespace and trim
    $text = ($text -replace '\s+', ' ').Trim()
    $words = ($text -split '\s+' | Where-Object { $_.Length -gt 0 }).Count
    
    $rel = $_.FullName.Replace($root + [IO.Path]::DirectorySeparatorChar, '').Replace('\', '/')
    $results += [PSCustomObject]@{ Path = $rel; Words = $words }
}

$short = $results | Where-Object { $_.Words -lt $minWords } | Sort-Object Words
$short | Format-Table Path, Words -AutoSize

# Group by section for report
$sections = @{
    'index' = @()
    'vehicles' = @()
    'vehicle-index' = @()
    'business-guides' = @()
    'equipment-costs' = @()
    'guides' = @()
    'industries' = @()
    'questions' = @()
    'data' = @()
    'glossary' = @()
    'comparisons' = @()
    'hubs' = @()
    'other' = @()
}

foreach ($r in $short) {
    $first = ($r.Path -split '/')[0]
    if ($r.Path -eq 'index.html') { $sections['index'] += $r }
    elseif ($sections.ContainsKey($first)) { $sections[$first] += $r }
    else { $sections['other'] += $r }
}

# Output report
$report = @"
# Word Count Audit - Pages Under $minWords Words
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')

## Summary
- Total short pages: $($short.Count)
- Threshold: $minWords words minimum

## By Section
"@

foreach ($sec in @('index','vehicles','vehicle-index','business-guides','equipment-costs','guides','industries','questions','data','glossary','comparisons','hubs','other')) {
    $items = $sections[$sec]
    if ($items.Count -eq 0) { continue }
    $report += "`n`n### $sec ($($items.Count) pages)`n"
    foreach ($i in ($items | Sort-Object Words)) {
        $report += "- " + $i.Path + " (" + $i.Words + " words)`n"
    }
}

$reportPath = Join-Path $root "word-count-audit-report.md"
$report | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "Report saved to: $reportPath"
Write-Host "`nShort pages: $($short.Count)"
