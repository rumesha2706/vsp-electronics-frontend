import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './src/app/app.component';
import { appConfig } from './src/app/app.config';
import { mergeApplicationConfig } from '@angular/core';
import { serverConfig } from './src/app/app.config.server';

const bootstrap = () => bootstrapApplication(AppComponent, mergeApplicationConfig(appConfig, serverConfig));

export default bootstrap;
