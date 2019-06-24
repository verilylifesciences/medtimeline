/**
 * Error class for errors with request IDs.
 * Formats the error message with the list of request IDs, the message,
 * and optional json.
 */
export class ResultError extends Error {
  constructor(requestIds: Set<string>, message: string, json?: any) {
    let completeMessage = `Request IDs: ${Array.from(requestIds).join(', ')}.` +
        `\n${message}`;
    if (json) {
      completeMessage += `\nJSON: ${JSON.stringify(json, null, 4)}`;
    }
    super(completeMessage);
  }
}
