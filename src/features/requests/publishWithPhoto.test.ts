import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aRequest } from '../../test/fixtures';
import { uploadRequestPhoto } from '../../shared/api/cloudinary';
import { addEvidence, createServiceRequest } from './api';
import { publishWithPhoto } from './publishWithPhoto';
vi.mock('../../shared/api/cloudinary', () => ({ uploadRequestPhoto: vi.fn() }));
vi.mock('./api', () => ({
  addEvidence: vi.fn(),
  createServiceRequest: vi.fn(),
}));
const metadata = {
  mediaUrl: 'https://example.test/photo.jpg',
  mediaType: 'image/jpeg',
};
const body = { applianceTypeId: 2, originalDescription: 'Does not start.' };
describe('publish with an optional photo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createServiceRequest).mockResolvedValue(aRequest());
    vi.mocked(uploadRequestPhoto).mockResolvedValue(metadata);
    vi.mocked(addEvidence).mockResolvedValue({
      ...metadata,
      requestId: 7,
      evidenceNumber: 1,
    });
  });
  it('keeps publishing without a photo', async () => {
    const result = await publishWithPhoto(body, null);
    expect(result.pendingPhoto).toBeNull();
    expect(uploadRequestPhoto).not.toHaveBeenCalled();
    expect(addEvidence).not.toHaveBeenCalled();
  });
  it('registers the external URL on the newly created request', async () => {
    const result = await publishWithPhoto(body, new File(['x'], 'p.jpg'));
    expect(addEvidence).toHaveBeenCalledWith(7, metadata);
    expect(result.pendingPhoto).toBeNull();
  });
  it('does not create a request if the upload fails', async () => {
    vi.mocked(uploadRequestPhoto).mockRejectedValue(new Error('offline'));
    await expect(
      publishWithPhoto(body, new File(['x'], 'p.jpg')),
    ).rejects.toThrow('offline');
    expect(createServiceRequest).not.toHaveBeenCalled();
  });
  it('preserves the published request and URL after an uncertain evidence write', async () => {
    vi.mocked(addEvidence).mockRejectedValue(new Error('timeout'));
    const result = await publishWithPhoto(body, new File(['x'], 'p.jpg'));
    expect(result.created.id).toBe(7);
    expect(result.pendingPhoto?.metadata).toEqual(metadata);
    expect(createServiceRequest).toHaveBeenCalledTimes(1);
  });
});
