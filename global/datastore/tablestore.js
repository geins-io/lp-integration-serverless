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
        rowKey: new Date().toISOString(),
        ...rest,
      };
      await this.tableClient.createEntity(entity);
    } catch (error) {
      console.error("Error saving table data:", error.message);
    }
  }

  async fetchData(filter) {
    try {
      await this.initPromise;
      const data = [];

      let queryOptions = {};

      if (filter) {
        let filterString = '';
        if (filter.partitionKey) {
          filterString += `PartitionKey eq '${filter.partitionKey}'`;
        }
        if (filter.rowKey) {
          filterString += (filterString ? ' and ' : '') + `RowKey eq '${filter.rowKey}'`;
        }
        if (filter.startTime && filter.endTime) {
          filterString += (filterString ? ' and ' : '') + `Timestamp gt ${filter.startTime} and Timestamp lt ${filter.endTime}`;
        }
        queryOptions = { filter: filterString };
      }

      const entities = this.tableClient.listEntities(queryOptions);
      for await (const entity of entities) {
        data.push(entity);
      }

      return data;
    } catch (error) {
      console.error("Error fetching data:", error.message);
      return [];
    }
  }

  async getLatestTimestamp(partitionKey) {
    try {
      const queryOptions = {
        filter: `PartitionKey eq '${partitionKey}'`,
        top: 1,
        orderBy: [{ Timestamp: "desc" }]
      };
      const entities = this.tableClient.listEntities(queryOptions);
      for await (const entity of entities) {
        return entity.Timestamp;
      }
      return null;
    } catch (error) {
      console.error("Error fetching latest timestamp:", error.message);
      return null;
    }
  }
}

module.exports = TableStore;
