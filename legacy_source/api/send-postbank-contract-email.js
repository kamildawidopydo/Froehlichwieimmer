const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'postbank_flexgeld',
  bankName: 'Postbank',
  contractFilename: (name) => `Postbank_Flexgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Flexgeldantrag (Postbank): ${name} — ${date}`,
  adminTitle: 'Neuer Postbank Flexgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
