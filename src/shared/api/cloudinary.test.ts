import axios from 'axios';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { uploadRequestPhoto, validatePhoto } from './cloudinary';
vi.mock('axios', () => ({ default: { request: vi.fn() } }));
const photo = () => new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
describe('external photo uploads', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'test-cloud');
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'unsigned-test');
    vi.mocked(axios.request).mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());
  it('uploads multipart without backend authorization and validates metadata', async () => {
    vi.mocked(axios.request).mockResolvedValue({
      data: {
        secure_url: 'https://res.cloudinary.com/test/image.jpg',
        format: 'jpg',
      },
    });
    expect(await uploadRequestPhoto(photo())).toEqual({
      mediaUrl: 'https://res.cloudinary.com/test/image.jpg',
      mediaType: 'image/jpeg',
    });
    const options = vi.mocked(axios.request).mock.calls[0]![0]!;
    expect(options.url).toBe(
      'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
    );
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(options.withCredentials).toBe(false);
    expect((options.data as FormData).get('upload_preset')).toBe(
      'unsigned-test',
    );
  });
  it('rejects unconfigured uploads and invalid files before HTTP', () => {
    expect(() =>
      validatePhoto(new File(['x'], 'x.svg', { type: 'image/svg+xml' })),
    ).toThrow('Elige una foto JPEG');
    expect(() =>
      validatePhoto(new File([], 'empty.jpg', { type: 'image/jpeg' })),
    ).toThrow('10 MB');
    const large = photo();
    Object.defineProperty(large, 'size', { value: 11 * 1024 * 1024 });
    expect(() => validatePhoto(large)).toThrow('10 MB');
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '');
    expect(() => validatePhoto(photo())).toThrow('no está configurada');
    expect(axios.request).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { secure_url: 'http://example.test/p.jpg', format: 'jpg' },
    { secure_url: 'https://example.test/p.jpg', format: '../bad' },
    { secure_url: 'https://user:pass@example.test/p.jpg', format: 'png' },
  ])('rejects invalid external responses', async (data) => {
    vi.mocked(axios.request).mockResolvedValue({ data });
    await expect(uploadRequestPhoto(photo())).rejects.toThrow();
  });
  it('propagates upload failures without a retry', async () => {
    vi.mocked(axios.request).mockRejectedValue(new Error('offline'));
    await expect(uploadRequestPhoto(photo())).rejects.toThrow(
      'No se pudo subir la foto',
    );
    expect(axios.request).toHaveBeenCalledTimes(1);
  });
});
