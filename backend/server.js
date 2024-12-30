

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
 
