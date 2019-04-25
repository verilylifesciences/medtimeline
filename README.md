# MedTimeLine

[See the online demo here!](https://verilylifesciences.github.io/medtimeline/)
This demo was automatically built using ./build_demo.sh

## Disclaimer
This is not an official Verily product.

## About MedTimeLine

MedTimeLine is a web application to help clinicians view how a patient's status
is changing over time. It uses the [SMART on FHIR API](http://docs.smarthealthit.org/)
to pull values for clinical concepts for a patient, then graphs the values
measured for that concept as a time series within a single card.

Users can customize the timelines they view by dragging and dropping
cards to different places on the screen, adding text annotations, dragging in
new clinical concepts, and changing the timeframe of the visualized data.

## Quick Start Demo
1. Clone this repository.
1. Change into the `medtimeline` directory.
1. Run `npm install` to install all dependencies.
1. Run `ng serve --port 8000 --configuration dev_mock_test_bMedtimeA` to run the application
   against the included mock data (note there is not data for all clinical
   concepts).
1. Visit http://localhost:8000 in your browser.

## Configuring your own server

There are several configurations for the development server. You can find
this project's configurations in `src/environments`.

### Running against a FHIR HTTP server

To run against an existing FHIR HTTP server, please create a file at
`src/app/fhir_config.js` with this structure:

```
const env = 'dev';
const dev = {
  credentials: {
    client_id: '<your client ID>',
  },
  url: {
    host: '',
    redirectURL: 'http://localhost:8000/',
    launchURL: 'http://localhost:8000/'
  },
  auth: {
    username: '<your FHIR auth username>',
    password: '<your FHIR auth password>',
  },
  googleAnalyticsTag: '<your Google Analytics tracking ID>',
};

const prod = {
  credentials: {
    client_id: '<<your client ID>',
  },
  url: {
    host: '',
    redirectURL: '<your prod redirect URL>',
    launchURL: '<your prod launch URL>'
  },
  auth: {
    username: '<your FHIR auth username>',
    password: '<your FHIR auth password>',
  },
  googleAnalyticsTag: '<your Google Analytics tracking ID>',
};

const config = {
  dev: dev,
  prod: prod,
};

// Here we have the environment set to dev, but of course you could also switch
// it to prod if needed.
module.exports = config[env];

```
To track events and user interactions with Google Analytics, set up a Google Analytics account,
and use the given tracking ID in your `src/app/fhir_config.js` file.

After you've put in your configuration, run the following command:

`ng serve --port <the port you've configured in your FHIR server and in fhir_config.js for redirect> --configuration dev_http`

This will serve the page at `localhost:<specified port number`.

Navigate to `http://localhost:<your port number>/auth?iss=<your ISS configuration>&launch=<your launch configuration>`
to run the application.

#### Optional use of custom microbiology server

Right now Cerner does not support getting DiagnosticReports representing microbiology results from
its standard FHIR interface. So, if you run this app as-is, you will just never get microbiology
results. If you implement your own microbiology server, you can wire it in to this app by providing
this stanza in your dev and prod configurations:

```
  microbiology: {
    url: '<your url>',
    username: 'username',
    password: 'password',
  }
```

The server should support simple authentication and should respond to a call that looks like this:

```
http://<your_url>/DiagnosticReport?patient=<PATIENTID>&category=microbiology&item-date=ge<lower date bound>&item-date=<upper date bound>&_format=json
```

with this header (code copied from fhir-http.service.ts)

```
const httpHeaders = new HttpHeaders({
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + FhirConfig.microbiology.username + ':' +
      FhirConfig.microbiology.password,
});
```

### Running against mock data

If instead you want to run against the mock data, you have your pick of test data sets to run against.
Look in src/assets/demo_data. There is a readme describing available data sets.
Here is an example of running against one of them.

`ng serve --port 8000 --configuration=dev_test_bmedtimeA`

Navigate to `http://localhost:8000/` to see the application.

## Reporting problems

Please file Github issues for any problems you experience.

## Angular CLI documentation

The foundation for this project was generated with
[Angular CLI](https://github.com/angular/angular-cli) version 6.0.8.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Running tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).
Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

### Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Acknowledgements
This code was developed in partnership with Boston Children Hospital's [Innovation and Digital Health Accelerator](https://accelerator.childrenshospital.org/).
