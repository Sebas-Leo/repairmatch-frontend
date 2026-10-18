// What Chrome and Edge, Safari and Firefox say when a dynamic `import()` fails.
const CHUNK_LOAD_MESSAGE =
  /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i;

/**
 * True when a lazy page could not be downloaded: the network dropped, or a new
 * deploy replaced the file the old page still points to. `React.lazy` remembers
 * the rejected download, so rendering again fails the same way: only reloading
 * the page helps, and it also fetches the new version.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('name' in error && error.name === 'ChunkLoadError') return true;
  return (
    'message' in error &&
    typeof error.message === 'string' &&
    CHUNK_LOAD_MESSAGE.test(error.message)
  );
}
