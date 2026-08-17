const { withApiHandler } = require('../server/lib/vercelHttp');
const { processDocumentUpload } = require('../server/lib/documentUploadSubmission');

module.exports = withApiHandler(processDocumentUpload);
