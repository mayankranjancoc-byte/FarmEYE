# Deploying FarmEYE to Vercel

This guide walks through deploying FarmEYE to Vercel for the hackathon demo.

## Prerequisites

- Vercel account ([sign up free](https://vercel.com/signup))
- GitHub account (optional, but recommended)

## Method 1: Vercel CLI (Fastest)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### Step 3: Deploy

From the `farmeye` directory:

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → farmeye (or your choice)
- **Directory?** → ./

The CLI will build and deploy your app. You'll get a URL like:
```
https://farmeye-xxxxx.vercel.app
```

### Step 4: Production Deployment

For the production URL:

```bash
vercel --prod
```

## Method 2: GitHub Integration (Recommended for Continuous Deployment)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: FarmEYE livestock monitoring"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/farmeye.git
git push -u origin main
```

### Step 2: Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `farmeye` repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or `farmeye` if in subdirectory)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

5. Click "Deploy"

Vercel will:
- Build your app
- Run TypeScript checks
- Deploy to production
- Give you a live URL

### Step 3: Set Up Auto-Deploy

Every push to `main` will automatically deploy. Create a `dev` branch for testing:

```bash
git checkout -b dev
git push origin dev
```

In Vercel dashboard, you can configure preview deployments for all branches.

## Environment Variables

If you need environment variables (none required for this version):

### Via CLI:
```bash
vercel env add NEXT_PUBLIC_APP_NAME
```

### Via Dashboard:
1. Go to project settings
2. Click "Environment Variables"
3. Add variables

## Vercel Configuration

Create `vercel.json` in project root (optional):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

## Edge Runtime Compatibility

All API routes in FarmEYE are Edge-compatible:
- ✅ No Node.js-specific APIs
- ✅ No file system access
- ✅ No long-running processes
- ✅ In-memory data store (resets per instance)

## Build Checks

Before deploying, verify locally:

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Test production build
npm start
```

## Troubleshooting

### Build Fails
**Error**: TypeScript errors
**Fix**: Run `npm run build` locally and fix all errors

**Error**: Module not found
**Fix**: Ensure all imports use `@/` alias correctly

### Runtime Errors
**Error**: Data not persisting
**Expected**: In-memory store resets on deployment (by design)

**Error**: API route timeout
**Fix**: All routes are optimized for edge; check for long-running code

### CSS Warnings
**Warning**: `@import` rules order
**Impact**: None (cosmetic warning only)
**Fix**: Optional - can be ignored for hackathon

## Custom Domain (Optional)

1. Go to project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Performance Tips

- **Static Generation**: Dashboard and pages are pre-rendered
- **API Routes**: Run on Vercel Edge Network
- **CDN**: All assets served via Vercel CDN
- **Caching**: Automatic caching of static pages

## Monitoring

Vercel provides:
- **Analytics**: Free analytics dashboard
- **Logs**: Real-time function logs
- **Error Tracking**: Automatic error detection

Access in project dashboard → Analytics/Logs tabs

## Demo URL Structure

After deployment, you'll have:
- **Production**: `https://farmeye.vercel.app`
- **Previews**: `https://farmeye-git-BRANCH.vercel.app`
- **Development**: `http://localhost:3000`

## Security Notes

For hackathon demo:
- ✅ No authentication required
- ✅ No database credentials
- ✅ No API keys needed
- ✅ Safe to share URL publicly

For production deployment:
- Add authentication
- Use real database
- Add rate limiting
- Enable security headers

## Post-Deployment Testing

Test all features on live URL:

1. ✅ Dashboard loads
2. ✅ Animals page displays
3. ✅ Corridor simulation works
4. ✅ Alerts are generated
5. ✅ Animal detail pages load
6. ✅ Navigation works

## Vercel Limits (Free Tier)

- **Bandwidth**: 100GB/month
- **Builds**: 6000 minutes/month
- **Serverless Functions**: 100GB-hours
- **Edge Functions**: Unlimited

Perfect for hackathon demos!

## Support Resources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

---

**You're all set! 🚀**

Share your FarmEYE demo URL with judges and showcase the power of Livestock Gemini AI!
