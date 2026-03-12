# Add Related Topics section before </main> in HTML files that don't have it
$baseDir = "c:\Users\walla\Desktop\axiant-truck-financing-baseline"
$htmlFiles = Get-ChildItem -Path $baseDir -Recurse -Filter "*.html" | Where-Object {
    $_.Name -ne "index.html" -and
    $_.FullName -notlike "*\add-related-topics*" -and
    $_.FullName -ne (Join-Path $baseDir "vehicles\dump-truck-financing.html")
}

$sectionRoot = @"
    <section class="section" id="related-topics">
      <div class="container">
        <h2>Related Topics</h2>
        <div class="table-links">
          <p><strong>Financing:</strong></p>
          <a href="hubs/commercial-vehicle-financing.html">Commercial Vehicle Financing</a>
          <a href="hubs/truck-financing-guide.html">Truck Financing Guide</a>
          <p><strong>Startup guides:</strong></p>
          <a href="business-guides/how-to-start-a-dump-truck-business.html">How to Start a Dump Truck Business</a>
          <a href="business-guides/how-to-start-a-trucking-company.html">How to Start a Trucking Company</a>
          <p><strong>Licensing:</strong></p>
          <a href="questions/cdl-class-a-vs-class-b.html">CDL Class A vs Class B</a>
          <a href="questions/commercial-truck-license-requirements.html">Commercial Truck License Requirements</a>
          <p><strong>Cost:</strong></p>
          <a href="data/average-cost-of-commercial-trucks.html">Average Cost of Commercial Trucks</a>
          <a href="data/vehicle-comparison-chart.html">Vehicle Comparison Chart</a>
        </div>
      </div>
    </section>

"@

$sectionSub = @"
    <section class="section" id="related-topics">
      <div class="container">
        <h2>Related Topics</h2>
        <div class="table-links">
          <p><strong>Financing:</strong></p>
          <a href="../hubs/commercial-vehicle-financing.html">Commercial Vehicle Financing</a>
          <a href="../hubs/truck-financing-guide.html">Truck Financing Guide</a>
          <p><strong>Startup guides:</strong></p>
          <a href="../business-guides/how-to-start-a-dump-truck-business.html">How to Start a Dump Truck Business</a>
          <a href="../business-guides/how-to-start-a-trucking-company.html">How to Start a Trucking Company</a>
          <p><strong>Licensing:</strong></p>
          <a href="../questions/cdl-class-a-vs-class-b.html">CDL Class A vs Class B</a>
          <a href="../questions/commercial-truck-license-requirements.html">Commercial Truck License Requirements</a>
          <p><strong>Cost:</strong></p>
          <a href="../data/average-cost-of-commercial-trucks.html">Average Cost of Commercial Trucks</a>
          <a href="../data/vehicle-comparison-chart.html">Vehicle Comparison Chart</a>
        </div>
      </div>
    </section>

"@

$count = 0
$skipped = 0
foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match 'id="related-topics"') {
        $skipped++
        continue
    }
    if ($content -notmatch '</main>') {
        Write-Host "Skipping (no </main>): $($file.FullName)"
        continue
    }
    $isRoot = ($file.DirectoryName -eq $baseDir)
    $section = if ($isRoot) { $sectionRoot } else { $sectionSub }
    $newContent = $content -replace '(\s*)</main>', "$section`$1</main>"
    Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
    $count++
    Write-Host "Updated: $($file.FullName)"
}
Write-Host "`nDone. Updated $count files, skipped $skipped (already had section)."
