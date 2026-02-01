/**
 * Convert Blob to Base64 string (chunked to avoid stack overflow)
 *
 * For large audio files, converting to Base64 in one go can cause
 * "Maximum call stack size exceeded" errors. This function processes
 * the data in 8KB chunks to avoid stack overflow.
 *
 * @param blob - The audio blob to convert
 * @returns Base64 encoded string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Process in 8KB chunks to avoid stack overflow
  const chunkSize = 8192;
  let result = "";

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    result += String.fromCharCode(...chunk);
  }

  return btoa(result);
}
