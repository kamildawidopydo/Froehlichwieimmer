const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'bunq_de_flexgeld',
  bankName: 'bunq DE',
  contractFilename: (name) => `bunq_DE_Flexgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Flexgeldantrag (bunq DE): ${name} — ${date}`,
  adminTitle: 'Neuer bunq DE Flexgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
