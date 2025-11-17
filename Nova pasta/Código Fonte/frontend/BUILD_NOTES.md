# Build Instructions

## Important Notes

### Node.js Version Compatibility
- **Recommended**: Node.js 18.x - 20.x
- **Not Compatible**: Node.js 25.x (has localStorage implementation changes that break the build)

### Build Process

#### Local Development (Windows)
```bash
npm install
npm start
```

#### Production Build
```bash
npm run build
```

The build files will be generated in the `build/` directory.

### Troubleshooting

If you encounter localStorage-related build errors with Node.js 25+:
1. Downgrade to Node.js 20.x LTS
2. Or use the build workaround scripts in the project history

### Environment Variables

Create a `.env` file for production:
```
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

### Deployment

The `build/` directory contains all static files ready for deployment to:
- Static hosting services
- CDN
- Web servers (Nginx, Apache)

### Dependencies

All required dependencies are included in package.json. The localStorage polyfill in `src/setupStorage.js` ensures compatibility across different Node.js versions during build.