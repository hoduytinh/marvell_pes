# Splits index.html into:
#   - assets/css/styles.css  (concatenation of all <style>...</style> blocks)
#   - assets/js/app.js       (main IIFE)
#   - assets/js/capture.js   (the smaller capture script at the bottom)
# Replaces them in index.html with <link>/<script src=""> references.
#
# Safe to re-run: it parses the current index.html and rebuilds the assets/
# files from scratch on each run.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File tools/split-html.ps1

[CmdletBinding()]
param(
    [string]$HtmlPath  = (Join-Path (Get-Location) 'index.html'),
    [string]$AssetsDir = (Join-Path (Get-Location) 'assets')
)

$ErrorActionPreference = 'Stop'
$HtmlPath  = (Resolve-Path $HtmlPath).Path
$AssetsDir = [System.IO.Path]::GetFullPath($AssetsDir)
$CssDir = Join-Path $AssetsDir 'css'
$JsDir  = Join-Path $AssetsDir 'js'
foreach($d in @($AssetsDir, $CssDir, $JsDir)) {
    if(!(Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

Write-Host "Reading $HtmlPath ..."
$html = [System.IO.File]::ReadAllText($HtmlPath)
$origLen = $html.Length

# ---- 1. Extract all <style>...</style> blocks into styles.css ----
# Pattern is non-greedy and case-insensitive. Source order is preserved so
# CSS cascade is unchanged after splitting.
$styleRe = [Regex]::new('<style[^>]*>(.*?)</style>', 'Singleline,IgnoreCase')
$styleMatches = $styleRe.Matches($html)
Write-Host "Found $($styleMatches.Count) <style> blocks"

$cssBuilder = [System.Text.StringBuilder]::new()
for($i = 0; $i -lt $styleMatches.Count; $i++) {
    [void]$cssBuilder.AppendLine("/* ---- block $($i+1) ---- */")
    [void]$cssBuilder.AppendLine($styleMatches[$i].Groups[1].Value.Trim())
    [void]$cssBuilder.AppendLine()
}
$cssPath = Join-Path $CssDir 'styles.css'
[System.IO.File]::WriteAllText($cssPath, $cssBuilder.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $cssPath ($([System.IO.FileInfo]::new($cssPath).Length) bytes)"

# Remove all <style> blocks. Replace the FIRST occurrence with a <link>;
# remove the rest entirely. Done by replacing them one by one in order so
# offsets don't shift unexpectedly.
$linkTag = '<link rel="stylesheet" href="assets/css/styles.css" />'
$tmp = $html
$replaced = $false
$tmp = $styleRe.Replace($tmp, {
    param($m)
    if(-not $script:replaced) {
        $script:replaced = $true
        return $linkTag
    }
    return ''
}, 1)
# Remove remaining ones (the callback above only handled the first; replace all
# subsequent ones with empty string)
$tmp = $styleRe.Replace($tmp, '')
$html = $tmp

# ---- 2. Extract the main IIFE <script> (the big inline one) ----
# Strategy: find every inline <script> (no src=""), pick the largest two —
# the big IIFE (app.js) and the capture script — in source order.
$scriptRe = [Regex]::new('<script(?![^>]*\bsrc=)(?![^>]*\btype="application/json")[^>]*>(.*?)</script>', 'Singleline,IgnoreCase')
$scriptMatches = $scriptRe.Matches($html)
Write-Host "Found $($scriptMatches.Count) inline <script> blocks (excluding EMBEDDED_DATA & external)"

if($scriptMatches.Count -lt 1) { throw 'No inline <script> found to extract.' }

# Sort by size descending to identify the main app script
$ranked = $scriptMatches | Sort-Object { $_.Groups[1].Value.Length } -Descending
$mainMatch    = $ranked[0]
$captureMatch = if($ranked.Count -ge 2) { $ranked[1] } else { $null }

$mainJsPath    = Join-Path $JsDir 'app.js'
$captureJsPath = Join-Path $JsDir 'capture.js'

[System.IO.File]::WriteAllText($mainJsPath, $mainMatch.Groups[1].Value.Trim() + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "Wrote $mainJsPath ($([System.IO.FileInfo]::new($mainJsPath).Length) bytes)"

if($captureMatch) {
    [System.IO.File]::WriteAllText($captureJsPath, $captureMatch.Groups[1].Value.Trim() + "`n", [System.Text.UTF8Encoding]::new($false))
    Write-Host "Wrote $captureJsPath ($([System.IO.FileInfo]::new($captureJsPath).Length) bytes)"
}

# Replace in HTML. Capture match offsets BEFORE doing any replacement so
# substring positions stay valid. Order replacements from the END of the
# file backwards to preserve indexes.
$replacements = @()
$replacements += [PSCustomObject]@{
    Index  = $mainMatch.Index
    Length = $mainMatch.Length
    NewText = '<script src="assets/js/app.js"></script>'
}
if($captureMatch) {
    $replacements += [PSCustomObject]@{
        Index  = $captureMatch.Index
        Length = $captureMatch.Length
        NewText = '<script src="assets/js/capture.js"></script>'
    }
}
$replacements = $replacements | Sort-Object Index -Descending
foreach($r in $replacements) {
    $html = $html.Substring(0, $r.Index) + $r.NewText + $html.Substring($r.Index + $r.Length)
}

[System.IO.File]::WriteAllText($HtmlPath, $html, [System.Text.UTF8Encoding]::new($false))
$newLen = [System.IO.FileInfo]::new($HtmlPath).Length
Write-Host ("index.html: {0} -> {1} bytes ({2:N1}% reduction)" -f $origLen, $newLen, (100.0 * (1 - $newLen/$origLen)))
