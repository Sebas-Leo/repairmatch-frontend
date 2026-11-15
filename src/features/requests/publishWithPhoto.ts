import type {
  CreateEvidence,
  CreateServiceRequest,
} from '../../shared/api/types';
import { uploadRequestPhoto } from '../../shared/api/cloudinary';
import { addEvidence, createServiceRequest } from './api';

export interface PendingPhoto {
  metadata: CreateEvidence;
}
export async function publishWithPhoto(
  body: CreateServiceRequest,
  photo: File | null,
) {
  // Upload first: a photo/configuration failure cannot publish an extra request.
  const metadata = photo ? await uploadRequestPhoto(photo) : null;
  const created = await createServiceRequest(body);
  let pendingPhoto: PendingPhoto | null = null;
  if (metadata) {
    try {
      await addEvidence(created.id, metadata);
    } catch {
      pendingPhoto = { metadata };
    }
  }
  return { created, pendingPhoto };
}
