@echo off
rem ============================================
rem Deploy Script for my-ai-app (Windows Batch)
rem
rem Usage:
rem   scripts\deploy.bat build-tar  # Build, save tar, upload, load, and start on VPS
rem   scripts\deploy.bat save-tar   # Build and save tar locally only
rem   scripts\deploy.bat load-tar   # Load local tar and start containers
rem   scripts\deploy.bat up         # Start containers
rem   scripts\deploy.bat down       # Stop containers
rem   scripts\deploy.bat status     # Show container status
rem   scripts\deploy.bat logs       # Follow logs
rem ============================================

setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%" || exit /b 1

set "IMAGE_TAR=my-ai-app-images.tar"
set "FRONTEND_IMAGE=my-ai-app-frontend:latest"
set "BACKEND_IMAGE=my-ai-app-backend:latest"
set "COMPOSE_FILE=docker-compose-prod.yml"
set "FRONTEND_PORT=3001"
set "BACKEND_PORT=8001"
set "VPS_IP=178.105.59.179"
set "VPS_USER=root"
set "VPS_TARGET_DIR=/my-ai"

if "%1"=="" goto usage
if /I "%1"=="build-tar" goto build_tar
if /I "%1"=="deploy" goto build_tar
if /I "%1"=="save-tar" goto save_tar
if /I "%1"=="load-tar" goto load_tar
if /I "%1"=="up" goto up
if /I "%1"=="down" goto down
if /I "%1"=="status" goto status
if /I "%1"=="logs" goto logs
goto usage

:save_tar
    call :require_file "%COMPOSE_FILE%" || exit /b 1

    echo ==^> Project root: %PROJECT_ROOT%
    echo ==^> Removing old local tar if present...
    if exist "%IMAGE_TAR%" del /f /q "%IMAGE_TAR%"

    echo ==^> Building Docker images (frontend + backend)...
    docker compose -f "%COMPOSE_FILE%" build --no-cache
    if errorlevel 1 goto fail

    echo ==^> Saving images to %IMAGE_TAR%...
    docker save -o "%IMAGE_TAR%" "%FRONTEND_IMAGE%" "%BACKEND_IMAGE%"
    if errorlevel 1 goto fail

    echo.
    echo ==^> Local tar is ready: %PROJECT_ROOT%\%IMAGE_TAR%
    goto :eof

:build_tar
    call :save_tar
    if errorlevel 1 exit /b 1

    call :require_file ".env" || exit /b 1

    echo.
    echo ==^> Upload target: %VPS_USER%@%VPS_IP%:%VPS_TARGET_DIR%
    echo ==^> Ensuring target directory exists...
    ssh %VPS_USER%@%VPS_IP% "mkdir -p %VPS_TARGET_DIR%"
    if errorlevel 1 goto fail

    echo ==^> Uploading %IMAGE_TAR%...
    scp "%IMAGE_TAR%" %VPS_USER%@%VPS_IP%:%VPS_TARGET_DIR%/
    if errorlevel 1 goto fail

    echo ==^> Uploading %COMPOSE_FILE%...
    scp "%COMPOSE_FILE%" %VPS_USER%@%VPS_IP%:%VPS_TARGET_DIR%/
    if errorlevel 1 goto fail

    echo ==^> Uploading .env...
    scp ".env" %VPS_USER%@%VPS_IP%:%VPS_TARGET_DIR%/
    if errorlevel 1 goto fail

    echo.
    echo ==^> Deploying on VPS: down -^> load -^> up -^> ps
    ssh %VPS_USER%@%VPS_IP% "cd %VPS_TARGET_DIR% && docker compose -f %COMPOSE_FILE% down && docker load -i %IMAGE_TAR% && docker compose -f %COMPOSE_FILE% up -d && docker compose -f %COMPOSE_FILE% ps"
    if errorlevel 1 goto fail

    echo.
    echo ==^> Deploy complete!
    echo    Frontend: http://%VPS_IP%:%FRONTEND_PORT%
    echo    Backend:  http://%VPS_IP%:%BACKEND_PORT%/docs
    goto :eof

:load_tar
    call :require_file "%IMAGE_TAR%" || exit /b 1
    call :require_file "%COMPOSE_FILE%" || exit /b 1

    echo ==^> Loading Docker images from %IMAGE_TAR%...
    docker load -i "%IMAGE_TAR%"
    if errorlevel 1 goto fail

    echo ==^> Starting containers...
    docker compose -f "%COMPOSE_FILE%" up -d
    if errorlevel 1 goto fail

    echo.
    echo ==^> Containers running:
    docker compose -f "%COMPOSE_FILE%" ps
    goto :eof

:up
    call :require_file "%COMPOSE_FILE%" || exit /b 1
    echo ==^> Starting containers...
    docker compose -f "%COMPOSE_FILE%" up -d
    if errorlevel 1 goto fail
    docker compose -f "%COMPOSE_FILE%" ps
    goto :eof

:down
    call :require_file "%COMPOSE_FILE%" || exit /b 1
    echo ==^> Stopping containers...
    docker compose -f "%COMPOSE_FILE%" down
    if errorlevel 1 goto fail
    goto :eof

:status
    call :require_file "%COMPOSE_FILE%" || exit /b 1
    echo ==^> Container status:
    docker compose -f "%COMPOSE_FILE%" ps
    goto :eof

:logs
    call :require_file "%COMPOSE_FILE%" || exit /b 1
    echo ==^> Container logs:
    docker compose -f "%COMPOSE_FILE%" logs -f
    goto :eof

:require_file
    if not exist "%~1" (
        echo Error: required file not found: %~1
        echo Current directory: %CD%
        exit /b 1
    )
    exit /b 0

:fail
    echo.
    echo Error: deploy step failed. Check the output above.
    exit /b 1

:usage
    echo Usage: scripts\deploy.bat {build-tar^|save-tar^|load-tar^|up^|down^|status^|logs}
    echo.
    echo   build-tar  - Build, save tar, upload to VPS, load images, and start containers
    echo   deploy     - Alias for build-tar
    echo   save-tar   - Build images and save tar locally only
    echo   load-tar   - Load local tar and start containers on this machine
    echo   up         - Start containers without building
    echo   down       - Stop containers
    echo   status     - Show container status
    echo   logs       - Follow container logs
    echo.
    echo Config:
    echo   VPS:      %VPS_USER%@%VPS_IP%:%VPS_TARGET_DIR%
    echo   Frontend: http://%VPS_IP%:%FRONTEND_PORT%
    echo   Backend:  http://%VPS_IP%:%BACKEND_PORT%/docs
    exit /b 1
