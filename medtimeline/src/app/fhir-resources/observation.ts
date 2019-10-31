// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {BCHMicrobioCode} from '../conceptmappings/resource-codes/bch-microbio-code';
import {LOINCCode} from '../conceptmappings/resource-codes/loinc-code';
import {ResourceCode} from '../conceptmappings/resource-codes/resource-code-group';
import {ResultError} from '../result-error';
import {fixUnitAbbreviations} from '../utils/unit_utils';

import {OBSERVATION_INTERPRETATION_VALUESET_URL, ObservationInterpretation} from './observation-interpretation-valueset';
import {ResultClass} from './sets/fhir-resource-set';


/**
 * These are the quantity attributes provided by FHIR. See
 * https://www.hl7.org/fhir/datatypes.html#quantity
 */
interface Quantity {
  value: number;
  comparator: string;
  unit: string;
  system: string;
  code: string;
}

/**
 * FHIR element for ObservationStatus, from the DSTU2 version of the
 * standard.
 * http://hl7.org/fhir/DSTU2/valueset-observation-status.html
 */
export enum ObservationStatus {
  Registered = 'Registered',
  Preliminary = 'Preliminary',
  Final = 'Final',
  Amended = 'Amended',
  Cancelled = 'Cancelled',
  EnteredInError = 'Enteredinerror',
  Unknown = 'Unknown'
}

const statusToEnumMap = new Map<string, ObservationStatus>([
  ['registered', ObservationStatus.Registered],
  ['preliminary', ObservationStatus.Preliminary],
  ['final', ObservationStatus.Final],
  ['amended', ObservationStatus.Amended],
  ['cancelled', ObservationStatus.Cancelled],
  ['entered-in-error', ObservationStatus.EnteredInError],
  ['unknown', ObservationStatus.Unknown],
]);

/**
 * This object represents a FHIR Observation. It does not contain all the
 * information in a standard Observation
 * (see https://www.hl7.org/fhir/observation.html#resource) but instead stores
 * only the information we're interested in seeing.
 *
 * In general, in terms of the MedTimeLine app, we represent an Observation
 * as a point on a line graph for a lab or a vital sign. Observations also hold
 * information about microbiology report results that show up in the
 * microbiology graph tooltips.
 */
export class Observation extends ResultClass {
  readonly codes: ResourceCode[] = [];
  timestamp: DateTime;
  readonly value: Quantity;
  // Populated if the Observation contains a qualitative result, such
  // as "Yellow", rather than a numerical value.
  readonly result: string;
  readonly normalRange: [number, number];
  readonly unit: string;
  readonly innerComponents: Observation[] = [];
  // The display string associated with the code for this Observation.
  readonly display: string;
  readonly interpretation: ObservationInterpretation;
  readonly status: ObservationStatus;

  // The number of decimal places stored in the value.
  readonly precision: number;

