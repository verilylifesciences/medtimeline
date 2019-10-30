/**
 * Formats a number as a string to the correct precision.
 *
 * Formats the number into a more "human-readable" format.
 * For example, the number 10000 would get formatted to 10,000.
 *
 * @param number the number to format
 * @param precision the precision to format the number to. Passing 0 means
 *   no decimal. Passing 1 means 1 digit after the decimal point.
 */
export function formatNumberWithPrecision(number: number, precision?: number) {
  // The function Number.toLocalString formats into a more "human-readable"
  // format. In IE10 and below, toLocalString always rounds to 2 decimal places.
  // https://stackoverflow.com/questions/21536984/javascript-format-whole-numbers-using-tolocalestring
  // In order to ensure the correct precision in all browsers, We need to adjust
  // the decimal portion of the string after formatting it with the correct
  // precision.

  // get the number rounded to the correct precision.
  const numberAtPrecision =
      precision !== undefined ? number.toFixed(precision) : number.toString();

  // numberParts will always contain the integer part of the number as the first
  // element in the list.
  const numberParts = numberAtPrecision.split('.');
  const integer = numberParts[0];

  const formattedInteger =
      Number(integer).toLocaleString('en-us').split('.')[0];

  // if the precision is 0 or there was no decimal value, then just return the
  // formatted integer. Otherwise, add the decimal part back to the formatted
  // integer.
  return (precision === 0 || numberParts.length === 1) ?
      formattedInteger :
      `${formattedInteger}.${numberParts[1]}`;
}
