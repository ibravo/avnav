; Script generated by the Inno Script Studio Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "AvNav"
#define MyAppVersion "1.0"
#define MyAppPublisher "Andreas Vogel"
#define MyAppURL "http://www.wellenvogel.de/software/avnav"
#define MyAppExeName "AvChartConvert.exe"


[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{832C93A9-F8FA-4EE4-9447-2645D4340A13}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
;OutputDir=C:\Users\andreas\Documents\GitHub\avnav\windows\installer
OutputBaseFilename=AvNavSetup
Compression=lzma
SolidCompression=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\AvChartConvert.exe"; DestDir: "{app}"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files
Source: "..\avnav_server_home.xml"; DestDir: "{app}"; DestName: "avnav_server.xml"
Source: "..\..\server\*.py"; DestDir: "{app}\scripts"
Source: "..\..\chartconvert\*.py"; DestDir: "{app}\scripts"
Source: "library\python-2.7.10.msi"; DestDir: "{tmp}"
Source: "..\..\viewer\avnav_min.js"; DestDir: "{app}\viewer"
Source: "..\..\viewer\loader.js"; DestDir: "{app}\viewer"
Source: "..\..\viewer\version.js"; DestDir: "{app}\viewer"
Source: "..\..\viewer\avnav_viewer.html"; DestDir: "{app}\viewer"
Source: "..\..\viewer\avnav_viewer.less"; DestDir: "{app}\viewer"
Source: "..\..\viewer\base.js"; DestDir: "{app}\viewer"
Source: "..\..\viewer\images\*.png"; DestDir: "{app}\viewer\images"
Source: "..\..\libraries\*"; DestDir: "{app}\libraries"; Flags: recursesubdirs; Excludes: "*.pyc,*debug.js"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Flags: nowait postinstall skipifsilent; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"
Filename: "msiexec.exe"; Parameters: "/i ""{tmp}\python-2.7.10.msi"" /qb TARGETDIR=""{app}\python"""; WorkingDir: "{tmp}"

[UninstallRun]
;take the uninstall id from the properties of the MSI
;getmsiinfo.py library\python-2.7.10.msi "ProductCode"
Filename: "msiexec.exe"; Parameters: "/x {{E2B51919-207A-43EB-AE78-733F9C6797C2} /qb";
