$ErrorActionPreference='Stop'
$job=$PSScriptRoot
$p=Get-Content -LiteralPath (Join-Path $job 'payload.json') -Raw -Encoding UTF8 | ConvertFrom-Json
function JsonFile($name,$data){$data|ConvertTo-Json -Compress|Set-Content -LiteralPath (Join-Path $job $name) -Encoding UTF8}
function Sha256($file){$stream=[IO.File]::OpenRead($file);try{$hash=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($hash.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$hash.Dispose()}}finally{$stream.Dispose()}}
$backup=Join-Path $job 'backup'
$installStarted=$false
try{
 $root=[IO.Path]::GetFullPath($p.root)
 $exe=[IO.Path]::GetFullPath($p.exe)
 if([IO.Path]::GetDirectoryName($exe) -ne $root -or [IO.Path]::GetFileName($exe) -ne '带薪看片.exe' -or $root.TrimEnd('\') -eq [IO.Path]::GetPathRoot($root).TrimEnd('\')){throw 'invalid target'}
 if(-not(Test-Path -LiteralPath (Join-Path $root 'resources'))){throw 'not app directory'}
 if($p.token -notmatch '^[a-f0-9-]{36}$' -or $p.version -notmatch '^\d+\.\d+\.\d+$' -or (Sha256 $p.file) -ne $p.sha256){throw 'invalid package'}
 New-Item -ItemType Directory -Path $backup -Force|Out-Null
 $entries=Get-ChildItem -LiteralPath $root | Where-Object { $_.Name -in @('resources','locales') -or $_.Name -match '\.(exe|dll|pak|bin|dat)$' }
 foreach($entry in $entries){Copy-Item -LiteralPath $entry.FullName -Destination (Join-Path $backup $entry.Name) -Recurse -Force}
 JsonFile 'ready.json' @{token=$p.token;status='ready'}
 $limit=(Get-Date).AddSeconds(70)
 while(-not(Test-Path -LiteralPath (Join-Path $job 'commit.json'))){if((Test-Path -LiteralPath (Join-Path $job 'abort.json')) -or (Get-Date) -gt $limit){throw 'not committed'};Start-Sleep -Milliseconds 100}
 $commit=Get-Content -LiteralPath (Join-Path $job 'commit.json') -Raw|ConvertFrom-Json
 if($commit.token -ne $p.token){throw 'wrong commit'}
 if(Get-Process -Id $p.pid -ErrorAction SilentlyContinue){Wait-Process -Id $p.pid -Timeout 120 -ErrorAction Stop}
 if((Sha256 $p.file) -ne $p.sha256){throw 'package changed'}
 $installStarted=$true
 $installer=Start-Process -FilePath $p.file -ArgumentList @('/S',('/D='+$root)) -WindowStyle Hidden -Wait -PassThru
 if($installer.ExitCode -ne 0){throw 'installer failed'}
 $version=[Diagnostics.FileVersionInfo]::GetVersionInfo($exe).ProductVersion
 if($version -ne $p.version){throw 'version mismatch'}
 JsonFile 'result.json' @{token=$p.token;status='installed';version=$p.version;backup=$backup}
 Start-Process -FilePath $exe -WorkingDirectory $root -WindowStyle Normal|Out-Null
 $limit=(Get-Date).AddSeconds(90)
 while((Get-Date) -lt $limit){Start-Sleep -Milliseconds 200;try{$result=Get-Content -LiteralPath (Join-Path $job 'result.json') -Raw|ConvertFrom-Json;if($result.status -eq 'restarted' -and $result.token -eq $p.token){exit 0}}catch{}}
 throw 'restart not confirmed'
}catch{
 if($installStarted){try{
  # Only stop the runtime at this exact validated installation path before restoring it.
  Get-Process | Where-Object { try { $_.Path -eq $exe } catch { $false } } | Stop-Process -Force
  foreach($entry in Get-ChildItem -LiteralPath $backup){Copy-Item -LiteralPath $entry.FullName -Destination (Join-Path $root $entry.Name) -Recurse -Force}
  Start-Process -FilePath $exe -WorkingDirectory $root -WindowStyle Normal|Out-Null
 }catch{}}
 JsonFile 'result.json' @{token=$p.token;status='failed';version=$p.version;backup=$backup;message='更新未完成，保留程序备份和用户设置'}
 exit 1
}
