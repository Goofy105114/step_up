#!/bin/bash

echo "🔨 Building StepUp iOS App..."

# Navigate to mobile directory
cd /Users/goofy/Documents/Recoz\ internship/Footcare\ Project/footwear-app/mobile

# Update CocoaPods repo
echo "📦 Updating CocoaPods..."
pod repo update

# Install iOS pods
echo "📦 Installing iOS dependencies..."
pod install --project-directory=ios

# Build and run on simulator
echo "🚀 Building iOS app..."
npm run ios

echo "✅ iOS app is ready!"
