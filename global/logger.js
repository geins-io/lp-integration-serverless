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
  
  async saveActionToLog(actionObj) {
    try {
      const { origin, action, payload, family } = actionObj;
      this.saveLog(origin, action, payload, family);
    } catch (error) {
      console.error("Error saving log:", error.message);
    }
  }

  async saveLog(origin, action, payload, family) {
    try {
      const logEntity = {
        partitionKey: action,
        family: family,
        rowKey: new Date().toISOString(),
        origin: origin,
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
        if (filter.action) {
          filterString += `PartitionKey eq '${filter.action}'`;
        }
        if (filter.origin) {
          filterString += (filterString ? ' and ' : '') + `origin eq '${filter.origin}'`;
        }
        if (filter.family) {
          filterString += (filterString ? ' and ' : '') + `PartitionKey ge '${filter.family}-' and PartitionKey lt '${filter.family}-~'`;
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

  async getLatestTimestamp(action) {
    try {
      const queryOptions = {
        filter: `PartitionKey eq '${action}'`,
        top: 1,
        orderBy: [{ timestamp: "desc" }]
      };
      const entities = this.tableClient.listEntities(queryOptions);
      for await (const entity of entities) {
        return entity.timestamp;
      }
      return null;
    } catch (error) {
      console.error("Error fetching latest timestamp:", error.message);
      return null;
    }
  }
}

module.exports = Logger;
