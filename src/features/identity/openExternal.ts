/** Sends the browser to Didit's hosted page. A seam so tests can observe it. */
export function openVerificationPage(url: string): void {
  window.location.assign(url);
}
