# Migrate base64 images embedded in data.json out to files under logos/.
# Rewrites data.json so every base64 image becomes a relative path string
# (e.g. "logos/AC_Milan.png"). Browsers render `<img src="...">` and
# `url("...")` identically for both data URLs and paths, so the rest of the
# app keeps working without code changes.
#
# Dedup is by SHA-1 of the decoded image bytes so identical images are stored
# only once. File naming priority:
#   1. logoMasterList entry name (sanitized)
#   2. Team name (sanitized) from season.teams[i]
#   3. Season name (sanitized) for the league logo
#   4. Fallback: img_<shortHash>
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File tools/migrate-images.ps1

[CmdletBinding()]
param(
    [string]$DataPath  = (Join-Path $PSScriptRoot '..\data.json'),
    [string]$LogosDir  = (Join-Path $PSScriptRoot '..\logos'),
    [string]$BackupPath = (Join-Path $PSScriptRoot '..\data.json.bak')
)

$ErrorActionPreference = 'Stop'
$DataPath  = (Resolve-Path $DataPath).Path
$LogosDir  = [System.IO.Path]::GetFullPath($LogosDir)
$BackupPath = [System.IO.Path]::GetFullPath($BackupPath)

if(!(Test-Path $LogosDir)) { New-Item -ItemType Directory -Path $LogosDir | Out-Null }

Write-Host "Reading $DataPath ..."
$raw  = Get-Content -LiteralPath $DataPath -Raw -Encoding UTF8
$orig = [System.IO.FileInfo]::new($DataPath).Length
Write-Host ("Original size: {0:N0} bytes" -f $orig)

if(!(Test-Path $BackupPath)) {
    Copy-Item -LiteralPath $DataPath -Destination $BackupPath
    Write-Host "Backup written to $BackupPath"
}

# Manual base64-aware parse instead of ConvertFrom-Json to preserve structure
# faithfully on PS 5.1.
$data = $raw | ConvertFrom-Json

$sha1 = [System.Security.Cryptography.SHA1]::Create()
$seen = @{}      # sha -> relative path (forward slashes)
$usedNames = @{} # filename (no ext) -> count, for collision suffixing

function Sanitize([string]$s) {
    if([string]::IsNullOrWhiteSpace($s)) { return $null }
    $s = $s.Trim()
    # replace whitespace with underscore
    $s = [Regex]::Replace($s, '\s+', '_')
    # strip anything not alnum, dash, underscore
    $s = [Regex]::Replace($s, '[^A-Za-z0-9_\-]', '')
    if($s.Length -gt 64) { $s = $s.Substring(0,64) }
    if([string]::IsNullOrWhiteSpace($s)) { return $null }
    return $s
}

function ExtForMime([string]$mime) {
    switch -Regex ($mime) {
        '^image/png'           { return 'png' }
        '^image/jpe?g'         { return 'jpg' }
        '^image/gif'           { return 'gif' }
        '^image/webp'          { return 'webp' }
        '^image/svg\+xml'      { return 'svg' }
        '^image/bmp'           { return 'bmp' }
        '^image/x-icon'        { return 'ico' }
        default                { return 'bin' }
    }
}

function PickName([string]$preferred, [string]$ext, [string]$folder) {
    $base = Sanitize $preferred
    if(-not $base) { $base = 'img' }
    $key = $folder + '/' + $base
    if($usedNames.ContainsKey($key)) {
        $i = $usedNames[$key]
        $i++
        $usedNames[$key] = $i
        $key = $folder + '/' + $base + '_' + $i
    } else {
        $usedNames[$key] = 1
    }
    return $key + '.' + $ext
}

