module.exports = async function (context, myQueueItem) {
    const item = myQueueItem;
    context.log('JavaScript queue trigger function processed work item:: ', item.data);
};