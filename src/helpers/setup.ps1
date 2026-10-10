param([string]$InstallerPath,[string]$InstallDir,[string]$Version,[switch]$Preview,[switch]$Acceptance,[string]$CapturePath,[string]$ReportPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class LaoyuSetupWindow {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window,int command);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
}
'@
$script:busy=$false;$script:done=$false;$script:exitCode=0;$script:worker=$null;$script:timer=$null
function Existing-Install {
 $record=Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -match '^(捞鱼桌脚看电视|捞鱼小窗|带薪看片)( \d+\.\d+\.\d+)?$'} | Select-Object -First 1
 if($record -and -not $record.InstallLocation -and ([string]$record.DisplayIcon) -match '^"?(.+?\.exe)"?(?:,\s*-?\d+)?$'){$record|Add-Member -Force NoteProperty InstallLocation ([IO.Path]::GetDirectoryName($matches[1]))}
 return $record
}
$old=Existing-Install
if(-not $Preview -and $old -and [IO.Directory]::Exists($old.InstallLocation)){$InstallDir=$old.InstallLocation;$reason='保留你已有的安装位置和个人设置。'}
elseif($InstallDir -and $InstallDir -notlike ($env:LOCALAPPDATA+'*')){$reason='使用你指定的位置，可以直接编辑路径。'}
else{
 $systemRoot=[IO.Path]::GetPathRoot($env:WINDIR)
 $drive=[IO.DriveInfo]::GetDrives() | Where-Object {$_.IsReady -and $_.DriveType -eq 'Fixed' -and $_.Name -ne $systemRoot -and $_.AvailableFreeSpace -gt 629145600} | Sort-Object Name | Select-Object -First 1
 $InstallDir=if($drive){Join-Path $drive.Name 'Applications\Laoyu\PaidToWatch'}else{Join-Path $env:LOCALAPPDATA 'Programs\paid-to-watch'}
 $reason=if($drive){'优先非系统盘；也可以选择其他磁盘或编辑完整路径。'}else{'没有可用的非系统盘，使用当前用户目录；可以自行更换。'}
}
$xaml=@'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="捞鱼桌脚看电视 · 安装" Width="800" Height="540" WindowStartupLocation="CenterScreen" WindowStyle="None" ResizeMode="NoResize" Background="#F7F5EE" FontFamily="Microsoft YaHei UI" FontSize="13">
 <Window.Resources>
  <Style TargetType="Button"><Setter Property="Background" Value="#586D45"/><Setter Property="Foreground" Value="White"/><Setter Property="BorderThickness" Value="0"/><Setter Property="Padding" Value="15,10"/><Setter Property="Cursor" Value="Hand"/><Setter Property="Template"><Setter.Value><ControlTemplate TargetType="Button"><Border x:Name="Shape" Background="{TemplateBinding Background}" CornerRadius="9" Padding="{TemplateBinding Padding}"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border><ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Shape" Property="Opacity" Value="0.8"/></Trigger><Trigger Property="IsEnabled" Value="False"><Setter TargetName="Shape" Property="Opacity" Value="0.4"/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>
  <Style TargetType="TextBox"><Setter Property="Padding" Value="12,10"/><Setter Property="Background" Value="#FFFFFF"/><Setter Property="Foreground" Value="#292A24"/><Setter Property="Template"><Setter.Value><ControlTemplate TargetType="TextBox"><Border Background="{TemplateBinding Background}" CornerRadius="8" BorderBrush="#D8DDD0" BorderThickness="1" Padding="{TemplateBinding Padding}"><ScrollViewer x:Name="PART_ContentHost"/></Border></ControlTemplate></Setter.Value></Setter></Style>
  <Style TargetType="CheckBox"><Setter Property="Foreground" Value="#58604F"/><Setter Property="Template"><Setter.Value><ControlTemplate TargetType="CheckBox"><StackPanel Orientation="Horizontal"><Border x:Name="Box" Width="19" Height="19" CornerRadius="5" Background="White" BorderBrush="#BEC9B4" BorderThickness="1" Margin="0,0,9,0"><Path x:Name="Tick" Data="M4,9 L8,13 L15,5" Stroke="White" StrokeThickness="2" Visibility="Collapsed"/></Border><ContentPresenter VerticalAlignment="Center"/></StackPanel><ControlTemplate.Triggers><Trigger Property="IsChecked" Value="True"><Setter TargetName="Box" Property="Background" Value="#586D45"/><Setter TargetName="Tick" Property="Visibility" Value="Visible"/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter></Style>
 </Window.Resources>
 <Grid><Grid.ColumnDefinitions><ColumnDefinition Width="255"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
  <Border Background="#23332C"><StackPanel Margin="30,42" VerticalAlignment="Center"><TextBlock Text="LAOYU DESK TV" Foreground="#AFBC9F" FontSize="11" Margin="0,0,0,35"/><Image x:Name="ProductIcon" Width="150" Height="150" HorizontalAlignment="Left" Stretch="Uniform"/><TextBlock Text="捞鱼桌脚看电视" FontSize="25" FontWeight="Bold" Foreground="#F7F5EE" Margin="0,32,0,12"/><TextBlock Text="把片刻放松，&#10;藏进桌面的角落。" Foreground="#BBC6AD" FontSize="15" LineHeight="27"/><TextBlock x:Name="VersionLabel" Foreground="#83937A" Margin="0,36,0,0" FontSize="11"/></StackPanel></Border>
  <Grid Grid.Column="1" Margin="32,22,32,24"><Grid.RowDefinitions><RowDefinition Height="34"/><RowDefinition Height="*"/><RowDefinition Height="60"/></Grid.RowDefinitions>
   <Grid x:Name="Drag"><TextBlock Text="安装捞鱼桌脚看电视" Foreground="#969B8C" VerticalAlignment="Center"/><Button x:Name="Close" Content="×" HorizontalAlignment="Right" Background="Transparent" Foreground="#74796A" Padding="12,2" FontSize="22"/></Grid>
   <StackPanel x:Name="Setup" Grid.Row="1" Margin="0,25,0,0"><TextBlock Text="给放松选个位置。" FontSize="25" FontWeight="Bold" Foreground="#292A24"/><TextBlock Text="建议非系统盘，为 C 盘留点空间。" Foreground="#7B836F" Margin="0,12,0,21"/><WrapPanel x:Name="Drives" Margin="0,0,0,14"/><TextBox x:Name="Path"/><TextBlock x:Name="Hint" TextWrapping="Wrap" Foreground="#909582" FontSize="11" Margin="0,10,0,20"/><CheckBox x:Name="Desktop" Content="在桌面创建快捷方式" IsChecked="True"/><TextBlock Text="无感保护和自动自检默认开启，可在软件设置中关闭。" Foreground="#909582" FontSize="11" TextWrapping="Wrap" Margin="0,18,0,0"/><TextBlock x:Name="Error" Foreground="#A45239" TextWrapping="Wrap" Margin="0,10,0,0" FontSize="12"/></StackPanel>
   <StackPanel x:Name="Progress" Grid.Row="1" VerticalAlignment="Center" Visibility="Collapsed"><TextBlock Text="正在准备，稍等片刻。" FontSize="25" FontWeight="Bold" Foreground="#292A24"/><TextBlock x:Name="Stage" Text="正在释放软件文件" Foreground="#7B836F" Margin="0,24,0,10"/><Grid x:Name="Track" Height="8"><Border Background="#E0E5D7" CornerRadius="4"/><Border x:Name="Fill" Width="0" Background="#586D45" CornerRadius="4" HorizontalAlignment="Left"/></Grid><TextBlock x:Name="Percent" Text="0%" Foreground="#7B836F" Margin="0,12,0,0"/></StackPanel>
   <StackPanel x:Name="Finish" Grid.Row="1" VerticalAlignment="Center" Visibility="Collapsed"><TextBlock Text="准备好了，开始播放。" FontSize="25" FontWeight="Bold" Foreground="#292A24"/><TextBlock Text="软件已加入开始菜单。&#10;默认静音，点击窗口底部声音开关可开启。" TextWrapping="Wrap" LineHeight="25" Foreground="#7B836F" Margin="0,18,0,25"/><CheckBox x:Name="Launch" Content="完成后打开捞鱼桌脚看电视" IsChecked="True"/><TextBlock Text="想固定到任务栏？可以在开始菜单中手动固定。" TextWrapping="Wrap" Foreground="#909582" FontSize="11" Margin="0,20,0,0"/></StackPanel>
   <Grid Grid.Row="2"><TextBlock Text="仅为当前用户安装&#10;目录、老板键和声音设置会保留" Foreground="#909582" FontSize="10" LineHeight="19" VerticalAlignment="Center"/><Button x:Name="Primary" Content="开始安装  →" HorizontalAlignment="Right" Width="150" VerticalAlignment="Center"/></Grid>
  </Grid>
 </Grid>
