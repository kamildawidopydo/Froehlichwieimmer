const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'bunq_festgeld',
  bankName: 'bunq NL',
  contractFilename: (name) => `bunq_NL_Festgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Festgeldantrag (bunq NL): ${name} — ${date}`,
  adminTitle: 'Neuer bunq NL Festgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
