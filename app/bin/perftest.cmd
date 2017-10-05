SET params=--teststorun=SPListPerf --testconfig=SPDFPERFConfig --browser=Chrome --timeoutinminutes=59
cd %~dp0\..\app
@IF EXIST "%~dp0\node.exe" (
  ECHO "%~dp0\node.exe" ".\index.js" %params% %*
  "%~dp0\node.exe" ".\index.js" %params% %*
) ELSE (
  ECHO node ".\index.js" %params% %*
  node ".\index.js" %params% %*
)