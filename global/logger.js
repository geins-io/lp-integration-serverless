const { TableClient } = require("@azure/data-tables");
const { AzureNamedKeyCredential } = require("@azure/core-auth");

class Logger {
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

  async saveLog(origin, action, payload) {
    try {
      const logEntity = {
        partitionKey: origin,
        rowKey: new Date().toISOString(),
        action: action,
        payload: JSON.stringify(payload),
        timestamp: new Date()
      };
      await this.tableClient.createEntity(logEntity);
    } catch (error) {
      console.error("Error saving log:", error.message);
    }
  }

  async fetchLogs(filter) {
    try {
      await this.initPromise;
      const logs = [];
  
      let queryOptions = {};
  
      if (filter) {
        let filterString = '';
        if (filter.origin) {
          filterString += `PartitionKey eq '${filter.origin}'`;
        }
        if (filter.action) {
          filterString += (filterString ? ' and ' : '') + `action eq '${filter.action}'`;
        }
        if (filter.startTime && filter.endTime) {
          filterString += (filterString ? ' and ' : '') + `timestamp gt ${filter.startTime} and timestamp lt ${filter.endTime}`;
        }
        queryOptions = { filter: filterString };
      }
  
      const entities = this.tableClient.listEntities(queryOptions);
      for await (const entity of entities) {
        logs.push(entity);
      }
  
      return logs;
    } catch (error) {
      console.error("Error fetching logs:", error.message);
      return [];
    }
  }
  
}

module.exports = Logger;
