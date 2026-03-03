# Auto Fixer - AI-Powered Error Fixing Platform

A modern, sleek web application for fixing errors with artificial intelligence. Auto Fixer helps users diagnose technical problems, learn solutions through tutorials, and find repair services.

## 🚀 Features

### 1. **Fix Error Text** (`/error-fixer`)
- Type or paste error messages
- Get instant AI-powered solutions with step-by-step fixing instructions
- Learn how to resolve the issue properly
- Connected to Python backend for error analysis

### 2. **Screenshot Scanner** (`/screenshot-scanner`)
- Upload error screenshots
- AI recognizes and analyzes error messages from images
- Provides detailed solutions based on visual error detection
- Supports PNG, JPG, GIF formats

### 3. **Learning Tutorials** (`/tutorials`)
- Browse 500+ comprehensive tutorials
- Search by application or topic
- Filter by skill level (Beginner, Intermediate, Advanced)
- Categories: Photoshop, Illustrator, VS Code, Windows, macOS, Chrome, and more

### 4. **Hardware & Repair Shops** (`/hardware-repair`)
- Diagnose hardware issues
- Find verified repair shops near you
- View ratings, reviews, and response times
- Direct contact and directions to local repair services

### 5. **About Us** (`/about`)
- Company mission and values
- Team information
- Journey timeline
- Impact statistics

### 6. **Contact Us** (`/contact`)
- Contact form for inquiries
- FAQ section
- Multiple contact channels
- Social media links

## 🎨 Design System

### Color Palette
- **Primary Cyan**: `#00d9ff`
- **Primary Dark**: `#00a8cc`
- **Accent Pink**: `#ff006e`
- **Accent Purple**: `#9d4edd`
- **Background Primary**: `#0a0e27`
- **Background Secondary**: `#1a1f3a`

### Typography
- **Headers**: Inter Bold (700-800 weight)
- **Body**: Inter Regular (400-500 weight)
- **Code**: Space Mono (for technical content)

### Effects
- Glassmorphism cards with backdrop blur
- Smooth animations with Framer Motion
- Neon glow shadows
- Gradient text and buttons
- Floating animations

## 📁 Project Structure

```
app/
├── layout.tsx              # Root layout with Header & Footer
├── page.tsx                # Homepage
├── globals.css             # Global styles and design system
├── error-fixer/
│   └── page.tsx            # Error fixer feature
├── screenshot-scanner/
│   └── page.tsx            # Screenshot upload & analysis
├── tutorials/
│   └── page.tsx            # Tutorial library
├── hardware-repair/
│   └── page.tsx            # Hardware repair finder
├── about/
│   └── page.tsx            # About us page
└── contact/
    └── page.tsx            # Contact us page

components/
├── Header.tsx              # Navigation header
└── Footer.tsx              # Footer with links

public/
└── auto-fixer-logo.jpg     # App logo
```

## 🔧 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Font**: Google Fonts (Inter, Space Mono)

## 📦 Dependencies

```json
{
  "next": "16.1.6",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.564.0",
  "tailwindcss": "^4.2.0"
}
```

## 🚀 Getting Started

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

The app is a **frontend-only application** that connects to your Python backend. Configure these environment variables for API integration:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000  # Your Python backend URL
```

## 🔌 API Integration Points

Connect these endpoints to your Python backend:

### 1. Error Fixer API
- **Endpoint**: `POST /api/fix-error`
- **Body**: `{ error: string }`
- **Response**: `{ solutions: Array<Solution> }`

### 2. Screenshot Scanner API
- **Endpoint**: `POST /api/scan-screenshot`
- **Body**: `{ image: base64_string }`
- **Response**: `{ detectedError: string, confidence: number, solutions: Array }`

### 3. Hardware Repair API
- **Endpoint**: `POST /api/find-repair-shops`
- **Body**: `{ deviceType: string, description: string, userLocation: string }`
- **Response**: `{ shops: Array<RepairShop> }`

### 4. Contact Form API
- **Endpoint**: `POST /api/contact`
- **Body**: `{ name, email, phone, subject, message }`
- **Response**: `{ success: boolean, message: string }`

## 🎯 Pages Overview

### Homepage (`/`)
- Hero section with call-to-action
- YouTube embedded demo video
- Feature cards with animations
- Statistics section
- Trust indicators

### Error Fixer (`/error-fixer`)
- Text input area for error messages
- Quick example suggestions
- Step-by-step solution display
- Additional resources section

### Screenshot Scanner (`/screenshot-scanner`)
- Drag-and-drop file upload
- Image preview
- Error detection results
- Multi-step solution guides

### Tutorials (`/tutorials`)
- Search functionality
- Category filtering
- Tutorial cards with metadata
- Duration, level, and view count

### Hardware Repair (`/hardware-repair`)
- Device type selector
- Issue description form
- Repair shop listings with ratings
- Contact and direction buttons

### About Us (`/about`)
- Company mission
- Core values
- Timeline of achievements
- Team member profiles
- Impact statistics

### Contact Us (`/contact`)
- Contact form with validation
- Contact information display
- FAQ section with collapsible items
- Social media links

## 🎨 Customization

### Change Primary Color
Edit variables in `app/globals.css`:
```css
:root {
  --primary-cyan: #00d9ff;    /* Change this */
  --primary-cyan-dark: #00a8cc;
  /* ... */
}
```

### Add New Features
1. Create new page in `app/[feature-name]/page.tsx`
2. Add navigation link in `Header.tsx`
3. Follow the existing component pattern with Framer Motion animations

### Update Content
- Edit mock data in component files
- Update contact information in `Footer.tsx` and `Contact.tsx`
- Replace API endpoints when connecting to backend

## 📱 Responsive Design

The application is fully responsive with breakpoints:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

All components use Tailwind's responsive prefixes (md:, lg:, etc.)

## ♿ Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast meets WCAG standards
- Screen reader friendly

## 🔐 Security

- No sensitive data stored in localStorage
- Backend API calls for authentication (when integrated)
- Input validation on forms
- CORS configuration ready
- XSS protection via React

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy with one click

```bash
vercel deploy
```

### Other Platforms
Works with any Node.js hosting platform (Netlify, Railway, Render, etc.)

## 📊 Performance

- Optimized images with Next.js Image component
- Code splitting with dynamic imports
- Efficient animations with Framer Motion
- CSS-in-JS with Tailwind (optimized builds)
- Fast initial load time

## 🐛 Troubleshooting

### API Calls Not Working
- Check that your Python backend is running
- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check CORS settings on backend

### Animations Stuttering
- Ensure GPU acceleration is enabled
- Reduce animation complexity if needed
- Check browser console for warnings

### Styling Issues
- Clear `.next` folder: `rm -rf .next`
- Rebuild: `npm run build`
- Verify Tailwind CSS is properly configured

## 📝 License

© 2024 Auto Fixer. All rights reserved.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for any suggestions.

## 📞 Support

For support, email: support@autofixer.com

---

**Built with ❤️ using Next.js, React, and Tailwind CSS**
