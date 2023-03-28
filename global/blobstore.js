const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");

class BlobStore {
  constructor(accountName, accountKey, containerName) {
    this.containerName = containerName;
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  async saveData(dataObj) {
    try {
      const { blobName, ...rest } = dataObj;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(JSON.stringify(rest), JSON.stringify(rest).length);
    } catch (error) {
      console.error("Error saving data:", error.message);
    }
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
