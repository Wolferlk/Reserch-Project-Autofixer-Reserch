# API Integration Guide - Auto Fixer Frontend

This guide explains how to connect the Auto Fixer frontend to your Python backend API.

## Overview

The frontend is designed to work with a Python backend that provides AI-powered error fixing, screenshot analysis, repair shop recommendations, and contact form handling.

## Environment Setup

### 1. Create `.env.local` file

Create a file at the root of your project:

```bash
# Your Python backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
# or for production
NEXT_PUBLIC_API_URL=https://api.autofixer.com
```

### 2. Update Fetch Calls

All API calls are currently commented out in the code. Follow the pattern below to uncomment and update them.

## API Endpoints

### 1. Error Fixer - Fix Text Errors

**File**: `app/error-fixer/page.tsx`

Replace this section (lines 25-45):

```typescript
// Current (disabled):
// const response = await fetch('/api/fix-error', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ error: errorInput })
// })
// const data = await response.json()

// With your API:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fix-error`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: errorInput })
})
const data = await response.json()

// Expected Response Structure:
// {
//   "error": "original error message",
//   "solutions": [
//     {
//       "step": 1,
//       "title": "Step Title",
//       "description": "Description of the step",
//       "action": "Code or action to take"
//     }
//   ]
// }
```

### 2. Screenshot Scanner - Analyze Error Screenshots

**File**: `app/screenshot-scanner/page.tsx`

Replace section (lines 31-48):

```typescript
// Current (disabled):
// const response = await fetch('/api/scan-screenshot', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ image: base64 })
// })
// const data = await response.json()

// With your API:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scan-screenshot`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64 })
})
const data = await response.json()

// Expected Response Structure:
// {
//   "detectedError": "Error name detected in screenshot",
//   "confidence": "94%",
//   "description": "Description of the error",
//   "solutions": [
//     {
//       "title": "Solution Step Title",
//       "steps": ["Step 1", "Step 2", "Step 3"]
//     }
//   ]
// }
```

### 3. Hardware Repair - Find Repair Shops

**File**: `app/hardware-repair/page.tsx`

Replace section (lines 33-51):

```typescript
// Current (disabled):
// const response = await fetch('/api/find-repair-shops', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ 
//     deviceType, 
//     description, 
//     userLocation: 'San Francisco' 
//   })
// })
// const data = await response.json()

// With your API:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/find-repair-shops`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    deviceType, 
    description,
    userLocation: 'user-provided-or-detected-location'
  })
})
const data = await response.json()

// Expected Response Structure:
// {
//   "shops": [
//     {
//       "id": 1,
//       "name": "Shop Name",
//       "rating": 4.8,
//       "reviews": 342,
//       "distance": 0.5,
//       "address": "123 Street, City, State",
//       "phone": "+1 (555) 123-4567",
//       "hours": "Mon-Sat: 9AM-6PM",
//       "specialties": ["Laptop", "Desktop"],
//       "response": "15 min"
//     }
//   ]
// }
```

### 4. Contact Form Submission

**File**: `app/contact/page.tsx`

Replace section (lines 88-94):

```typescript
// Current (disabled):
// const response = await fetch('/api/contact', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(formData)
// })
// const data = await response.json()

// With your API:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})
const data = await response.json()

// Expected Response Structure:
// {
//   "success": true,
//   "message": "Contact form received successfully"
// }
```

## Python Backend Requirements

Your Python backend should implement these endpoints:

### Express-like Framework (Flask/FastAPI)

```python
# Flask example
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/fix-error', methods=['POST'])
def fix_error():
    data = request.json
    error = data.get('error')
    
    # Your AI logic here
    solutions = analyze_error(error)
    
    return jsonify({
        'error': error,
        'solutions': solutions
    })

@app.route('/scan-screenshot', methods=['POST'])
def scan_screenshot():
    data = request.json
    image_base64 = data.get('image')
    
    # Your image analysis logic here
    result = analyze_image(image_base64)
    
    return jsonify(result)

