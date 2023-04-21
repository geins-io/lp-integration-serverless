const util = require("../util.js");
class KlavyioParser {
    constructor() {
    }

    async parse(output, action) {
        // TODO: is this the best way to do this?
        // parse the output type and process it        
        switch(output.type) {
            case util.OutputType.API_PUSH:
                this.handler(action);
                break;
        }
    }

    async handler(actionObject) {
        // push the action to the api
        const family = actionObject.family;
        const payload = actionObject.payload;       
        const action = actionObject.action;

        switch(family) {
            case 'user':
                this.userSync(actionObject);
                break;
            case 'users':
                this.usersSync(actionObject);
                break;
            case 'product':
                this.productSync(actionObject);
                break;
            case 'products':
                this.productsSync(actionObject);
                break
            case 'category':
                this.categorySync(actionObject);
                break
            default:
                // log error
                util.logger.saveLog('error-no-action/'+actionObject.origin, actionObject.action, actionObject.payload, 'Invalid action');
                break;                
        }
    }

    async categorySync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'category-sync/'+ actionObject.origin;  
        const action = actionObject.action;
       
        // get category info
        const categories = await this.categoryInfoGet(actionPayload);
        if(categories === undefined || categories === null || categories.length === 0) {
            return;
        }
        const category = categories[0];

         // define the klaviyo id
         let klaviyoId = '';

        // set broker name
        const brokerName = util.dataStore.categoryBrokerName(category.CategoryId);

        // get the product from the broker table  
        const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(brokerName);

        // set klaivyo category id if broker row exists
        if(brokerRow !== undefined && brokerRow !== null) {
            klaviyoId = brokerRow.rowKey;
        }

        // create item if not exists in broker table
        let categorySaved = false;
        if(klaviyoId === '') {
            // push product to Klaviyo
            const response = await klavyioClient.createCatalogCategory(category);
            if(response.status === 'ok') {
                // set the klaviyo product id from response
                klaviyoId = response.klaviyoId;     
                categorySaved = true;           
            } else if (response.status === 'duplicate_category') {
                // category already exists in Klaviyo
                // handle this case as you wish, in this case we just update the category in Klaviyo
                klaviyoId = klavyioClient.getKlaviyoCatalogCategoryId(category.CategoryId);
                util.logger.saveLog(origin, action, actionPayload, 'Category already exists in Klaviyo');
            }
        }

        // category was not saved at this point in Klaviyo, try update it
        if(!categorySaved && klaviyoId !== '') {
            const response = await klavyioClient.updateCatalogCategory(category, klaviyoId);
            if(response.status === 'ok' || response.statusCode === 204) {
                categorySaved = true;
            }            
        }

        // save categroy to broker table it was not saved before
        if(klaviyoId !== '' && (brokerRow === undefined || brokerRow === null)) {
            util.dataStore.productBrokerTable.saveData({
                partitionKey: brokerName,
                rowKey: klaviyoId,            
            });
        }

