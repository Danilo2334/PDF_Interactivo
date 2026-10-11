"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";

export function PdfFileSelector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function selectFile(file?: File) {
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);
      setError("Solo se permiten archivos en formato PDF.");
      return;
    }

    setSelectedFile(file);
    setError("");
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <section className="w-full max-w-2xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? "border-blue-600 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-500"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        <p className="text-lg font-semibold text-slate-900">
          Arrastra tu archivo PDF aquí
        </p>

        <p className="mt-2 text-sm text-slate-600">
          O haz clic para seleccionarlo desde tu equipo
        </p>

        <span className="mt-5 inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">
          Seleccionar PDF
        </span>
      </div>

      {selectedFile && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">Archivo seleccionado</p>
          <p className="mt-1 break-all text-sm text-green-700">
            {selectedFile.name}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}