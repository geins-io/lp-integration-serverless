# Introduction
This integration launchpad comes with full features set optimized to build agains Geins Management API.

## Pre-requisites
- Node.js
- Azure Account (Storage Account, Table Storage, Queue Storage) [Get a fee account here](https://azure.microsoft.com/en-us/free/)
- Geins Management API Account. [Get a free trial here](https://www.geins.io)


## Features
- [x] Authentication
- [x] Geins API Client
- [x] Logging in Azure Table Storage
- [x] Queue Storage
- [x] Queue Trigger
- [x] HTTP Trigger
- [x] Timer Trigger
- [x] Log search via http request and response

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
    "AZURE_ACCOUNT_NAME": "YOUR_ACCOUNT_NAME",
    "AZURE_ACCOUNT_KEY": "YOUT_ACCOUNT_KEY",
    "AZURE_TABLE_NAME": "log",
    "AZURE_QUEUE_NAME": "queue-items",
    "GEINS_MGMT_API_KEY": "YOUR_API_KEY",
    "GEINS_MGMT_API_USERMAME": "YOUR_API_USERNAME",
    "GEINS_MGMT_API_PASSWORD": "YOuR_API_PASSWORD",
    "ENVIRONMENT" : "development",
    "AzureWebJobsStorage": "AZURE_STORAGE_ACCOUNT_CONNECTION_STRING"
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
    "AZURE_ACCOUNT_NAME": "YOUR_ACCOUNT_NAME",
    "AZURE_ACCOUNT_KEY": "YOUT_ACCOUNT_KEY",
    "AZURE_TABLE_NAME": "log",
    "AZURE_QUEUE_NAME": "queue-items",
    "GEINS_MGMT_API_KEY": "YOUR_API_KEY",
    "GEINS_MGMT_API_USERMAME": "YOUR_API_USERNAME",
    "GEINS_MGMT_API_PASSWORD": "YOuR_API_PASSWORD"
  }
}
```


### Logging
The logging is done via the `Logger` class that is exposed throug the `util` module as `logger`. The logger is configured to log to Azure Table Storage. The table name is configured in the `local.settings.json` file.

To log a message, use the `saveLog` method:
```javascript
util.logger.saveLog(origin, action, payload);
```
| Parameter | Info | Example |
|-|-|-|
| origin | Origin of request | `PostmanRuntime/7.31.1` or IP |
| action | Action | `syncUser` |
| payload | Payload | `{ text: 'Hello World! '}` | 

### Queue Storage
The queue storage is configured to use the `AZURE_QUEUE_NAME` from the `local.settings.json` file. The queue storage is used to store the queue items that are used to trigger the queue trigger.

### HTTP Trigger
Trigger to put action and payload in the queue. The queue item is a JSON object with the following structure:
```json
{
  "action": "syncUser",
  "payload": {
    "id": "1234567890",
    "name": "John Doe"
  }
}
```

### Log search 
Exposed throug an HTTP trigger. The log search is done via the `fetchLogs` class that is exposed throug the `util` module as `logger.fetchLogs(filter)`. Filter is an object with the following structure:
```javascript
{ 
    origin: 'PostmanRuntime/7.31.1', 
    action: 'sendEmail',
}
```

### Timer Trigger
Used to put a queue item in the queue. Schedule for the timer trigger is configured in the `function.json` file. Schedule is a cron expression see the documentation here: https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=csharp#ncrontab-expressions.

The queue item is a JSON object with the following structure:
```json
{
  "action": "syncUser",
  "payload": {
    "id": "1234567890",
    "name": "John Doe"
  }
}
```

### Queue Trigger
Trigger to process the queue items. The queue item is a JSON object with the following structure:
```json
{
  "action": "syncUser",
  "payload": {
    "id": "1234567890",
    "name": "John Doe"
  }
}
```

## Actions
An action is a function that is used to process the queue item. The action is a function that is exposed throug the `actions` module. The action is a function that is used in the `queueTrigger` function.

| Variable | Info | Example |
|-|-|-|
| origin | Origin of request | `queue-trigger` |
| action | Action | `sync` |
| family | Family | `user` |
| output | Output | `action.output.push(new util.Output(util.OutputType.API_PUSH, new util.MyParser()));` |
| payload | Payload | `{ text: 'Hello World! '}` |

## Output
The Output class is used to output the result of the queue item. An Output object has the following structure:
```javascript
new util.Output(util.OutputType.API_PUSH, new util.MyParser());
```
| Variable | Info | Example |
|-|-|-|
| type | Type of output | `API_PUSH` |
| parser | Parser | `new util.MyParser()` |

## OutputType
The OutputType enum is used to define the type of output. The OutputType enum is exposed throug the `util` module as `OutputType`. The OutputType enum is used in the `Output` class.

## Parsers
Parser is added to an Output object. The parser is used to parse the result of the queue item. Parser must implement the `parse` method. The `parse` method is used to parse the result of the queue item. The `parse` method is used in the `queueTrigger` function.



