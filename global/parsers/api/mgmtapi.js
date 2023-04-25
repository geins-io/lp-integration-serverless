// Geins Mgmt API Wrapper
const GeinsMgmtAPI = require('@geins/sdk-api-mgmt-javascript');
class MgmtAPI {
    constructor() {
        // Geins Mgmt API Setup
        this.api = GeinsMgmtAPI;
        this.client = GeinsMgmtAPI.ApiClient.instance;
        this.apiKey = this.client.authentications['apiKey'];
        this.basicAuth = this.client.authentications['basicAuth'];
        this.apiKey.apiKey = process.env['GEINS_MGMT_API_KEY'];
        this.basicAuth.username = process.env['GEINS_MGMT_API_USERMAME'];
        this.basicAuth.password = process.env['GEINS_MGMT_API_PASSWORD'];
    }

    async getUserProfile(email) {   
        // get the user from the api
        let userApi = new this.api.UserApi();
        let query = new this.api.UserModelsUserProfileQuery(); 
        query.email = email;
        return await new Promise((resolve, reject) => {
            userApi.getUserProfile(query, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getUserOrders(userId, email) {
        // get the orders made by user from the api
        let orderApi = new this.api.OrderApi();
        
        // create query
        let query = new this.api.OrderModelsOrderQuery(); 
        
        // if email is provided, use it
        if(email.length > 0){
       //     query.email = email;
        }

        // if userId is provided, use it
        if(userId > 0) {       
            query.customerId = userId;
        }
        
        // add refunds and rows
        query.include = 'rows,refunds';

        //return the orders
        return await new Promise((resolve, reject) => {
            orderApi.queryOrders(query, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getOrders(fromDate) {
        let orderApi = new this.api.OrderApi();
        
        // create query
        let query = new this.api.OrderModelsOrderQuery(); 
        
        // if email is provided, use it
        if(fromDate){
            query.updated = fromDate;
        }
        
        //return the orders
        return await new Promise((resolve, reject) => {
            orderApi.queryOrders(query, (error, data, response) => {
                if (error) {                    
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });

    }

    async getProductsPaged(fromDate, page, batchId) {
        let productApi = new this.api.ProductApi();
        
        // create query
        let query = new this.api.ProductModelsProductQuery();
        query.OnlySellable = true;        
        if(fromDate){
            query.updatedAfter = fromDate;
        }
        if(batchId){
            query.BatchId = batchId;
        }

        // create options
        let opts = {};

        //set page if not set
        if(!page){
            page = 1;        
        }

        console.log('--- queryProductsPaged page: ' + page);

        //return the orders
        return await new Promise((resolve, reject) => {
            productApi.queryProductsPaged(page, query, opts, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getProduct(id) {
        let api = new this.api.ProductApi();

        let query = new this.api.ProductModelsProductQuery();
        query.ProductIds = [];
        query.ProductIds.push(id);
        let opts = {
            'include': 'names,items,prices,categories,parameters,variants,markets,images,feeds,urls,shorttexts'
        };

        //return the products
        return await new Promise((resolve, reject) => {
            api.queryProducts(query, opts, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getCategory(id) {
        let api = new this.api.CategoryApi();

        let query = new this.api.CategoryModelsCategoryQuery();
        query.CategoryIds = [];
        query.CategoryIds.push(id);

        //return the categorys
        return await new Promise((resolve, reject) => {
            api.queryCategories(query, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getBrand(id) {
        let api = new this.api.BrandApi();

        let query = new this.api.BrandModelsBrandQuery();
        query.BrandIds = [];
        query.BrandIds.push(id);

        //return the brands
        return await new Promise((resolve, reject) => {
            api.queryBrands(query, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async getSupplier(id) {
        let api = new this.api.SupplierApi();

        //return the supplier
        return await new Promise((resolve, reject) => {
            api.getSupplierById(id, (error, data, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data.Resource);
                }
            });
        });
    }


}
module.exports = MgmtAPI;