  /**
   * Makes an Observation out of a JSON object that represents a
   * a FHIR observation.
   * @param json A JSON object that represents a FHIR observation.
   * @param requestId The x-request-id of the request that acquired this
   *     observation's data.
   */
  constructor(private json: any, requestId: string) {
    super(Observation.getLabel(json), requestId);

    this.timestamp = Observation.getTimestamp(json);
    if (json.code) {
      if (json.code.coding) {
        if (json.code.coding[0].system === BCHMicrobioCode.CODING_STRING) {
          this.codes =
              json.code.coding
                  .map((coding) => BCHMicrobioCode.fromCodeString(coding.code))
                  // Filter out any codes that are not in our mapping.
                  .filter((code) => !!code);
          this.display = json.code.coding[0].display;
        } else {
          this.codes =
              json.code.coding
                  .map(
                      // Map the codes to a boolean that is true only if the
                      // encoding is a LOINC encoding, and the LOINC code appeas
                      // in our LOINCCode list that we care about.
                      (coding) => (!coding.system ||
                                   coding.system.indexOf(
                                       LOINCCode.CODING_STRING) !== -1) &&
                          LOINCCode.fromCodeString(coding.code))
                  // Filter out any codes that are not LOINC codes.
                  .filter((code) => !!code);
        }
      }
    }

    if (json.interpretation) {
      if (json.interpretation.coding) {
        const coding = json.interpretation.coding[0];
        if (coding.system === OBSERVATION_INTERPRETATION_VALUESET_URL) {
          if (ObservationInterpretation.codeToObject.has(coding.code)) {
            this.interpretation =
                ObservationInterpretation.codeToObject.get(coding.code);
          } else {
            throw new ResultError(
                new Set([this.requestId]), 'Unsupported interpretation code.',
                coding);
          }
        }
      } else if (json.interpretation.text) {
        // BCH uses a non-standard coding system so we make interpretations on
        // the fly.
        this.interpretation = new ObservationInterpretation(
            json.interpretation.text, json.interpretation.text);
      }
    }

    if (json.component) {
      json.component.forEach(element => {
        const innerObs = new Observation(element, this.requestId);
        if (!innerObs.timestamp) {
          innerObs.timestamp = this.timestamp;
        }
        this.innerComponents.push(innerObs);
      });
    }

    if (!this.codes || this.codes.length === 0) {
      throw new ResultError(
          new Set([this.requestId]),
          'Observations have to have a LOINC code to be useful. ', json);
    }

    if (!this.label) {
      throw new ResultError(
          new Set([this.requestId]),
          'Observations have to have a label to be useful.', json);
    }

    // Check the observation label against the LOINC code label.
    if (this.label.toLowerCase() !== this.codes[0].label.toLowerCase()) {
      throw new ResultError(
          new Set([this.requestId]),
          `The label for this observation's LOINC code doesn't match ` +
              `the label in the data. Observation label: ${this.label}. ` +
              `LOINC label: ${this.codes[0].label}. `,
          json);
    }


    this.value = json.valueQuantity ? json.valueQuantity : null;
    if (this.value) {
      this.unit = fixUnitAbbreviations(this.value.unit);
    }

    // We must calculate precision before the value is stored as a number,
    // where precision is lost. If the value stored in the json has
    // a precision of 0 and is less than 1, then we change the precision to
    // 1 to display decimals and better UI.

    if (json.valueQuantity && json.valueQuantity.value) {
      const values = json.valueQuantity.value.toString().split('.');
      this.precision = values.length > 1 ? values[1].length : 0;
      if (values[0] === '0' && this.precision === 0) {
        this.precision = 1;
      }
    } else {
      // If the values are not present and are instead displayed as a value
      // of 0, the precision is set to 1 to prevent duplicated display of values
      this.precision = 1;
    }

    this.result =
        json.valueCodeableConcept ? json.valueCodeableConcept.text : null;
    if (this.value === null && this.result === null && !this.interpretation &&
        (this.innerComponents && this.innerComponents.length === 0)) {
      throw new ResultError(
          new Set([this.requestId]),
          'An Observation must have a value, result, inner components, ' +
              'or an interpretation to be useful.',
          json);
    }

    // The FHIR standard says that if there's only one range then it should be
    // what is "normal" for that measure. Otherwise they should be labeled.
    // We are going to err on the side of safety and not include a normal
    // range unless there's just the one, and it includes a high and low
    // field. https://www.hl7.org/fhir/DSTU2/observation.html#4.20.4.4
    if (json.referenceRange && json.referenceRange.length === 1) {
      if (json.referenceRange[0].low && json.referenceRange[0].high) {
        this.normalRange = [
          json.referenceRange[0].low.value, json.referenceRange[0].high.value
        ];
      }
    }

    this.status = statusToEnumMap.get(json.status);
  }

  private static getLabel(json: any) {
    let label;
    if (json.code) {
      label = json.code.text;
      if (json.code.coding) {
        if (json.code.coding[0].system === BCHMicrobioCode.CODING_STRING) {
          label = json.code.coding[0].display;
        }
      }
    }
    return label;
  }

  static getTimestamp(json: any): DateTime {
    return json.effectiveDateTime ?
        DateTime.fromISO(json.effectiveDateTime).toUTC() :
        json.issued ? DateTime.fromISO(json.issued).toUTC() : null;
  }
}
