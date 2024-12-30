
// Frontend: App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const apiBase = 'http://localhost:5000'; // Backend base URL

function App() {
  const [files, setFiles] = useState([]);
  const [nodes, setNodes] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');

  useEffect(() => {
    fetchFiles();
    fetchNodes();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${apiBase}/files`);
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const fetchNodes = async () => {
    try {
      // Nodes are derived from the file details API, adjust if needed.
      const response = await axios.get(`${apiBase}/files`);
      const nodeStatus = {};
      response.data.forEach(file => {
        file.nodeSizes.forEach(node => {
          nodeStatus[node.node] = node.status === 'Active';
        });
      });
      setNodes(nodeStatus);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post(`${apiBase}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('File uploaded successfully');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const simulateFailure = async (node) => {
    try {
      await axios.post(`${apiBase}/simulate-failure`, { node });
      alert(`${node} marked as down and files reallocated.`);
      fetchFiles();
      fetchNodes();
    } catch (error) {
      console.error('Error simulating failure:', error);
    }
  };

  const restoreNode = async (node) => {
    try {
      await axios.post(`${apiBase}/restore-node`, { node });
      alert(`${node} restored successfully.`);
      fetchFiles();
      fetchNodes();
    } catch (error) {
      console.error('Error restoring node:', error);
    }
  };

  const addNode = async () => {
    if (!newNodeName) return alert('Node name cannot be empty.');

    try {
      await axios.post(`${apiBase}/add-node`, { nodeName: newNodeName });
      alert(`${newNodeName} added successfully.`);
      setNewNodeName('');
      fetchNodes();
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const removeNode = async (node) => {
    try {
      await axios.post(`${apiBase}/remove-node`, { nodeName: node });
      alert(`${node} removed successfully.`);
      fetchFiles();
      fetchNodes();
    } catch (error) {
      console.error('Error removing node:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Distributed File System</h1>
      </header>

      <section>
        <h2>Upload File</h2>
        <form onSubmit={handleFileUpload}>
          <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
          <button type="submit">Upload</button>
        </form>
      </section>

      <section>
        <h2>Files</h2>
        <table>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Total Size</th>
              <th>Nodes</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr key={index}>
                <td>{file.fileName}</td>
                <td>{file.totalSize} bytes</td>
                <td>
                  {file.nodeSizes.map((node, idx) => (
                    <div key={idx}>
                      {node.node}: {node.size} bytes ({node.status})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Manage Nodes</h2>
        <h3>Active Nodes</h3>
        <ul>
          {Object.keys(nodes).map((node) => (
            <li key={node}>
              {node} - {nodes[node] ? 'Active' : 'Inactive'}
              {nodes[node] ? (
                <button onClick={() => simulateFailure(node)}>Simulate Failure</button>
              ) : (
                <button onClick={() => restoreNode(node)}>Restore</button>
              )}
              <button onClick={() => removeNode(node)}>Remove</button>
            </li>
          ))}
        </ul>

        <h3>Add Node</h3>
        <input
          type="text"
          placeholder="Node Name"
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
        />
        <button onClick={addNode}>Add Node</button>
      </section>
    </div>
  );
}

export default App;