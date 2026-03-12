# Add Key Takeaways section to all HTML pages
# Extracts page-specific facts and inserts near top (after lead, before hero-actions)

$root = "c:\Users\walla\Desktop\axiant-truck-financing-baseline"
$files = Get-ChildItem -Path $root -Recurse -Filter "*.html" | Where-Object { $_.FullName -notlike "*node_modules*" }
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$count = 0

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # Skip if already has key-takeaways
    if ($content -match 'key-takeaways') { continue }
    
    # Must have lead and hero-actions
    if ($content -notmatch 'class="lead"' -or $content -notmatch 'hero-actions') { continue }
    
    # Extract subject (vehicle/equipment name) from title or h1
    $subject = ""
    if ($content -match '<title>([^<|]+)') {
        $title = $Matches[1].Trim()
        # "Dump Truck Financing" -> "Dump trucks", "How to Start a Dump Truck Business" -> "dump truck business"
        if ($title -match '^How to Start (?:a|an) (.+?) Business') { $subject = $Matches[1].ToLower() }
        elseif ($title -match '^How Much Does (?:a|an) (.+?) Cost') { $subject = $Matches[1] }
        elseif ($title -match '^(.+?) (?:Financing|vs\.|vs )') { 
            $sub = $Matches[1].Trim()
            # Pluralize: "Dump Truck" -> "Dump trucks", "Box Truck" -> "Box trucks"
            if ($sub -match '^(.+?)\s+(Truck|Van)$') { $subject = $Matches[1] + " " + $Matches[2] + "s" }
            elseif ($sub -match '^(.+?)\s+Trucks?$') { $subject = $sub + "s" -replace 's$','s' }
            else { $subject = $sub }
        }
        elseif ($title -match '^(.+?)\s+\|') { $subject = $Matches[1].Trim() }
    }
    if (-not $subject) { $subject = "Commercial trucks" }
    
    # Extract price range (match digits with any separator: - or –)
    $priceRange = ""
    if ($content -match '(?:Average|Typical)\s+price\s+range[:\s]*\$?(\d+)[kK]?\s*[^\d\$]+\s*\$?(\d+)[kK]?') {
        $priceRange = "`$$($Matches[1])k and `$$($Matches[2])k"
    }
    elseif ($content -match 'typical(?:ly)?\s+cost[s]?\s+(?:between\s+)?\$?(\d+)[,.]?(\d*)\s*(?:and|to)\s*\$?(\d+)[,.]?(\d*)') {
        $lo = $Matches[1]; $hi = $Matches[3]
        if ([int]$lo -lt 1000) { $priceRange = "`$${lo}k and `$${hi}k" } else { $priceRange = "`$$lo and `$$hi" }
    }
    elseif ($content -match '"lowPrice"\s*:\s*(\d+).*?"highPrice"\s*:\s*(\d+)') {
        $lo = [int]$Matches[1]; $hi = [int]$Matches[2]
        if ($lo -ge 1000) { $priceRange = "`$$($lo/1000)k and `$$($hi/1000)k" } else { $priceRange = "`$$lo and `$$hi" }
    }
    elseif ($content -match 'range[s]?\s+from\s+\$?(\d+)[,.]?(\d*)\s+to\s+\$?(\d+)[,.]?(\d*)') {
        $lo = $Matches[1]; $hi = $Matches[3]
        $priceRange = "`$$lo and `$$hi"
    }
    
    # Extract loan terms (match digits with any separator)
    $terms = ""
    if ($content -match 'Typical\s+loan\s+terms[:\s]*(\d+)\s*[^\d]+\s*(\d+)\s*months') {
        $terms = $Matches[1] + "-" + $Matches[2] + " months"
    }
    elseif ($content -match '(\d+)\s*[^\d]+\s*(\d+)\s*months') {
        $terms = $Matches[1] + "-" + $Matches[2] + " months"
    }
    
    # CDL requirement
    $cdlNote = ""
    if ($content -match 'Class\s+[AB]\s+CDL|CDL\s+required|require[s]?\s+(?:a\s+)?CDL|typically\s+require\s+(?:a\s+)?(?:Class\s+[AB]\s+)?CDL') {
        if ($content -match 'Class\s+A\s+CDL') { $cdlNote = "Many require a Class A CDL" }
        elseif ($content -match 'Class\s+B\s+CDL') { $cdlNote = "Many require a Class B CDL" }
        else { $cdlNote = "A CDL is often required" }
    }
    elseif ($content -match 'do\s+not\s+need\s+a\s+CDL|no\s+CDL\s+required') {
        $cdlNote = "A CDL is typically not required for light-duty units"
    }
    
    # Down payment / strong credit
    $downNote = ""
    if ($content -match 'strong\s+credit|qualify\s+with\s+(?:little\s+or\s+)?no\s+down\s+payment|\$0\s+down') {
        $downNote = "Strong credit businesses may qualify with little or no down payment"
    }
    
    # Build bullet list
    $bullets = @()
    if ($priceRange -and $subject) {
        $subPlural = $subject -replace '\s+Truck$',' trucks' -replace '\s+Van$',' vans' -replace '\s+Trucks$',' trucks'
        if ($subPlural -eq $subject -and $subject -notmatch 's$') { $subPlural = $subject + "s" }
        $bullets += "$subPlural typically cost between $priceRange"
    }
    if ($cdlNote) { $bullets += $cdlNote }
    if ($terms) { $bullets += "Financing terms commonly range from $terms" }
    if ($downNote) { $bullets += $downNote }
    
    # Fallbacks for pages without vehicle-specific data
    if ($bullets.Count -eq 0) {
        $bullets = @(
            "Commercial vehicle financing covers a wide range of truck types and equipment",
            "Typical financing terms range from 36-84 months depending on equipment",
            "Strong credit and established businesses may qualify with little or no down payment",
            "Approval typically takes 24-72 hours for qualified applicants"
        )
    }
    elseif ($bullets.Count -lt 3) {
        if (-not ($bullets -match 'Strong credit')) { $bullets += "Strong credit businesses may qualify with little or no down payment" }
        if (-not ($bullets -match 'terms')) { $bullets += "Financing terms commonly range from 36-60 months" }
    }
    
    # Limit to 4 bullets
    $bullets = $bullets | Select-Object -First 4
    
    $takeawaysHtml = @"
        <div class="key-takeaways">
          <h3>Key Takeaways</h3>
          <ul>
$(($bullets | ForEach-Object { "            <li>$_</li>" }) -join "`n")
          </ul>
        </div>
"@
    
    # Insert after lead closing </p>, before hero-actions
    $pattern = '(</p>\s*)<div class="hero-actions">'
    $replacement = '$1' + $takeawaysHtml + "`n        <div class=""hero-actions"">"
    
    $newContent = $content -replace $pattern, $replacement
    if ($newContent -ne $content) {
        [System.IO.File]::WriteAllText($f.FullName, $newContent, $utf8NoBom)
        $count++
        Write-Host "Updated: $($f.FullName.Replace($root,''))"
    }
}

Write-Host "`nDone. Updated $count files."
