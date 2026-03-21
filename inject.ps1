Start-Process powershell -ArgumentList "-NoProfile", "-WindowStyle", "Normal", "-Command", "cd d:\Codebase\mgi-dream; .\deploy.ps1 > d:\Codebase\mgi-dream\deploy_log.txt 2>&1"
Start-Sleep -Seconds 4
$wshell = New-Object -ComObject wscript.shell;
$wshell.SendKeys('6Ms6j6JVo6yM68m~')
