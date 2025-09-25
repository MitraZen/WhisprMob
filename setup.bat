@echo off
echo 🚀 Setting up Whispr Mobile App...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully!
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Check if React Native CLI is installed
react-native --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📱 Installing React Native CLI...
    npm install -g @react-native-community/cli
)

echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. For Android: npm run android
echo 2. For iOS: cd ios ^&^& pod install ^&^& cd .. ^&^& npm run ios
echo 3. Start Metro: npm start
echo.
echo Happy coding! 💬
pause











