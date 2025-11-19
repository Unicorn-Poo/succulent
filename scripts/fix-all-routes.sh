#!/bin/bash

# Add export const dynamic = 'force-dynamic'; to all API routes that don't have it

find app/api -name "route.ts" -type f | while read file; do
  if ! grep -q "export const dynamic" "$file"; then
    # Find the first import line
    first_import_line=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
    
    if [ -n "$first_import_line" ]; then
      # Find the last import line
      last_import_line=$(awk '/^import/ {last=NR} END {print last}' "$file")
      
      # Insert after the last import, before any other code
      if [ -n "$last_import_line" ]; then
        # Use sed to insert the dynamic export after the last import
        sed -i.bak "${last_import_line}a\\
\\
export const dynamic = 'force-dynamic';" "$file"
        rm -f "${file}.bak"
        echo "✅ Fixed: $file"
      fi
    else
      # No imports, add at the top after the first line
      sed -i.bak "1a\\
export const dynamic = 'force-dynamic';\\
" "$file"
      rm -f "${file}.bak"
      echo "✅ Fixed: $file (no imports)"
    fi
  fi
done

echo "Done!"




