const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads');
let nodeStoragePaths = [];
let nodeStatus = {};

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
    nodeStatus[nodeName] = true;
  });
};

const reallocateFiles = async (failedNode) => {
  // Logic for reallocating files from the failed node to active nodes
};

module.exports = {
  initializeNodes,
  nodeStoragePaths,
  nodeStatus,
  reallocateFiles,
};
