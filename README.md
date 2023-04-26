# Introduction
This Klaviyo integration launchpad is built on Azure Functions. The launchpad is a starting point for building Klaviyo integrations. The launchpad is an fork of the [Geins Integration Launchpad](https://github.com/geins-io/lp-integration-serverless)


## Pre-requisites
- Node.js
- Azure Account (Storage Account, Table Storage, Queue Storage) [Get a free account here](https://azure.microsoft.com/en-us/free/)
- Geins Management API Account. [Get a free trial here](https://www.geins.io)
- Klaviyo Account. [Get a free trial here](https://www.klaviyo.com)


## Features
- [x] User Sync (Create and Update)
- [x] Product Sync (Create and Update)
- [x] Product Item Sync (Create and Update)


## Getting started 
Run the following command to install the dependencies:
```bash
npm install
```

Add the `local.settings.json` file to the root of the project. The `local.settings.json` file is used to store the credentials for the Azure Storage Account and Geins Management API. The `local.settings.json` file is not checked in to the repository.

```json
{
  "IsEncrypted": false,
  "Values": {
    "ENVIRONMENT" : "development",    
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    
    "AZURE_ACCOUNT_NAME": "my-account-name",
    "AZURE_ACCOUNT_KEY": "my-key",
    "AZURE_TABLE_NAME": "log",
    "AZURE_QUEUE_NAME": "queue-items",
   
    "GEINS_MGMT_API_KEY": "my-key",
    "GEINS_MGMT_API_USERMAME": "my-username",
    "GEINS_MGMT_API_PASSWORD": "my-pwd", 

    "KLAVIYO_API_KEY": "my-key"
  },
  "Host": {
    "CORS": "*"
  }
}
```

Run the following command to start the function app:
```bash
func start
```



### Authentication
@azure/core-auth is used for authentication. You can find more information here: https://www.npmjs.com/package/@azure/core-auth

- For the table storage and queue storage, you can use the connection string or credentials. 
- For the Geins API, you use api-user credentialas and api-key. Read more at docs.geins.io.

Update the `local.settings.json` file with your credentials:
```json
{
  "IsEncrypted": false,
  "Values": {
    "ENVIRONMENT" : "development",    
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    
    "AZURE_ACCOUNT_NAME": "my-account-name",
    "AZURE_ACCOUNT_KEY": "my-key",
    "AZURE_TABLE_NAME": "log",
    "AZURE_QUEUE_NAME": "queue-items",
   
    "GEINS_MGMT_API_KEY": "my-key",
    "GEINS_MGMT_API_USERMAME": "my-username",
    "GEINS_MGMT_API_PASSWORD": "my-pwd", 

    "KLAVIYO_API_KEY": "my-key"
  },
  "Host": {
    "CORS": "*"
  }
}
```

## Features
The launchpad is a starting point for building Klaviyo integrations. The launchpad is an fork of the [Geins Integration Launchpad](https://github.com/geins-io/lp-integration-serverless).

### HTTP Trigger
This trigger is used to put messages in queue to sync data. For example, when a user is created in Geins, a message is put in the queue to sync the user to Klaviyo.

### Timer Trigger
This trigger is used to run the sync on a schedule. For time based syncs. For example, sync all users every 24 hours.

### Queue Trigger
This is the main trigger. It is used to process the messages in the queue. The trigger is used to sync data from Geins to Klaviyo.


## Refrences
- [Azure Functions JavaScript developer guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2)
- [Azure Functions JavaScript developer guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2)
- [Klaviyo API](https://www.klaviyo.com/docs/api/v2)
- [Geins Management API](https://docs.geins.io)

