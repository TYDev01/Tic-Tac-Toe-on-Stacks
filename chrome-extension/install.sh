#!/bin/bash

# Installation script for Tic-Tac-Toe Chrome Extension

echo "🎲 Setting up Tic-Tac-Toe Chrome Extension..."

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "Error: Please run this script from the chrome-extension directory"
    exit 1
fi

echo "Current directory: $(pwd)"

# Create icons directory if it doesn't exist
mkdir -p icons

echo "Generating extension icons..."

# Note: In a real setup, you'd use a tool like ImageMagick to convert SVG to PNG
# For now, we'll provide instructions for manual conversion

echo "Manual icon setup required:"
echo "   1. Convert icons/icon16.svg to PNG format at these sizes:"
echo "      - icons/icon16.png (16x16)"
echo "      - icons/icon32.png (32x32)"  
echo "      - icons/icon48.png (48x48)"
echo "      - icons/icon128.png (128x128)"
echo ""
echo "   You can use online converters or tools like:"
echo "   - ImageMagick: convert icon16.svg -resize 16x16 icon16.png"
echo "   - Online SVG to PNG converters"
echo "   - Design tools like Figma, Canva, or GIMP"

# Check for common tools
if command -v convert &> /dev/null; then
    echo " ImageMagick found! Attempting to generate PNG icons..."
    
    cd icons
    
    # Generate different sizes from SVG
    convert icon16.svg -resize 16x16 icon16.png 2>/dev/null || echo "  Could not generate 16x16 icon"
    convert icon16.svg -resize 32x32 icon32.png 2>/dev/null || echo "  Could not generate 32x32 icon"
    convert icon16.svg -resize 48x48 icon48.png 2>/dev/null || echo "  Could not generate 48x48 icon"
    convert icon16.svg -resize 128x128 icon128.png 2>/dev/null || echo "  Could not generate 128x128 icon"
    
    cd ..
    
    echo " Icon generation complete!"
else
    echo "  ImageMagick not found. Please generate PNG icons manually."
fi

echo ""
echo " Installation Instructions:"
echo "   1. Open Chrome and go to chrome://extensions/"
echo "   2. Enable 'Developer mode' (toggle in top right)"
echo "   3. Click 'Load unpacked' and select this directory:"
echo "      $(pwd)"
echo "   4. The extension should now appear in your extensions list"
echo "   5. Pin the extension to your toolbar for easy access"
echo ""
echo " Next Steps:"
echo "   - Click the extension icon to open the popup"
echo "   - Connect your Stacks wallet"
echo "   - Start creating and playing games!"
echo ""
echo " For detailed usage instructions, see README.md"
echo ""
echo "✨ Extension setup complete! Happy gaming! 🎮"