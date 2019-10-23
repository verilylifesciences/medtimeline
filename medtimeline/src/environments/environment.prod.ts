// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
import {environment_file_locations} from './environment_file_locations';

export const environment = {
  production: true,
  useMockServer: false,
  mockDataFolder: '',
  mockDataFiles: [],
  useDebugger: false,
  ...environment_file_locations,
};
