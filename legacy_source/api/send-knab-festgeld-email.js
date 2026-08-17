const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'knab_festgeld',
  bankName: 'Knab',
  contractFilename: (name) => `Knab_Festgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Knab Festgeldantrag: ${name} — ${date}`,
  adminTitle: 'Neuer Knab Festgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