</Window>
'@
$window=[Windows.Markup.XamlReader]::Parse($xaml);$c=@{}
$window.Add_SourceInitialized({
 if(-not $Preview){
  $script:showTimer=[Windows.Threading.DispatcherTimer]::new();$script:showTimer.Interval=[TimeSpan]::FromMilliseconds(200)
  $script:showTimer.Add_Tick({param($s,$e)$handle=[Windows.Interop.WindowInteropHelper]::new($window).Handle;[void][LaoyuSetupWindow]::ShowWindow($handle,5);if([LaoyuSetupWindow]::IsWindowVisible($handle)){$s.Stop();[void]$window.Activate();if($ReportPath -and -not $Acceptance){@{status='visible';title=$window.Title;handle=$handle.ToInt64();version=$Version;path=$c.Path.Text;nativeVisible=$true}|ConvertTo-Json|Set-Content -LiteralPath $ReportPath -Encoding UTF8}}})
  $script:showTimer.Start()
 }
})
foreach($name in 'VersionLabel','Drag','Close','Setup','Drives','Path','Hint','Desktop','Error','Progress','Stage','Track','Fill','Percent','Finish','Launch','Primary'){$c[$name]=$window.FindName($name)}
$icon=Join-Path $PSScriptRoot 'icon.png';if(-not [IO.File]::Exists($icon)){$icon=Join-Path $PSScriptRoot '../../assets/icon.png'};if([IO.File]::Exists($icon)){$window.FindName('ProductIcon').Source=[Windows.Media.Imaging.BitmapImage]::new([Uri]::new([IO.Path]::GetFullPath($icon)))}
$c.VersionLabel.Text="v$Version  ·  Windows 10 / 11";$c.Path.Text=$InstallDir;$c.Hint.Text=$reason
foreach($disk in [IO.DriveInfo]::GetDrives() | Where-Object {$_.IsReady -and $_.DriveType -eq 'Fixed'}){$button=[Windows.Controls.Button]::new();$button.Content=$disk.Name.TrimEnd('\');$button.Tag=$disk.Name;$button.Margin='0,0,8,0';$button.Padding='14,7';$button.Add_Click({param($s,$e)$c.Path.Text=Join-Path ([string]$s.Tag) 'Applications\Laoyu\PaidToWatch';$c.Hint.Text='使用你选择的磁盘；可以直接编辑完整路径。'});[void]$c.Drives.Children.Add($button)}
$c.Drag.Add_MouseLeftButtonDown({try{$window.DragMove()}catch{}})
$c.Close.Add_Click({if(-not $script:busy){$window.Close()}})
$window.Add_Closing({param($s,$e)if($script:busy){$e.Cancel=$true}})
function Capture {
 if(-not $CapturePath){return};$window.UpdateLayout();$image=[Windows.Media.Imaging.RenderTargetBitmap]::new([int]$window.ActualWidth,[int]$window.ActualHeight,96,96,[Windows.Media.PixelFormats]::Pbgra32);$image.Render($window);$encoder=[Windows.Media.Imaging.PngBitmapEncoder]::new();$encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($image));$stream=[IO.File]::Create($CapturePath);try{$encoder.Save($stream)}finally{$stream.Dispose()}
}
function Install {
 try{
  $c.Error.Text='';$candidate=$c.Path.Text.Trim();if($candidate -notmatch '^[A-Za-z]:\\' -or $candidate.Length -le 3 -or $candidate.Contains('"')){throw '请选择磁盘下的文件夹，例如 D:\Applications\Laoyu\PaidToWatch。'}
  $script:target=[IO.Path]::GetFullPath($candidate).TrimEnd('\');$disk=[IO.DriveInfo]::new([IO.Path]::GetPathRoot($script:target));if(-not $disk.IsReady -or $disk.AvailableFreeSpace -lt 629145600){throw '请至少预留 600 MB 空间。'}
  if(Get-Process -Name '捞鱼桌脚看电视','带薪看片' -ErrorAction SilentlyContinue){throw '请先从托盘退出正在播放的软件，再开始安装。'}
  [void][IO.Directory]::CreateDirectory($script:target);$test=Join-Path $script:target ('.paid-setup-'+[Guid]::NewGuid().ToString('N')+'.tmp');$stream=[IO.File]::Open($test,[IO.FileMode]::CreateNew);$stream.Dispose();[IO.File]::Delete($test)
  if(-not [IO.File]::Exists($InstallerPath)){throw '安装包已移动，请重新打开下载的文件。'}
  $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=$InstallerPath;$start.Arguments='/S '+$(if(-not $c.Desktop.IsChecked){'--no-desktop-shortcut '})+'/D='+$script:target;$start.UseShellExecute=$false;$start.CreateNoWindow=$true;$script:worker=[Diagnostics.Process]::Start($start)
  $script:busy=$true;$c.Setup.Visibility='Collapsed';$c.Progress.Visibility='Visible';$c.Primary.IsEnabled=$false;$c.Close.IsEnabled=$false
  $script:timer=[Windows.Threading.DispatcherTimer]::new();$script:timer.Interval=[TimeSpan]::FromMilliseconds(400)
  $script:timer.Add_Tick({try{
   if(-not $script:worker.HasExited){$bytes=0L;foreach($file in [IO.Directory]::EnumerateFiles($script:target,'*',[IO.SearchOption]::AllDirectories)){try{$bytes+=[IO.FileInfo]::new($file).Length}catch{}};$percent=[Math]::Min(96,[Math]::Max(3,[int](90*$bytes/320000000)));$c.Fill.Width=$c.Track.ActualWidth*$percent/100;$c.Percent.Text="$percent%";return}
   $script:timer.Stop();$script:busy=$false;$c.Close.IsEnabled=$true;if($script:worker.ExitCode -ne 0){throw "安装未完成（代码 $($script:worker.ExitCode)），请重试。"}
   $script:exe=Join-Path $script:target '捞鱼桌脚看电视.exe';$record=Existing-Install;$installedVersion=if([IO.File]::Exists($script:exe)){[Diagnostics.FileVersionInfo]::GetVersionInfo($script:exe).ProductVersion}else{''}
   if($installedVersion -ne $Version -and $installedVersion -ne ($Version+'.0')){throw '安装版本未能确认，请重试。'}
   if(-not $record -or $record.DisplayVersion -ne $Version -or ([string]$record.InstallLocation).TrimEnd('\') -ne $script:target){throw '系统安装记录未能确认，请重试。'}
   $script:done=$true;$c.Progress.Visibility='Collapsed';$c.Finish.Visibility='Visible';$c.Primary.Content='完成并打开  →';$c.Primary.IsEnabled=$true
   if($Acceptance){Capture;@{status='passed';version=$Version;path=$script:target;registered=$true;executable=$script:exe;desktop=[bool]$c.Desktop.IsChecked}|ConvertTo-Json|Set-Content -LiteralPath $ReportPath -Encoding UTF8;$window.Close()}
  }catch{$script:timer.Stop();$script:busy=$false;$script:exitCode=1;$c.Close.IsEnabled=$true;$c.Progress.Visibility='Collapsed';$c.Setup.Visibility='Visible';$c.Primary.IsEnabled=$true;$c.Error.Text=$_.Exception.Message;if($Acceptance){@{status='failed';message=$_.Exception.Message}|ConvertTo-Json|Set-Content -LiteralPath $ReportPath -Encoding UTF8;$window.Close()}}});$script:timer.Start()
 }catch{$c.Error.Text=$_.Exception.Message;if($Acceptance){$script:exitCode=1;@{status='failed';message=$_.Exception.Message}|ConvertTo-Json|Set-Content -LiteralPath $ReportPath -Encoding UTF8;$window.Close()}}
}
$c.Primary.Add_Click({if($Preview){return};if($script:done){if($c.Launch.IsChecked){Start-Process -FilePath $script:exe -WorkingDirectory $script:target -WindowStyle Normal|Out-Null};$window.Close()}else{Install}})
$window.Add_ContentRendered({
 # PowerShell's hidden startup flag must hide its console, not the WPF installer.
 if(-not $Preview){$handle=[Windows.Interop.WindowInteropHelper]::new($window).Handle;[void][LaoyuSetupWindow]::ShowWindow($handle,5);[void]$window.Activate()}
 if($Acceptance){Install};if($Preview){$timer=[Windows.Threading.DispatcherTimer]::new();$timer.Interval=[TimeSpan]::FromMilliseconds(350);$timer.Add_Tick({param($s,$e)$s.Stop();Capture;$window.Close()});$timer.Start()}
})
try{[void]$window.ShowDialog()}finally{if($script:timer){$script:timer.Stop()};if($script:worker){$script:worker.Dispose()}}
exit $script:exitCode
