import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PhotoUploadError,
  uploadRequestPhoto,
} from '../../shared/api/cloudinary';
import { addEvidence, listEvidences } from './api';
import { RequestPhotoUpload } from './RequestPhotoUpload';
vi.mock('../../shared/api/cloudinary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/api/cloudinary')>()),
  uploadRequestPhoto: vi.fn(),
}));
vi.mock('./api', () => ({ addEvidence: vi.fn(), listEvidences: vi.fn() }));
const metadata = {
  mediaUrl: 'https://example.test/photo.jpg',
  mediaType: 'image/jpeg',
};
const evidence = { ...metadata, requestId: 7, evidenceNumber: 1 };
describe('RequestPhotoUpload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(uploadRequestPhoto).mockResolvedValue(metadata);
    vi.mocked(listEvidences).mockResolvedValue([]);
    vi.mocked(addEvidence).mockResolvedValue(evidence);
  });
  it('selects and saves a photo for an existing request', async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();
    render(<RequestPhotoUpload requestId={7} onAdded={onAdded} />);
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeDisabled();
    await user.upload(
      screen.getByLabelText('Agregar una foto desde tu computadora'),
      new File(['image'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir foto' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Foto guardada.',
    );
    expect(addEvidence).toHaveBeenCalledWith(7, metadata);
    expect(onAdded).toHaveBeenCalledOnce();
  });
  it('reuses the uploaded URL and reconciles a write that timed out', async () => {
    const user = userEvent.setup();
    vi.mocked(addEvidence).mockRejectedValueOnce(new Error('timeout'));
    render(<RequestPhotoUpload requestId={7} onAdded={vi.fn()} />);
    await user.upload(
      screen.getByLabelText('Agregar una foto desde tu computadora'),
      new File(['image'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir foto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no se pudo confirmar el registro',
    );
    vi.mocked(listEvidences).mockResolvedValue([evidence]);
    await user.click(
      screen.getByRole('button', { name: 'Reintentar guardar foto' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Foto guardada.',
    );
    expect(addEvidence).toHaveBeenCalledTimes(1);
    expect(uploadRequestPhoto).toHaveBeenCalledTimes(1);
  });
  it('finishes a pending photo from publication without uploading again', async () => {
    const user = userEvent.setup();
    render(
      <RequestPhotoUpload
        requestId={7}
        pendingPhoto={{ metadata }}
        onAdded={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La solicitud se publicó',
    );
    await user.click(
      screen.getByRole('button', { name: 'Reintentar guardar foto' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Foto guardada.',
    );
    expect(uploadRequestPhoto).not.toHaveBeenCalled();
  });
  it('hides raw errors of the upload service behind generic copy', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadRequestPhoto).mockRejectedValue(new Error('Network Error'));
    render(<RequestPhotoUpload requestId={7} onAdded={vi.fn()} />);
    await user.upload(
      screen.getByLabelText('Agregar una foto desde tu computadora'),
      new File(['image'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir foto' }));
    expect(await screen.findByRole('alert')).not.toHaveTextContent(
      'Network Error',
    );
  });
  it('reports upload errors without registering evidence', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadRequestPhoto).mockRejectedValue(
      new PhotoUploadError('La subida de fotos no está configurada.'),
    );
    render(<RequestPhotoUpload requestId={7} onAdded={vi.fn()} />);
    await user.upload(
      screen.getByLabelText('Agregar una foto desde tu computadora'),
      new File(['image'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    await user.click(screen.getByRole('button', { name: 'Subir foto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no está configurada',
    );
    expect(addEvidence).not.toHaveBeenCalled();
  });
});
