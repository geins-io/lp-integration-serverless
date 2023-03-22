const { Action, Output, OutputType } = require("../global/enitites.js");
const Logger = require("../global/logger.js");
const Queue = require("../global/queue.js");

const accountName =process.env["AZURE_ACCOUNT_NAME"];
const accountKey = process.env["AZURE_ACCOUNT_KEY"];
const tableName = process.env["AZURE_TABLE_NAME"];
const queueConnectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
const queueName = process.env["AZURE_QUEUE_NAME"];


const logger = new Logger(accountName, accountKey, tableName);
const queue = new Queue(queueConnectionString, queueName);

module.exports = {
  logger,
  queue,
  Action,
  Output,
  OutputType,
  // ... (export other helper functions or instances as needed)
};