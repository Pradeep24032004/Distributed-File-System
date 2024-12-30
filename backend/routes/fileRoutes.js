const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { nodeStoragePaths } = req.app.locals;
    cb(null, nodeStoragePaths[0]); // Store in the first node
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Store the original filename
  },
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// File upload route
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { nodeStoragePaths, db } = req.app.locals;

    if (!req.file) {
      return res.status(400).send({ error: 'No file uploaded.' });
    }

    // Replicate the file across other nodes
    nodeStoragePaths.forEach((nodePath, index) => {
      if (index !== 0) {
        fs.copyFileSync(
          path.join(nodeStoragePaths[0], req.file.originalname),
          path.join(nodePath, req.file.originalname)
        );
      }
    });

    // Store file metadata in MongoDB
    const fileMetadata = {
      fileName: req.file.originalname,
      size: req.file.size,
      locations: nodeStoragePaths.map(nodePath => path.join(nodePath, req.file.originalname)),
      uploadedAt: new Date(),
    };

    await db.collection('files').insertOne(fileMetadata);
    res.status(200).send({ message: 'File uploaded successfully.', file: req.file });
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).send({ error: 'Internal server error while uploading file.' });
  }
});

// Get files route
router.get('/', async (req, res) => {
  try {
    const { db, nodeStatus } = req.app.locals;
    const files = await db.collection('files').find().toArray();

    const fileDetails = files.map(file => {
      const nodeSizes = file.locations.map(location => {
        const node = location.split(path.sep).slice(-2, -1)[0]; // Extract node name
        const isNodeActive = nodeStatus[node];

        let size = 0;
        if (isNodeActive && fs.existsSync(location)) {
          try {
            const stats = fs.statSync(location);
            size = stats.size;
          } catch (err) {
            console.error(`Error fetching stats for ${location}:`, err.message);
          }
        }

        return { node, size, status: isNodeActive ? 'Active' : 'Inactive' };
      });

      return { fileName: file.fileName, totalSize: file.size, nodeSizes: nodeSizes };
    });

    res.status(200).send(fileDetails);
  } catch (error) {
    console.error('Error retrieving file metadata:', error);
    res.status(500).send({ error: 'Failed to retrieve files.' });
  }
});

module.exports = router;
