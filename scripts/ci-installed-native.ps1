param([Parameter(Mandatory=$true)][string]$RequestFile)
$ErrorActionPreference='Stop';[Console]::OutputEncoding=New-Object Text.UTF8Encoding $false
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows'){throw 'Temporary hosted Windows runner only'}
$request=[IO.File]::ReadAllText($RequestFile,[Text.Encoding]::UTF8)|ConvertFrom-Json
. (Join-Path $PSScriptRoot '../src/helpers/windows-install.ps1')
if($request.operation -eq 'installation'){Test-DeskTvInstallation $request.root $request.version ([bool]$request.desktopRequired)|ConvertTo-Json -Depth 5 -Compress;exit}
function Hosted-Sha256($file){$stream=[IO.File]::OpenRead($file);$hash=[Security.Cryptography.SHA256]::Create();try{([BitConverter]::ToString($hash.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose();$hash.Dispose()}}
if($request.operation -eq 'snapshot'){@{records=@(Get-DeskTvRecords $request.root);shortcuts=@(Get-DeskTvLinks|Where-Object {Test-Path -LiteralPath $_}|ForEach-Object {@{path=$_;sha256=(Hosted-Sha256 $_)}})}|ConvertTo-Json -Depth 12 -Compress;exit}
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Runtime.InteropServices; using System.Text;
public static class DeskTvHostedWindow {
 public delegate bool Callback(IntPtr window,IntPtr unused);
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback,IntPtr unused);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect rect);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window,uint message,IntPtr w,IntPtr l);
}
'@
$script:processes=@{};foreach($process in [Diagnostics.Process]::GetProcesses()){try{if($process.MainModule.FileName -eq $request.exe -and (-not $request.pid -or $request.pid -eq $process.Id)){$script:processes[[uint32]$process.Id]=$process}}catch{}}
$script:windows=New-Object Collections.ArrayList
$callback=[DeskTvHostedWindow+Callback]{param([IntPtr]$handle,[IntPtr]$unused);[uint32]$windowPid=0;[DeskTvHostedWindow]::GetWindowThreadProcessId($handle,[ref]$windowPid)|Out-Null;if($script:processes.ContainsKey($windowPid) -and [DeskTvHostedWindow]::IsWindowVisible($handle) -and -not [DeskTvHostedWindow]::IsIconic($handle)){$r=New-Object DeskTvHostedWindow+Rect;[DeskTvHostedWindow]::GetWindowRect($handle,[ref]$r)|Out-Null;if($r.Right-$r.Left -ge 200 -and $r.Bottom-$r.Top -ge 200){$p=$script:processes[$windowPid];$script:windows.Add(@{pid=$p.Id;handle=$handle.ToInt64();visible=$true;minimized=$false;exe=$p.MainModule.FileName;fileVersion=[Diagnostics.FileVersionInfo]::GetVersionInfo($p.MainModule.FileName).ProductVersion;bounds=@{x=$r.Left;y=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}})|Out-Null}};return $true}
[DeskTvHostedWindow]::EnumWindows($callback,[IntPtr]::Zero)|Out-Null
if(-not $script:windows.Count){@{found=$false;matchingProcesses=$script:processes.Count}|ConvertTo-Json -Compress;exit}
$window=$script:windows[0]
if($request.operation -eq 'close'){[DeskTvHostedWindow]::PostMessage([IntPtr]$window.handle,0x10,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null;@{closedRequested=$true;pid=$window.pid}|ConvertTo-Json -Compress;exit}
if($request.capture){$b=New-Object Drawing.Bitmap $window.bounds.width,$window.bounds.height;$g=[Drawing.Graphics]::FromImage($b);try{$g.CopyFromScreen($window.bounds.x,$window.bounds.y,0,0,$b.Size);$b.Save($request.capture,[Drawing.Imaging.ImageFormat]::Png);$colors=New-Object 'Collections.Generic.HashSet[int]';for($x=0;$x -lt $b.Width;$x+=8){for($y=0;$y -lt $b.Height;$y+=8){$colors.Add($b.GetPixel($x,$y).ToArgb())|Out-Null}};if($colors.Count -lt 8){throw 'Native window capture is blank'};$window.capture=@{nonblank=$true;sampledColors=$colors.Count;path=$request.capture}}finally{$g.Dispose();$b.Dispose()}}
@{found=$true;window=$window}|ConvertTo-Json -Depth 6 -Compress