# Returns path string for a given base64 data URL, writing the file if new.
function StoreImage([string]$dataUrl, [string]$preferredName, [string]$folder) {
    if(-not $dataUrl) { return $null }
    if($dataUrl -notmatch '^data:([^;]+);base64,(.+)$') {
        # not a data URL -- already a path or external URL -- pass through
        return $dataUrl
    }
    $mime = $Matches[1]
    $b64  = $Matches[2]
    try {
        $bytes = [Convert]::FromBase64String($b64)
    } catch {
        Write-Warning "Failed to decode base64 for '$preferredName' -- leaving as-is"
        return $dataUrl
    }
    $hash = ($sha1.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
    if($seen.ContainsKey($hash)) { return $seen[$hash] }

    $ext  = ExtForMime $mime
    $rel  = PickName $preferredName $ext $folder
    $abs  = Join-Path (Split-Path $LogosDir -Parent) $rel
    $absDir = Split-Path $abs -Parent
    if(!(Test-Path $absDir)) { New-Item -ItemType Directory -Path $absDir -Force | Out-Null }
    [System.IO.File]::WriteAllBytes($abs, $bytes)
    $seen[$hash] = $rel
    return $rel
}

# Pass 1: logoMasterList -- best-named source, do first so master names win
$masterCount = 0
if($data.logoMasterList) {
    for($i = 0; $i -lt $data.logoMasterList.Count; $i++) {
        $entry = $data.logoMasterList[$i]
        if($entry -and $entry.data) {
            $rel = StoreImage $entry.data $entry.name 'logos'
            if($rel) { $entry.data = $rel; $masterCount++ }
        }
    }
}
Write-Host "Master logos processed: $masterCount"

# Pass 2: seasons
$seasonLogoCount = 0
$teamLogoCount   = 0
$pictureCount    = 0
if($data.seasons) {
    foreach($prop in $data.seasons.PSObject.Properties) {
        $id = $prop.Name
        $s  = $prop.Value
        if($s.logo) {
            $rel = StoreImage $s.logo ("season_" + (Sanitize $s.name)) 'logos'
            if($rel) { $s.logo = $rel; $seasonLogoCount++ }
        }
        if($s.teamLogos) {
            for($i = 0; $i -lt $s.teamLogos.Count; $i++) {
                $val = $s.teamLogos[$i]
                if($val) {
                    $teamName = $null
                    if($s.teams -and $i -lt $s.teams.Count) { $teamName = $s.teams[$i] }
                    $rel = StoreImage $val $teamName 'logos'
                    if($rel) {
                        $s.teamLogos[$i] = $rel
                        $teamLogoCount++
                    }
                }
            }
        }
        if($s.timelines) {
            for($ti = 0; $ti -lt $s.timelines.Count; $ti++) {
                $tl = $s.timelines[$ti]
                if($tl -and $tl.pictures) {
                    for($pi = 0; $pi -lt $tl.pictures.Count; $pi++) {
                        $val = $tl.pictures[$pi]
                        if($val) {
                            $year = if($tl.year) { $tl.year } else { ('y' + $ti) }
                            $preferred = $id + '_' + $year + '_' + ($pi + 1)
                            $rel = StoreImage $val $preferred 'photos'
                            if($rel) {
                                $tl.pictures[$pi] = $rel
                                $pictureCount++
                            }
                        }
                    }
                }
            }
        }
    }
}
Write-Host "Season logos processed:    $seasonLogoCount"
Write-Host "Team logos processed:      $teamLogoCount"
Write-Host "Timeline pictures processed: $pictureCount"
Write-Host ("Unique images written:     {0}" -f $seen.Count)

Write-Host "Writing cleaned data.json ..."
$json = $data | ConvertTo-Json -Depth 100 -Compress:$false
# ConvertTo-Json on PS 5.1 escapes non-ASCII as \uXXXX -- keep as-is for safety.
Set-Content -LiteralPath $DataPath -Value $json -Encoding UTF8 -NoNewline

$new = [System.IO.FileInfo]::new($DataPath).Length
Write-Host ("New size: {0:N0} bytes  (reduction: {1:N1}%)" -f $new, (100.0 * (1 - $new/$orig)))
Write-Host "Logos directory: $LogosDir"
