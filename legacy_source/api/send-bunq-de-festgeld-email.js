const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'bunq_de_festgeld',
  bankName: 'bunq DE',
  contractFilename: (name) => `bunq_DE_Festgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Festgeldantrag (bunq DE): ${name} — ${date}`,
  adminTitle: 'Neuer bunq DE Festgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
