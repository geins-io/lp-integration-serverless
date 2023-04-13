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
}
module.exports = MgmtAPI;
