import axios from 'axios';
import type { CreateEvidence } from './types';

export function validatePhoto(file: File) {
  if (
    ![
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/heic',
      'image/heif',
    ].includes(file.type)
  ) {
    throw new Error('Elige una foto JPEG, PNG, WebP, GIF, AVIF o HEIC.');
  }
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error('Elige una foto de entre 1 byte y 10 MB.');
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
    string | undefined;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
    string | undefined;
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !preset)
    throw new Error(
      'La subida de fotos no está configurada. Completa el nombre de nube y el preset sin firma de Cloudinary.',
    );
  return { cloud, preset };
}

export async function uploadRequestPhoto(file: File): Promise<CreateEvidence> {
  const { cloud, preset } = validatePhoto(file);
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', preset);
  // Independent external transport: no app interceptors or Bearer token.
  const response = await axios.request<unknown>({
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    method: 'POST',
    data: body,
    timeout: 60000,
    withCredentials: false,
    withXSRFToken: false,
    adapter: 'fetch',
    fetchOptions: { redirect: 'error' },
    headers: { 'User-Agent': false },
  });
  const data = response.data;
  if (
    !data ||
    typeof data !== 'object' ||
    !('secure_url' in data) ||
    typeof data.secure_url !== 'string' ||
    !('format' in data) ||
    typeof data.format !== 'string'
  ) {
    throw new Error(
      'El servicio de imágenes devolvió una respuesta no válida.',
    );
  }
  const url = new URL(data.secure_url);
  const mediaType = `image/${data.format === 'jpg' ? 'jpeg' : data.format}`;
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    data.secure_url.length > 500 ||
    !/^[a-z0-9]+$/i.test(data.format) ||
    mediaType.length > 50
  ) {
    throw new Error(
      'El servicio de imágenes devolvió una dirección o un formato no válido.',
    );
  }
  return { mediaUrl: data.secure_url, mediaType };
}
