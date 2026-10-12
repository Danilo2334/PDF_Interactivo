"use client";

import Link from "next/link";
import { validatePdfFile } from "@/lib/validations/pdf-file";
import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";

type UploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "success"
  | "error";

export function PdfFileSelector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);
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

  const isBusy =
    uploadStatus === "uploading" ||
    uploadStatus === "processing";

  async function selectFile(file?: File) {
    if (!file || isBusy) return;

    setSelectedFile(null);
    setFileError("");
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadMessage("");
    setCreatedProjectId(null);

    const validation = await validatePdfFile(file);

    if (!validation.valid) {
      setFileError(validation.message);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void selectFile(event.dataTransfer.files?.[0]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      !isBusy &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  function uploadFile() {
    if (
      !selectedFile ||
      uploadInFlightRef.current ||
      uploadStatus === "success"
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const request = new XMLHttpRequest();

    // Bloquea inmediatamente un segundo envío por doble clic.
    uploadInFlightRef.current = true;

    setFileError("");
    setCreatedProjectId(null);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadMessage("Transfiriendo archivo...");

    function finishWithError(message: string) {
      uploadInFlightRef.current = false;
      setUploadStatus("error");
      setUploadMessage(message);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        setUploadProgress(
          Math.min(
            100,
            Math.floor((event.loaded / event.total) * 100),
          ),
        );
      }
    };

    request.upload.onload = () => {
      if (!uploadInFlightRef.current) return;

      setUploadProgress(100);
      setUploadStatus("processing");
      setUploadMessage(
        "Archivo enviado. Validando y guardando el PDF...",
      );
    };

    request.onload = () => {
      let response: {
        message?: string;
        project?: { id?: string };
      } = {};

      try {
        const parsed = JSON.parse(request.responseText);

        if (parsed && typeof parsed === "object") {
          response = parsed;
        }
      } catch {
        response = {};
      }

      const projectId = response.project?.id;

      if (
        request.status >= 200 &&
        request.status < 300 &&
        typeof projectId === "string" &&
        projectId.length > 0
      ) {
        uploadInFlightRef.current = false;
        setUploadStatus("success");
        setUploadProgress(100);
        setUploadMessage(
          response.message ?? "Proyecto creado correctamente.",
        );
        setCreatedProjectId(projectId);
        return;
      }

      finishWithError(
        typeof response.message === "string"
          ? response.message
          : "No se pudo confirmar la carga. Revisa Mis documentos antes de reintentar.",
      );
    };

    request.onerror = () => {
      finishWithError(
        "Se perdió la conexión. Revisa Mis documentos antes de reintentar la carga.",
      );
    };

    request.onabort = () => {
      finishWithError(
        "La transferencia se interrumpió. Revisa Mis documentos antes de reintentar.",
      );
    };

    try {
      request.open("POST", "/api/documents/upload");
      request.send(formData);
    } catch {
      finishWithError(
        "No fue posible iniciar la transferencia. Inténtalo nuevamente.",
      );
    }
  }

  return (
    <section className="w-full max-w-2xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!isBusy) {
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
          isBusy
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
          disabled={isBusy}
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
            disabled={isBusy || uploadStatus === "success"}
            className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {uploadStatus === "processing"
              ? "Procesando PDF..."
              : uploadStatus === "uploading"
                ? "Transfiriendo..."
                : uploadStatus === "error"
                  ? "Reintentar transferencia"
                  : uploadStatus === "success"
                    ? "Carga completada"
                    : "Cargar PDF"}
          </button>
        </div>
      )}

      {isBusy && (
        <div className="mt-4" role="status" aria-live="polite">
          {uploadStatus === "uploading" ? (
            <>
              <progress
                value={uploadProgress}
                max={100}
                aria-label="Progreso de transferencia del PDF"
                className="h-3 w-full accent-blue-700"
              />

              <p className="mt-2 text-sm text-slate-700">
                {uploadProgress}% transferido
              </p>
            </>
          ) : (
            <p className="font-medium text-blue-800">
              Transferencia terminada. Procesando PDF...
            </p>
          )}

          <p className="mt-2 text-sm text-slate-700">
            {uploadMessage}
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
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="font-semibold text-red-800">
            No se pudo aceptar el archivo
          </p>

          <p className="mt-1 text-sm text-red-700">
            {fileError || uploadMessage}
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Seleccionar otro PDF
          </button>
        </div>
      )}
    </section>
  );
}
