// Backend: server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI and database setup
const mongoUri = "mongodb://localhost:27017"; // Local MongoDB connection
const dbName = 'distributedFileSystem';
let db;

// Connect to MongoDB
MongoClient.connect(mongoUri, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error('MongoDB connection failed:', err));

// Create 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Node status and dynamic paths
let nodeStatus = {};
let nodeStoragePaths = [];

const initializeNodes = () => {
  nodeStoragePaths = [
    path.join(uploadDir, 'node1'),
    path.join(uploadDir, 'node2'),
    path.join(uploadDir, 'node3'),
  ];

  nodeStoragePaths.forEach((dir, index) => {
    const nodeName = `node${index + 1}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    nodeStatus[nodeName] = true; // All nodes start as active
  });
};

initializeNodes();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, nodeStoragePaths[0]); // Store in the first node
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Store the original filename
  },
});

// Create multer instance with file size limit
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Function to reallocate files from failed nodes
const reallocateFiles = async (failedNode) => {
  console.log(`Reallocating files from ${failedNode}`);

  const files = await db.collection('files').find().toArray();

  files.forEach(file => {
    const failedNodePath = file.locations.find(location => location.includes(failedNode));

    if (failedNodePath && fs.existsSync(failedNodePath)) {
      const activeNodes = nodeStoragePaths.filter((nodePath, index) => {
        const nodeName = `node${index + 1}`;
        return nodeStatus[nodeName] && !file.locations.includes(nodePath);
      });

      activeNodes.forEach(activeNode => {
        const destination = path.join(activeNode, file.fileName);
        if (!fs.existsSync(destination)) {
          fs.copyFileSync(failedNodePath, destination);
          file.locations.push(destination);
        }
      });

      // Remove the file from the failed node
      fs.unlinkSync(failedNodePath);
    }
  });

  // Update file metadata in MongoDB
  await Promise.all(
    files.map(file =>
      db.collection('files').updateOne(
        { fileName: file.fileName },
        { $set: { locations: file.locations } }
      )
    )
  );
};

// File upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
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
      locations: nodeStoragePaths.map((nodePath) => path.join(nodePath, req.file.originalname)),
      uploadedAt: new Date(),
    };

    await db.collection('files').insertOne(fileMetadata);

    res.status(200).send({ message: 'File uploaded successfully.', file: req.file });
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).send({ error: 'Internal server error while uploading file.' });
  }
});

app.get('/files', async (req, res) => {
  try {
    const files = await db.collection('files').find().toArray();
    const fileDetails = files.map(file => {
      const nodeSizes = file.locations.map(location => {
        const node = location.split(path.sep).slice(-2, -1)[0]; // Extract node name (node1, node2, node3)
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

        return {
          node,
          size,
          status: isNodeActive ? 'Active' : 'Inactive',
        };
      });

      return {
        fileName: file.fileName,
        totalSize: file.size,
        nodeSizes: nodeSizes,
      };
    });

    res.status(200).send(fileDetails);
  } catch (error) {
    console.error('Error retrieving file metadata:', error);
    res.status(500).send({ error: 'Failed to retrieve files.' });
  }
});

// API to simulate node failure
app.post('/simulate-failure', async (req, res) => {
  const { node } = req.body;

  if (nodeStatus[node] === undefined) {
    return res.status(400).send({ error: 'Invalid node.' });
  }

  nodeStatus[node] = false;
  await reallocateFiles(node);
  res.status(200).send({ message: `${node} is now marked as down and files reallocated.` });
});

// API to restore a node
app.post('/restore-node', (req, res) => {
  const { node } = req.body;

  if (nodeStatus[node] === undefined) {
    return res.status(400).send({ error: 'Invalid node.' });
  }

  nodeStatus[node] = true;
  res.status(200).send({ message: `${node} is now active.` });
});

// API to add a new node
app.post('/add-node', (req, res) => {
  const { nodeName } = req.body;

  if (!nodeName || nodeStatus[nodeName] !== undefined) {
    return res.status(400).send({ error: 'Invalid or duplicate node name.' });
  }

  const newPath = path.join(uploadDir, nodeName);
  if (!fs.existsSync(newPath)) {
    fs.mkdirSync(newPath);
  }

  nodeStoragePaths.push(newPath);
  nodeStatus[nodeName] = true;

  res.status(200).send({ message: `${nodeName} added successfully.` });
});

// API to remove a node
app.post('/remove-node', async (req, res) => {
  const { nodeName } = req.body;

  if (!nodeName || nodeStatus[nodeName] === undefined) {
    return res.status(400).send({ error: 'Invalid node.' });
  }

  if (!nodeStatus[nodeName]) {
    return res.status(400).send({ error: 'Node is already inactive.' });
  }

  nodeStatus[nodeName] = false;
  await reallocateFiles(nodeName);

  const nodePath = path.join(uploadDir, nodeName);
  if (fs.existsSync(nodePath)) {
    fs.rmSync(nodePath, { recursive: true, force: true });
  }

  delete nodeStatus[nodeName];
  nodeStoragePaths = nodeStoragePaths.filter(path => !path.includes(nodeName));

  res.status(200).send({ message: `${nodeName} removed successfully.` });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});   
/*
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const fileRoutes = require('./routes/fileRoutes');
const nodeRoutes = require('./routes/nodeRoutes');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI and database setup
const mongoUri = "mongodb://localhost:27017";
const dbName = 'distributedFileSystem';
let db;

// Connect to MongoDB
MongoClient.connect(mongoUri, { useUnifiedTopology: true })
  .then(client => {
    db = client.db(dbName);
    console.log('Connected to MongoDB');
    app.locals.db = db; // Share the database instance with routers
  })
  .catch(err => console.error('MongoDB connection failed:', err));

// Create 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.locals.uploadDir = uploadDir;

// Initialize nodes
const nodeStoragePaths = [
  path.join(uploadDir, 'node1'),
  path.join(uploadDir, 'node2'),
  path.join(uploadDir, 'node3'),
];
app.locals.nodeStoragePaths = nodeStoragePaths;

const nodeStatus = {};
nodeStoragePaths.forEach((dir, index) => {
  const nodeName = `node${index + 1}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  nodeStatus[nodeName] = true;
});
app.locals.nodeStatus = nodeStatus;

// Routes
app.use('/files', fileRoutes);
app.use('/nodes', nodeRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
 */