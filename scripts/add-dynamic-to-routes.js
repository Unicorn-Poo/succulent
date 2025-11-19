#!/usr/bin/env node

/**
 * Script to automatically add `export const dynamic = 'force-dynamic';` 
 * to all API routes that don't already have it.
 * 
 * This fixes Next.js 15 static analysis issues with Zod/jazz-tools schemas.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function addDynamicToRoutes() {
  const apiRoutes = await glob('app/api/**/route.ts', {
    ignore: ['node_modules/**'],
    absolute: true,
  });

  let fixed = 0;
  let skipped = 0;

  for (const routeFile of apiRoutes) {
    const content = fs.readFileSync(routeFile, 'utf8');
    
    // Skip if already has dynamic export
    if (content.includes('export const dynamic')) {
      skipped++;
      continue;
    }

    // Find the first import statement
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find where to insert (after imports, before first export/function)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim().startsWith('export ') && insertIndex > 0) {
        break;
      }
    }

    // Insert the dynamic export
    lines.splice(insertIndex, 0, '', 'export const dynamic = \'force-dynamic\';');
    
    fs.writeFileSync(routeFile, lines.join('\n'), 'utf8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), routeFile)}`);
    fixed++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed} routes`);
  console.log(`   Skipped: ${skipped} routes (already had dynamic export)`);
}

addDynamicToRoutes().catch(console.error);




