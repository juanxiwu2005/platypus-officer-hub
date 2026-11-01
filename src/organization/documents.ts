/** Files are decoded locally; only extracted, reviewed text is sent to the setup service. */
export async function readConstitution(file: File): Promise<string> {
  if (file.size > 8_000_000) throw new Error("Use a file smaller than 8 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  let text = "";
  if (ext === "pdf") {
    const pdf = await import("pdfjs-dist");
    const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
      .default;
    pdf.GlobalWorkerOptions.workerSrc = worker;
    const task = pdf.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    try {
      const doc = await task.promise;
      if (doc.numPages > 50)
        throw new Error("Use a constitution of 50 pages or fewer.");
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        pages.push(
          content.items
            .map((item) =>
              "str" in item
                ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
                : "",
            )
            .join(""),
        );
      }
      text = pages.join("\n\n");
    } finally {
      await task.destroy();
    }
  } else if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    text = result.value;
  } else if (ext === "txt" || ext === "md") text = await file.text();
  else
    throw new Error(
      "Choose a PDF, Word (.docx), .txt or .md file. Google Docs connections come later.",
    );
  text = text.replace(/\r\n?/g, "\n").trim();
  if (text.length < 20)
    throw new Error(
      "No readable text was found. For a scanned PDF, paste its text or upload a text-based PDF or Word file.",
    );
  if (text.length > 60000)
    throw new Error(
      "This document is too long for the prototype. Use a shorter fictional constitution or paste the relevant sections.",
    );
  return text;
}
export async function documentSource(text: string, fileName: string) {
  const clean = text
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[contact redacted]",
    )
    .replace(
      /\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g,
      "[phone redacted]",
    );
  if (/(?:api[_ -]?key|password|secret)\s*[:=]\s*\S+/i.test(clean))
    throw new Error(
      "Remove credentials before uploading this fictional document.",
    );
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(clean),
  );
  return {
    fileName,
    text: clean,
    checksum: [...new Uint8Array(bytes)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join(""),
    uploadedAt: new Date().toISOString(),
  };
}
