/** Öffentliche Kundendokumente — PDFs unter /assets/documents/ */
export const CUSTOMER_DOCUMENTS = [
  {
    id: 'kundendokumente',
    title: 'Kundendokumente',
    description: 'Wichtige Unterlagen und Hinweise für unsere Kunden — zum Herunterladen und Aufbewahren.',
    file: '/assets/documents/Kapitalmitte_Kundendokumente.pdf',
    downloadName: 'Kapitalmitte_Kundendokumente.pdf',
  },
  {
    id: 'risiken-kapitalanlage',
    title: 'Risiken der Kapitalanlage',
    description: 'Informationen zu Chancen und Risiken bei Kapitalanlagen gemäß den gesetzlichen Vorgaben.',
    file: '/assets/documents/Kapitalmitte_Risiken_der_Kapitalanlage.pdf',
    downloadName: 'Kapitalmitte_Risiken_der_Kapitalanlage.pdf',
  },
  {
    id: 'freistellungsauftrag',
    title: 'Freistellungsauftrag',
    description: 'Formular zur steuerlichen Freistellung von Kapitalerträgen — ausfüllbar und einreichbar.',
    file: '/assets/documents/Freistellungsauftrag.pdf',
    downloadName: 'Freistellungsauftrag.pdf',
  },
  {
    id: 'informationsbogen-einlagen',
    title: 'Informationsbogen Einlagenlösungen',
    description: 'Produktinformationen zu Festgeld, Tagesgeld und weiteren Einlagenlösungen.',
    file: '/assets/documents/Kapitalmitte_Informationsbogen_Einlagenloesungen.pdf',
    downloadName: 'Kapitalmitte_Informationsbogen_Einlagenloesungen.pdf',
  },
];

export const getCustomerDocumentById = (id) =>
  CUSTOMER_DOCUMENTS.find((doc) => doc.id === id) ?? null;
