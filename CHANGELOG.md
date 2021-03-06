# MedTimeLine Changelog

## Disclaimer
Verily is not responsible for changes to the code or IFU beyond Verily’s
original submission: MedTimeLine v1.0.1.0, commit number 3f17565ee6549a97b9be164c1eeb19be174e7e07.

## Versions

### 2.3.0.0
* Update error message.
* Update antiviral and antifungal generic RxNorm codes
* Add generic antibiotics to configurations.

### 2.2.1.0
* Turn off optimization for the prod build. It breaks Cerner deployment.

### 2.2.0.0
* Fix IE setup screen style (attempt 2)
* Tweak a few configurations for an optimized build suitable for IE10/11.
* Pre-parse encounters and discard those that don't fall within the app timespan.

### 2.1.0.0

* Correct all linter errors.
* Fix e2e tests for customizable timeline.
* Reduce Min height for step graphs to match other graphs
* Put medication monitoring on the same axis
* Fix E2E Tests
* Small bug fix in line breaks for long axis labels
* Tighten up vertical space by giving less margin within the chart.
* Save vertical space by tightening spacing between cards.
* Adjust left padding for y axis since the wrapping changed slightly.
* Save vertical space by making slightly smaller graphs and condensing down the tick labels.
* A couple small bugfixes.
* Dynamically adjust height of step graphs
* Add coverage for resource-code-creator.
* Add test concept configurations.
* Fix dependency injection for unit tests. Add basic test for resource-code-creator.
* Filter out cancelled Encounters
* Fix notgiven query param
* Update Gifs for timeline actions
* Update Gifs for custom timeline and annotations
* Updated gifs for tutorial for setup screen and datepicker
* Fix setup screen display in IE
* Extract out dependencies on environment.ts from resource-code-creator.

### 2.0.0.0alpha3

This is an alpha release and should not be used in production. Notably, end to end tests are
broken. We are using this release to test against an external server, will make any updates,
and then will fix the end to end tests.

* Add some filtering parameters to the call for MedicationAdministrations.
* Load Medications on Setup
* Make the tooltip style not reference c3 since we use chart.js now.
* Issue #37: Add in monitoring on vancomycin and gentamicin cards
* Move resource-codes into concept-mapping so that everything to do with resource codes lives together.
* Make a 'sets' folder within fhir-resources.
* Let all the selection menu components live in the same folder.
* Add a few service files to live alongside their components.
* Rename fhir-data-classes to fhir-resources for better clarity.
* Add Medication summary cards
* Simplify dependency structure by letting the setup service handle concept loading.
* Move all utils into their own subfolder.
* Move everything that has to do with graphs into a folder.
* Move FHIR server and related classes into their own folder.
* Move time navigation components into a folder.
* Put all the dialog boxes in a folder.
* Only show attachement button in Radiology Tooltips


### 2.0.0.0alpha2

This is an alpha release and should not be used in production. Notably, end to end tests are
broken. We are using this release to test against an external server, will make any updates,
and then will fix the end to end tests.

* Fix a production compiler error.
* Make FhirHttpService caches static
* Update tooltips for Medication Monitoring to include all vanc meds


### 2.0.0.0alpha1

This is an alpha release and should not be used in production. Notably, end to end tests are
broken. We are using this release to test against an external server, will make any updates,
and then will fix the end to end tests.

* Rework the way we load in clinical concepts so that concepts are decoupled from groups.
* Microbio groups should be displayed on same axis
* Load Microbio from Configuration File
* Simplify resource-code-creator's promise structure for clarity.
* Add Vancomycin monitoring annotations
* Add "Make Annotated" Functionality for Blood Pressure
* Add vancomycin & gentamicin monitoring as separate card.
* Separate out meds into their drug classes.
* Add new medications and load meds from file.
* Fix tooltips for Blood Pressure
* Load Vitals from configuration files
* Add Radiology Concept Loading
* Add clinical concepts for medications.
* Add environment variables for vital signs configuration.
* Begin migration to load concepts in from file.
* Remove Radiology Flag: Always show Radiology
* Change the pattern for resource-code-manager to be asynchronous.
* Beginning work for configuring clinical concepts using JSON.
* Add a stanza to all environments to give a path for lab clincial concepts.
* Correctly tear down diagnostic tooltip component in tests
* Move resource-code-manager to its own folder.
* Filter out Entered in Error Medication Administrations
* Add workarounds for making e2e tests work.
* Move caching to fhir level
* Run npm audit fix to upgrade packages
* Configurations for Vital Signs
* Remove fetch of all medications on setup
* Remove dosage number information from Medication graphs: Backend Part 1
* Frontend: Remove dosage number information from Medication graphs
* Make 2 columns on setup page


