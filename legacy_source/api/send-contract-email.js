const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'bbva_flexgeld',
  bankName: 'BBVA',
  contractFilename: (name) => `BBVA_Flexgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Flexgeldantrag: ${name} — ${date}`,
  adminTitle: 'Neuer Flexgeldantrag eingegangen',
  staticPdfs: [
    { url: '/pdfs/BBVA_Produktinformationsblatt_Flexgeld.pdf', filename: 'BBVA_Produktinformationsblatt_Flexgeld.pdf' },
    { url: '/pdfs/BBVA_Bedingungen_Flexgeld.pdf', filename: 'BBVA_Bedingungen_Flexgeld.pdf' },
  ],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
