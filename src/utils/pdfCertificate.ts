import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { OrganizationSettings } from '../domain/types';

export interface CertificatePayload {
  cursistaName: string;
  churchName: string;
  turmaName: string;
  conclusionDate: string;
  settings: OrganizationSettings;
}

function base64ToUint8Array(base64OrDataUrl: string): Uint8Array {
  const cleanBase64 = base64OrDataUrl.includes(',')
    ? base64OrDataUrl.split(',')[1]
    : base64OrDataUrl;
  const binaryStr = window.atob(cleanBase64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

async function rasterizeImageToPngBytes(dataUrl: string): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = Math.min(img.naturalWidth || 240, 360);
        const targetH = Math.min(img.naturalHeight || 240, 200);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const pngUrl = canvas.toDataURL('image/png');
        resolve(base64ToUint8Array(pngUrl));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * RF-049 a RF-054:
 * Gera certificado individual em PDF pronto para impressão, utilizando o PDF modelo de fundo
 * (se enviado pelo Administrador) e exibindo o logo da organização no canto superior esquerdo,
 * preenchendo automaticamente nome do cursista, igreja e data de conclusão.
 */
export async function generateCertificatePdfBytes(
  payload: CertificatePayload
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  let pageWidth = 841.89; // A4 Landscape
  let pageHeight = 595.28;

  if (payload.settings.certificateTemplatePdfBase64) {
    try {
      const templateBytes = base64ToUint8Array(payload.settings.certificateTemplatePdfBase64);
      pdfDoc = await PDFDocument.load(templateBytes);
      const pages = pdfDoc.getPages();
      if (pages.length === 0) {
        pdfDoc.addPage([pageWidth, pageHeight]);
      }
    } catch {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([pageWidth, pageHeight]);
    }
  } else {
    pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([pageWidth, pageHeight]);
  }

  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  pageWidth = width;
  pageHeight = height;

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSerifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  // Se não houver PDF de fundo customizado, desenha moldura institucional limpa
  if (!payload.settings.certificateTemplatePdfBase64) {
    page.drawRectangle({
      x: 24,
      y: 24,
      width: pageWidth - 48,
      height: pageHeight - 48,
      borderColor: rgb(0.08, 0.32, 0.44),
      borderWidth: 2.5,
      color: rgb(0.985, 0.99, 0.995),
    });

    page.drawRectangle({
      x: 32,
      y: 32,
      width: pageWidth - 64,
      height: pageHeight - 64,
      borderColor: rgb(0.55, 0.72, 0.8),
      borderWidth: 0.8,
    });
  }

  // RF-053 / RF-060: Exibir o logo da organização na parte superior esquerda do certificado
  if (payload.settings.logoDataUrl) {
    const pngBytes = await rasterizeImageToPngBytes(payload.settings.logoDataUrl);
    if (pngBytes) {
      try {
        const embeddedLogo = await pdfDoc.embedPng(pngBytes);
        const dims = embeddedLogo.scaleToFit(90, 64);
        page.drawImage(embeddedLogo, {
          x: 52,
          y: pageHeight - 52 - dims.height,
          width: dims.width,
          height: dims.height,
        });
      } catch {
        // Fallback badge se o logo falhar
      }
    }
  } else {
    // Emblema tipográfico padrão no canto superior esquerdo
    page.drawRectangle({
      x: 52,
      y: pageHeight - 98,
      width: 155,
      height: 44,
      color: rgb(0.08, 0.32, 0.44),
    });
    page.drawText('MISSAO ENCHEIVOS', {
      x: 64,
      y: pageHeight - 74,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('TRES LAGOAS - MS', {
      x: 64,
      y: pageHeight - 88,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.82, 0.92, 0.96),
    });
  }

  const centerText = (
    text: string,
    y: number,
    size: number,
    font = fontRegular,
    color = rgb(0.12, 0.18, 0.24)
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(48, (pageWidth - textWidth) / 2),
      y,
      size,
      font,
      color,
    });
  };

  centerText(
    'CERTIFICADO DE CONCLUSÃO DE CURSO BÍBLICO',
    pageHeight - 135,
    20,
    fontBold,
    rgb(0.08, 0.32, 0.44)
  );
  centerText(
    payload.settings.organizationName || 'Missão EncheiVos – Três Lagoas',
    pageHeight - 162,
    12,
    fontRegular,
    rgb(0.32, 0.4, 0.48)
  );

  centerText(
    'Certificamos para os devidos fins pastorais e comunitários que',
    pageHeight - 220,
    13,
    fontRegular
  );

  // Nome do cursista (RF-050)
  centerText(
    payload.cursistaName,
    pageHeight - 268,
    26,
    fontSerifItalic,
    rgb(0.05, 0.22, 0.32)
  );

  // Linha sob o nome
  page.drawLine({
    start: { x: pageWidth * 0.2, y: pageHeight - 280 },
    end: { x: pageWidth * 0.8, y: pageHeight - 280 },
    thickness: 1,
    color: rgb(0.65, 0.75, 0.82),
  });

  const formattedDate = payload.conclusionDate.includes('-')
    ? payload.conclusionDate.split('-').reverse().join('/')
    : payload.conclusionDate;

  centerText(
    `concluiu com aproveitamento e frequência regular os 19 Encontros do Curso Bíblico`,
    pageHeight - 318,
    13,
    fontRegular
  );
  centerText(
    `realizado na ${payload.churchName} (${payload.turmaName})`,
    pageHeight - 342,
    14,
    fontBold,
    rgb(0.1, 0.26, 0.36)
  );
  centerText(
    `Data de Conclusão: ${formattedDate}  •  ${payload.settings.city || 'Três Lagoas – MS'}`,
    pageHeight - 375,
    12,
    fontRegular,
    rgb(0.28, 0.35, 0.42)
  );

  // Linhas de assinatura
  const sigY = 105;
  page.drawLine({
    start: { x: 130, y: sigY },
    end: { x: 350, y: sigY },
    thickness: 0.9,
    color: rgb(0.3, 0.38, 0.45),
  });
  page.drawText('Coordenação Local — Missão EncheiVos', {
    x: 155,
    y: sigY - 16,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.38, 0.45),
  });

  page.drawLine({
    start: { x: pageWidth - 350, y: sigY },
    end: { x: pageWidth - 130, y: sigY },
    thickness: 0.9,
    color: rgb(0.3, 0.38, 0.45),
  });
  page.drawText(`Pároco / Formador — ${payload.churchName.slice(0, 28)}`, {
    x: pageWidth - 335,
    y: sigY - 16,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.38, 0.45),
  });

  return pdfDoc.save();
}

export async function downloadCertificatePdf(payload: CertificatePayload): Promise<void> {
  const pdfBytes = await generateCertificatePdfBytes(payload);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = payload.cursistaName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase();
  a.href = url;
  a.download = `certificado_${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
