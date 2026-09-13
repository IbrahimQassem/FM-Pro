import { maxProfileImageBytes } from './account-profile';

// Match the app picker: cap the input, resize locally, then let the existing
// callable validate/re-encode and strip metadata before storing the image.
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 4 * maxProfileImageBytes) throw new Error('invalid-profile-image');
  const image = await createImageBitmap(file);
  try {
    if (!image.width || !image.height || image.width * image.height > 16_000_000) throw new Error('invalid-profile-image');
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('invalid-profile-image');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('invalid-profile-image')), 'image/jpeg', .85));
    if (!blob.size || blob.size > maxProfileImageBytes) throw new Error('invalid-profile-image');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return btoa(binary);
  } finally { image.close(); }
}
