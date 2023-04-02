const util = require("../util.js");
const MyFeed = require('./feeds/myfeed.js');
class FeedParser {
    constructor() {
    }

    parse(output, action) {
        // parse the output type and process it
        switch(output.type) {
            case "storeSave":
                this.saveFeed(action);
                break;
        }
    }

    async saveFeed(actionObject) {
        // push the action to the api
        const payload = actionObject.payload;
        let data = '';
        switch(payload) {   
            case "google-shopping":
                data = await this.generateFeed();
                break;
        }
        const blobName = await util.dataStore.feedBlob.sanitizeName(`${payload}-locale.csv`);
        // set the data object
        const datBlobObj = {
            blobName: blobName,
            partitionKey: payload,
            property: actionObject.origin,
            data: data,
        };
        // set the data table object
        const dataTableObj = {
            blobName: blobName,
            partitionKey: payload,
            property: actionObject.origin,
        };
        // save the data to the data store
        try {
            // save the blob to the data store
            await util.dataStore.feedBlob.saveData(datBlobObj);
            // save the blob info to the data table store
            await util.dataStore.feedTable.saveData(dataTableObj);
        } catch (error) {
            console.error('Error saving data to data store:', error.message);
        }
    }

    async generateFeed() {
        // Get the products
        const products = await this.getProducts();
        // Generate the feed
        const feed = new MyFeed(products);
        const data = await feed.generateFeed();
        return data;
    }

    async getProducts() {        
        try {
            const mgmtClient = new util.MgmtAPI();
            let apiInstance = new mgmtClient.api.ProductApi();
            let query = new mgmtClient.api.ProductModelsProductQuery()
            let opts = {
                'include': "names,items,prices,categories,parameters,variants,markets,images,feeds,urls,shorttexts"
            };
            let products = [];
            let page = 1;
            let pageCount = 1;
            while (page <= pageCount) {
                console.log('*** LOOP  *****', page, pageCount);
                const response = await new Promise((resolve, reject) => {
                    apiInstance.queryProductsPaged(page, query, opts, (error, data, response) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(data);
                        }
                    });
                });
                // Get the page data
                const pageData = response.PageResult;
                // Set the page count
                pageCount = pageData.PageCount;
                // Get the products
                const productData = response.Resource;
                // Loop over the products and add to products array
                for (let i = 0; i < productData.length; i++) {
                    const product = productData[i]; 
                    products.push(product);
                }
                page++;
            }            
            return products;
        } catch (error) {
            console.log('Error fetching products:', error.message);
            return [];
        }
    }
}
module.exports = FeedParser

  