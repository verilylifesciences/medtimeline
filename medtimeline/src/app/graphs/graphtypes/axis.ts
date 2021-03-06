// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {BCHMicrobioCode, BCHMicrobioCodeGroup} from '../../conceptmappings/resource-codes/bch-microbio-code';
import {DiagnosticReportCode, DiagnosticReportCodeGroup} from '../../conceptmappings/resource-codes/diagnostic-report-code';
import {DisplayGrouping} from '../../conceptmappings/resource-codes/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../../conceptmappings/resource-codes/loinc-code';
import {ResourceCodeGroup} from '../../conceptmappings/resource-codes/resource-code-group';
import {RxNormCode} from '../../conceptmappings/resource-codes/rx-norm';
import {RxNormCodeGroup} from '../../conceptmappings/resource-codes/rx-norm-group';
import {Encounter} from '../../fhir-resources/encounter';
import {MedicationOrderSet} from '../../fhir-resources/medication-order';
import {FhirService} from '../../fhir-server/fhir.service';
import {DiagnosticGraphData} from '../graphdatatypes/diagnosticgraphdata';
import {GraphData} from '../graphdatatypes/graphdata';
import {LineGraphData} from '../graphdatatypes/linegraphdata';
import {MicrobioGraphData} from '../graphdatatypes/microbiographdata';
import {StepGraphData} from '../graphdatatypes/stepgraphdata';

import {ChartType} from './graph/graph.component';

/**
 * An axis represents one graph to be rendered. It
 * holds values for the type of graph (step, scatter, line, etc) as well as the
 * actual graph data.
 *
 * One axis might have multiple ResourceCodes associated with it, but all of
 * the same type.
 *
 * This class makes the FHIR calls to grab the associated data for the chart.
 */
export class Axis {
  /**
   * The chart type for this graph.
   */
  readonly chartType: ChartType;

  /**
   * The date range the data is currently loaded for.
   */
  dateRange: Interval;

  /**
   * Holds the GraphData already resolved for the class's current date range,
   * unless it hasn't been resolved yet. Then this variable will be undefined,
   * and you need to call updateDateRange to get the data loaded in.
   */
  alreadyResolvedData: GraphData;

  /**
   * The associated DisplayGrouping for this graph.
   */
  displayConcept: DisplayGrouping;

  /*
   * The label for this axis.
   */
  label: string;

  /*
   * Whether to show tick marks for this axis (only changed when results are all
   * qualitative).
   */
  showTicks = true;

  /** An error message if there's an error in data retrieval. */
  errorMessage: string;

  // The encounters for the date range.
  private encounters: Encounter[] = [];

  // Holds the grouping of the resource codes for this axis.
  private allLoinc: boolean;
  private allRx: boolean;
  private allBCHMicrobio: boolean;
  private allDiagnosticReport: boolean;

  /** Whether there is data available for this axis in the app time scope. */
  axisDataAvailable = true;

  /**
   * The constructor for this axis.
   * @param fhirService The FhirService used to make the FHIR calls.
   * @param resourceGroup The ResourceGroup to request data for.
   * @param dateRange: The date range to display on the axis.
   * @param label?: The optional y-axis label for this axis.
   */
  constructor(
      private fhirService: FhirService, private sanitizer: DomSanitizer,
      /**
       * The ResourceCodeGroup for this axis.
       */
      readonly resourceGroup: ResourceCodeGroup,
      /*
       * The label for this axis.
       */
      label?: string) {
    this.chartType = resourceGroup.chartType;
    this.displayConcept = resourceGroup.displayGrouping;
    this.label = label;

    const resourceCodeList = this.resourceGroup.resourceCodes;
    // Check that all elements of the resourceCodeList are of the same type.
    this.allLoinc = resourceCodeList.every(code => code instanceof LOINCCode);
    this.allRx = resourceCodeList.every(code => code instanceof RxNormCode);
    this.allBCHMicrobio =
        resourceCodeList.every(code => code instanceof BCHMicrobioCode);
    this.allDiagnosticReport =
        resourceCodeList.every(code => code instanceof DiagnosticReportCode);
    if (!this.allLoinc && !this.allRx && !this.allBCHMicrobio &&
        !this.allDiagnosticReport) {
      throw Error('All resource codes must be of the same type.');
    }
  }

  /**
   * Changes this axis' date range and loads in the new graph data accordingly.
   */
  updateDateRange(dateRange: Interval): Promise<GraphData> {
    if (dateRange === this.dateRange) {
      return Promise.resolve(this.alreadyResolvedData);
    }
    // Invalidate the already-resolved data so that the graph data promise
    // has to be re-evaluated.
    this.dateRange = dateRange;
    this.alreadyResolvedData = undefined;
    this.errorMessage = undefined;
    return this.getDataFromFhir(dateRange).then(
        data => {
          this.alreadyResolvedData = data;
          return data;
        },
        rejection => {
          if (rejection instanceof Error) {
            this.errorMessage = rejection.message;
          } else {
            this.errorMessage = JSON.stringify(rejection, null, 4);
          }
          return LineGraphData.emptyData();
        });
  }

  /**
   * Returns whether there is data available for this axis within the
   * application's time scope.
   */
  axisDataAvailableInAppTimeScope(): Promise<boolean> {
    return this.resourceGroup.dataAvailableInAppTimeScope().then(res => {
      this.axisDataAvailable = res;
      return this.axisDataAvailable;
    });
  }

