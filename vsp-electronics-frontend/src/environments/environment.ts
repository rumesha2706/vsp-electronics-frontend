import { AppConfig } from '../app/config/app.config';

export const environment = {
  production: false,
  apiUrl: AppConfig.apiEndpoint,
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' // Replace with actual Client ID
};
