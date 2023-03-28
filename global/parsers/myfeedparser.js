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
        // set the data object
        const dataObj = {
            partitionKey: payload,
            property1: actionObject.origin,
            feed: data,
        };
        
        // save the data to the data store
        util.dataStore.feedBlob.saveData(dataObj);
        
        console.log('*** SAVE TO DATA STORE  -> ', actionObject);
    }

    async generateFeed() {
        console.log('*** GENERATE *****');
        const products = await this.getProducts();
        // Work with the products
        console.log('*** PRODUCTS LENGTH *****', products.length);
        // Generate the feed
        const feed = new MyFeed(products);
        return feed.generateFeed();
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

  