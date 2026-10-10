!macro customInit
  IfSilent paid_backend_ready
  ; A durable unique stage lets the original NSIS process quit and release its mutex.
  ; The modern UI then invokes the same, unchanged silent NSIS backend after user choice.
  GetTempFileName $0 "$TEMP"
  Delete "$0"
  StrCpy $0 "$0.paid-to-watch"
  CreateDirectory "$0"
  SetOutPath "$0"
  File /oname=installer-ui.ps1 "${PROJECT_DIR}\src\helpers\setup.ps1"
  File /oname=icon.png "${PROJECT_DIR}\assets\icon.png"
  Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "$0\installer-ui.ps1" -InstallerPath "$EXEPATH" -InstallDir "$INSTDIR" -Version "${VERSION}"'
  Quit
  paid_backend_ready:
!macroend
!macro customInstall
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "InstallLocation" "$INSTDIR"
!macroend
