const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'knab_flexgeld',
  bankName: 'Knab',
  contractFilename: (name) => `Knab_Flexgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Knab Flexgeldantrag: ${name} — ${date}`,
  adminTitle: 'Neuer Knab Flexgeldantrag eingegangen',
  staticPdfs: [],
  staticPdfLinks: [
    { url: '/pdfs/Knab_Produktinformationsblatt_Flexgeld.pdf', filename: 'Knab_Produktinformationsblatt_Flexgeld.pdf' },
  ],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
