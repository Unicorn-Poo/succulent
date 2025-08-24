import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// 📚 API DOCUMENTATION ENDPOINT
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Read the API documentation markdown file
    const docsPath = join(process.cwd(), 'docs', 'API.md');
    const markdownContent = await readFile(docsPath, 'utf-8');

    // Simple markdown to HTML conversion for basic formatting
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Succulent API Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #fafafa;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    h1 { 
      color: #059669; 
      border-bottom: 3px solid #10b981; 
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 { 
      color: #065f46; 
      margin-top: 40px;
      border-bottom: 2px solid #d1fae5;
      padding-bottom: 8px;
    }
    h3 { 
      color: #047857; 
      margin-top: 30px;
    }
    code { 
      background: #f3f4f6; 
      padding: 2px 6px; 
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    .endpoint {
      background: #ecfdf5;
      border: 1px solid #10b981;
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .method {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      margin-right: 8px;
    }
    .method.post { background: #fef3c7; color: #92400e; }
    .method.get { background: #dbeafe; color: #1e40af; }
    .method.put { background: #fce7f3; color: #be185d; }
    .method.delete { background: #fee2e2; color: #dc2626; }
    .alert {
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .alert.info { background: #eff6ff; border: 1px solid #3b82f6; }
    .alert.warning { background: #fffbeb; border: 1px solid #f59e0b; }
    .alert.success { background: #f0fdf4; border: 1px solid #10b981; }
    .toc {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
    }
    .back-link {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      transition: all 0.2s;
    }
    .back-link:hover {
      background: #059669;
      transform: translateY(-1px);
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
</head>
<body>
  <a href="/" class="back-link">← Back to App</a>
  <div class="container">
    <div id="content"></div>
  </div>

  <script>
    // Simple markdown parser for basic formatting
    function parseMarkdown(markdown) {
      let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        
        // Code blocks
        .replace(/\`\`\`(\w*)\n([\s\S]*?)\`\`\`/g, '<pre><code class="language-$1">$2</code></pre>')
        
        // Inline code
        .replace(/\`([^\`]*)\`/g, '<code>$1</code>')
        
        // Bold
        .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
        
        // Italic
        .replace(/\*(.*)\*/g, '<em>$1</em>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        
        // Tables (basic)
        .replace(/^\|(.+)\|\s*$/gm, function(match, content) {
          const cells = content.split('|').map(cell => cell.trim());
          const isHeader = cells.some(cell => cell.includes('**'));
          const tag = isHeader ? 'th' : 'td';
          return '<tr>' + cells.map(cell => \`<\${tag}>\${cell.replace(/\*\*/g, '')}</\${tag}>\`).join('') + '</tr>';
        });

      // Wrap in paragraphs
      html = '<p>' + html + '</p>';
      
      // Clean up extra paragraph tags
      html = html.replace(/<p><\/p>/g, '');
      html = html.replace(/<p><h([1-6])>/g, '<h$1>');
      html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
      html = html.replace(/<p><pre>/g, '<pre>');
      html = html.replace(/<\/pre><\/p>/g, '</pre>');
      html = html.replace(/<p><table>/g, '<table>');
      html = html.replace(/<\/table><\/p>/g, '</table>');
      
      return html;
    }

    // Parse and render the markdown content
    const markdownContent = \`${markdownContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
    document.getElementById('content').innerHTML = parseMarkdown(markdownContent);
    
    // Highlight code blocks
    if (window.Prism) {
      Prism.highlightAll();
    }
  </script>
</body>
</html>`;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('❌ Error serving API documentation:', error);
    
    // Fallback HTML if markdown file can't be read
    const fallbackHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Succulent API Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      text-align: center;
    }
    .error { color: #dc2626; }
    .back-link {
      display: inline-block;
      margin-top: 20px;
      background: #10b981;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>Succulent API Documentation</h1>
  <div class="error">
    <h2>Documentation Temporarily Unavailable</h2>
    <p>We're working on getting the API documentation back online. Please check back soon!</p>
  </div>
  
  <h2>Quick API Reference</h2>
  <div style="text-align: left; max-width: 600px; margin: 0 auto;">
    <h3>Authentication</h3>
    <p>Include your API key in the header:</p>
    <pre style="background: #f3f4f6; padding: 15px; border-radius: 6px;">X-API-Key: sk_your_api_key_here</pre>
    
    <h3>Create Post</h3>
    <pre style="background: #f3f4f6; padding: 15px; border-radius: 6px;">POST /api/posts
Content-Type: application/json

{
  "accountGroupId": "your-account-group",
  "content": "Your post content here",
  "platforms": ["instagram", "x", "linkedin"]
}</pre>
  </div>
  
  <a href="/" class="back-link">← Back to App</a>
</body>
</html>`;

    return new NextResponse(fallbackHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
} 