import pdf from "pdf-parse";

export interface PageBoundary {
  page: number;
  startOffset: number;
  endOffset: number;
}

export interface ParsedPDF {
  text: string;
  pageCount: number;
  pageTexts: string[];
  pageBoundaries: PageBoundary[];
}

export async function extractTextFromPDF(buffer: Buffer): Promise<ParsedPDF> {
  const pageTextsCollector: string[] = [];

  const data = await pdf(buffer, {
    pagerender: (pageData) => {
      return pageData.getTextContent().then((textContent) => {
        const pageText = textContent.items.map((item) => item.str).join("");
        pageTextsCollector.push(pageText);
        return pageText;
      });
    },
  });

  const rawText = data.text;
  const finalPageTexts = pageTextsCollector.length > 0 ? pageTextsCollector : [rawText];

  // Build page boundaries from the known concatenation pattern
  // pdf-parse joins page texts with \n\n
  const pageBoundaries: PageBoundary[] = [];
  let offset = 0;

  for (let i = 0; i < finalPageTexts.length; i++) {
    const pageStart = offset;
    const pageEnd = pageStart + finalPageTexts[i].length;

    pageBoundaries.push({
      page: i + 1,
      startOffset: pageStart,
      endOffset: pageEnd,
    });

    offset = pageEnd + 2; // \n\n separator
  }

  return {
    text: rawText,
    pageCount: data.numpages,
    pageTexts: finalPageTexts,
    pageBoundaries,
  };
}
