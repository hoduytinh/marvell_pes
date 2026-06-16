# Generate 30x30 JPG flags for the 48 teams of the 2026 FIFA World Cup.
# Flags are downloaded from flagcdn.com, center-cropped to a square
# (keeps the focal point), then resized to 30x30 and saved into ../logos.

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logosDir  = Join-Path (Split-Path -Parent $scriptDir) 'logos'
if (-not (Test-Path $logosDir)) { New-Item -ItemType Directory -Path $logosDir | Out-Null }

$tmpDir = Join-Path $env:TEMP 'wc2026-flags'
if (-not (Test-Path $tmpDir)) { New-Item -ItemType Directory -Path $tmpDir | Out-Null }

# filename (without extension) => flagcdn country code
$teams = [ordered]@{
  'Australia'              = 'au'
  'Iran'                   = 'ir'
  'Iraq'                   = 'iq'
  'Japan'                  = 'jp'
  'Jordan'                 = 'jo'
  'Qatar'                  = 'qa'
  'Saudi_Arabia'          = 'sa'
  'South_Korea'           = 'kr'
  'Uzbekistan'             = 'uz'
  'Algeria'                = 'dz'
  'Cape_Verde'            = 'cv'
  'DR_Congo'              = 'cd'
  'Egypt'                  = 'eg'
  'Ghana'                  = 'gh'
  'Ivory_Coast'           = 'ci'
  'Morocco'                = 'ma'
  'Senegal'                = 'sn'
  'South_Africa'          = 'za'
  'Tunisia'                = 'tn'
  'Canada'                 = 'ca'
  'Curacao'                = 'cw'
  'Haiti'                  = 'ht'
  'Mexico'                 = 'mx'
  'Panama'                 = 'pa'
  'United_States'         = 'us'
  'Argentina'              = 'ar'
  'Brazil'                 = 'br'
  'Colombia'               = 'co'
  'Ecuador'                = 'ec'
  'Paraguay'               = 'py'
  'Uruguay'                = 'uy'
  'New_Zealand'           = 'nz'
  'Austria'                = 'at'
  'Belgium'                = 'be'
  'Bosnia_and_Herzegovina'= 'ba'
  'Croatia'                = 'hr'
  'Czech_Republic'        = 'cz'
  'England'                = 'gb-eng'
  'France'                 = 'fr'
  'Germany'                = 'de'
  'Netherlands'            = 'nl'
  'Norway'                 = 'no'
  'Portugal'               = 'pt'
  'Scotland'               = 'gb-sct'
  'Spain'                  = 'es'
  'Sweden'                 = 'se'
  'Switzerland'            = 'ch'
  'Turkey'                 = 'tr'
}

# JPEG encoder at high quality
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [int64]92)

$ok = 0; $fail = 0
foreach ($name in $teams.Keys) {
  $code = $teams[$name]
  $srcPng = Join-Path $tmpDir "$code.png"
  $url = "https://flagcdn.com/w320/$code.png"
  try {
    Invoke-WebRequest -Uri $url -OutFile $srcPng -UseBasicParsing -ErrorAction Stop
  } catch {
    Write-Warning "Download failed for $name ($code): $($_.Exception.Message)"
    $fail++
    continue
  }

  try {
    $img = [System.Drawing.Image]::FromFile($srcPng)
    $side = [Math]::Min($img.Width, $img.Height)
    $sx = [int](($img.Width  - $side) / 2)
    $sy = [int](($img.Height - $side) / 2)

    $bmp = New-Object System.Drawing.Bitmap 30, 30
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $destRect = New-Object System.Drawing.Rectangle 0, 0, 30, 30
    $g.DrawImage($img, $destRect, $sx, $sy, $side, $side, [System.Drawing.GraphicsUnit]::Pixel)

    $outPath = Join-Path $logosDir "$name.jpg"
    $bmp.Save($outPath, $jpegCodec, $encParams)

    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    $ok++
    Write-Host "OK  $name.jpg"
  } catch {
    Write-Warning "Processing failed for $name ($code): $($_.Exception.Message)"
    $fail++
  }
}

Write-Host ""
Write-Host "Done. Created/updated: $ok, Failed: $fail (of $($teams.Count))"
