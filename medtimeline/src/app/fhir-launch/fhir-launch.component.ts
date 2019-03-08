// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'fhirclient';
import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Router} from '@angular/router';

import {environment} from '../../environments/environment';

import * as FhirConfig from './../fhir_config.js';

/* Type definition for SMART on FHIR client (from assets/fhir-client.min.js) */
declare var FHIR: any;

@Component({
  selector: 'app-fhir-launch',
  templateUrl: './fhir-launch.component.html',
  styleUrls: ['./fhir-launch.component.css']
})

export class FhirLaunchComponent implements OnInit {
  error = false;

  private scope: string = [
    'launch', 'patient/Observation.read', 'patient/Patient.read',
    'patient/MedicationOrder.read', 'patient/MedicationAdministration.read',
    'patient/DocumentReference.read', 'patient/DocumentReference.write',
    'patient/Encounter.read'
  ].join(' ');

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    if (environment.useMockServer) {
      this.router.navigate(['']);
    } else {
      const clientId = FhirConfig.credentials.client_id;
      if (!clientId) {
        this.error = true;
      } else {
        FHIR.oauth2.authorize({
          'client_id': clientId,
          'scope': this.scope,
          'redirect_uri': FhirConfig.url.redirectURL
        });
      }
    }
  }
}
