// Description: This file contains all the helper functions and instances that are used across the project
const { Action, Output, OutputType, Response } = require('../global/enitites.js');
const TableStore = require('../global/datastore/tablestore.js');
const BlobStore = require('../global/datastore/blobstore.js');
const Logger = require('../global/logger.js');
const Queue = require('../global/queue.js');
const MgmtAPI = require('../global/parsers/api/mgmtapi.js');
const KlavyioAPI = require('../global/parsers/klaviyo/wrapper.js');

const environment = process.env['ENVIRONMENT'];
const accountName =process.env['AZURE_ACCOUNT_NAME'];
const accountKey = process.env['AZURE_ACCOUNT_KEY'];
const tableName = process.env['AZURE_TABLE_NAME'];
const queueConnectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
const queueName = process.env['AZURE_QUEUE_NAME'];

const logger = new Logger(accountName, accountKey, tableName);
const queue = new Queue(queueConnectionString, queueName);

// Add data stores here 
const dataStore = {
  userBrokerTable: new TableStore(accountName, accountKey, 'klaviyoUserBrokerTable'),
  productBrokerTable: new TableStore(accountName, accountKey, 'klaviyoProductBrokerTable'),
  syncTable: new TableStore(accountName, accountKey, 'klaviyoSyncTable'),
  blob: new BlobStore(accountName, accountKey, 'klaviyo-blobs'),
  
  // borker names
  productBrokerName(productId) {
    return `product-${productId}`;
  },
  productItemBrokerName(productId, itemId) {
    return `product-${productId}:::item-${itemId}`;
  },
  categoryBrokerName(id, type) {
    return `${type}-${id}`;
  },
}




module.exports = {
  environment,
  logger,
  queue,
  Response,
  Action,
  Output,
  OutputType,
  MgmtAPI,  
  dataStore,
  KlavyioAPI,  
};