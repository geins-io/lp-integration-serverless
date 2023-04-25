const { QueueServiceClient } = require("@azure/storage-queue");

class Queue {
  constructor(connectionString, queueName) {
    this.queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
    this.queueClient = this.queueServiceClient.getQueueClient(queueName);
    this.initPromise = this.initQueue();
  }

  async initQueue() {
    try {
      await this.queueClient.createIfNotExists();
    } catch (error) {
      console.error("Error initializing queue:", error.message);
    }
  }

  async enqueueMessage(message) {
    try {
      await this.initPromise;
      await this.queueClient.sendMessage(Buffer.from(JSON.stringify(message)).toString("base64"));
    } catch (error) {
      console.error("Error enqueuing message:", error.message);
    }
  }

  // throttle is in milliseconds
  async enqueueMessages(messages, throttle = 0) {
    try {
      await this.initPromise;
      for (const message of messages) {
        await this.queueClient.sendMessage(Buffer.from(JSON.stringify(message)).toString("base64"));
        await new Promise((resolve) => setTimeout(resolve, throttle));
      }
    } catch (error) {
      console.error("Error enqueuing messages:", error.message);
    }
  }


}

module.exports = Queue;
