// Description: This file contains all the helper functions and instances that are used across the project
const { Action, Output, OutputType, Response } = require("../global/enitites.js");
const Logger = require("../global/logger.js");
const Queue = require("../global/queue.js");
// Geins Mgmt API
const GeinsMgmtAPI = require('@geins/sdk-api-mgmt-javascript'); 

// My Parsers
const MyParser = require("../global/parsers/");

// Geins Mgmt API Setup
var defaultClient = GeinsMgmtAPI.ApiClient.instance;
var apiKey = defaultClient.authentications['apiKey'];
var basicAuth = defaultClient.authentications['basicAuth'];

apiKey.apiKey = process.env["GEINS_MGMT_API_KEY"];
basicAuth.username = process.env["GEINS_MGMT_API_USERMAME"];
basicAuth.password = process.env["GEINS_MGMT_API_PASSWORD"];

const accountName =process.env["AZURE_ACCOUNT_NAME"];
const accountKey = process.env["AZURE_ACCOUNT_KEY"];
const tableName = process.env["AZURE_TABLE_NAME"];
const queueConnectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
const queueName = process.env["AZURE_QUEUE_NAME"];

const logger = new Logger(accountName, accountKey, tableName);
const queue = new Queue(queueConnectionString, queueName);
const environment = process.env["ENVIRONMENT"];

module.exports = {
  environment,
  logger,
  queue,
  Response,
  Action,
  Output,
  OutputType,
  GeinsMgmtAPI,
  MyParser,
  // ... (export other helper functions or instances as needed)
};