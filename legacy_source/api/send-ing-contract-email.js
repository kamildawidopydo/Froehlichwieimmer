const { processContractEmailSubmission } = require('../server/lib/contractEmailSubmission');
const { withApiHandler } = require('../server/lib/vercelHttp');

const CONFIG = {
  productKey: 'ing_flexgeld',
  bankName: 'ING',
  contractFilename: (name) => `ING_Flexgeldvertrag_${name.replace(/\s+/g, '_')}.pdf`,
  adminSubject: (name, date) => `Neuer Flexgeldantrag (ING): ${name} — ${date}`,
  adminTitle: 'Neuer ING Flexgeldantrag eingegangen',
  staticPdfs: [],
};

module.exports = withApiHandler((req, res) => processContractEmailSubmission(req, res, CONFIG));
