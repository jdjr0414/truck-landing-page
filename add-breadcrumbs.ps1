# Add visible breadcrumb navigation and BreadcrumbList schema to all HTML pages
# Run from project root

$root = "c:\Users\walla\Desktop\axiant-truck-financing-baseline"
$baseUrl = "https://axiantpartners.com/truckhub"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$sectionLabels = @{
    "vehicles" = "Vehicles"
    "business-guides" = "Business Guides"
    "equipment-costs" = "Equipment Costs"
    "guides" = "Guides"
    "hubs" = "Hubs"
    "questions" = "Licensing"
    "comparisons" = "Comparisons"
    "industries" = "Industries"
    "data" = "Data"
    "vehicle-index" = "Vehicle Index"
    "glossary" = "Glossary"
}

$sectionsWithIndex = @("equipment-costs", "guides", "data", "glossary")

function Get-PageTitle($content) {
    if ($content -match '<title>([^<]+)</title>') {
        $t = $Matches[1].Trim() -replace '\s*\|\s*.*$', ''
        return $t.Trim()
    }
    return "Page"
}

function Escape-Html($s) {
    $s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;'
}

$files = Get-ChildItem -Path $root -Recurse -Filter "*.html" | Where-Object { $_.FullName -notlike "*node_modules*" }
$count = 0

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # Skip if breadcrumb nav already present
    if ($content -match 'aria-label="Breadcrumb"' -or $content -match 'class="breadcrumb"') {
        continue
    }

    $relPath = $f.FullName.Substring($root.Length).TrimStart('\', '/').Replace('\', '/')
    $pathParts = $relPath -split "/"
    $dir = if ($pathParts.Count -gt 1) { $pathParts[0] } else { "" }
    $fileName = $pathParts[-1]
    $pageTitle = Get-PageTitle $content
    $pageTitleEscaped = Escape-Html $pageTitle

    # Build breadcrumb HTML
    $prefix = if ($dir) { "../" } else { "" }
    $homeHref = if ($dir) { "../index.html" } else { "index.html" }

    $bcParts = @()
    $bcParts += "<a href=`"$homeHref`">Home</a>"

    if ($dir -and $sectionLabels[$dir]) {
        $sectionLabel = $sectionLabels[$dir]
        if ($sectionsWithIndex -contains $dir -and $fileName -eq "index.html") {
            # Section index page - current page is the section
            $sectionHref = if ($dir) { "index.html" } else { "" }
            $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
            $bcParts += "<span aria-current=`"page`">$sectionLabel</span>"
        }
        elseif ($sectionsWithIndex -contains $dir) {
            # Child page in section with index
            $sectionHref = "index.html"
            $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
            $bcParts += "<a href=`"$sectionHref`">$sectionLabel</a>"
            $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
            $bcParts += "<span aria-current=`"page`">$pageTitleEscaped</span>"
        }
        else {
            # Section without index - link to main page anchor
            $sectionHref = "${prefix}index.html#$dir"
            $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
            $bcParts += "<a href=`"$sectionHref`">$sectionLabel</a>"
            $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
            $bcParts += "<span aria-current=`"page`">$pageTitleEscaped</span>"
        }
    }
    elseif ($relPath -eq "index.html") {
        # Root index - just Home
        $bcParts = @("<span aria-current=`"page`">Home</span>")
    }
    elseif ($relPath -eq "get-started.html") {
        # Root get-started
        $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
        $bcParts += "<span aria-current=`"page`">Get Started</span>"
    }
    else {
        $bcParts += "<span aria-hidden=`"true`">&#8250;</span>"
        $bcParts += "<span aria-current=`"page`">$pageTitleEscaped</span>"
    }

    $bcHtml = $bcParts -join " "
    $bcNav = @"
    <nav aria-label="Breadcrumb" class="breadcrumb">
      <div class="container">
        $bcHtml
      </div>
    </nav>

"@

    # Insert after <main>
    $content = $content -replace '(<main>\s*)', "`$1`n$bcNav"
    
    # Add BreadcrumbList schema if missing
    if ($content -notmatch 'BreadcrumbList') {
        $pageUrl = $baseUrl + "/" + $relPath
        if ($relPath -eq "index.html") { $pageUrl = $baseUrl + "/" }
        $pageTitleJson = $pageTitle -replace '\\', '\\\\' -replace '"', '\"'
        $items = @()
        $items += '{"@type":"ListItem","position":1,"name":"Home","item":"' + $baseUrl + '/' + '"}'
        $pos = 2
        if ($dir -and $sectionLabels[$dir]) {
            $sectionUrl = $baseUrl + "/" + $dir + "/"
            if ($sectionsWithIndex -notcontains $dir) { $sectionUrl = $baseUrl + "/#" + $dir }
            $items += '{"@type":"ListItem","position":' + $pos + ',"name":"' + $sectionLabels[$dir] + '","item":"' + $sectionUrl + '"}'
            $pos++
        }
        if ($relPath -ne "index.html") {
            $items += '{"@type":"ListItem","position":' + $pos + ',"name":"' + $pageTitleJson + '","item":"' + $pageUrl + '"}'
        }
        $bcJson = '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[' + ($items -join ",") + ']}'
        $bcScript = "`n  <script type=`"application/ld+json`">`n  $bcJson`n  </script>"
        $content = $content -replace '</head>', "$bcScript`n</head>"
    }

    [System.IO.File]::WriteAllText($f.FullName, $content, $utf8NoBom)
    $count++
    Write-Host "Added breadcrumb: $relPath"
}

Write-Host "`nDone. Updated $count pages."
