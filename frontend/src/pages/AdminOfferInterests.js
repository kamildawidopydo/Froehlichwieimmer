import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  AdminSubpageLayout,
  AdminSubpageHeader,
  AdminToolbarCard,
  AdminSurfaceCard,
  adminTheadClass,
  adminRowHover,
} from '@/components/admin/AdminSubpageChrome';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, Search, Mail, Phone, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';

const AdminOfferInterests = () => {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('offer_interests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterests(data || []);
    } catch (error) {
      toast.error('Fehler beim Laden der Interessenten: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteInterest = async (id) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) return;
    
    try {
      const { error } = await supabase.from('offer_interests').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Eintrag erfolgreich gelöscht');
      setInterests((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      toast.error('Fehler beim Löschen: ' + error.message);
    }
  };

  const filteredInterests = interests.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.offer_bank_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminSubpageLayout>
        <AdminSubpageHeader
          eyebrow="Admin · Leads"
          title="Interessenten"
          titleIcon={Inbox}
          description="Anfragen zu Festgeld- und Tagesgeldangeboten — Kontakt und Zuordnung zur Bank."
        />

        <AdminToolbarCard className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-text-muted/70" size={18} />
              <Input
                placeholder="Suchen nach Name, E-Mail oder Bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 w-full"
              />
            </div>
            <p className="text-sm text-bank-text-muted tabular-nums">
              {filteredInterests.length} {filteredInterests.length === 1 ? 'Eintrag' : 'Einträge'} gefunden
            </p>
        </AdminToolbarCard>

        <AdminSurfaceCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={adminTheadClass}>
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Datum</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Kontakt</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Bank / Angebot</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-bank-text-muted">Nachricht</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-bank-text-muted">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bank-border/60">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-bank-text-muted">
                      Lädt Daten...
                    </td>
                  </tr>
                ) : filteredInterests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-bank-text-muted">
                      Keine Interessenten gefunden.
                    </td>
                  </tr>
                ) : (
                  filteredInterests.map((item) => (
                    <tr key={item.id} className={adminRowHover}>
                      <td className="px-6 py-4 whitespace-nowrap text-bank-text-muted">
                        {item.created_at ? format(new Date(item.created_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '—'}
                      </td>
                      <td className="px-6 py-4 font-medium text-bank-text">{item.name}</td>
                      <td className="px-6 py-4 text-bank-text-muted space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-bank-text-muted/70" />
                          <a href={`mailto:${item.email}`} className="text-bank-accent hover:underline">{item.email}</a>
                        </div>
                        {item.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-bank-text-muted/70" />
                            <a href={`tel:${item.phone}`} className="text-bank-text-muted hover:text-bank-text">{item.phone}</a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bank-accent/15 text-bank-text-muted">
                          {item.offer_bank_name || 'Unbekannt'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-bank-text-muted max-w-xs truncate" title={item.message}>
                        {item.message || <span className="text-bank-text-muted/70 italic">Keine Nachricht</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteInterest(item.id)}
                          className="p-2 text-bank-error hover:bg-bank-error/10 hover:text-bank-error rounded-lg transition-colors"
                          title="Eintrag löschen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSurfaceCard>
    </AdminSubpageLayout>
  );
};

export default AdminOfferInterests;
