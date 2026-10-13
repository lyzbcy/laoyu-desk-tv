# Keep Unicode paths end to end; WScript.Shell can lose Chinese executable names.
if(-not ('DeskTvInstallPaths' -as [type])){
 Add-Type @'
using System;
using System.Text;
using System.IO;
using System.Runtime.InteropServices;
[ComImport,Guid("000214F9-0000-0000-C000-000000000046"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface DeskTvShellLink { [PreserveSig] int GetPath([Out,MarshalAs(UnmanagedType.LPWStr)] StringBuilder value,int size,IntPtr metadata,uint flags); }
public static class DeskTvInstallPaths {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)] static extern uint GetLongPathName(string source,StringBuilder destination,uint size);
 public static string Normalize(string value){string absolute=Path.GetFullPath(value);if(!File.Exists(absolute)&&!Directory.Exists(absolute))throw new IOException("Installation path is missing");var buffer=new StringBuilder(32768);uint size=GetLongPathName(absolute,buffer,(uint)buffer.Capacity);if(size==0||size>=buffer.Capacity)throw new IOException("Installation path cannot be read");return buffer.ToString().TrimEnd('\\');}
 public static bool Same(string left,string right){return String.Equals(Normalize(left),Normalize(right),StringComparison.OrdinalIgnoreCase);}
 public static string LinkTarget(string file){object instance=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("00021401-0000-0000-C000-000000000046")));try{((System.Runtime.InteropServices.ComTypes.IPersistFile)instance).Load(file,0);var target=new StringBuilder(32768);int status=((DeskTvShellLink)instance).GetPath(target,target.Capacity,IntPtr.Zero,4);if(status<0)Marshal.ThrowExceptionForHR(status);if(target.Length==0)throw new IOException("Shortcut target is empty");return target.ToString();}finally{Marshal.FinalReleaseComObject(instance);}}
}
'@
}
function Get-DeskTvRecords([string]$Root){
 $base='Software\Microsoft\Windows\CurrentVersion\Uninstall';$registry=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($base)
 if(-not $registry){return}
 try{foreach($name in $registry.GetSubKeyNames()){$key=$registry.OpenSubKey($name);try{$display=[string]$key.GetValue('DisplayName');$location=[string]$key.GetValue('InstallLocation');if($display -notin @('捞鱼桌脚看电视','带薪看片') -or -not $location){continue};try{$owned=[DeskTvInstallPaths]::Same($location,$Root)}catch{$owned=$false};if($owned){$values=@{};foreach($property in $key.GetValueNames()){$values[$property]=@{value=$key.GetValue($property,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames);kind=[string]$key.GetValueKind($property)}};[pscustomobject]@{key=$base+'\'+$name;name=$display;version=[string]$key.GetValue('DisplayVersion');location=$location;icon=[string]$key.GetValue('DisplayIcon');values=$values}}}finally{$key.Dispose()}}}finally{if($registry){$registry.Dispose()}}
}
function Get-DeskTvLinks {
 @((Join-Path ([Environment]::GetFolderPath('Programs')) '捞鱼桌脚看电视.lnk'),(Join-Path ([Environment]::GetFolderPath('Desktop')) '捞鱼桌脚看电视.lnk'))
}
function Test-DeskTvInstallation([string]$Root,[string]$Version,[bool]$DesktopRequired=$false){
 $exe=Join-Path $Root '捞鱼桌脚看电视.exe';$actual=[Diagnostics.FileVersionInfo]::GetVersionInfo($exe).ProductVersion
 if($actual -ne $Version -and $actual -ne ($Version+'.0')){throw 'installed executable version mismatch'}
 $records=@(Get-DeskTvRecords $Root);if($records.Count -ne 1 -or $records[0].name -ne '捞鱼桌脚看电视' -or $records[0].version -ne $Version){throw 'installed registration mismatch'}
 $icon=[string]$records[0].icon;if($icon -notmatch '^\s*"?(.+?\.exe)"?(?:,\s*-?\d+)?\s*$' -or -not [DeskTvInstallPaths]::Same($Matches[1],$exe)){throw 'installed icon mismatch'}
 $links=Get-DeskTvLinks;$verified=@();for($i=0;$i -lt $links.Count;$i++){$link=$links[$i];if($i -eq 0 -or $DesktopRequired -or (Test-Path -LiteralPath $link)){if(-not (Test-Path -LiteralPath $link) -or -not [DeskTvInstallPaths]::Same([DeskTvInstallPaths]::LinkTarget($link),$exe)){throw 'installed shortcut mismatch'};$verified+= $link}}
 @{version=$Version;location=$Root;exe=$exe;registryKey=$records[0].key;shortcuts=$verified}
}
function Restore-DeskTvRecords([string]$Root,$Before){
 $after=@(Get-DeskTvRecords $Root);foreach($record in $after){if(-not @($Before|Where-Object {$_.key -eq $record.key}).Count){[Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($record.key,$false)}}
 foreach($record in $Before){$key=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($record.key);try{foreach($name in $key.GetValueNames()){if(-not $record.values.ContainsKey($name)){$key.DeleteValue($name,$false)}};foreach($name in $record.values.Keys){$entry=$record.values[$name];$key.SetValue($name,$entry.value,[Microsoft.Win32.RegistryValueKind]$entry.kind)}}finally{$key.Dispose()}}
}
