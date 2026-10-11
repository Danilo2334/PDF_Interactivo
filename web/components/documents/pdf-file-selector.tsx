"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function PdfFileSelector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [uploadStatus, setUploadStatus] =
    useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(
    null,
  );

  function selectFile(file?: File) {
    if (!file || uploadStatus === "uploading") return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setSelectedFile(null);
      setFileError("Solo se permiten archivos en formato PDF.");
      return;
    }

    setSelectedFile(file);
    setFileError("");
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadMessage("");
    setCreatedProjectId(null);
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
    if (
      uploadStatus !== "uploading" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  function uploadFile() {
    if (!selectedFile || uploadStatus === "uploading") return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    const request = new XMLHttpRequest();

    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadMessage("Transfiriendo archivo...");

    request.open("POST", "/api/documents/upload");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round(
          (event.loaded / event.total) * 100,
        );

        setUploadProgress(percentage);
      }
    };

    request.onload = () => {
      let response: {
        message?: string;
        project?: {
          id: string;
        };
      } = {};

      try {
        response = JSON.parse(request.responseText);
      } catch {
        response = {};
      }

      if (request.status >= 200 && request.status < 300) {
        setUploadStatus("success");
        setUploadProgress(100);
        setUploadMessage(
          response.message ?? "Transferencia completada correctamente.",
        );
        setCreatedProjectId(response.project?.id ?? null);
        return;
      }

      setUploadStatus("error");
      setUploadMessage(
        response.message ?? "No fue posible transferir el archivo.",
      );
    };

    request.onerror = () => {
      setUploadStatus("error");
      setUploadMessage(
        "Se perdió la conexión durante la transferencia.",
      );
    };

    request.send(formData);
  }

  return (
    <section className="w-full max-w-2xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (uploadStatus !== "uploading") {
            inputRef.current?.click();
          }
        }}
        onKeyDown={handleKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          uploadStatus === "uploading"
            ? "cursor-not-allowed border-slate-300 bg-slate-100"
            : isDragging
              ? "cursor-pointer border-blue-600 bg-blue-50"
              : "cursor-pointer border-slate-300 bg-white hover:border-blue-500"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          disabled={uploadStatus === "uploading"}
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
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <p className="font-medium text-slate-900">
            Archivo seleccionado
          </p>

          <p className="mt-1 break-all text-sm text-slate-700">
            {selectedFile.name}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Tamaño: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>
          <button
            type="button"
            onClick={uploadFile}
            disabled={
              uploadStatus === "uploading" ||
              uploadStatus === "success"
            }
            className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {uploadStatus === "uploading"
              ? "Transfiriendo..."
              : uploadStatus === "error"
                ? "Reintentar transferencia"
                : uploadStatus === "success"
                  ? "Transferencia completada"
                  : "Cargar PDF"}
          </button>
        </div>
      )}

      {uploadStatus === "uploading" && (
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-blue-700 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-slate-700">
            {uploadProgress}% — {uploadMessage}
          </p>
        </div>
      )}

      {uploadStatus === "success" && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">{uploadMessage}</p>

          {createdProjectId && (
            <Link
              href={`/projects/${createdProjectId}`}
              className="mt-4 inline-block rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Abrir proyecto
            </Link>
          )}
        </div>
      )}

      {(fileError || uploadStatus === "error") && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {fileError || uploadMessage}
        </p>
      )}
    </section>
  );
}
