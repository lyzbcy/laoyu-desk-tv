$ErrorActionPreference='Stop'
$job=$PSScriptRoot
$p=Get-Content -LiteralPath (Join-Path $job 'payload.json') -Raw -Encoding UTF8 | ConvertFrom-Json
function JsonFile($name,$data){$data|ConvertTo-Json -Compress|Set-Content -LiteralPath (Join-Path $job $name) -Encoding UTF8}
function Sha256($file){$stream=[IO.File]::OpenRead($file);try{$hash=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($hash.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$hash.Dispose()}}finally{$stream.Dispose()}}
$backup=Join-Path $job 'backup'
$installStarted=$false
$step='prepare'
try{
 . (Join-Path $job 'windows-install.ps1')
 $root=[IO.Path]::GetFullPath($p.root)
 $exe=[IO.Path]::GetFullPath($p.exe)
 if([IO.Path]::GetDirectoryName($exe) -ne $root -or [IO.Path]::GetFileName($exe) -ne '捞鱼桌脚看电视.exe' -or $root.TrimEnd('\') -eq [IO.Path]::GetPathRoot($root).TrimEnd('\')){throw 'invalid target'}
 if(-not(Test-Path -LiteralPath (Join-Path $root 'resources'))){throw 'not app directory'}
 if($p.appId -ne 'com.laoyu.paidtowatch' -or $p.token -notmatch '^[a-f0-9-]{36}$' -or $p.version -notmatch '^\d+\.\d+\.\d+$' -or (Sha256 $p.file) -ne $p.sha256){throw 'invalid package'}
 $writeProbe=Join-Path $root ('.desk-update-write-'+[Guid]::NewGuid().ToString('N')+'.tmp');$probeStream=[IO.File]::Open($writeProbe,[IO.FileMode]::CreateNew);$probeStream.Dispose();[IO.File]::Delete($writeProbe)
 $registryBefore=@(Get-DeskTvRecords $root);$shortcutBefore=@{};$shortcutFiles=Get-DeskTvLinks;$shortcutBackup=Join-Path $job 'shortcut-backup';New-Item -ItemType Directory -Path $shortcutBackup -Force|Out-Null
 $oldVersion=[Diagnostics.FileVersionInfo]::GetVersionInfo($exe).ProductVersion -replace '^(\d+\.\d+\.\d+)\.0$','$1'
 foreach($link in $shortcutFiles){if(Test-Path -LiteralPath $link){if(-not [DeskTvInstallPaths]::Same([DeskTvInstallPaths]::LinkTarget($link),$exe)){throw 'custom shortcut target'};$saved=Join-Path $shortcutBackup ([Guid]::NewGuid().ToString('N')+'.lnk');Copy-Item -LiteralPath $link -Destination $saved;$shortcutBefore[$link]=$saved}}
 $desktopRequired=Test-Path -LiteralPath $shortcutFiles[1]
 New-Item -ItemType Directory -Path $backup -Force|Out-Null
 $entries=Get-ChildItem -LiteralPath $root | Where-Object { $_.Name -in @('resources','locales') -or $_.Name -match '\.(exe|dll|pak|bin|dat)$' }
 foreach($entry in $entries){Copy-Item -LiteralPath $entry.FullName -Destination (Join-Path $backup $entry.Name) -Recurse -Force}
 JsonFile 'ready.json' @{token=$p.token;status='ready';version=$p.version;pid=$PID}
 $limit=(Get-Date).AddSeconds(70)
 while(-not(Test-Path -LiteralPath (Join-Path $job 'commit.json'))){if((Test-Path -LiteralPath (Join-Path $job 'abort.json')) -or (Get-Date) -gt $limit){throw 'not committed'};Start-Sleep -Milliseconds 100}
 $commit=Get-Content -LiteralPath (Join-Path $job 'commit.json') -Raw|ConvertFrom-Json
 if($commit.token -ne $p.token){throw 'wrong commit'}
 $step='wait-parent'
 if(Get-Process -Id $p.pid -ErrorAction SilentlyContinue){try{Wait-Process -Id $p.pid -Timeout 120 -ErrorAction Stop}catch{if(Get-Process -Id $p.pid -ErrorAction SilentlyContinue){throw}}}
 # Chromium children may remain briefly after the main process exits.
 $limit=(Get-Date).AddSeconds(120)
 while(Get-Process | Where-Object { try { $_.Path -eq $exe } catch { $false } }){if((Get-Date) -gt $limit){throw 'runtime still active'};Start-Sleep -Milliseconds 200}
 $step='install'
 if((Sha256 $p.file) -ne $p.sha256){throw 'package changed'}
 $installStarted=$true
 $installerArguments=@('/S');if(-not $desktopRequired){$installerArguments+='--no-desktop-shortcut'};$installerArguments+=('/D='+$root)
 $installer=Start-Process -FilePath $p.file -ArgumentList $installerArguments -WindowStyle Hidden -Wait -PassThru
 if($installer.ExitCode -ne 0){throw 'installer failed'}
 $step='verify-version'
 $version=[Diagnostics.FileVersionInfo]::GetVersionInfo($exe).ProductVersion
 if($version -ne $p.version -and $version -ne ($p.version+'.0')){throw 'version mismatch'}
 $step='verify-registration-and-shortcuts';$verified=Test-DeskTvInstallation $root $p.version $desktopRequired
 JsonFile 'result.json' @{token=$p.token;status='installed';version=$p.version;backup=$backup;installation=$verified}
 $step='restart'
 Start-Process -FilePath $exe -WorkingDirectory $root -WindowStyle Normal|Out-Null
 $limit=(Get-Date).AddSeconds(90)
 while((Get-Date) -lt $limit){Start-Sleep -Milliseconds 200;try{$result=Get-Content -LiteralPath (Join-Path $job 'result.json') -Raw|ConvertFrom-Json;if($result.status -eq 'restarted' -and $result.token -eq $p.token){exit 0}}catch{}}
 throw 'restart not confirmed'
}catch{
 $rollbackSucceeded=$false
 if($installStarted){try{
  # Only stop the runtime at this exact validated installation path before restoring it.
  Get-Process | Where-Object { try { $_.Path -eq $exe } catch { $false } } | Stop-Process -Force
  foreach($entry in Get-ChildItem -LiteralPath $backup){
   $destination=[IO.Path]::GetFullPath((Join-Path $root $entry.Name))
   if([IO.Path]::GetDirectoryName($destination) -ne $root -or ($entry.PSIsContainer -and $entry.Name -notin @('resources','locales'))){throw 'invalid recovery path'}
   # Copy-Item into an existing directory otherwise creates resources/resources.
   if($entry.PSIsContainer -and (Test-Path -LiteralPath $destination)){Remove-Item -LiteralPath $destination -Recurse -Force}
   Copy-Item -LiteralPath $entry.FullName -Destination $destination -Recurse -Force
  }
  Restore-DeskTvRecords $root $registryBefore
  foreach($link in $shortcutFiles){if($shortcutBefore.ContainsKey($link)){Copy-Item -LiteralPath $shortcutBefore[$link] -Destination $link -Force}elseif(Test-Path -LiteralPath $link){if([DeskTvInstallPaths]::Same([DeskTvInstallPaths]::LinkTarget($link),$exe)){Remove-Item -LiteralPath $link -Force}}}
  Test-DeskTvInstallation $root $oldVersion $desktopRequired|Out-Null
  $rollbackSucceeded=$true
  Start-Process -FilePath $exe -WorkingDirectory $root -WindowStyle Normal|Out-Null
 }catch{}}
 JsonFile 'result.json' @{token=$p.token;status='failed';version=$p.version;backup=$backup;step=$step;rollbackSucceeded=$rollbackSucceeded;message='更新未完成，保留程序备份和用户设置'}
 exit 1
}
