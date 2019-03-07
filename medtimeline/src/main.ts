// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {AppModule} from './app/app.module';
import * as FhirConfig from './app/fhir_config';
import {environment} from './environments/environment';

if (environment.production) {
  enableProdMode();
}


if (FhirConfig.googleAnalyticsTag) {
  // Global site tag (gtag.js) - Google Analytics
  document.write(
      '  <script async src="https://www.googletagmanager.com/gtag/js?id=' +
      FhirConfig.googleTag + '"></script>');
  document.write(
      '<script>window.dataLayer = window.dataLayer || [];' +
      'function gtag() {dataLayer.push(arguments);} gtag("js", new Date());' +
      'gtag("config", "' + FhirConfig.googleTag + '");</script>');
} else {
  // If there is no Google Analytics Tag found, insert an empty script to
  // prevent errors with user interaction.
  document.write('<script>function gtag() {} </script>');
}

platformBrowserDynamic().bootstrapModule(AppModule).catch(
    err => console.log(err));
