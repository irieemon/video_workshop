#!/bin/bash

# Scenra Brand Migration Script
# This script updates all "Sora" references to "Scenra" across the codebase

echo "🎨 Starting Scenra Brand Migration..."

# Update all text references from Sora to Scenra
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/scripts/*" \
  -exec sed -i '' \
    -e 's/Sora2 Studio/Scenra Studio/g' \
    -e 's/Sora2/Scenra/g' \
    -e 's/"Sora"/"Scenra"/g' \
    -e "s/'Sora'/'Scenra'/g" \
    -e 's/\bsora-video-generator\b/scenra-studio/g' \
    {} +

# Update color class references from sage to scenra-amber
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/scripts/*" \
  -exec sed -i '' \
    -e 's/bg-sage-500/bg-scenra-amber/g' \
    -e 's/bg-sage-700/bg-scenra-dark/g' \
    -e 's/hover:bg-sage-700/hover:bg-scenra-amber\/90/g' \
    -e 's/hover:bg-sage-500/hover:bg-scenra-amber\/90/g' \
    -e 's/text-sage-500/text-scenra-amber/g' \
    -e 's/text-sage-700/text-scenra-dark/g' \
    -e 's/border-sage-500/border-scenra-amber/g' \
    -e 's/ring-sage-500/ring-scenra-amber/g' \
    {} +

echo "✅ Brand migration complete!"
echo "🔍 Please review the changes and test the application."
