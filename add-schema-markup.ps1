# Add and enhance structured schema markup across the site
# - BreadcrumbList on all pages
# - Article: url, mainEntityOfPage, publisher with logo, datePublished/dateModified where missing
# - Product on comparison pages (both products)

$root = "c:\Users\walla\Desktop\axiant-truck-financing-baseline"
$baseUrl = "https://axiantpartners.com/truckhub"
$files = Get-ChildItem -Path $root -Recurse -Filter "*.html" | Where-Object { $_.FullName -notlike "*node_modules*" }
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$breadcrumbCount = 0
$articleCount = 0
$productCount = 0

$sectionLabels = @{
    "vehicles" = "Vehicles"
    "business-guides" = "Business Guides"
    "equipment-costs" = "Equipment Costs"
    "guides" = "Guides"
    "hubs" = "Hubs"
    "questions" = "Questions"
    "comparisons" = "Comparisons"
    "industries" = "Industries"
    "data" = "Data"
    "vehicle-index" = "Vehicle Index"
}

function Escape-JsonString($s) {
    $s -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''
}

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $relPath = $f.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
    $changed = $false

    # Build breadcrumb
    $pathParts = $relPath -split "/"
    $dir = if ($pathParts.Count -gt 1) { $pathParts[0] } else { "" }
    $pageTitle = "Commercial Vehicle Financing"
    if ($content -match '<title>([^<|]+)') { $pageTitle = ($Matches[1].Trim() -replace '\s*\|\s*.*$', '').Trim() }
    $pageTitle = Escape-JsonString($pageTitle)

    $pageUrl = $baseUrl + "/" + $relPath
    if ($relPath -eq "index.html") { $pageUrl = $baseUrl + "/" }

    $items = @()
    $items += '{"@type":"ListItem","position":1,"name":"Home","item":"' + $baseUrl + '/' + '"}'
    $pos = 2
    if ($dir -and $sectionLabels[$dir]) {
        $items += '{"@type":"ListItem","position":' + $pos + ',"name":"' + $sectionLabels[$dir] + '","item":"' + $baseUrl + '/' + $dir + '/' + '"}'
        $pos++
    }
    $items += '{"@type":"ListItem","position":' + $pos + ',"name":"' + $pageTitle + '","item":"' + $pageUrl + '"}'
    $bcJson = '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[' + ($items -join ",") + ']}'

    # Add BreadcrumbList if missing (or update index which has minimal breadcrumb)
    if ($content -notmatch 'BreadcrumbList') {
        $bcScript = "`n  <script type=`"application/ld+json`">`n  $bcJson`n  </script>"
        $content = $content -replace '</head>', "$bcScript`n</head>"
        $changed = $true
        $breadcrumbCount++
    }
    elseif ($content -match 'BreadcrumbList.*itemListElement.*\[.*\{.*"position":1') {
        # Index has Breadcrumb - replace with full breadcrumb (Home only)
        $oldBc = @'
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://axiantpartners.com/truckhub/"}]}
'@
        if ($relPath -eq "index.html") {
            $content = $content -replace '\s*<script type="application/ld\+json">\s*\{[^}]*BreadcrumbList[^}]*\}[\s\S]*?</script>', "`n  <script type=`"application/ld+json`">`n  $bcJson`n  </script>"
            $changed = $true
        }
    }

    # Add url and mainEntityOfPage to Article
    $articleUrl = $baseUrl + "/" + $relPath
    if ($relPath -eq "index.html") { $articleUrl = $baseUrl + "/" }
    if ($content -match 'Article' -and $content -notmatch '"url"\s*:\s*"' -and $content -notmatch 'mainEntityOfPage') {
        $add = ',"url":"' + $articleUrl + '","mainEntityOfPage":{"@type":"WebPage","@id":"' + $articleUrl + '"}'
        if ($content -match '("dateModified"\s*:\s*"[^"]*")\s*\}') {
            $content = $content -replace '("dateModified"\s*:\s*"[^"]*")\s*\}', "`$1$add`}"
            $changed = $true
            $articleCount++
        }
        elseif ($content -match '("datePublished"\s*:\s*"[^"]*")\s*\}') {
            $content = $content -replace '("datePublished"\s*:\s*"[^"]*")\s*\}', "`$1$add`}"
            $changed = $true
            $articleCount++
        }
        elseif ($content -match '("author"\s*:\s*\{[^}]+\})\s*\}') {
            $content = $content -replace '("author"\s*:\s*\{[^}]+\})\s*\}', "`$1,$add`}"
            $changed = $true
            $articleCount++
        }
    }

    # Add publisher/datePublished/dateModified to Article where missing
    if ($content -match '"@type":"Article"' -and $content -notmatch '"publisher"') {
        $publisher = ',"publisher":{"@type":"Organization","name":"Axiant Partners","logo":{"@type":"ImageObject","url":"https://axiantpartners.com/favicon.ico"}},"datePublished":"2025-01-01","dateModified":"2026-03-12"'
        $content = $content -replace '("author"\s*:\s*\{[^}]+\})\s*\}', "`$1$publisher`}"
        $changed = $true
    }
    if ($content -match '"@type":"Article"' -and $content -notmatch '"dateModified"' -and $content -match '"publisher"') {
        $content = $content -replace '("publisher"[\s\S]*?"name"\s*:\s*"Axiant Partners")\s*\}', "`$1}," + '"datePublished":"2025-01-01","dateModified":"2026-03-12"'
        $changed = $true
    }

    # Fix dateModified 2025-03-01 to 2026-03-12
    $content = $content -replace '"dateModified":"2025-03-01"', '"dateModified":"2026-03-12"'
    if ($content -match '2026-03-12') { $changed = $true }

    # Add publisher logo where publisher exists but no logo
    $content = $content -replace '"publisher":\s*\{\s*"@type":\s*"Organization",\s*"name":\s*"Axiant Partners"\s*\}', '"publisher":{"@type":"Organization","name":"Axiant Partners","logo":{"@type":"ImageObject","url":"https://axiantpartners.com/favicon.ico"}}'
    $content = $content -replace '"publisher":{"@type":"Organization","name":"Axiant Partners"}', '"publisher":{"@type":"Organization","name":"Axiant Partners","logo":{"@type":"ImageObject","url":"https://axiantpartners.com/favicon.ico"}}'

    # Add Product schema to comparison pages
    if ($relPath -match 'comparisons/.*-vs-.*\.html' -and $content -notmatch '"@type":"Product"') {
        $fn = [System.IO.Path]::GetFileNameWithoutExtension($relPath)
        if ($fn -match '(.+)-vs-(.+)') {
            $p1 = (Get-Culture).TextInfo.ToTitleCase(($Matches[1] -replace '-', ' '))
            $p2 = (Get-Culture).TextInfo.ToTitleCase(($Matches[2] -replace '-', ' '))
            $product1 = '{"@context":"https://schema.org","@type":"Product","name":"' + $p1 + '","description":"Commercial ' + $p1.ToLower() + ' for business use.","category":"Commercial Vehicles","brand":{"@type":"Brand","name":"Various"}}'
            $product2 = '{"@context":"https://schema.org","@type":"Product","name":"' + $p2 + '","description":"Commercial ' + $p2.ToLower() + ' for business use.","category":"Commercial Vehicles","brand":{"@type":"Brand","name":"Various"}}'
            $productScript = "`n  <script type=`"application/ld+json`">`n  $product1`n  </script>`n  <script type=`"application/ld+json`">`n  $product2`n  </script>"
            $content = $content -replace '</head>', "$productScript`n</head>"
            $changed = $true
            $productCount++
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
        Write-Host "Updated: $relPath"
    }
}

Write-Host "`nDone. Breadcrumbs: $breadcrumbCount, Articles enhanced: $articleCount, Products added: $productCount"
