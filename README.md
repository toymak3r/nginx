# NGINX File Manager

A static site deployment with NGINX that includes an admin interface for editing and uploading files.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/o3MbZe)

## ✨ Features

- NGINX static site hosting
- Admin interface with authentication
- Edit HTML and other files through web interface
- Upload files to replace or add to the site
- Session-based authentication

## 🚀 Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create a `.env` file):
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<generate-hash-using-script-below>
SESSION_SECRET=your-secret-key-change-this
PORT=3000
```

3. Generate a password hash:
```bash
node generate-password.js your-password
```

4. Build and run with Docker:
```bash
docker build -t nginx-file-manager .
docker run -p 80:80 --env-file .env nginx-file-manager
```

5. Access the site:
   - Public site: http://localhost/
   - Admin panel: http://localhost/admin.html

### Configuration

The admin credentials are configured via environment variables:

- `ADMIN_USERNAME`: The username for admin login (default: "admin")
- `ADMIN_PASSWORD_HASH`: Bcrypt hash of the password (required)
- `SESSION_SECRET`: Secret key for session encryption (required)
- `PORT`: Port for Node.js backend (default: 3000)

### Generate Password Hash

To generate a password hash, use the provided script:

```bash
node generate-password.js my-secure-password
```

Or use Node.js directly:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 10).then(hash => console.log(hash));"
```

## 📝 Admin Features

Once logged in at `/admin.html`, you can:

1. **Edit Files**: Select any file from the list and edit its content directly in the browser
2. **Upload Files**: Upload new files or replace existing ones
3. **Delete Files**: Remove files (except `index.html` which is protected)

## 🔒 Security Notes

- Change the default `SESSION_SECRET` in production
- Use strong passwords and keep the password hash secure
- The admin interface is protected by session-based authentication
- File operations are restricted to the `site/` directory to prevent path traversal attacks

## 📁 Project Structure

```
.
├── Dockerfile          # Container configuration
├── nginx.conf          # NGINX configuration with API proxy
├── server.js           # Node.js backend server
├── package.json        # Node.js dependencies
├── start.sh            # Startup script for both services
├── site/               # Static site files
│   ├── index.html      # Main site page
│   ├── admin.html      # Admin interface
│   └── ...             # Other static files
└── README.md           # This file
```

## 💁‍♀️ How it works

- NGINX serves static files from the `site/` directory
- API requests to `/api/*` are proxied to the Node.js backend
- The backend handles authentication, file reading, editing, and uploading
- File changes are written directly to the `site/` directory
