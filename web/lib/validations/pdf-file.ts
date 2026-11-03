export const PDF_MAX_SIZE_BYTES = 20 * 1024 * 1024;
export const PDF_ALLOWED_MIME_TYPE = "application/pdf";
export const PDF_SIGNATURE = "%PDF-";

export type PdfValidationErrorCode =
  | "EMPTY_FILE"
  | "INVALID_EXTENSION"
  | "INVALID_MIME_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_SIGNATURE"
  | "READ_ERROR";

export type PdfValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      code: PdfValidationErrorCode;
      message: string;
    };

export async function validatePdfFile(
  file: File,
): Promise<PdfValidationResult> {
  if (file.size === 0) {
    return {
      valid: false,
      code: "EMPTY_FILE",
      message: "El archivo PDF está vacío.",
    };
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return {
      valid: false,
      code: "INVALID_EXTENSION",
      message: "El archivo debe tener extensión .pdf.",
    };
  }

  if (file.type !== PDF_ALLOWED_MIME_TYPE) {
    return {
      valid: false,
      code: "INVALID_MIME_TYPE",
      message: "El tipo real del archivo debe ser application/pdf.",
    };
  }

  if (file.size > PDF_MAX_SIZE_BYTES) {
    return {
      valid: false,
      code: "FILE_TOO_LARGE",
      message: "El archivo PDF no puede superar los 20 MB.",
    };
  }

  try {
    const firstBytes = await file.slice(0, PDF_SIGNATURE.length).arrayBuffer();
    const signature = new TextDecoder().decode(firstBytes);

    if (signature !== PDF_SIGNATURE) {
      return {
        valid: false,
        code: "INVALID_SIGNATURE",
        message: "El archivo seleccionado no contiene una firma PDF válida.",
      };
    }
  } catch {
    return {
      valid: false,
      code: "READ_ERROR",
      message: "No fue posible leer el archivo seleccionado.",
    };
  }

  return {
    valid: true,
  };
}
