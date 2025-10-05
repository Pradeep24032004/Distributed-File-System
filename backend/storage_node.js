
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const storagePath = './storage';
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath);
}

// API to store a file
app.post('/store', (req, res) => {
  try {
    const { filename, fileData } = req.body;
    fs.writeFileSync(path.join(storagePath, filename), Buffer.from(fileData, 'base64'));
    res.status(200).json({ message: 'File stored successfully.' });
  } catch (err) {
    console.error('Error storing file:', err);
    res.status(500).json({ error: 'Failed to store file.' });
  }
});

// API to retrieve a file
app.get('/retrieve/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(storagePath, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const fileData = fs.readFileSync(filePath).toString('base64');
    res.json({ fileData });
  } catch (err) {
    console.error('Error retrieving file:', err);
    res.status(500).json({ error: 'Failed to retrieve file.' });
  }
});

const PORT = process.env.PORT || 6001;
app.listen(PORT, () => {
  console.log(`Storage node running on http://localhost:${PORT}`);
});



