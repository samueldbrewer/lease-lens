import pdf from "pdf-parse";

export interface ParsedPDF {
  text: string;
  pageCount: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<ParsedPDF> {
  const data = await pdf(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
  };
}
