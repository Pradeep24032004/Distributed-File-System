# Distributed-File-System

## Overview
This project simulates a **Distributed File System** where files are stored and managed across multiple "nodes" (storage locations). It includes features like file uploads, node failure simulation, file reallocation, and dynamic addition/removal of nodes.

## Major Functionalities

### 1. File Upload and Replication
- A file is uploaded to the system via an API endpoint.
- The file is initially stored on the first node and replicated across all other nodes to ensure redundancy.

### 2. Node Initialization and Management
- Nodes (`node1`, `node2`, etc.) are directories created dynamically within an `uploads` folder.
- Each node's status is tracked (active or inactive).

### 3. Node Failure and Recovery
- Simulate a node failure by marking a node as inactive.
- Files from the failed node are reallocated to active nodes.
- Recovery restores the node to active status.

### 4. Dynamic Node Management
- Add a new node to the system by creating a new directory and updating the storage paths.
- Remove a node, reallocate its files, and delete the corresponding directory.

### 5. File Metadata Management
- File metadata (e.g., name, size, locations) is stored in MongoDB.
- Metadata includes the replication status and storage locations of each file.

### 6. File Details Retrieval
- Retrieve file details, including the size and status of the nodes storing the file.

## Workflow

### 1. Initialization
- Nodes are created in the `uploads` directory, and their statuses are set to active.

### 2. File Upload
- Files are uploaded via `/upload` API and stored in the first node.
- The file is replicated to other nodes.

### 3. Simulate Node Failure
- Mark a node as inactive using the `/simulate-failure` API.
- Files from the failed node are reallocated to active nodes to maintain redundancy.

### 4. Dynamic Node Management
- Use `/add-node` to add a new node.
- Use `/remove-node` to remove a node after reallocating its files.

### 5. File Retrieval
- The `/files` API provides details of all files, including the storage nodes and their statuses.

### 6. Database Operations
- MongoDB stores file metadata for quick access and status tracking.

## Use Cases
- **High Availability**: Ensures data is not lost even if a node fails.
- **Scalability**: Dynamically adds nodes to handle increased storage needs.
- **Data Integrity**: Metadata ensures consistent tracking of file locations and node statuses.

## Project Features
- **Fault Tolerance**: Automatic reallocation of files in case of node failure.
- **Scalability**: Nodes can be added or removed dynamically to scale the system.
- **Redundancy**: Ensures files are replicated across multiple nodes for high availability.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/distributed-file-system-simulation.git
   cd distributed-file-system-simulation

![Screenshot (375)](https://github.com/user-attachments/assets/b9801e21-5575-4eca-b167-3d5ee93fa9cc)


![Screenshot (376)](https://github.com/user-attachments/assets/1abc8f1e-f25a-45bd-9411-771d589327a0)
