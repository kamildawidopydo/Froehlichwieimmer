const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'bbva_festgeld',
  bankName: 'BBVA',
  contractFilename: (name) => `BBVA_Festgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Festgeldantrag: ${name} — ${date}`,
  adminTitle: 'Neuer Festgeldantrag eingegangen',
  staticPdfs: [
    { url: '/pdfs/BBVA_Bedingungen_Festgeldkonto.pdf', filename: 'BBVA_Bedingungen_Festgeldkonto.pdf' },
    { url: '/pdfs/BBVA_Produktinformationsblatt_Festgeld.pdf', filename: 'BBVA_Produktinformationsblatt_Festgeld.pdf' },
  ],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
