import { useRef, useState } from 'react';
import {
  PhotoUploadError,
  uploadRequestPhoto,
} from '../../shared/api/cloudinary';
import type { CreateEvidence } from '../../shared/api/types';
import { describeApiError } from '../../shared/api/errorMessages';
import { useSubmitGuard } from '../../shared/hooks/useSubmitGuard';
import { Button } from '../../shared/ui/Button';
import { addEvidence, listEvidences } from './api';
import type { PendingPhoto } from './publishWithPhoto';

export function RequestPhotoUpload({
  requestId,
  pendingPhoto,
  onAdded,
}: {
  requestId: number;
  pendingPhoto?: PendingPhoto | null;
  onAdded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState(
    pendingPhoto
      ? 'La solicitud se publicó, pero no se confirmó el registro de la foto. Reintenta para comprobarlo y completar el guardado.'
      : '',
  );
  const [message, setMessage] = useState('');
  const [metadata, setMetadata] = useState<CreateEvidence | null>(
    pendingPhoto?.metadata ?? null,
  );
  const input = useRef<HTMLInputElement>(null);
  const { run: save, isSubmitting } = useSubmitGuard(async () => {
    setError('');
    setMessage('');
    let uploaded = metadata;
    try {
      if (!uploaded) {
        if (!file) throw new PhotoUploadError('Primero selecciona una foto.');
        uploaded = await uploadRequestPhoto(file);
        setMetadata(uploaded);
      }
      // Reconcile uncertain writes before a manual retry; never retry POST automatically.
      const existing = await listEvidences(requestId);
      if (!existing.some((item) => item.mediaUrl === uploaded?.mediaUrl)) {
        await addEvidence(requestId, uploaded);
      }
      setMetadata(null);
      setFile(null);
      if (input.current) input.current.value = '';
      setMessage('Foto guardada.');
      onAdded();
    } catch (cause) {
      setError(
        uploaded
          ? 'La foto se subió, pero no se pudo confirmar el registro. Al reintentar se comprobará si ya está guardada.'
          : cause instanceof PhotoUploadError
            ? cause.message
            : describeApiError(cause).message,
      );
    }
  });
  return (
    <div className="grid gap-3">
      <label className="grid gap-2">
        Agregar una foto desde tu computadora
        <span
          aria-hidden="true"
          className="inline-flex min-h-11 w-fit items-center rounded-lg border border-line bg-surface px-4 font-semibold"
        >
          Seleccionar archivo
        </span>
        <input
          aria-label="Agregar una foto desde tu computadora"
          className="visually-hidden"
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif"
          disabled={isSubmitting || !!metadata}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setError('');
            setMessage('');
          }}
        />
      </label>
      <p className="m-0 text-sm">
        {file ? (
          <>Archivo seleccionado: {file.name}</>
        ) : (
          'Ningún archivo seleccionado.'
        )}
      </p>
      <Button
        loading={isSubmitting}
        disabled={!file && !metadata}
        onClick={() => void save()}
      >
        {metadata ? 'Reintentar guardar foto' : 'Subir foto'}
      </Button>
      {!!error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}
      {!!message && (
        <p role="status" className="m-0 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
