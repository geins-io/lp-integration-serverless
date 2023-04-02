const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");

class BlobStore {
  constructor(accountName, accountKey, containerName) {
    this.containerName = containerName;
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
    // this.initContainer();
    (async () => {
      try {
        // Create the container if it doesn't exist
        const exists = await this.containerClient.exists();
        if (!exists) {
          await this.containerClient.create();
          console.log(`Container "${this.containerName}" created successfully.`);
        } else {
          console.log(`Container "${this.containerName}" already exists.`);
        }
      } catch (error) {
        console.error(`Error creating "${this.containerName}" container if not exists:`, error.message);
      }
    })();
  }

  async createBlobIfNotExists(blobName) {
    try {
      if (typeof blobName !== 'string') {
        throw new Error("Invalid blobName: must be a string");
      }
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      // Check if blob exists
      const exists = await blockBlobClient.exists();
      // Create blob if not exists
      if (!exists) {
        await blockBlobClient.upload("", 0);
      }
    } catch (error) {
      console.error("Error creating blob if not exists:", error.message);
    }
  }

  async saveData(dataObj) {
    try {
      const { blobName, partitionKey, data, ...rest } = dataObj;
      // Create blob if not exists
      await this.createBlobIfNotExists(blobName);
      // Get blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      // Get blob data
      const serializedData = JSON.stringify(data);
      // Upload blob data
      await blockBlobClient.upload(serializedData, serializedData.length);
      // Return url to blob
      return blockBlobClient.url;
    } catch (error) {
      console.error("Error saving blob data:", error.message);
    }
    return null;
  }

  async sanitizeName(name) {
    // Replace invalid characters with an underscore
    return name.replace(/[^a-zA-Z0-9-_~.]/g, '_').substring(0, 1024);
  }

  async fetchData(filter) {
    try {
      const blobs = await this.containerClient.listBlobsFlat();
      const data = [];

      for await (const blob of blobs) {
        const blobClient = this.containerClient.getBlobClient(blob.name);
        const blobData = await blobClient.downloadToBuffer();
        const jsonData = JSON.parse(blobData.toString());

        let matchesFilter = true;
        if (filter) {
          if (filter.blobName && filter.blobName !== blob.name) {
            matchesFilter = false;
          }
          if (filter.startTime && new Date(jsonData.timestamp) < new Date(filter.startTime)) {
            matchesFilter = false;
          }
          if (filter.endTime && new Date(jsonData.timestamp) > new Date(filter.endTime)) {
            matchesFilter = false;
          }
        }

        if (matchesFilter) {
          data.push({
            blobName: blob.name,
            ...jsonData
          });
        }
      }

      return data;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return [];
    }
  }

  async getLatestTimestamp(blobName) {
    try {
      const blobClient = this.containerClient.getBlobClient(blobName);
      const blobData = await blobClient.downloadToBuffer();
      const jsonData = JSON.parse(blobData.toString());
      return jsonData.timestamp;
    } catch (error) {
      console.error("Error fetching latest timestamp:", error.message);
      return null;
    }
  }
}

module.exports = BlobStore;
