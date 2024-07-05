export function jsonStringToBytes(jsonString: string): Uint8Array {
  const buffer = Buffer.from(jsonString, 'utf-8');

  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return view;
}

export function bytesToJsonString(bytes: Uint8Array): string {
  // Create a buffer from the Uint8Array
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Convert the buffer to a string
  return buffer.toString('utf-8');
}
