@echo off
rem Deletes files the app no longer uses (E1). Safe to run more than once. Double-click to run.
rem If a file does not exist it is skipped. Nothing else is touched.
cd /d "%~dp0.."
echo Cleaning unused files in %CD% ...

rem --- old 97-picture intro (replaced by assets\intro\walk-sprite.png) ---
if exist "src\features\intro\introFrames.ts" del /q "src\features\intro\introFrames.ts"
if exist "scripts\make-intro-frames.py" del /q "scripts\make-intro-frames.py"
for /l %%i in (0,1,96) do (
  if %%i LSS 10 (
    if exist "assets\intro\f0%%i.png" del /q "assets\intro\f0%%i.png"
  ) else (
    if exist "assets\intro\f%%i.png" del /q "assets\intro\f%%i.png"
  )
)

rem --- code no longer imported anywhere ---
if exist "src\features\schedule\replan.ts" del /q "src\features\schedule\replan.ts"
if exist "src\features\schedule\autoEnd.ts" del /q "src\features\schedule\autoEnd.ts"
if exist "src\features\schedule\startPlan.ts" del /q "src\features\schedule\startPlan.ts"
if exist "src\features\history\components\ApeMark.tsx" del /q "src\features\history\components\ApeMark.tsx"
if exist "src\app\time.tsx" del /q "src\app\time.tsx"

rem --- unused assets ---
if exist "assets\icons\check.png" del /q "assets\icons\check.png"
if exist "assets\fonts\Pretendard-Bold.ttf" del /q "assets\fonts\Pretendard-Bold.ttf"

rem --- original template folder (not used anymore) ---
if exist "_scaffold" rmdir /s /q "_scaffold"

echo Done. Restart the dev server with: npx expo start -c
pause
