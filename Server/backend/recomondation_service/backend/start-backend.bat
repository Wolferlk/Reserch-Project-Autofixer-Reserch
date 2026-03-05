@echo off
echo Starting FastAPI Backend Server...
echo.
cd /d "%~dp0"
echo Current directory: %CD%
echo.

echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo.
echo Starting uvicorn server on port 8000...
echo Backend will be available at: http://localhost:8000
echo API Docs will be available at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn app:app --reload --host 0.0.0.0 --port 8000

pause

