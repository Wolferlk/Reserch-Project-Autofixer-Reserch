# Auto Fixer - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### 1. Install & Run
```bash
npm install
npm run dev
```
Visit: http://localhost:3000

### 2. Explore the App
- 🏠 **Homepage** - See all features and YouTube demo
- ⚡ **Error Fixer** - Fix errors by typing messages
- 📸 **Screenshot** - Upload error screenshots
- 📚 **Tutorials** - Browse 500+ tutorials
- 🔧 **Hardware** - Find repair shops
- ℹ️ **About** - Learn about Auto Fixer
- 📞 **Contact** - Get in touch

### 3. Connect Your Backend
See `API_INTEGRATION_GUIDE.md` for detailed steps.

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout + Header/Footer |
| `app/page.tsx` | Homepage |
| `app/globals.css` | Design system & animations |
| `components/Header.tsx` | Navigation |
| `components/Footer.tsx` | Footer |
| `package.json` | Dependencies |

---

## 🎨 Customization Cheatsheet

### Change Primary Color
Edit `app/globals.css`:
```css
:root {
  --primary-cyan: #00d9ff;  /* Change to your color */
}
```

### Update Company Info
Edit in `Footer.tsx` and `Contact.tsx`:
- Email: support@autofixer.com
- Phone: +1 (555) 123-4567
- Address: San Francisco, CA

### Add New Page
1. Create `app/[name]/page.tsx`
2. Add to Header navigation
3. Copy animation pattern from existing pages

---

## 🔌 API Integration Quick Setup

### 1. Add Environment Variable
Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Find API Calls
Search for `// const response = await fetch` in:
- `app/error-fixer/page.tsx` (line ~35)
- `app/screenshot-scanner/page.tsx` (line ~35)
- `app/hardware-repair/page.tsx` (line ~35)
- `app/contact/page.tsx` (line ~90)

### 3. Uncomment & Update
Replace the mock code with your API endpoints.

### 4. Test
Go to each page and test the forms.

---

## 📱 Page Breakdown

### Homepage (/)
- Hero section
- YouTube video
- Feature showcase
- Stats
- CTA button

### Error Fixer (/error-fixer)
- Left: Input form
- Right: Solutions display
- API: POST /fix-error

### Screenshot Scanner (/screenshot-scanner)
- Left: File upload
- Right: Analysis results
- API: POST /scan-screenshot

### Tutorials (/tutorials)
- Search bar
- Category filter
- Tutorial grid
- No API needed (mock data)

### Hardware Repair (/hardware-repair)
- Left: Form
- Right: Shop listings
- API: POST /find-repair-shops

### About (/about)
- Mission statement
- Values
- Timeline
- Team
- Stats

### Contact (/contact)
- Contact form
- Contact info cards
- FAQ
- API: POST /contact

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 🎯 Color Palette

```css
Cyan:    #00d9ff (primary)
Blue:    #0066ff (secondary)
Purple:  #9d4edd (accent)
Pink:    #ff006e (accent)
Dark:    #0a0e27 (background)
```

---

## 📦 Dependencies

- **next**: 16.1.6
- **react**: 19.2.4
- **tailwindcss**: 4.2.0
- **framer-motion**: 11.0.0 (animations)
- **lucide-react**: 0.564.0 (icons)

---

## ⚡ Optimization Tips

1. **Images**: Use Next.js Image component
2. **Animations**: Already optimized with Framer Motion
3. **CSS**: Tailwind tree-shakes unused styles
4. **Bundle**: Code split with dynamic imports
5. **SEO**: Metadata already configured

---

## 🐛 Common Issues

### Port 3000 in use?
```bash
npm run dev -- -p 3001
```

### CORS errors?
1. Check `NEXT_PUBLIC_API_URL` is set
2. Backend must have CORS enabled
3. Allowed origins must include `http://localhost:3000`

### Animations stuttering?
1. Check browser GPU acceleration
2. Reduce animation complexity
3. Profile with Chrome DevTools

### API not working?
1. Backend must be running
2. Check endpoint paths
3. Use browser DevTools Network tab

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Other Options
- Netlify: Connect GitHub repo
- Railway: `railway deploy`
- Render: Connect GitHub repo
- Any Node.js hosting

### Environment Variables
Set in your deployment platform:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 📞 Support Files

- **README.md** - Full documentation
- **API_INTEGRATION_GUIDE.md** - Backend setup
- **BUILD_SUMMARY.md** - What's included
- **COMPLETION_CHECKLIST.md** - Full checklist

---

## ✅ Pre-Launch Checklist

- [ ] Dependencies installed
- [ ] App runs locally
- [ ] All pages accessible
- [ ] Animations smooth
- [ ] No console errors
- [ ] Backend API ready
- [ ] Environment variables set
- [ ] Content updated
- [ ] Branding customized
- [ ] Ready to deploy!

---

## 🎉 You're All Set!

Your Auto Fixer app is ready to go. Start with `npm run dev` and begin customizing!

---

**Next Steps:**
1. Run: `npm install && npm run dev`
2. Visit: http://localhost:3000
3. Customize: Update colors, content, branding
4. Connect: Add your Python backend APIs
5. Deploy: Push to Vercel/Netlify

Happy coding! 🚀
