const util = require("../global/util.js");
module.exports = async function (context, myTimer) {
    // get the latest entity from the table store
    const latestEntity = await util.dataStore.syncTable.getLatestEntity('user-sync');
    // delete all entities with the partition key
    await util.dataStore.syncTable.deleteAllEntitiesByPartitionKey('user-sync');
    // insert the latest entity back into the table store if it exists
    if(latestEntity) {
        await util.dataStore.syncTable.saveData(latestEntity);
    }
    console.log('^^^^^^^^^^^^^^ Clean up complete', 'user-sync', latestEntity);
};