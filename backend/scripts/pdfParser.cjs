// pdf-parse@1.1.1 has a bug where it checks `module.parent`.
// Since ES Modules don't have module.parent, it thinks it's being run directly
// and tries to load a test PDF that doesn't exist in the npm package.
// This CommonJS wrapper prevents that issue.
const pdfParse = require('pdf-parse');
module.exports = pdfParse;
