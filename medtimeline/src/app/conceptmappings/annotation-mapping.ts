import {Interval} from 'luxon';

import {LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {RxNormCodeGroup} from '../clinicalconcepts/rx-norm-group';
import {AnnotatedObservation} from '../fhir-resources/annotated/annotated-observation';
import {AnnotatedMedicationOrder} from '../fhir-resources/medication-order';
import {Observation} from '../fhir-resources/observation';

/**
 * Returns the function to annotate a Blood Pressure Resource group with
 * a Blood Pressure Location.
 *
 * @param The LOINCCodeGroup for the 'Blood Pressure Details' group
 */
function getBloodPressureAnnotationFunction(
    bpDetailsResourceGroup: LOINCCodeGroup) {
  return (observation: Observation,
          dateRange: Interval): Promise<AnnotatedObservation> => {
    return bpDetailsResourceGroup.getResourceSet(dateRange).then(obsSet => {
      return AnnotatedObservation.forBloodPressure(
          observation,
          // We only pass in the first ObservationSet, since we
          // know there is only one code whose observations we
          // care about.
          obsSet[0]);
    });
  };
}

/**
 * Returns the function to annotate a Medication Monitoring Resource group with
 * Medication Administration information.
 *
 * @param The RxNormCode for the Medication Resource group
 */
function getMedicationMonitoringAnnotationFunction(
    rxNormGroup: RxNormCodeGroup) {
  return (observation: Observation,
          dateRange: Interval): Promise<AnnotatedObservation> => {
    return rxNormGroup.getResourceSet(dateRange).then(rxNorms => {
      const medOrders: AnnotatedMedicationOrder[] = [].concat.apply(
          [], rxNorms.map(rxNorm => rxNorm.orders.resourceList));
      return AnnotatedObservation.forMedicationMonitoring(
          observation, medOrders);
    });
  };
}

/**
 * List of Configurations for Resource Groups that should have a makeAnnotated
 * function set.
 *
 * Each element in the list should be a JSON object with the following
 * properties:
 *  - groupName: should be the name of the ResourceCodeGroup that should have
 * its makeAnnotated attribute set.
 *  - makeAnnotatedFunction: a function that takes a reference
 * ResourceCodeGroup and returns a function that should be assigned to the
 * makeAnnotated attribute.
 *  - refGroup: the name of the ResourceCodeGroup that needs to be referenced
 * in order to create the makeAnnotated attribute function.
 *
 */
export const ANNOTATION_CONFIGURATION = [
  {
    'groupName': 'Blood Pressure',
    'makeAnnotatedFunction': (refGroup) =>
        getBloodPressureAnnotationFunction(refGroup),
    'refGroup': 'Blood Pressure Details'
  },
  {
    'groupName': 'Vancomycin monitoring',
    'makeAnnotatedFunction': (refGroup) =>
        getMedicationMonitoringAnnotationFunction(refGroup),
    'refGroup': 'Vancomycin Monitoring Reference'
  },
  {
    'groupName': 'Gentamicin monitoring',
    'makeAnnotatedFunction': (refGroup) =>
        getMedicationMonitoringAnnotationFunction(refGroup),
    'refGroup': 'Gentamicin Monitoring Reference'
  }
];
