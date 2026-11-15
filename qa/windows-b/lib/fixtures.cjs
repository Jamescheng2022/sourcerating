'use strict';
// Deterministic synthetic upload fixtures, shared by the browser tool server and the P0 oracle (which needs their SHA-256).
const crypto = require('crypto');
const pdf = (label) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\n% ${label}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const file = (name, label) => () => ({ name, mimeType: 'application/pdf', buffer: pdf(label) });
const FIXTURES = {
  'pdf-a': file('qa-drawing.pdf', 'synthetic A'),
  'pdf-b': file('qa-drawing.pdf', 'synthetic B'),
  rev0: file('QA_Joint_Plate_Rev0.pdf', 'synthetic joint plate Rev0 plate t=12mm bolts M20'),
  rev1: file('QA_Joint_Plate_Rev1.pdf', 'synthetic joint plate Rev1 plate t=16mm bolts M24'),
  rev2: file('QA_Joint_Plate_Rev2.pdf', 'synthetic joint plate Rev2 plate t=16mm bolts M24 edge distance 40mm'),
};
const sha256 = (k) => crypto.createHash('sha256').update(FIXTURES[k]().buffer).digest('hex');
module.exports = { FIXTURES, sha256 };
