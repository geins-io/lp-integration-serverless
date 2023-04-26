const { TableClient } = require("@azure/data-tables");
const { AzureNamedKeyCredential } = require("@azure/core-auth");

class TableStore {
  constructor(accountName, accountKey, tableName) {
    this.tableName = tableName;
    const url = `https://${accountName}.table.core.windows.net`;
    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    this.tableClient = new TableClient(url, tableName, credential);
    this.initTable();
  }

  async initTable() {
    try {
      await this.tableClient.createTable(this.tableName);
    } catch (error) {
      if (error.statusCode === 409 && error.code === "TableAlreadyExists") {
        console.log("Table already exists");
      } else {
        console.error("Error initializing table:", error.message);
      }
    }
  }

  async saveData(dataObj) {
    try {
      const { partitionKey, rowKey, ...rest } = dataObj;
      const entity = {
        partitionKey: partitionKey,
        rowKey: rowKey || new Date().toISOString(),        
        ...rest,
      };      
      await this.tableClient.createEntity(entity);
    } catch (error) {
      console.error("Error saving table data:", error.message);
      console.error("Object:", dataObj);
    }
  }
  
  async createOrUpdateEntity(dataObj) {
    try {
      const { partitionKey, rowKey, ...rest } = dataObj;
      const entity = {
        partitionKey: partitionKey,
        rowKey: rowKey || new Date().toISOString(),
        ...rest,
      };
      console.log("Creating or updating entity:", entity);
  
      await this.tableClient.upsertEntity(entity);
    } catch (error) {
      console.error("Error creating or updating entity:", error.message);
    }
  }

  async fetchData(filter) {
    try {
      await this.initPromise;
      const data = [];

      let filterString = '';
      if (filter) {
        
        if (filter.partitionKey) {
          filterString += `PartitionKey eq '${filter.partitionKey}'`;
        }
        if (filter.rowKey) {
          filterString += (filterString ? ' and ' : '') + `RowKey eq '${filter.rowKey}'`;
        }
        if (filter.startTime && filter.endTime) {
          filterString += (filterString ? ' and ' : '') + `Timestamp gt ${filter.startTime} and Timestamp lt ${filter.endTime}`;
        }
      }
      const entities = this.tableClient.listEntities({
        queryOptions: { filter: filterString }
      });
      for await (const entity of entities) {
        data.push(entity);
      }

      return data;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return [];
    }
  }

  async getLatestEntity(partitionKey) {
    try {
      const queryOptions = {
        filter: `PartitionKey eq '${partitionKey}'`,
      };
      const entities = this.tableClient.listEntities({ queryOptions });
      let latestEntity = null;
      for await (const entity of entities) {
        if (!latestEntity || entity.timestamp > latestEntity.timestamp) {
          latestEntity = entity;
        }
      }
      return latestEntity;
    } catch (error) {
      console.error("Error fetching latest entity:", error.message);
      return null;
    }
  }  

  async getLatestTimestamp(partitionKey) {
    try {
        return returngetLatestEntity(partitionKey).timestamp
    } catch (error) {
      console.error("Error fetching latest entity:", error.message);
      return null;
    }
  }

  async deleteAllEntitiesByPartitionKey(partitionKey) {
    try {
      const queryOptions = {
        filter: `PartitionKey eq '${partitionKey}'`
      };
      const entities = this.tableClient.listEntities({ queryOptions });
  
      for await (const entity of entities) {
        await this.tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
      }
  
      console.log(`All entities with partition key '${partitionKey}' have been deleted.`);
    } catch (error) {
      console.error(`Error deleting entities with partition key '${partitionKey}':`, error.message);
    }
  }

}

module.exports = TableStore;
