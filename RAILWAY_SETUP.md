# Railway Setup Guide

This guide will help you deploy this NGINX File Manager to Railway with the required storage mount.

## Prerequisites

- A Railway account (sign up at [railway.app](https://railway.app))
- Railway CLI (optional, but recommended)

## Step-by-Step Deployment

### 1. Deploy the Template

**Option A: Using the Deploy Button**
- Click the "Deploy on Railway" button in the README
- This will create a new project from the template

**Option B: Using Railway CLI**
```bash
railway login
railway init
railway up
```

### 2. Add Storage Volume (REQUIRED)

The application requires a persistent storage volume mounted at `/www` to store uploaded files and static site content.

**Via Railway Dashboard:**
1. Go to your Railway project dashboard
2. Select your service
3. Click on **Settings** tab
4. Scroll down to **Volumes** section
5. Click **+ New Volume** or **Add Volume**
6. Configure the volume:
   - **Mount Path**: `/www`
   - **Volume Name**: `www-storage` (or any name you prefer)
7. Click **Add** or **Create**

**Via Railway CLI:**
```bash
railway volume create www-storage
railway volume mount www-storage --mount-path /www
```

### 3. Configure Environment Variables

Go to your service **Variables** tab and add:

**Required Variables:**
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<your-bcrypt-hash>
SESSION_SECRET=<random-secret-string>
BACKEND_PORT=5000
```

**Generate Password Hash:**
```bash
node generate-password.js your-secure-password
```

**Generate Session Secret:**
```bash
openssl rand -hex 32
```

### 4. Deploy

Railway will automatically:
- Build your Docker image
- Deploy the service
- Mount the volume at `/www`

### 5. Access Your Application

Once deployed:
- **Public Site**: `https://your-app.railway.app/`
- **Admin Panel**: `https://your-app.railway.app/admin.html`

## Initial Setup

After deployment:
1. Access the admin panel at `/admin.html`
2. Log in with your configured credentials
3. Upload your initial site files using the admin interface
4. Files will be stored in the `/www` volume and persist across deployments

## Troubleshooting

### Volume Not Mounted
If you see errors about `/www` not existing:
- Verify the volume is created and mounted in Railway dashboard
- Check that the mount path is exactly `/www`
- Restart the service after adding the volume

### Files Not Persisting
- Ensure the volume is properly mounted
- Check that files are being uploaded to `/www` (not `/site`)
- Verify volume size limits in Railway dashboard

### Admin Panel Not Accessible
- Check that `ADMIN_PASSWORD_HASH` is set correctly
- Verify `SESSION_SECRET` is configured
- Check Railway logs for authentication errors

## Volume Management

### View Volume Contents
The volume contents are managed through the admin interface. You can:
- Upload files via the admin panel
- Edit files directly in the browser
- Delete files (except `index.html`)

### Backup Volume
To backup your volume:
1. Use Railway's volume export feature (if available)
2. Or download files via the admin interface
3. Or use Railway CLI to access the volume

### Volume Size
Railway volumes have size limits based on your plan. Check your Railway dashboard for current usage and limits.

## Notes

- The `/www` volume is **required** for the application to function
- Files uploaded through the admin interface are stored in `/www`
- The admin interface itself (`admin.html`) is served from a separate location and cannot be edited
- All static site content should be uploaded to `/www` via the admin interface
