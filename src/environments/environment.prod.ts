import { AppConfig } from '../app/config/app.config';

export const environment = {
  production: true,
  apiUrl: AppConfig.prodApiEndpoint,
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
};
