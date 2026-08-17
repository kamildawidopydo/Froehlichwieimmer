import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV, downloadFile } from '@/lib/export';
import { generateProductReportPdf } from '@/lib/generateProductReportPdf';
import { toast } from 'sonner';

/**
 * Renders CSV / PDF export buttons for product dashboard pages.
 *
 * @param {object} props
 * @param {string} props.fileBase                        Filename stem (without extension).
 * @param {string} props.title                           Title for the PDF document.
 * @param {string} [props.subtitle]                      Subtitle for the PDF.
 * @param {Array<{header:string,value:string|Function,align?:string,width?:number}>} props.columns
 * @param {Array<object>} props.rows
 * @param {Array<{label:string,value:string,hint?:string}>} [props.kpis]
 * @param {boolean} [props.disabled]
 */
const ExportActions = ({
  fileBase,
  title,
  subtitle,
  columns = [],
  rows = [],
  kpis = [],
  disabled = false,
}) => {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleCSV = () => {
    if (!rows.length) {
      toast.info('Keine Datensätze zum Exportieren.');
      return;
    }
    try {
      downloadCSV(rows, columns, fileBase);
      toast.success('CSV-Datei wurde heruntergeladen.');
    } catch (err) {
      toast.error('CSV-Export fehlgeschlagen.');
      console.error(err);
    }
  };

  const handlePDF = async () => {
    if (!rows.length) {
      toast.info('Keine Datensätze zum Exportieren.');
      return;
    }
    setPdfLoading(true);
    try {
      const blob = await generateProductReportPdf({
        title,
        subtitle,
        kpis,
        columns,
        rows,
      });
      downloadFile(blob, `${fileBase}.pdf`, 'application/pdf');
      toast.success('PDF wurde heruntergeladen.');
    } catch (err) {
      console.error(err);
      toast.error('PDF-Export fehlgeschlagen.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        onClick={handleCSV}
        disabled={disabled}
      >
        <Download size={12} /> CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        onClick={handlePDF}
        disabled={disabled || pdfLoading}
      >
        <FileText size={12} /> {pdfLoading ? 'PDF…' : 'PDF'}
      </Button>
    </div>
  );
};

export default ExportActions;
