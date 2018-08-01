// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * A class that has a label attribute.
 */
export class LabeledClass {
  label;
}

/**
 * A set of FHIR resources. All resources that are a part of this set must
 * have the same label.
 */
export class FhirResourceSet<T extends LabeledClass> {
  /**
   * The list of resources that belong together.
   */
  readonly resourceList: T[];

  /*
   * The label for this set of data. All data in this set
   * must have the same label.
   */
  label: string;

  /**
   * Constructor for FhirResourceSet.
   * @param resourceList The list of resources belonging together.
   * @throws Error if the resources have different labels, or if there is not
   *     a label.
   */
  constructor(resourceList: T[]) {
    if (!resourceList) {
      throw Error('Resource list is undefined.');
    }

    if (resourceList.length > 0) {
      const firstLabel = resourceList[0].label;
      if (!firstLabel) {
        throw Error('The first resource does not have a label.');
      }

      const allLabels = new Set(resourceList.map(rs => rs.label.toLowerCase()));
      if (allLabels.size !== 1) {
        throw Error(
            'The resource list in this set has mixed labels: ' +
            Array.from(allLabels.values()));
      }
      this.label = firstLabel;
    }

    this.resourceList = resourceList;
  }
}
