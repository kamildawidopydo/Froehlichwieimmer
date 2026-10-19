import React, { useState } from 'react';
import { Eye, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { panelApi, extractErrorMessage } from '@/lib/panelApi';

/** Geschützte Ansicht: kurzlebiger Link (5 Min.), wird nur auf Klick erzeugt und protokolliert. */
export default function KycDocViewer({ docId, label = 'Ansehen' }) {
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  const [zoom, setZoom] = useState(1);
  const show = async () => {
    setOpen(true); setDoc(null); setErr(null); setZoom(1);
    try { setDoc(await panelApi.get(`kyc/doc/${docId}`)); } catch (e) { setErr(extractErrorMessage(e)); }
  };
  return (
    <>
      <Button size="sm" variant="outline" className="mt-2" onClick={show}><Eye className="mr-1.5 h-3.5 w-3.5" />{label}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Dokument (geschützte Ansicht)</DialogTitle></DialogHeader>
          {!doc && !err && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {err && <p className="text-sm text-red-700">{err}</p>}
          {doc && (doc.mime_type === 'application/pdf'
            ? <iframe title="Dokument" src={doc.url} className="h-[75vh] w-full border border-bank-border" />
            : <>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
                <span className="self-center text-xs text-bank-text-muted">{Math.round(zoom * 100)} %</span>
              </div>
              <div className="h-[70vh] overflow-auto border border-bank-border bg-bank-bg">
                <img src={doc.url} alt="Ausweisdokument" style={{ width: `${zoom * 100}%` }} className="max-w-none" />
              </div>
            </>)}
          <p className="text-xs text-bank-text-muted">Der Link ist nur 5 Minuten gültig. Jeder Aufruf wird im Audit-Log festgehalten.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
