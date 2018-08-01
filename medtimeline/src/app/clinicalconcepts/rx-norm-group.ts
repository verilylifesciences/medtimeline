// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {CachedResourceCodeGroup} from '../clinicalconcepts/resource-code-group';
import {MedicationAdministration} from '../fhir-data-classes/medication-administration';
import {MedicationOrder, MedicationOrderSet} from '../fhir-data-classes/medication-order';

import {RxNormCode} from './rx-norm';

/**
 * Represents one or more RxNorm codes that should be displayed together. In the
 * case of multiple RxNorm codes in a group, you should provide a label for that
 * group.
 */
export class RxNormCodeGroup extends CachedResourceCodeGroup<RxNormCode> {
  /**
   * Fills out the order and administration information for each for each
   * RxNormCode in this group, and returns a list of the populated RxNormCodes.
   * This is a roundabout process because the Cerner implementation of the
   * FHIR standard doesn't allow for searching MedicationOrders by RxNorm code,
   * so we have to search for MedicationAdministrations by RxNorm code and work
   * up from there.
   */
  getResourceFromFhir(dateRange: Interval): Promise<RxNormCode[]> {
    return this.fhirService
        .getMedicationAdministrationsWithCodes(this, dateRange)
        .then(medAdmins => {
          const groupedByOrder = this.groupAdministrationsByOrderId(medAdmins);
          return this.getMedicationOrdersAndMapToMed(groupedByOrder);
        });
  }

  /**
   * Takes a list of lists of MedicationAdministrations and groups them by their
   * order IDs. Each list represents a set of MedicationAdministrations for a
   * specific RxNorm, but they're not arranged by order. For example:
   *
   * [[admin1_rxnorm1_orderA, admin2_rxnorm1_orderB, admin3_rxnorm1_orderB],
   *  [admin1_rxnorm2_orderC, admin2_rxnorm2_orderC],
   *  [admin1_rxnorm3_orderD]]
   *
   * would yield:
   *
   * {orderA: [admin1_rxnorm1_orderA],
   *  orderB: [admin2_rxnorm1_orderB, admin3_rxnorm1_orderB],
   *  orderC: [admin1_rxnorm2_orderC, admin2_rxnorm2_orderC],
   *  orderD: [admin1_rxnorm3_orderD]
   * }
   * @param medAdmins A list of lists of MedicationAdministrations. See above.
   * @returns A map of order IDs to a list of corresponding
   *     MedicationAdministrations.
   */
  private groupAdministrationsByOrderId(medAdmins:
                                            MedicationAdministration[][]):
      Map<string, MedicationAdministration[]> {
    let groupedByOrder = new Map<string, MedicationAdministration[]>();
    for (const medAdminForDrug of medAdmins) {
      // Group medication administrations by medication order.
      groupedByOrder = medAdminForDrug.reduce(
          (groups: Map<string, MedicationAdministration[]>,
           medAdmin: MedicationAdministration) => {
            // Append this administration to whatever order list it belongs to.
            const orderId: string = medAdmin.medicationOrderId;
            if (!groups.has(orderId)) {
              groups.set(orderId, new Array<MedicationAdministration>());
            }
            groups.set(orderId, groups.get(orderId).concat(medAdmin));
            return groups;
          },
          // Use whatever existed in groupedByOrder prior to this iteration as
          // the basis for the reducer to add to.
          groupedByOrder);
    }
    return groupedByOrder;
  }

  /**
   * Transforms a map with keys of MedicationOrder IDs and values of
   * MedicationAdministrations to a list of RxNormCodes, with the RxNormCodes
   * containing their corresponding MedicationOrders, and the medicationOrders
   * containing their corresponding MedicationAdministrations. For example:
   *
   * {orderA: [admin1_rxnorm1_orderA],
   *  orderB: [admin2_rxnorm1_orderB, admin3_rxnorm1_orderB],
   *  orderC: [admin1_rxnorm2_orderC, admin2_rxnorm2_orderC],
   *  orderD: [admin1_rxnorm3_orderD]
   * }
   *
   * would yield:
   *
   *  [RxNorm1 = {orders:
   *     [OrderA {administrationsForOrder: [admin1_rxnorm1_orderA]},
   *      OrderB {administrationsForOrder: [admin2_rxnorm1_orderB,
   *                                        admin3_rxnorm1_orderB]}]}
   *   RxNorm2 = {orders:
   *      [OrderC {administrationsForOrder: [admin1_rxnorm2_orderC,
   *                                         admin2_rxnorm2_orderC]}]}
   *   RxNorm3 = {orders:
   *      [OrderD {administrationsForOrder: [admin1_rxnorm3_orderD]}]}
   *
   * @param groupedByOrder A map with keys of MedicationOrder IDs and values of
   *     MedicationAdministrations for those MedicationOrders.
   * @returns A list of RxNormCodes with orders populated
   * @throws Error if the incoming parameter has medication administrations that
   *     did not come from the same order for the same med
   */
  private getMedicationOrdersAndMapToMed(
      groupedByOrder: Map<string, MedicationAdministration[]>):
      Promise<RxNormCode[]> {
    const groupedByMed = new Map<RxNormCode, MedicationOrder[]>();
    const allPromises = Array.from(groupedByOrder.keys()).map(orderId => {
      return this.fhirService.getMedicationOrderWithId(orderId)
          .then(order => {
            // We only have the MedicationAdministrations from within the
            // specified time window, so we have to search again for all the
            // MedicationAdministrations present for this order and assign
            // them to the order.
            return order.setMedicationAdministrations(this.fhirService);
          })
          .then((order: MedicationOrder) => {
            // Verify all the administrations have the same RxNormCode and
            // same Order ID.
            const rxNormCodeSet =
                new Set(Array.from(groupedByOrder.get(order.orderId).values())
                            .map(admin => admin.rxNormCode));
            if (rxNormCodeSet.size !== 1) {
              throw Error(
                  'Administrations for order ' + order.orderId +
                  ' are for multiple RxNorms: ' +
                  Array.from(rxNormCodeSet.values()));
            }

            const orderSet =
                new Set(Array.from(groupedByOrder.get(order.orderId).values())
                            .map(admin => admin.medicationOrderId));
            if (rxNormCodeSet.size !== 1) {
              throw Error(
                  'Administrations for order ' + order.orderId +
                  ' report multiple order IDs: ' + Array.from(orderSet));
            }

            // Add the order to the map for the RxNorm code.
            const rxCode = rxNormCodeSet.values().next().value;
            if (groupedByMed.has(rxCode)) {
              groupedByMed.set(rxCode, groupedByMed.get(rxCode).concat(order));
            } else {
              groupedByMed.set(rxCode, new Array(order));
            }
          });
    });
    // Resolve all the promises and set the corresponding orders for each
    // RxNorm.
    return Promise.all(allPromises).then(_ => {
      Array.from(groupedByMed.entries()).forEach(medEntry => {
        const rxNorm = medEntry[0];
        const medOrders = medEntry[1];
        rxNorm.orders = new MedicationOrderSet(medOrders);
      });
      // Return all the populated RxNorms.
      return Array.from(groupedByMed.keys());
    });
  }
}
