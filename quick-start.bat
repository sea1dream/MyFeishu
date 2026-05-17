@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo FlowDoc Editor Quick Start
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto no_node

where npm >nul 2>nul
if errorlevel 1 goto no_npm

if not exist "node_modules\electron" (
  echo [1/2] Dependencies not found. Running npm install...
  call npm install
  if errorlevel 1 goto install_failed
) else (
  echo [1/2] Dependencies already installed. Skipping npm install.
)

echo.
echo [2/2] Starting FlowDoc Editor...
call npm start
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Start failed. Exit code: %EXIT_CODE%
  echo Please check the error messages above.
  pause
)

exit /b %EXIT_CODE%

:no_node
echo Node.js was not found.
echo Please install Node.js first, then run this script again.
pause
exit /b 1

:no_npm
echo npm was not found.
echo Please make sure Node.js is installed correctly, then run this script again.
pause
exit /b 1

:install_failed
echo.
echo npm install failed.
echo Please check your network, Node.js environment, or npm logs, then try again.
pause
exit /b 1
