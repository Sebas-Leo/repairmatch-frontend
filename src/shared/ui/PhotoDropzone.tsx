import { ImagePlus, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { cx } from './cx';

interface PhotoDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
}

/**
 * Drop a photo or pick one from the device. The preview lives only in the
 * browser (an object URL), so nothing leaves the device until the request
 * is published.
 */
export function PhotoDropzone({
  file,
  onChange,
  label = 'Foto del equipo malogrado',
}: PhotoDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function accept(list: FileList | null) {
    const picked = list?.[0];
    if (picked && picked.type.startsWith('image/')) onChange(picked);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="peer visually-hidden"
        onChange={(event) => accept(event.target.files)}
      />
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cx(
          'grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed text-center transition-[background-color,border-color] duration-300 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-accent',
          dragging
            ? 'border-brand bg-brand-soft'
            : 'border-line bg-surface hover:border-cobalt/50',
        )}
      >
        {preview ? (
          <img
            src={preview}
            alt="Vista previa de la foto elegida"
            className="size-full object-cover"
          />
        ) : (
          <span className="grid justify-items-center gap-2 px-6">
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full bg-surface text-brand"
            >
              <ImagePlus size={22} />
            </span>
            <span className="font-semibold">{label}</span>
            <span className="text-sm text-muted">
              Arrástrala aquí o haz clic · Opcional
            </span>
          </span>
        )}
      </label>
      {file ? (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="absolute top-3 right-3 inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
        >
          <X size={14} aria-hidden="true" />
          Quitar foto
        </button>
      ) : null}
    </div>
  );
}