### 1.0.6.0
* Fix e2e tests
* Issue #7: Changed y-axis from modality to report category to prevent unnecessary text parsing
* Demo data- Added radiology report files to BMedTimeB to show on online demo
* Issue #7: Radiology Reports- finished fhir http calls
* Issue #7: Radiology Reports: connected mock attachments to mock report
* Added e2e tests: changed environment from production to mock to allow for more tests
* Issue #7: Radiology Reports- added dialog popup for the html attachment
* MicrobioGraphComponent unit tests
* Cleaned code in MicrobioGraphComponent
* Issue #7: Radiology Report- tooltip is interactable
* Issue #7: Radiology Report card front-end; base graph + basic tooltip
* Add radiology flag in environments to hide radiology features
* Issue #7: Some backend work for radiology reports. Refactored microbiology, making naming uniform across app.

### 1.0.5.0
* Autogenerated: Update Github Pages demo
* Attempt to Fix Precision Errors in IE10

### 1.0.4.0
* Autogenerated: Update Github Pages demo
* Optimize how we fetch Medication Administrations
* Trailing zeros on y-axis of medication administration card- only seen in production
* Fix Mock FHIR loading of MB data
* Autogenerated: Update Github Pages demo

### 1.0.3.0
* Autogenerated: Update Github Pages demo
* Short circuit medicationsPresentWithCode.
* Update to observationsPresentWithCode.
* Cache Medication Orders that are no longer active
* Cache Results per day
* Issue #21: Tooltip shows multiple instances of 'blood pressure'
* Get Microbio to load
* Filter medication response before creating medication administrations
* Issue #11 (Cont.): Abnormal tooltip for microbio
* Issue #11: Abnormal tooltip- changed the text color to red; added triangle to depict abnormality; added the interpretation values in parentheses next to the value text
* Issue #27: Fixed abnormal normal bound behavior when adding card
* Commit up manual tests.
* Issue #16 (part 2): Surface request ID for encounter errors in error triangle next to datepicker
* Issue #25: Fixed y-axis display for discrete data and repeated labels in non-discrete graphs
* Fix Broken Unit Tests
* Merge changes Idd16a6b4,I6c613b52,I69f4150d
* Normal boundary is now a hover option. The user interacts with the X's on the y-axis to read the normal boundary through a tooltip

### 1.0.2.0
* For some reason the microbiology error message is tripping over finding this object's label so we can't debug it because it won't render the error message. We remove the label from the error message in hopes of getting more to debug with.
* Issue #16: Add Encounters error message to setup screen
* Issue #12: Print xrequestID in debug info on the card
* Clarify and simplify display range calculations for graphs.
* Fix e2e tests by implementing a previously overlooked function.
* Upgrade dev dependencies to address security vulnerabilities.
* Added the shorter time options (#9). e2e tests currently on local; did not push.
* Ordered concepts in CBC (#5)
* Upgrade packages.
* Issue #10: Show concept label if it fails to load
* Remove resource count for faster FHIR calls. Clean up a few imports.
* Check in documentation for MedTimeLine.
* Mark abnormal points as triangles.
* Autogenerated: Update Github Pages demo
* Make BMedTimeB the demo patient.
* Update documentation with final commit ID.

### 1.0.1.0
* Initial release of MedTimeLine. Verily is not responsible for changes to the code or IFU beyond Verily’s
original submission: MedTimeLine v1.0.1.0, commit number 3f17565ee6549a97b9be164c1eeb19be174e7e07.
