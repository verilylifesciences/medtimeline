/**
 * Error class for errors with request IDs.
 * Formats the error message with the list of request IDs, the message,
 * and optional json.
 */
export class ResultError extends Error {
  readonly shortMessage;

  constructor(requestIds: Set<string>, message: string, json?: any) {
    const requestIDMessage = requestIds.size > 0 ?
        `Request IDs: ${Array.from(requestIds).join(', ')}.\n` :
        '';
    const shortMessage = requestIDMessage + message;
    let completeMessage = shortMessage;
    if (json) {
      completeMessage += `\nJSON: ${JSON.stringify(json, null, 4)}`;
    }
    super(completeMessage);
    // 'super' needs to be called before accessing 'this', so we need to set
    // this.shortMessage after calling 'super'.
    this.shortMessage = shortMessage;
  }
}