@app.route('/find-repair-shops', methods=['POST'])
def find_repair_shops():
    data = request.json
    device_type = data.get('deviceType')
    description = data.get('description')
    location = data.get('userLocation')
    
    # Your location and shop matching logic
    shops = find_nearby_shops(location, device_type)
    
    return jsonify({'shops': shops})

@app.route('/contact', methods=['POST'])
def contact():
    data = request.json
    
    # Send email or store in database
    save_contact_form(data)
    
    return jsonify({
        'success': True,
        'message': 'Contact form received'
    })
```

## Error Handling

Add error handling to the frontend. Example for Error Fixer:

```typescript
try {
  setIsLoading(true)
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fix-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: errorInput })
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  const data = await response.json()
  setResult(data)
} catch (error) {
  console.error('Error:', error)
  // Show error toast or message to user
  setError(error.message)
} finally {
  setIsLoading(false)
}
```

## CORS Configuration

Your Python backend needs CORS enabled. Example:

```python
# FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://autofixer.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Flask
from flask_cors import CORS
CORS(app, origins=["http://localhost:3000", "https://autofixer.com"])
```

## Testing the Integration

1. **Start your Python backend**:
   ```bash
   python app.py  # or your start command
   ```

2. **Update environment variables**:
   ```bash
   # .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Start the Next.js dev server**:
   ```bash
   npm run dev
   ```

4. **Test each feature**:
   - Go to `/error-fixer` and test error fixing
   - Go to `/screenshot-scanner` and upload an image
   - Go to `/hardware-repair` and search for shops
   - Go to `/contact` and submit a form

5. **Check browser console** for any errors

## Common Issues

### CORS Error
**Problem**: `Cross-Origin Request Blocked`

**Solution**:
1. Enable CORS on your Python backend
2. Add frontend URL to allowed origins
3. Check that `NEXT_PUBLIC_API_URL` is correct

### 404 Error
**Problem**: `404 Not Found`

**Solution**:
1. Verify backend is running
2. Check endpoint paths match exactly
3. Verify `NEXT_PUBLIC_API_URL` environment variable

### Timeout
**Problem**: Requests hang or time out

**Solution**:
1. Check backend is responding
2. Add timeout configuration:
   ```typescript
   const controller = new AbortController()
   const timeoutId = setTimeout(() => controller.abort(), 10000)
   
   const response = await fetch(url, { signal: controller.signal })
   ```

### Response Format Mismatch
**Problem**: Data doesn't display correctly

**Solution**:
1. Verify response structure matches expected format
2. Use TypeScript interfaces for type safety
3. Add console.log to inspect response

## Production Deployment

When deploying to production:

1. **Update environment variable**:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. **Update CORS origins** in Python backend to include production URLs

3. **Enable HTTPS** for all API calls

4. **Add rate limiting** to prevent abuse

5. **Monitor API logs** for errors

## TypeScript Types (Optional)

Create types for API responses:

```typescript
// lib/types.ts

export interface ErrorSolution {
  step: number
  title: string
  description: string
  action: string
}

export interface FixErrorResponse {
  error: string
  solutions: ErrorSolution[]
}

export interface ScanScreenshotResponse {
  detectedError: string
  confidence: string
  description: string
  solutions: Array<{
    title: string
    steps: string[]
  }>
}

export interface RepairShop {
  id: number
  name: string
  rating: number
  reviews: number
  distance: number
  address: string
  phone: string
  hours: string
  specialties: string[]
  response: string
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}
```

Then use in components:

```typescript
const response = await fetch(url)
const data: FixErrorResponse = await response.json()
```

## Support

For API integration help:
- Check Python backend logs
- Use browser DevTools Network tab to inspect requests
- Verify request/response format matches expectations
- Test endpoints with Postman or curl first

Good luck with your integration! 🚀
