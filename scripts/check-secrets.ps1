param(
  [string[]]$Paths
)

$ErrorActionPreference = 'Stop'

function Mask-Value {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return '****'
  }
  if ($Value.Length -le 8) {
    return '****'
  }
  return ($Value.Substring(0, 4) + '…' + $Value.Substring($Value.Length - 4))
}

$files = $Paths
if (-not $files -or $files.Count -eq 0) {
  $files = git ls-files
}

if (-not $files -or $files.Count -eq 0) {
  Write-Host 'No files found to scan.'
  exit 0
}

$patterns = @(
  @{ name = 'SUPABASE_SERVICE_ROLE_KEY'; regex = 'SUPABASE_SERVICE_ROLE_KEY\s*=\s*([^\s]+)' },
  @{ name = 'TWILIO_AUTH_TOKEN'; regex = 'TWILIO_AUTH_TOKEN\s*=\s*([^\s]+)' },
  @{ name = 'SMS_WEBHOOK_SECRET'; regex = 'SMS_WEBHOOK_SECRET\s*=\s*([^\s]+)' },
  @{ name = 'JOB_SECRET'; regex = 'JOB_SECRET\s*=\s*([^\s]+)' },
  @{ name = 'PRIVATE_KEY'; regex = '-----BEGIN (PRIVATE|RSA|EC) KEY-----' },
  @{ name = 'JWT'; regex = 'eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}' }
)

$found = $false

foreach ($pattern in $patterns) {
  $matches = Select-String -Path $files -Pattern $pattern.regex -AllMatches -ErrorAction SilentlyContinue
  foreach ($match in $matches) {
    foreach ($m in $match.Matches) {
      $found = $true
      $masked = '****'
      if ($m.Groups.Count -gt 1 -and $m.Groups[1].Value) {
        $masked = Mask-Value $m.Groups[1].Value
      } elseif ($pattern.name -eq 'JWT') {
        $masked = Mask-Value $m.Value
      }
      Write-Host ("[SECRET] {0}:{1} {2} -> {3}" -f $match.Path, $match.LineNumber, $pattern.name, $masked)
    }
  }
}

if ($found) {
  Write-Host 'Potential secrets detected. Remove them from tracked files before committing.'
  exit 1
}

Write-Host 'No secrets detected in tracked files.'
exit 0
