# VSP Electronics Frontend

Angular 17 frontend application for VSP Electronics e-commerce platform.

## Prerequisites

- Node.js 18.0.0+
- npm or yarn
- Angular CLI 17+

## Installation

```bash
npm install
```

## Development Server

Run the development server:
```bash
npm start
```

Navigate to `http://localhost:4200/`

## Build

Build for production:
```bash
npm run build
```

Build output will be generated in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── app/           # Angular components, services, modules
│   ├── assets/        # Static assets (images, fonts, etc.)
│   ├── environments/  # Environment configuration
│   ├── styles.css     # Global styles
│   ├── main.ts        # Application entry point
│   └── index.html     # Main HTML file
├── public/            # Public assets
├── angular.json       # Angular CLI configuration
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies
```

## Configuration

### Development

Development settings are in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

### Production

Production settings are in `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api'
};
```

## Vercel Deployment

### Option 1: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Option 2: GitHub Integration

1. Push frontend code to GitHub repository
2. Connect repository to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist/vsp-electronics`
5. Add environment variables in Vercel dashboard:
   - `NG_API_URL` - Backend API URL

## GitHub Setup

Initialize git repository:
```bash
git init
git add .
git commit -m "Initial commit: Frontend Application"
git remote add origin https://github.com/yourusername/vsp-electronics-frontend.git
git push -u origin main
```

## Testing

Run unit tests:
```bash
ng test
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure the API backend is configured to accept requests from your frontend domain.

### Build Errors
Clear cache and rebuild:
```bash
rm -rf node_modules dist
npm install
npm run build
```