  /**
   * Gets the appropriate GraphData by classifying the resource codes and
   * making the appropriate FHIR calls for data and transformations. If
   * the data is already set in this class, it just returns that data.
   *
   * @returns A GraphData promise that will resolve to the GraphData for
   *    this axis's resourceGroup.
   */
  private getDataFromFhir(dateRange: Interval): Promise<GraphData> {
    if (this.alreadyResolvedData) {
      return Promise.resolve(this.alreadyResolvedData);
    }

    // Set the encounters for this date range. If the promise fails, the list of
    // encounters is empty.
    this.fhirService.getEncountersForPatient(dateRange).then(e => {
      if (!e) {
        e = [];
      }
      e = e.sort(
          (a, b) => a.period.start.toMillis() - b.period.start.toMillis());
      this.encounters = e;
    }, reject => this.encounters = []);

    if (this.allRx) {
      // Prescriptions can be plotted as a step chart or as a line chart.
      if (this.chartType === ChartType.STEP) {
        return this.getStepGraphDataForMedicationSummary(
            this.resourceGroup as RxNormCodeGroup, dateRange);
      } else {
        return this.getLineGraphDataForMedicationDetail(
            this.resourceGroup as RxNormCodeGroup, dateRange);
      }
    }

    if (this.allBCHMicrobio) {
      // Microbiology always shows up as a step chart.
      return this.getStepGraphDataForMB(
          this.resourceGroup as BCHMicrobioCodeGroup, dateRange);
    }

    if (this.allDiagnosticReport) {
      return this.getStepGraphDataForDiagnosticReport(
          this.resourceGroup as DiagnosticReportCodeGroup, dateRange);
    } else {
      // In this case it is all LOINC codes.
      // We use LineGraphData for both ChartType.Scatter and
      // ChartType.Line, for plotting LOINC Codes.
      return (this.resourceGroup as LOINCCodeGroup)
          .getResourceSet(dateRange)
          .then(obsSetList => {
            if (obsSetList) {
              const allUnits = new Set(
                  obsSetList.map(x => x.unit).filter(x => x !== undefined));
              // If the observation set contains any qualitative
              // values, even if it's mixed in with quantitative values,
              // we display the discrete linegraph. Similarly, if the
              // observations have different units we display it as a discrete
              // line graph.
              if (obsSetList.some(obsSet => obsSet.anyQualitative) ||
                  allUnits.size > 1) {
                this.showTicks = false;
                return LineGraphData.fromObservationSetListDiscrete(
                    this.displayConcept.label, obsSetList, this.sanitizer,
                    this.encounters);
              }
              return LineGraphData.fromObservationSetList(
                  this.displayConcept.label, obsSetList, this.resourceGroup,
                  this.sanitizer, this.encounters);
            }
            return LineGraphData.emptyData();
          });
    }
  }

  /**
   * Get the data needed for the medication summary.
   * We first get the MedicationAdministrations corresponding to the RxNorms to
   * display on the page, and group them by order id (representing a
   * prescription). We then get the MedicationOrder for each order id, and group
   * those into MedicationOrderSets, where each MedicationOrderSet represents a
   * set of MedicationOrders for a particular medication.
   * @param rxNorms The RxNorms to be displayed in the StepGraphCard.
   */
  getStepGraphDataForMedicationSummary(
      rxNorms: RxNormCodeGroup, dateRange: Interval): Promise<StepGraphData> {
    return rxNorms.getResourceSet(dateRange).then(medOrderSets => {
      return StepGraphData.fromMedicationOrderSetList(
          medOrderSets.map(x => x.orders), dateRange, this.sanitizer);
    });
  }

  getStepGraphDataForMB(bchCodes: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<StepGraphData> {
    return bchCodes.getResourceSet(dateRange).then(microbioReports => {
      return MicrobioGraphData.fromMicrobioReports(
          microbioReports, this.sanitizer);
    });
  }

  getStepGraphDataForDiagnosticReport(
      diagCodes: DiagnosticReportCodeGroup,
      dateRange: Interval): Promise<StepGraphData> {
    return diagCodes.getResourceSet(dateRange).then(diagReports => {
      return DiagnosticGraphData.fromDiagnosticReports(
          diagReports, this.sanitizer);
    });
  }

  /**
   * Issues a FHIR request to get all the meds data for a list of
   * RxNorm codes (medications).
   */
  getLineGraphDataForMedicationDetail(
      rxNorms: RxNormCodeGroup, dateRange: Interval): Promise<LineGraphData> {
    return rxNorms.getResourceSet(dateRange)
        .then(rxNs => {
          return [].concat(...rxNs.map(rx => rx.orders.resourceList));
        })
        .then(orders => {
          return LineGraphData.fromMedicationOrderSet(
              new MedicationOrderSet(orders), dateRange, this.sanitizer,
              this.encounters);
        });
  }

  /**
   * Gets the x regions from the data for this axis.
   */
  getXRegions(): Promise<any[]> {
    return this.getDataFromFhir(this.dateRange).then(data => {
      return data.xRegions ? data.xRegions : [];
    });
  }

  /**
   * Returns whether there's resolved data for this axis.
   */
  dataResolved(): boolean {
    return this.alreadyResolvedData && this.axisDataAvailable ? true : false;
  }
}
