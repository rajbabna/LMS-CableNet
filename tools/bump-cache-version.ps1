# tools/bump-cache-version.ps1
# Adds content-hash cache-busters (?v=<md5:8>) to every LOCAL JS/CSS asset
# referenced by the site's HTML, so GitHub Pages pushes don't depend on
# manual hard-refreshes during testing/beta.
#
#   * Only local relative assets get a version (external https:// CDNs are
#     left alone; only .js and .css get busted).
#   * The version is the first 8 chars of the asset file's MD5, so a file
#     only gets a NEW version string when its content actually changes.
#   * Idempotent: running it on an already-bumped tree changes nothing.
#
# Usage: run from anywhere ->  powershell -File tools\bump-cache-version.ps1
# Then commit + push. Hard-refresh is still fine, but no longer required
# for JS/CSS to update.

$ErrorActionPreference = 'Stop'

$siteRoot = Split-Path -Parent $PSScriptRoot

function Get-AssetVersion([string]$fullPath) {
  if (Test-Path -LiteralPath $fullPath) {
    $hash = (Get-FileHash -LiteralPath $fullPath -Algorithm MD5).Hash
    return $hash.Substring(0, 8)
  }
  return $null
}

$files = @()
$files += Get-ChildItem -LiteralPath $siteRoot -Filter '*.html' -File
$toolsDir = Join-Path $siteRoot 'tools'
if (Test-Path -LiteralPath $toolsDir) {
  $files += Get-ChildItem -LiteralPath $toolsDir -Filter '*.html' -File
}

$scriptPattern = '(<script[^>]*\bsrc=")([^"]+?)(\?v=[0-9a-f]{8})?(")'
$linkPattern   = '(<link[^>]*\brel=["'']stylesheet["''][^>]*\bhref=")([^"]+?)(\?v=[0-9a-f]{8})?(")'

$evaluator = {
  param($m)
  $prefix = $m.Groups[1].Value
  $path   = $m.Groups[2].Value
  $quote  = $m.Groups[4].Value

  if ($path -match '^([a-z]+:)?//' -or $path.StartsWith('#') -or $path.StartsWith('data:')) {
    return $m.Value
  }

  $v = Get-AssetVersion (Join-Path $fileDir $path)
  if (-not $v) { return $m.Value }

  return $prefix + $path + '?v=' + $v + $quote
}

$updated = 0
foreach ($f in $files) {
  $fileDir = $f.DirectoryName
  $text    = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($f.FullName))
  $newText = [regex]::Replace($text, $scriptPattern, $evaluator)
  $newText = [regex]::Replace($newText, $linkPattern, $evaluator)

  if ($newText -ne $text) {
    [System.IO.File]::WriteAllBytes($f.FullName, [System.Text.Encoding]::UTF8.GetBytes($newText))
    Write-Output ("updated: " + $f.Name)
    $updated++
  }
}

Write-Output ("cache-bust: {0} file(s) updated" -f $updated)
