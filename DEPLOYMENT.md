# 🚀 Deployment Guide

## GitHub Actions Automatic Deployment

This project uses GitHub Actions to automatically build and deploy to GitHub Pages whenever you push to the `main` branch.

### How It Works

1. **Push to main branch** → Triggers GitHub Actions workflow
2. **Workflow runs** → Installs dependencies, builds the app
3. **Auto-deploy** → Deploys built files to GitHub Pages
4. **Live site** → Your app is automatically available at `https://YOUR_USERNAME.github.io/itinerary-killer/`

### Setup Steps

1. **Create GitHub Repository**
   - Go to GitHub and create a new repository named `itinerary-killer`
   - Make it **Public** (required for free GitHub Pages)

2. **Push Your Code**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/itinerary-killer.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `gh-pages` (this will be created automatically by the workflow)
   - Click Save

4. **That's it!** 🎉
   - Every time you push to `main`, your site will automatically update
   - No manual deployment needed

### Workflow Details

The `.github/workflows/deploy.yml` file:
- Runs on Ubuntu with Node.js 18
- Installs dependencies with `npm ci`
- Builds the app with `npm run build`
- Deploys the `dist` folder to GitHub Pages
- Only deploys from the `main` branch

### Custom Domain (Optional)

If you have a custom domain:
1. Add it to the workflow file in the `cname` field
2. Configure DNS settings as per GitHub's instructions

### Troubleshooting

- **Build fails?** Check the Actions tab in your repository
- **Site not updating?** Wait a few minutes for deployment to complete
- **404 errors?** Make sure the repository is public and Pages is enabled

---

**No more manual deployments! Just push your code and GitHub Actions handles the rest.** 🚀
