"use client";

import { useEffect } from "react";

type Props = {
  metric: "listado" | "primera-pagina-pdf";
  items: number;
};

export function ViewTiming({ metric, items }: Props) {
  useEffect(() => {
    if (sessionStorage.getItem("medir-rendimiento") !== "1") return;

    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;

    // El procedimiento mide recargas completas de la ruta actual.
    if (
      !navigation ||
      navigation.type !== "reload" ||
      new URL(navigation.name).pathname !== window.location.pathname
    ) {
      return;
    }

    const measurementName = `SCRUM-146:${metric}`;

    if (performance.getEntriesByName(measurementName).length > 0) return;

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (document.visibilityState !== "visible") return;

        const end = performance.now();

        performance.measure(measurementName, {
          start: 0,
          end,
        });

        const pdfRequest = (
          performance.getEntriesByType(
            "resource",
          ) as PerformanceResourceTiming[]
        ).find((entry) => {
          const path = new URL(entry.name).pathname;
          return path.startsWith("/api/projects/") && path.endsWith("/pdf");
        });

        console.table([
          {
            vista: metric,
            total_segundos: Number((end / 1000).toFixed(3)),
            respuesta_inicial_segundos: Number(
              (navigation.responseStart / 1000).toFixed(3),
            ),
            solicitud_pdf_segundos: pdfRequest
              ? Number((pdfRequest.duration / 1000).toFixed(3))
              : "No aplica",
            elementos_o_paginas: items,
          },
        ]);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [metric, items]);

  return null;
}
