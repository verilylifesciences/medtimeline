// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file can be replaced during build by using the `fileReplacements`
// array.// `ng build ---prod` replaces `environment.ts` with
// `environment.prod.ts`. The list of file replacements can be found in
// `angular.json`.

export const environment = {
  production: false,
  useMockServer: false,
  mockDataFolder: '',
  mockDataFiles: []
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