        // something went wrong, log error and stop execution
        if(!categorySaved) {
            // log error
            util.logger.saveLog(origin, action, actionPayload, 'Category not saved, , category id:' + category.ProductId);
            // stop execution
            return;            
        }

    }

    async productsSync(actionObject) {        
        const mgmtClient = new util.MgmtAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'products-sync/'+ actionObject.origin;  
        const action = actionObject.action;
        const incremental = actionObject.payload === 'incremental';        

        // set latest date to 2000-01-01
        let latestDate = new Date('2000-01-01T00:00:00Z');

        // update latest date if incremantal
        if(incremental) {
            const latestEntity = await util.dataStore.syncTable.getLatestEntity('product-sync');
            if(latestEntity === undefined || latestEntity === null) {
                latestDate = new Date('2000-01-01T00:00:00Z');
            } else {                
                latestDate = new Date(latestEntity.latestDate);               
            }
 
        }
        // convert latestDate to ISO string
        const latestDateStr = latestDate.toISOString();

        let page = 1;
        let pageCount = 1;
        let hasMoreRows = true;
        let products = [];
        // loop response until HasMoreRows is false        
        while (hasMoreRows) {
            const response = await mgmtClient.getProductsPaged(latestDateStr, page);
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

            // Set the has more rows
            hasMoreRows = pageData.HasMoreRows;

            // Set the next page number if there are more rows
            if(hasMoreRows) {
                page = pageData.PageNumber + 1;
            }

        }

        // add products to queque
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            util.queue.enqueueMessage({ action: 'product-sync', payload: product, origin: actionObject.origin });            
        }

        // add record of latest order to log table to be used for incremental sync
        const syncDate = new Date();               
        util.dataStore.syncTable.saveData({ partitionKey:  'product-sync', latestDate: syncDate, syncedEntities: products.length });
    }

    async productSync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'product-sync/'+ actionObject.origin;  
        const action = actionObject.action;

        // get product info
        let products = await this.productInfoGet(actionPayload.ProductId || actionPayload);        
        if(products === undefined || products === null || products.length === 0) {
            return;
        }
        const product = products[0];
        
        // define the klaviyo product id
        let klaviyoProductId = '';
        
        // set broker name
        const productBorkerName = util.dataStore.productBrokerName(product.ProductId);
        
        // get the product from the broker table  
        const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(productBorkerName);
        
        // set klaivyo product id if broker row exists
        if(brokerRow !== undefined && brokerRow !== null) {
            klaviyoProductId = brokerRow.rowKey;
        }

        // create item if not exists in broker table
        let productSaved = false;
        if(klaviyoProductId === '') {
            // push product to Klaviyo
            const response = await klavyioClient.createCatalogItem(product);
            if(response.status === 'ok') {
                // set the klaviyo product id from response
                klaviyoProductId = response.klaviyoId;     
                productSaved = true;           
            } else if (response.status === 'conflict') {
                // product already exists in Klaviyo
                // handle this case as you wish, in this case we just update the product
                klaviyoProductId = klavyioClient.getKlaviyoCatalogItemId(product.ProductId);
                util.logger.saveLog(origin, action, actionPayload, 'Product already exists in Klaviyo');
            }            
        
        }

        // product was not saved at this point in Klaviyo, try update it
        if(!productSaved && klaviyoProductId !== '') {
            const response = await klavyioClient.updateCatalogItem(product, klaviyoProductId);
            if(response.status === 'ok') {
                productSaved = true;
            }            
        }

        // save product to broker table it was not saved before
        if(klaviyoProductId !== '' && (brokerRow === undefined || brokerRow === null)) {
            util.dataStore.productBrokerTable.saveData({
                partitionKey: productBorkerName,
                rowKey: klaviyoProductId,            
            });
        }

        // something went wrong, log error and stop execution
        if(!productSaved) {
            // log error
            util.logger.saveLog(origin, action, actionPayload, 'Product not saved, , product id:' + product.ProductId);
            // stop execution
            return;            
        }

        // add klaviyo product id to product object
        product.klaviyoProductId = klaviyoProductId;

        // push product variants to Klaviyo if any
        for(const item of product.Items) {
            let klaviyoProductItemId = '';            
            // set broker name
            const itemBrokerName = util.dataStore.productItemBrokerName(product.ProductId, item.ItemId);
            //get the item from the broker table
            const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(itemBrokerName);
            // set klaivyo product id if broker row exists
            if(brokerRow !== undefined && brokerRow !== null) {
                klaviyoProductItemId = brokerRow.rowKey;
            }        

            // push product variant to Klaviyo
            let itemSaved = false;
            if(klaviyoProductItemId === '') {
                // push product variant to Klaviyo
                const response = await klavyioClient.createCatalogVariant(item, product);        
                if(response.status === 'ok') {
                    // set the klaviyo product item id from response
                    klaviyoProductItemId = response.klaviyoId;     
                    itemSaved = true;           
                } else if (response.status === 'conflict') {
                    // product already exists in Klaviyo
                    // handle this case as you wish, in this case we update the product
                    klaviyoProductItemId = klavyioClient.getKlaviyoCatalogItemId(product.ProductId);
                    util.logger.saveLog(origin, action, actionPayload, 'Product Item already exists in Klaviyo item, product id: ' + product.ProductId + ' item id: ' + item.ItemId + ' klaviyo id: ' + klaviyoProductItemId);
                }               
            }

            // item not created, try update it
            if(!productSaved && klaviyoProductId !== '') {
                // update the product in Klaviyo
                const response = await klavyioClient.updateCatalogVariant(item, product, klaviyoProductItemId);
                if(response.status === 'ok') {
                    productSaved = true;
                }            
            }

             // save the klaviyo product id to the broker table if it was not saved before
            if(klaviyoProductItemId !== '' && (brokerRow === undefined || brokerRow === null)) {
                util.dataStore.productBrokerTable.saveData({
                    partitionKey: itemBrokerName,
                    rowKey: klaviyoProductItemId,            
                });
            } 

            // something is wrong, log and try next item
            if(!itemSaved) {
                // log error
                util.logger.saveLog(origin, action, actionPayload, 'Product item not saved, product id: ' + product.ProductId + ' item id: ' + item.ItemId);
            }

        }
    }

    // get category info from geins
    async categoryInfoGet(categoryId) {
        // use the geins mgmt api to get the user info
        const mgmtClient = new util.MgmtAPI();

        // get user info from the api
        let response = {};
        try {
           response = await mgmtClient.getCategory(categoryId);
        } catch (error) {
            return;
        }
        if(response === undefined || response === null) {
           return;
        }
        // return category
        return response;
   }

    async productInfoGet(productId) {
         // use the geins mgmt api to get the user info
         const mgmtClient = new util.MgmtAPI();

         // get user info from the api
         let response = {};
         try {
            response = await mgmtClient.getProduct(productId);
         } catch (error) {
             return;
         }
         if(response === undefined || response === null) {
            return;
         }
         // return product
         return response.Resource;
    }

    async usersSync(actionObject,) {
        const incremental = actionObject.payload === 'incremental';        
        // get all users from the api
        // loop through the users and add them to the queue
        let latestDate = new Date('2000-01-01T00:00:00Z');
        
        let latestOrderId = 0;
        // to prevent unnessary api calls
        let atLeastOrderId = 0;

        // get latest date if incremantal
        if(incremental) {
            const latestEntity = await util.dataStore.syncTable.getLatestEntity('user-sync');
            console.log('*** latestEntity -> ', latestEntity);
            if(latestEntity === undefined || latestEntity === null) {
                latestDate = new Date('2000-01-01T00:00:00Z');
            } else {                
                latestDate = new Date(latestEntity.latestDate);
                atLeastOrderId = latestEntity.latestOrderId;            
            }
        }       

        // get all orders from the api
        const mgmtClient = new util.MgmtAPI();
        const orderResponse = await mgmtClient.getOrders(latestDate);  

        let users = [];       
        for (const order of orderResponse) {
            // get the latest order id
            if(order.Id > latestOrderId){
                latestOrderId = order.Id;
            }

            // get the latest order date
            if(new Date(order.CreatedAt) > latestDate){
                latestDate = new Date(order.CreatedAt);
            }
            // get the user email from the order
            const email = this.normalizeEmail(order.BillingAddress.Email);            
            // add the user to the array if it does not exist
            if(!users.includes(email)) {
                users.push(email);
            }
        };

        // add the users to the queue
        for (const email of users) {
            util.queue.enqueueMessage({ action: 'user-sync', payload: email, origin: actionObject.origin });
            
        }

        // add record of latest order to log table to be used for incremental sync       
        util.dataStore.syncTable.saveData({ partitionKey:  'user-sync', latestDate:latestDate.toISOString(), latestOrderId: latestOrderId, syncedEntities: users.length });
    }

    async userSync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'user-sync/'+ actionObject.origin;  
        const action = actionObject.action;

        // Klaviyo Profile ID
        let klaviyoProfileId = '';

        // get the user info
        const user = await this.userInfoGet(actionPayload.email|| actionPayload);
        if(user === undefined || user === null || user === {}){
            // no user found do nothing
            return;
        }
        const itemBrokerName = user.email;       

        // get the product from the broker table  
        const brokerRow = await util.dataStore.userBrokerTable.getLatestEntity(itemBrokerName);

        // set klaivyo product id if broker row exists
        if(brokerRow !== undefined && brokerRow !== null) {
            klaviyoProfileId = brokerRow.rowKey;
        }

        // create user if not exists in broker table
        let userSaved = false;
        if(klaviyoProfileId === '') {
            // push product to Klaviyo
            const response = await klavyioClient.createProfile(user);
            console.log('*** response -> ', response);
            if(response.status === 'ok') {
                // set the klaviyo product id from response
                klaviyoProfileId = response.klaviyoId;     
                userSaved = true;           
            } else if (response.status === 'duplicate_profile') {
                // user already exists in Klaviyo
                // handle this case as you wish, in this case we just try to update the user
                klaviyoProfileId = response.klaviyoId;            
                util.logger.saveLog(origin, action, actionPayload, 'User already exists in Klaviyo');
            }        
        }

        // // user was not saved at this point in Klaviyo, try update it
        if(!userSaved && klaviyoProfileId !== '') {
            console.log('*** user UPDATE -> ');
            const response = await klavyioClient.updateProfile(user, klaviyoProfileId);
            if(response.status === 'ok') {
                userSaved = true;
            }            
        }
       
        // save the klaviyo product id to the broker table if it was not saved before
        if(klaviyoProfileId !== '' && (brokerRow === undefined || brokerRow === null)) {
            util.dataStore.userBrokerTable.saveData({
                partitionKey: itemBrokerName,
                rowKey: klaviyoProfileId,            
            });
        }

        // something went wrong, log error and stop execution
        if(!userSaved) {
            // log error
            util.logger.saveLog(origin, action, actionPayload, 'User not saved');
            // stop execution
            console.log('User not saved stopping execution');
            return;            
        }
    }

    async userInfoGet(email) {
        // use the geins mgmt api to get the user info
        const mgmtClient = new util.MgmtAPI();
        // get user info from the api
        let response = {};
        try {
            response = await mgmtClient.getUserProfile(email);
        } catch (error) {
            return;
        }
        // set user info from user response
        const user = response.Resource;

        // set the user id from user
        const userId = user?.UserId || 0;

        let commercial = {
            lastOrder: '',
            skus: [],
            categories: [],
            brands: [],
            campaigns: [],
            sales: [],
            orders: [],
            totalOrders: 0,
            totalReurns: 0,
        };

        if(userId > 0) {
            // get commercial info from the api
            const orderResponse = await mgmtClient.getUserOrders(userId, email);  
            for (const order of orderResponse) {
                if(order.CreatedAt > commercial.lastOrder){
                    commercial.lastOrder = order.CreatedAt;
                }

                // add the order to the array
                commercial.orders.push(order.Id);

                // add to the total orders
                commercial.totalOrders += 1;   

                // push sales info to the array in right currency or update the existing one
                let sales = commercial.sales.find(s => s.currency === order.Currency);
                if(sales === undefined) {
                    sales = {
                        currency: order.Currency,
                        totalSpent: order.OrderTotal,            
                        totalProfit: 0, // add if available
                    }
                    commercial.sales.push(sales);
                } else {
                    sales.totalSpent += order.OrderTotal;
                }  

                // add order info form rows
                for(const row of order.Rows) {
                    commercial.skus.push({ 
                                            sku: row.ProductName, 
                                            skuItem: row.Name,
                                            brand: row.BrandName,
                                            category: row.CategoryId,
                                        }); 
                    // add the brand to the array if it does not exist
                    if(!commercial.brands.includes(row.BrandName)) {
                        commercial.brands.push(row.BrandName);                    
                    }
                    // add the category to the array if it does not exist
                    if(!commercial.categories.includes(row.CategoryId)) {
                        commercial.categories.push(row.CategoryId);
                    }                    
                    if(row.CampaignNames){
                        for (const campaign of row.CampaignNames) {
                            // add the campaign to the array if it does not exist
                            if(!commercial.campaigns.includes(campaign)) {
                                commercial.campaigns.push(campaign);
                            }
                        }                               
                    }
                }
                // add order info form refunds
                if(order.Refunds){
                    for(const refund of order.Refunds) {
                        commercial.totalReurns += 1;
                    }
                }                
            }
        }        
        
        // build the payload
        let payload = 
        {             
            id: user.UserId || 0,
            email: user.Email,
            firstName: user.FirstName || '',
            lastName:  user.LastName || '',
            location: {
                address1: user.Address || '',
                address2: user.Address2 || '',
                address3: user.Address3 || '',
                zip: user.Zip || '',
                city: user.City || '',
                state: user.State || '',
                country: user.Country || '',
            },
            attributes: {
                company: user.Company || '',
                phone: user.Phone || '',
                memberType: user.MemberType || '',
                userType: user.UserType || '',
            },
            commercial: {
            ... commercial
            }            
        };

        return payload;
    }

    normalizeEmail(email) {
        if(email === undefined) {
            return '';
        }
        return email.toLowerCase();
    }
}
module.exports = KlavyioParser

  