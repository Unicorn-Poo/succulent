This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Gelato Template Import Feature

## Overview

Since Gelato doesn't provide a "list all templates" endpoint, we've created an import feature where users can paste specific template IDs to import templates into their Jazz accounts.

## API Endpoints

### Get Product Catalog (Template Bases)
```bash
POST /api/gelato-templates
Content-Type: application/json

{
  "apiKey": "your-gelato-api-key",
  "storeId": "optional-store-id"
}
```

### Import Specific Template ✅ **FIXED**
```bash
POST /api/gelato-templates
Content-Type: application/json

{
  "apiKey": "your-gelato-api-key",
  "action": "import",
  "templateId": "your-template-id",
  "saveToJazzAccount": true,
  "jazzAccountId": "your-jazz-account-id"
}
```

**Now uses the official Gelato API endpoint:**
`GET https://ecommerce.gelatoapis.com/v1/templates/{templateId}`

## How It Works

### 1. Template Discovery
Since Gelato doesn't provide template listing, users need to:
- **Find template IDs** in their Gelato dashboard
- **Copy the template ID** from the template URL or details page
- **Use the import feature** to fetch specific templates

### 2. Template Import Process
1. **Paste template ID** into the import dialog
2. **API fetches template** from official Gelato endpoint
3. **Template processed** with all variants, sizes, and print areas
4. **Auto-saved to Jazz account** (if enabled)

### 3. Troubleshooting Template Import
If import fails:
- ✅ **Check template ID** - ensure it's correct
- ✅ **Verify API key** - ensure it has template access
- ✅ **Check template ownership** - must belong to your account
- ✅ **Template exists** - verify it's not deleted

## Example Usage

### Frontend Implementation
```javascript
// Import a specific template
async function importTemplate(templateId, jazzAccountId) {
  const response = await fetch('/api/gelato-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: process.env.GELATO_API_KEY,
      action: 'import',
      templateId: templateId,
      saveToJazzAccount: true,
      jazzAccountId: jazzAccountId
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Template imported:', result.template.name);
    console.log('Jazz save result:', result.jazzSaveResult);
  } else {
    console.error('Import failed:', result.error);
  }
}

// Get product catalog (template bases)
async function getProductCatalog() {
  const response = await fetch('/api/gelato-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: process.env.GELATO_API_KEY
    })
  });
  
  const result = await response.json();
  return result.products; // Array of product template bases
}
```

### Response Examples

#### Successful Import
```json
{
  "success": true,
  "action": "import",
  "template": {
    "id": "template-123",
    "gelatoTemplateId": "abc-def-123",
    "name": "Custom T-Shirt Template",
    "description": "High-quality custom t-shirt",
    "productType": "apparel",
    "variants": [...],
    "importedAt": "2024-01-15T10:30:00Z",
    "jazzMetadata": {
      "imported": true,
      "source": "gelato",
      "templateType": "ecommerce"
    }
  },
  "jazzSaveResult": {
    "success": true,
    "jazzTemplateId": "jazz-template-456",
    "message": "Template saved to Jazz account successfully"
  }
}
```

#### Template Not Found
```json
{
  "success": false,
  "error": "Template not found",
  "message": "Could not fetch template with ID: invalid-id",
  "troubleshooting": {
    "reasons": [
      "Template ID might be incorrect or not exist",
      "API key might not have access to this template",
      "Template might be private or deleted"
    ],
    "solutions": [
      "Double-check the template ID",
      "Ensure your API key has the correct permissions",
      "Check if the template exists in your Gelato dashboard"
    ]
  }
}
```

## Environment Variables

Add these to your `.env` file:
```bash
GELATO_API_KEY=your-gelato-api-key
JAZZ_API_BASE_URL=https://api.jazz.tools  # Optional, defaults to this
JAZZ_API_KEY=your-jazz-api-key  # Required for saving to Jazz accounts
```

## Limitations

1. **No Template Listing**: Gelato doesn't provide an endpoint to list all templates
2. **Template ID Required**: Users must know the specific template ID to import
3. **API Access**: Templates might be private or require specific permissions
4. **Jazz Integration**: Currently uses placeholder Jazz API endpoints

## Future Enhancements

- [ ] Template ID validation
- [ ] Batch template import
- [ ] Template preview generation
- [ ] Better Jazz API integration
- [ ] Template search by product type
- [ ] Cache frequently used templates
