const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'bunq_flexgeld',
  bankName: 'bunq NL',
  contractFilename: (name) => `bunq_NL_Flexgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Flexgeldantrag (bunq NL): ${name} — ${date}`,
  adminTitle: 'Neuer bunq NL Flexgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
