const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Simulate node failure
router.post('/simulate-failure', async (req, res) => {
  const { node } = req.body;
  const { nodeStatus, db, nodeStoragePaths } = req.app.locals;

  if (nodeStatus[node] === undefined) {
    return res.status(400).send({ error: 'Invalid node.' });
  }

  nodeStatus[node] = false;

  const files = await db.collection('files').find().toArray();
  files.forEach(file => {
    const failedNodePath = file.locations.find(location => location.includes(node));
    if (failedNodePath && fs.existsSync(failedNodePath)) {
      const activeNodes = nodeStoragePaths.filter((path, index) => {
        const nodeName = `node${index + 1}`;
        return nodeStatus[nodeName];
      });

      activeNodes.forEach(activeNode => {
        const destination = path.join(activeNode, file.fileName);
        if (!fs.existsSync(destination)) {
          fs.copyFileSync(failedNodePath, destination);
        }
      });

      fs.unlinkSync(failedNodePath);
    }
  });

  res.status(200).send({ message: `${node} marked as down.` });
});

// Restore node
router.post('/restore', (req, res) => {
  const { node } = req.body;
  const { nodeStatus } = req.app.locals;

  if (!nodeStatus[node]) {
    return res.status(400).send({ error: 'Invalid node.' });
  }

  nodeStatus[node] = true;
  res.status(200).send({ message: `${node} restored successfully.` });
});

module.exports = router;
