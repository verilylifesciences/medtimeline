// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';

import {AbstractResourceCodeGroup} from '../clinicalconcepts/resource-code-group';
import {MedicationAdministration} from '../fhir-data-classes/medication-administration';
import {AnnotatedMedicationOrder, MedicationOrder, MedicationOrderSet, MedicationOrderStatus} from '../fhir-data-classes/medication-order';

import {RxNormCode} from './rx-norm';

/**
 * Represents one or more RxNorm codes that should be displayed together. In the
 * case of multiple RxNorm codes in a group, you should provide a label for that
 * group.
 */
export class RxNormCodeGroup extends
    AbstractResourceCodeGroup<RxNormCode, MedicationAdministration> {
  medicationOrderCache = new Map<string, MedicationOrder>();

  /**
   * Gets all Medication Administrations in this group from FHIR for the given
   * date range.
   * @param dateRange date range to get medication administrations for
   */
  getResourceFromFhir(dateRange: Interval):
      Promise<MedicationAdministration[]> {
    return this.fhirService.getMedicationAdministrationsWithCodeGroup(
        this, dateRange);
  }

  /**
   * Fills out the order and administration information for each
   * RxNormCode in this group, and returns a list of the populated RxNormCodes.
   * This is a roundabout process because the Cerner implementation of the
   * FHIR standard doesn't allow for searching MedicationOrders by RxNorm code,
   * so we have to search for MedicationAdministrations by RxNorm code and work
   * up from there.
   */
  formatRawResults(rawResults: MedicationAdministration[]):
      Promise<RxNormCode[]> {
    const groupedByOrder = this.groupAdministrationsByOrderId(rawResults);
    return this.getMedicationOrdersAndMapToMed(groupedByOrder);
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
  private groupAdministrationsByOrderId(medAdmins: MedicationAdministration[]):
      Map<string, MedicationAdministration[]> {
    let groupedByOrder = new Map<string, MedicationAdministration[]>();
    // Group medication administrations by medication order.
    groupedByOrder = medAdmins.reduce(
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
    const allPromises = Array.from(groupedByOrder.keys()).map(orderId => {
      if (this.medicationOrderCache.has(orderId)) {
        return Promise.resolve(this.medicationOrderCache.get(orderId));
      } else {
        return this.fhirService.getMedicationOrderWithId(orderId).then(
            order => {
              this.medicationOrderCache.set(orderId, order);
              return order;
            },
            rejection => {
              // If there are any errors getting a MedicationOrder for
              // this RxNormCode[], throw the error.
              throw rejection;
            });
      }
    });

    // Resolve all the promises and set the corresponding orders for each
    // RxNorm.
    const groupedByMed = new Map<RxNormCode, AnnotatedMedicationOrder[]>();
    return Promise.all(allPromises)
        .then(orders => {
          orders.map(
              (order: MedicationOrder) => {
                const orderId = order.orderId;
                const medicationAdminsForOrder =
                    Array.from(groupedByOrder.get(orderId).values());
                // Verify all the administrations have the same RxNormCode and
                // same Order ID.
                const rxNormCodeSet = new Set(
                    medicationAdminsForOrder.map(admin => admin.rxNormCode));
                if (rxNormCodeSet.size !== 1) {
                  throw Error(
                      'Administrations for order ' + orderId +
                      ' are for multiple RxNorms: ' +
                      Array.from(rxNormCodeSet.values()));
                }

                const orderSet = new Set(medicationAdminsForOrder.map(
                    admin => admin.medicationOrderId));
                if (rxNormCodeSet.size !== 1) {
                  throw Error(
                      'Administrations for order ' + orderId +
                      ' report multiple order IDs: ' + Array.from(orderSet));
                }

                // Add the order to the map for the RxNorm code.
                const rxCode = rxNormCodeSet.values().next().value;
                const annotatedOrder = new AnnotatedMedicationOrder(
                    order, medicationAdminsForOrder);
                if (groupedByMed.has(rxCode)) {
                  groupedByMed.set(
                      rxCode, groupedByMed.get(rxCode).concat(annotatedOrder));
                } else {
                  groupedByMed.set(rxCode, new Array(annotatedOrder));
                }
              },
              rejection => {
                // If there are any errors constructing MedicationOrders for
                // this RxNormCode[], throw the error.
                throw rejection;
              });
        })
        .then(
            _ => {
              Array.from(groupedByMed.entries()).forEach(medEntry => {
                const rxNorm = medEntry[0];
                const medOrders = medEntry[1];
                rxNorm.orders = new MedicationOrderSet(medOrders);
              });
              // Return all the populated RxNorms.
              return Array.from(groupedByMed.keys());
            },
            rejection => {
              // If any promise is rejected, throw the same rejection.
              throw rejection;
            });
  }
}
