import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

export const csvUploadMiddleware = upload.single('file');

export const parseCsvBuffer = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required (field name: file)' });
  }

  const rows = [];
  const stream = Readable.from(req.file.buffer.toString('utf8'));

  stream
    .pipe(csv())
    .on('data', (data) => rows.push(data))
    .on('end', () => {
      req.parsedCsvRows = rows;
      next();
    })
    .on('error', (err) => {
      res.status(400).json({ message: `CSV parse error: ${err.message}` });
    });
};
