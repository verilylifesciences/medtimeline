// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'fhirclient';

import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCheckboxModule, MatDatepickerModule, MatDialogModule, MatDividerModule, MatExpansionModule, MatGridListModule, MatListModule, MatMenuModule, MatNativeDateModule, MatProgressSpinnerModule, MatRadioModule, MatSnackBarModule, MatStepperModule, MatToolbarModule, MatTooltipModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {BrowserModule} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {ChartsModule} from 'ng2-charts';
import {DragulaModule} from 'ng2-dragula';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {environment} from '../environments/environment';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {CardcontainerComponent} from './cardcontainer/cardcontainer.component';
import {CardComponent} from './cardtypes/card/card.component';
// tslint:disable-next-line:max-line-length
import {CustomizableTimelineDialogComponent} from './cardtypes/customizable-timeline/customizable-timeline-dialog/customizable-timeline-dialog.component';
import {CustomizableTimelineComponent} from './cardtypes/customizable-timeline/customizable-timeline.component';
import {MultiGraphCardComponent} from './cardtypes/multigraphcard/multigraphcard.component';
import {TextboxcardComponent} from './cardtypes/textboxcard/textboxcard.component';
import {ResourceCodeCreator} from './conceptmappings/resource-code-creator';
import {ResourceCodeManager} from './conceptmappings/resource-code-manager';
import {DataSelectorElementComponent} from './data-selector-element/data-selector-element.component';
import {DataSelectorMenuComponent} from './data-selector-menu/data-selector-menu.component';
import {DebuggerComponent} from './debugger/debugger.component';
import {ConfirmSaveComponent} from './dialogs/confirm-save/confirm-save.component';
import {DeleteDialogComponent} from './dialogs/delete-dialog/delete-dialog.component';
import {HelpDialogComponent} from './dialogs/help-dialog/help-dialog.component';
import {IfuDialogComponent} from './dialogs/ifu-dialog/ifu-dialog.component';
import {FhirHttpService} from './fhir-server/fhir-http.service';
import {FhirLaunchComponent} from './fhir-server/fhir-launch/fhir-launch.component';
import {FhirService} from './fhir-server/fhir.service';
import {MockFhirService} from './fhir-server/mock-fhir.service';
import {SMART_ON_FHIR_CLIENT} from './fhir-server/smart-on-fhir-client';
import {CustomizableGraphComponent} from './graphs/graphtypes/customizable-graph/customizable-graph.component';
import {DiagnosticGraphComponent} from './graphs/graphtypes/diagnostic-graph/diagnostic-graph.component';
import {DiagnosticGraphDialogComponent} from './graphs/graphtypes/diagnostic-graph/diagnostic-graph.dialog.component';
import {LineGraphComponent} from './graphs/graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from './graphs/graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from './graphs/graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from './graphs/graphtypes/stepgraph/stepgraph.component';
import {SetupComponent} from './setup/setup.component';
import {TimelineControllerComponent} from './time-navigation/timeline-controller/timeline-controller.component';
import {TimelineToolbarComponent} from './time-navigation/timeline-toolbar/timeline-toolbar.component';

@NgModule({
  declarations: [
    AppComponent,
    FhirLaunchComponent,
    CardcontainerComponent,
    TextboxcardComponent,
    LineGraphComponent,
    ScatterplotComponent,
    StepGraphComponent,
    MultiGraphCardComponent,
    TimelineControllerComponent,
    CustomizableTimelineComponent,
    CustomizableGraphComponent,
    CustomizableTimelineDialogComponent,
    MicrobioGraphComponent,
    DiagnosticGraphComponent,
    TimelineToolbarComponent,
    DataSelectorElementComponent,
    DataSelectorMenuComponent,
    HelpDialogComponent,
    CardComponent,
    DeleteDialogComponent,
    DebuggerComponent,
    SetupComponent,
    ConfirmSaveComponent,
    IfuDialogComponent,
    DiagnosticGraphDialogComponent,
  ],
  imports: [
    BrowserModule,
    NgbModule,
    MatCardModule,
    MatGridListModule,
    HttpClientModule,
    MatListModule,
    MatDividerModule,
    MatIconModule,
    NoopAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatMenuModule,
    MatTooltipModule,
    FlexLayoutModule.withConfig({useColumnBasisZero: false}),
    MatDialogModule,
    MatStepperModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatDatepickerModule,
    NgxDaterangepickerMd.forRoot({}),
    MatButtonToggleModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatRadioModule,
    ChartsModule,
    DragulaModule.forRoot(),
    AppRoutingModule,
    MatExpansionModule,
  ],
  providers: [
    ResourceCodeCreator,
    ResourceCodeManager,
    // This sets up a provider for the smart on fhir client defined by
    // assets/fhir-client.min.js (defined as symbol `FHIR`) so that it can be
    // injected into the service that uses it to allow for easier testing.
    {provide: SMART_ON_FHIR_CLIENT, useValue: FHIR},
    {
      provide: FhirService,
      useClass: environment.useMockServer ? MockFhirService : FhirHttpService
    },

    {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS},
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    CustomizableTimelineDialogComponent, HelpDialogComponent,
    DeleteDialogComponent, ConfirmSaveComponent, IfuDialogComponent,
    DiagnosticGraphDialogComponent
  ]
})
export class AppModule {
}
