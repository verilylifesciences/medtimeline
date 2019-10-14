// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.'

export const PATIENT_ENCOUNTER =
    ['02/11/2019 – 02/17/2019 (patient encounter)'];

export const TIME_PERIODS = [
  'Last three months', 'Last month', 'Last seven days', 'Last three days',
  'Since midnight yesterday'
];

// The textbox does not have a label, and would not be in this list
export const ALL_CARD_LABELS_WITH_DATA = [
  'Custom Timeline',
  'Temperature',
  'Heart Rate',
  'Respiratory Rate',
  'Oxygen Saturation (SpO2)',
  'Blood Pressure',
  'C-Reactive Protein',
  'ESR (Erythrocyte Sedimentation Rate)',
  'BUN',
  'Creatinine',
  'ALT',
  'AST (Aspartate Aminotransferase)',
  'Alkaline Phosphatase',
  'Bilirubin, Direct',
  'Bilirubin, Total',
  'Complete Blood Count',
  'Complete Blood Count White Blood Cell',
  'Urinalysis',
  'CSF',
  'Radiology',
  'Vancomycin & Gentamicin Summary',
  'Vancomycin',
  'Gentamicin',
  'Respiratory',
  'Other',
  'Blood'
];

// The textbox does not have a label, and would not be in this list
export const ALL_DEFAULT_CARD_LABELS = [
  'Custom Timeline',
  'Temperature',
  'Heart Rate',
  'Respiratory Rate',
  'Oxygen Saturation (SpO2)',
  'Blood Pressure',
  'C-Reactive Protein',
  'ESR (Erythrocyte Sedimentation Rate)',
  'BUN',
  'Creatinine',
  'ALT',
  'AST (Aspartate Aminotransferase)',
  'Alkaline Phosphatase',
  'Bilirubin, Direct',
  'Bilirubin, Total',
  'Complete Blood Count White Blood Cell',
  'Radiology',
  'Vancomycin & Gentamicin Summary',
  'Vancomycin',
  'Respiratory',
  'Other',
  'Blood',
];

export const VITAL_SIGNS = 'Vital Signs';
export const LAB_RESULTS = 'Lab Results';
export const RADIOLOGY = 'Radiology';
export const MEDICATIONS = 'Medications';
export const MICROBIO = 'Microbiology';

export const SUBMENU_LABELS = [
  'Search for a concept', VITAL_SIGNS, LAB_RESULTS, RADIOLOGY, MEDICATIONS,
  MICROBIO
];

export const SUBMENU_VITALS = [
  'Temperature', 'Heart Rate', 'Respiratory Rate', 'Blood Pressure',
  'Oxygen Saturation (SpO2)'
];

export const SUBMENU_LABS = [
  'ALT', 'Alkaline Phosphatase', 'AST (Aspartate Aminotransferase)',
  'Bilirubin, Direct', 'Bilirubin, Total', 'BUN', 'C-Reactive Protein',
  'Complete Blood Count', 'Complete Blood Count White Blood Cell', 'Creatinine',
  'CSF', 'ESR (Erythrocyte Sedimentation Rate)', 'Other Fluid', 'Uric acid',
  'Urinalysis'
];

export const SUBMENU_MEDICATION =
    ['Vancomycin & Gentamicin Summary', 'Vancomycin', 'Gentamicin'];

export const SUBMENU_MICROBIO =
    ['Blood', 'CSF Microbiology', 'Other', 'Respiratory', 'Stool'];

export const SUBMENU_DIAGNOSTIC = ['Radiology'];
