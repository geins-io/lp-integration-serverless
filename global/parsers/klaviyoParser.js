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
            case 'productRelations':
                this.productRelationsSync(actionObject);
                break
            case 'category':
            case 'brand':
            case 'supplier':
                this.catalogCategorySync(actionObject);
                break
            default:
                // log error
                util.logger.saveLog('error-no-action/'+actionObject.origin, actionObject.action, actionObject.payload, 'Invalid action');
                break;                
        }
    }

    // push catalog category
    async catalogCategorySync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'catalogCategorySync/'+ actionObject.origin;  
        const action = actionObject.action;
        
        // get category catalog info from the geins api
        const info = await this.categoryCatalogInfoGet(actionPayload, family);
        if(!info || info === undefined || info === null || info.length === 0) {
            return;
        }

        // console.log('**** info', info);

        // since the api returns an array, we only need the first item 
        const infoObject = Array.isArray(info) ? info[0] : info;

        // get catalog category 
        const category = await this.categoryCatalogInfoParse(infoObject, family);
       
        // define the klaviyo id
        let klaviyoId = ''; 

        // set broker name // FIX THIS
        const brokerName = util.dataStore.categoryBrokerName(category.id, family);

        // get the product from the broker table  
        const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(brokerName);

        // set klaivyo category id if broker row exists
        if(brokerRow !== undefined && brokerRow !== null) {
            klaviyoId = brokerRow.rowKey;
        }

        //console.log('**** klaviyoId --- from broker :: ', klaviyoId);

        // create item if not exists in broker table
        let categorySaved = false;
        if(klaviyoId === '') {
            // push product to Klaviyo
            const response = await klavyioClient.createCatalogCategory(category);
            if(response.status === 'ok') {
                // set the klaviyo product id from response
                klaviyoId = response.klaviyoId;     
                categorySaved = true;
                //console.log('**** klaviyoId --- from create', klaviyoId);           
            } else if (response.status === 'duplicate_category') {
                // category already exists in Klaviyo
                // handle this case as you wish, in this case we just update the category in Klaviyo
                klaviyoId = klavyioClient.getKlaviyoCatalogCategoryId(category.id, family);
                //console.log('**** klaviyoId --- from dublicate', klaviyoId); 
                util.logger.saveLog(origin, action, actionPayload, 'Category already exists in Klaviyo');
            }
        }
        // TODO:
        //console.log('**** category', category);
        //console.log('**** brokerName', brokerName);
        //console.log('**** brokerRow', brokerRow);        
        // return;

        // category was not saved at this point in Klaviyo, try update/patch it
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

    // push products
    async productsSync(actionObject) {
        const mgmtClient = new util.MgmtAPI();
        const actionPayload = JSON.parse(actionObject.payload) 
        let page = actionPayload.page;
        const batchId = actionPayload.batchId;
        const syncType = actionPayload.type;        
        const origin = 'products-sync/'+ actionObject.origin;
        const incremental = syncType === 'incremental';   
        
        
        console.log('**** productsSync actionObject', actionObject);
        console.log('**** productsSync actionPayload', actionPayload);



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

        let hasMoreRows = false;
        let messages = [];         
        const response = await mgmtClient.getProductsPaged(latestDateStr, page, batchId);
        console.log('**** response PageResult', response.PageResult);
        // Get the page data
        const pageData = response.PageResult;
        // Set the has more rows
        hasMoreRows = pageData.HasMoreRows; 
        // Get the products
        const productData = response.Resource;
        // Loop over the products and add to mssage array
        for (let i = 0; i < productData.length; i++) {
            const product = productData[i];
            messages.push({ action: 'product-sync', payload: product, origin: origin });  
            
            //break after 10 products for testing
            //if(i > 10) {
            //    break;
            //}

        }
        // add messages to queue with throttle
        await util.queue.enqueueMessages(messages, 1000);

        // logg sync
        // add record of latest order to log table to be used for incremental sync
        const syncDate = new Date();               
        util.dataStore.syncTable.saveData({ partitionKey:  'product-sync', latestDate: syncDate, syncedEntities: messages.length });

        // if another page add to queue
        if(hasMoreRows) {
            // add next page to queue
            const nextPayload = JSON.stringify({ 
                page: pageData.Page + 1,
                batchId: pageData.BatchId,
                type: syncType
            });
            await util.queue.enqueueMessage({ action: 'products-sync', payload: nextPayload, origin: origin });   
        }
    }

    // push one product 
    async productSync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'product-sync/'+ actionObject.origin;  
        const action = actionObject.action;

        // console.log('***** PRODUCT actionPayload::',  actionPayload);

        // get product info
        let products = await this.productInfoGet(actionPayload.ProductId || actionPayload);        
        if(products === undefined || products === null || products.length === 0) {
            return;
        }

        // get the product
        let product = products[0];
        //console.log('*****  product::',  product);

        // get product relations and add if not in broker table
        product.relations = await this.productRelationsGet(product);
        if( product.relations !== undefined &&  product.relations !== null) {
            // console.log('*****  rels::',  product.relations);
            for (let i = 0; i <  product.relations.length; i++) {
                const relation =  product.relations[i];                
                // if not in broker table add to klaivyo
                if(relation.brokerRow == undefined || relation.brokerRow == null) {
                    await this.catalogCategorySync({ action: 'category-sync', family: relation.family, payload: relation.id, origin: origin });
                }
            }
        }
        
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
            console.log('***** PRODUCT create-response == '+product.ProductId);
            // console.log('***** PRODUCT create-response::', response);
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
            console.log('***** PRODUCT update-response == '+product.ProductId);
            // console.log('***** PRODUCT update-response::', response);
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
            console.error('***** PRODUCT NOT SAVED == '+product.ProductId);
            util.logger.saveLog(origin, action, actionPayload, 'Product not saved, product id:' + product.ProductId);
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

    // push relations to Klaviyo 
    async productRelationsSync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'product-sync/'+ actionObject.origin;  
        const action = actionObject.action;

        // get the product from the payload
        const product = actionPayload.product;
    }

    // get category info from geins mgmt api
    async categoryCatalogInfoGet(id, family) {
        // use the geins mgmt api to get the user info
        const mgmtClient = new util.MgmtAPI();

        // get user info from the api
        let response = {};
        try {
            if(family == 'category') {
                response = await mgmtClient.getCategory(id);
            } else if(family == 'brand') {
                response = await mgmtClient.getBrand(id);
            } else if(family == 'supplier') {
                response = await mgmtClient.getSupplier(id);                
            }            
        } catch (error) {
            return;
        }
        if(response === undefined || response === null) {
            return;
        }
        // return category
        return response;
    }

    // get category info from geins mgmt api
    async categoryCatalogInfoParse(data, family) {
        const klavyio = new util.KlavyioAPI();
        let category = {};
        if(family == 'category') {
           const categoryData =  klavyio.buildCategoryData(data);
           category.id = categoryData.id;
           category.name = categoryData.name;
           category.externalId = categoryData.externalId
        } else if(family == 'brand') {
            const brandData =  klavyio.buildBrandData(data);
            category.id = brandData.id;
            category.name = brandData.name;
            category.externalId = brandData.externalId
        } else if(family == 'supplier') {
            const supplierData =  klavyio.buildSupplierData(data); 
            category.id = supplierData.id;
            category.name = supplierData.name;
            category.externalId = supplierData.externalId
        }

        return category;       
    }

    // get product info from geins
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

    // build product relations from geins product data
    async productRelationsGet(product) {
        const klavyioClient = new util.KlavyioAPI();
        const config = klavyioClient.config;
        const relations = [];

        // add brand
        if(config.catalogCategorySync.brands && product.BrandId !== undefined && product.BrandId !== null && product.BrandId !== '') {
            // get the brand from the broker table
            const brokerName = util.dataStore.categoryBrokerName(product.BrandId, 'brand');
            const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(brokerName);
            const klaviyoId = klavyioClient.getKlaviyoCatalogCategoryId(product.BrandId, 'brand');
            relations.push({
                id: product.BrandId,
                name: product.BrandName,
                family: 'brand',
                brokerName: brokerName,
                brokerRow: brokerRow,
                klaviyoId: klaviyoId,
            });
        }

        // add supplier
        if(config.catalogCategorySync.suppliers == true && product.SupplierId !== undefined && product.SupplierId !== null && product.SupplierId > 0 &&  product.SupplierId !== '') {
            const brokerName = util.dataStore.categoryBrokerName(product.SupplierId, 'supplier');
            const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(brokerName);
            const klaviyoId = klavyioClient.getKlaviyoCatalogCategoryId(product.SupplierId, 'supplier');            
            relations.push({
                id: product.SupplierId,
                name: product.SupplierName,
                family: 'supplier',
                brokerName: brokerName,
                brokerRow: brokerRow,
                klaviyoId: klaviyoId,
            });
        }
        // add categories
        if (config.catalogCategorySync.categories && product.Categories !== undefined && product.Categories !== null && product.Categories.length > 0) {            
            
            for (let i = 0; i < product.Categories.length; i++) {
                const category = product.Categories[i];
                const brokerName = util.dataStore.categoryBrokerName(category.CategoryId, 'category');
                const brokerRow = await util.dataStore.productBrokerTable.getLatestEntity(brokerName);
                const klaviyoId = klavyioClient.getKlaviyoCatalogCategoryId(category.CategoryId, 'category');  
                const name = category.Names.find(text => text.LanguageCode === 'sv').Content;
                
                // add category if it doesn't exist
                const categoryExists = relations.find(cat => cat.id === category.CategoryId);
                if(categoryExists === undefined || categoryExists === null) {
                    relations.push({
                        id: category.CategoryId,
                        name: name,                    
                        family: 'category',
                        brokerName: brokerName,
                        brokerRow: brokerRow,
                        klaviyoId: klaviyoId,
                    });
                }
            
            }
        }
        return relations;
    }
    
    // build product relations from geins product data
    getCategoryPath(category, categoryMap, path = []) {
        if (category === undefined || category === null) {
            return path;
        }
        // console.log(category);
        const name = category.Names.find(text => text.LanguageCode === 'sv').Content;
        // console.log('--- ** --- name for:{' + category.CategoryId + '} ', name);
        path.push(category.CategoryId);
    
        // Check if the parent category exists in the map
        const parentCategory = categoryMap.get(category.ParentCategoryId);
    
        // If the parent is found, call the function recursively; otherwise, return the path
        return parentCategory ? this.getCategoryPath(parentCategory, categoryMap, path) : path;
    }

    // push users to Klaviyo
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
            if(latestEntity === undefined || latestEntity === null) {
                latestDate = new Date('2000-01-01T00:00:00Z');
            } else {                
                latestDate = new Date(latestEntity.latestDate);
                atLeastOrderId = latestEntity.latestOrderId;            
            }
        }       
        console.log('-----------  usersSync latestDate: ', latestDate);

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
        let messages = [];
        for (const email of users) {
            messages.push( { action: 'user-sync', payload: email, origin: actionObject.origin });            
        }

        // send the messages to the queue throttled
        await util.queue.enqueueMessages(messages, 500);

        // add record of latest order to log table to be used for incremental sync       
        util.dataStore.syncTable.saveData({ partitionKey:  'user-sync', latestDate:latestDate.toISOString(), latestOrderId: latestOrderId, syncedEntities: users.length });
    }

    // push one user to Klaviyo
    async userSync(actionObject) {
        const klavyioClient = new util.KlavyioAPI();
        const actionPayload = actionObject.payload; 
        const family = actionObject.family;
        const origin = 'user-sync/'+ actionObject.origin;  
        const action = actionObject.action;

        // console.log('userSync actionObject: ', actionObject.payload);
        // return;

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

    // get user info from geins mgmt api
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

    // helper_ normalize email
    normalizeEmail(email) {
        if(email === undefined) {
            return '';
        }
        return email.toLowerCase();
    }
}
module.exports = KlavyioParser

  