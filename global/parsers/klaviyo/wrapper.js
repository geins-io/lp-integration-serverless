// Klavyio API Wrapper
var klaviyoSdk = require('klaviyo-api');

class KlavyioAPI {
    constructor() {
        // KlavyioAPI API Setup
        this.api = klaviyoSdk;
        this.config = {
            languageCode: 'sv',
            currencyCode: 'SEK',
            vatIncluded: true,
            marketId: 1,          
        }
        klaviyoSdk.ConfigWrapper(process.env['KLAVIYO_API_KEY']);
    }

    // get the profile id from the email
    async getProfileFromEmail(email) {
        // docs: https://developers.klaviyo.com/en/reference/get_profiles
        var retval = {
            profileId: null,
            status: null,
            statusCode: null,
            data: null,
        };         
        // build the options
        // docs: https://developers.klaviyo.com/en/docs/filtering_#filter-operations
        var opts = {
            filter:  `equals(email,"${email}")`
        };
        // get the profile
        await klaviyoSdk.Profiles.getProfiles(opts)
        .then(function(data) {         
            if(data.body){           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body.data;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            if(data.length > 0){
                retval.profileId = data[0].id;
                retval.data = data[0];
            } 
        })
        return retval;
    }

    // create a profile
    async createProfile(payload) {
        // docs: https://developers.klaviyo.com/en/reference/create_profile
        var retval = this.createResponseReturnValue();
        retval.klaviyoId = null;  

        // build the body fom the payload
        const body = this.buildProfileBody(payload);

        // build the options
        var opts = {};
        // create the profile
        await klaviyoSdk.Profiles.createProfile(body, opts)
        .then(function(data) {            
            if(data.body){           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            retval.klaviyoId = data.data.id;
            retval.data = data.data;
        })
        .catch(function(error) {
            if(error){
                if(error.response?.text){                
                    const errorText = JSON.parse(error.response.text);
                    retval.data = error.response.text;
                    errorText.errors.forEach(function(error) {
                        if(error.status == 409) {     
                            retval.statusCode = error.status;
                            retval.status = error.code;                    
                            retval.klaviyoId = error.meta.duplicate_profile_id;
                        }
                        else {
                            retval.statusCode = error.status;
                            retval.status = error.code;
                            retval.data = error;
                        }
                    });                
                }
            }            
        });
        return retval;    
    }

    // update a profile
    async updateProfile(payload, id) {
        // docs: https://developers.klaviyo.com/en/reference/update_profile
        var retval = this.createResponseReturnValue();
        retval.profileId = null;     

        // build the body fom the payload
        let body = this.buildProfileBody(payload);
        body.data.id = id        

        var opts = {};
        await klaviyoSdk.Profiles.updateProfile(body, id, opts)
        .then(function(data) {            
            if(data.body){           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            retval.klaviyoId = data.data.id;
            retval.data = data;
        })
        .catch(function(error) {
            if(error){
                if(error.response?.text){                
                    const errorText = JSON.parse(error.response.text);
                    retval.data = error.response.text;
                    errorText.errors.forEach(function(err) {
                        if(err.status == 409) {     
                            retval.statusCode = err.status;
                            retval.status = err.code;                    
                            retval.klaviyoId = err.meta.duplicate_profile_id;
                        }
                    });                
                }
            }            
        });        
        return retval;    
    }
    
    // create a catalog item in klaviyo
    async createCatalogItem(payload) {
        // docs: https://developers.klaviyo.com/en/reference/create_catalog_item
        var retval = this.createResponseReturnValue();

        // build the body fom the payload
        let body = this.buildCatalogItemBody(payload);

        // set new item values
        body.data.attributes.integration_type = '$custom';
        body.data.attributes.catalog_type = '$default';
        body.data.attributes.external_id = this.buildExtrenalProductId(payload.ProductId);
        
        // build the options
        const context = this;
        await klaviyoSdk.Catalogs.createCatalogItem(body)
        .then(function(data) {            
            if(data.body){           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            retval.klaviyoId = data.data.id;
            retval.data = data;
        })
        .catch(function(error) {
            retval = context.handleResponseError(error, retval);      
        });  
        return retval;
    }

    // update a catalog item in klaviyo
    async updateCatalogItem(payload, id) {
        // docs: https://developers.klaviyo.com/en/reference/update_catalog_item
        var retval = this.createResponseReturnValue();

        // build the body fom the payload
        let body = this.buildCatalogItemBody(payload);
        // add the id to the body
        body.data.id = id;
        
        const context = this;    
        await klaviyoSdk.Catalogs.updateCatalogItem(body, id)
        .then(function(data) {            
            if(data.body){           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            retval.klaviyoId = data.data.id;
            retval.data = data;
        })
        .catch(function(error) {
            retval = context.handleResponseError(error, retval);      
        });  
        return retval;
    }

    // create a catalog variant in klaviyo
    async createCatalogVariant(item, product) {
        // docs: https://developers.klaviyo.com/en/reference/create_catalog_variant
        var retval = this.createResponseReturnValue();

        // build the body fom the payload
        let body = this.buildCatalogVariantBody(item, product);
        // set new item values
        body.data.attributes.integration_type = '$custom';
        body.data.attributes.catalog_type = '$default';
        body.data.attributes.external_id = this.buildExtrenalProductItemId(product.ProductId, item.ItemId);

        const context = this;    
        await klaviyoSdk.Catalogs.createCatalogVariant(body, opts)
        .then(function(data) {            
            if(data.body){           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            retval.klaviyoId = data.data.id;
            retval.data = data;
        })
        .catch(function(error) {
            retval = context.handleResponseError(error, retval);      
        });        
        return retval;  
    }

    // update a catalog variant in klaviyo
    async updateCatalogVariant(item, product, id) {
        // docs: https://developers.klaviyo.com/en/reference/update_catalog_variant
        var retval = this.createResponseReturnValue();
        // build the body fom the payload
        let body = this.buildCatalogVariantBody(item, product);
        // add the id to the body
        body.data.id = id;
        // remove relationships
        body.data.relationships = null;
       
        console.log('updateCatalogVariant body: ', body);
        const context = this;

        await klaviyoSdk.Catalogs.updateCatalogVariant(body, id)
        .then(function(data) {            
            if(data.body) {           
                retval.statusCode = data.status;
                retval.status = 'ok';
                return data.body;
            }
            throw new Error('No data returned');
        })
        .then(function(data) {
            retval.klaviyoId = data.data.id;
            retval.data = data;
        })
        .catch(function(error) {
            retval = context.handleResponseError(error, retval);      
        });        
        return retval;  
    }

    // build the body fom the payload
    buildProfileBody(payload) {
        // build the body fom the payload
        var body = {
            data: {
                type: 'profile',                
                attributes: {
                    email: payload.email,
                    // phone_number: payload.attributes.phone || '',
                    external_id: payload.id,
                    first_name: payload.firstName || '',
                    last_name: payload.lastName || '',
                    organization: payload.attributes.company || '',
                    location: {
                        address1: payload.location.address1 || '',
                        address2: payload.location.address2 || '',
                        city: payload.location.city || '',
                        country: payload.location.city || '',
                        zip: payload.location.zip || '',
                    },
                    properties: {                        
                        'User Type': payload.commercial.userType || '',
                        'Latest Order': payload.commercial.lastOrder || '',
                        'Orders': payload.commercial.totalOrders || '',
                        'Returns': payload.commercial.totalReurns || '',                       
                    }
                    }
            }   
        }; 
        // add brands if any            
        if(payload.commercial.brands.length > 0) {
            body.data.attributes.properties['Brands'] = payload.commercial.brands.join(',');
        }

        // add categories if any
        if(payload.commercial.categories.length > 0) {
            body.data.attributes.properties['Categories'] = payload.commercial.categories.join(',');
        }

        // add skus if any
        if(payload.commercial.skus.length > 0) {
            body.data.attributes.properties['Sku'] = payload.commercial.skus.map(sku => sku.sku).join(',');
            body.data.attributes.properties['Sku Items'] = payload.commercial.skus.map(sku => sku.skuItem).join(',');
        }

        // add campaigns if any
        if(payload.commercial.campaigns.length > 0) {
            body.data.attributes.properties['Campaigns'] = payload.commercial.campaigns.join(',');
        }

        // add sales for each currency if any
        payload.commercial.sales.forEach(function(sales) {
            body.data.attributes.properties['Sales ' + sales.currency] = sales.totalSpent;
        });
        return body;
    }

    // build the catalog item body
    buildCatalogItemBody(payload) {
        // configured language  
        const languageCode = this.config.languageCode;
        // configured currency
        const currencyCode = this.config.currencyCode;  
        // get product data
        const productData = this.buildProductData(payload, languageCode, currencyCode); 

        // build the body fom the payload
        var body = {
                data: {
                    type: 'catalog-item',
                    attributes: {                        
                        title: productData.name,
                        price: productData.price,
                        description: productData.shortText || productData.longText || productData.techText,
                        url: productData.url,
                        image_full_url: productData.imageUrl,
                        image_thumbnail_url: productData.imageUrl,
                        custom_metadata: { 
                            ... productData.properties
                        },
                        published: true
                    }
                }
        };         
        return body;
    }

    // build the catalog variant body from Geins Product Item
    buildCatalogVariantBody(item, product) {
        // configured language  
        const languageCode = this.config.languageCode;
        // configured currency
        const currencyCode = this.config.currencyCode;  
        // get product data
        const productData = this.buildProductData(product, languageCode, currencyCode);
        
        // DEBUG
        // console.log('***** productData', productData);

        // build data for variant
        const variant = this.buildProductItemData(item, languageCode, currencyCode);

        // build the body fom the item
        var body = {
            data: {
                type: 'catalog-variant',
                attributes: {
                    title: variant.title,
                    description: '',
                    sku: variant.sku,
                    inventory_policy: 1,
                    inventory_quantity: variant.inventory,
                    price: productData.price,
                    url: productData.url,
                    image_full_url: productData.imageUrl,
                    image_thumbnail_url: productData.imageUrl,
                    custom_metadata: {
                        gtin: variant.gtin,
                        ... productData.properties
                    },
                    published: true
                },                
                relationships: {
                    items: { 
                            data: [
                                    { 
                                        type: 'catalog-item', id: product.klaviyoProductId
                                }
                            ]
                    }
                }
            }
        };

        return body;
    }

    // build product data for klaviyo from an Geins Product
    buildProductData(data, languageCode, currencyCode) {
        // declare product data
        let productData = {};

        // set product id
        productData.id = data.ProductId;

        // set klaviyo id
        productData.klaviyoId = this.getKlaviyoCatalogItemId(data.ProductId);

        // get the name of product in configured language
        productData.name = data.Names.find(product => product.LanguageCode === languageCode).Content;

        // get image url from data
        productData.imageUrl = data.PrimaryImage;

        // get prices with configured currency
        const prices = data.Prices.filter(price => price.Currency === currencyCode);
        // loop through prices and get the lowest price
        const price = 0;
        productData.currency = '';
        prices.forEach(function(priceItem) {
            if(priceItem.PriceIncVat < price || price == 0) {
                productData.price = priceItem.PriceIncVat;
                productData.currency = priceItem.Currency;
            }
        });

        // get url for congigured market
        productData.url = data.Urls.find(url => url.Market === this.config.marketId).Url;

        // get loop items and all count of stock to inventory
        productData.inventory = 0;
        data.Items.forEach(function(item) {
            productData.inventory += item.Stock;
        });

        // get short text in configured language
        const shortTextObj = data.ShortTexts ? data.ShortTexts.find(text => text.LanguageCode === languageCode) : null;
        productData.shortText = shortTextObj ? this.cleanString(shortTextObj.Content) : '';
        
        // get long text in configured language
        const longTextObj = data.LongTexts ? data.LongTexts.find(text => text.LanguageCode === languageCode) : null;
        productData.longText = longTextObj ? this.cleanString(longTextObj.Content) : '';

        // get tech text in configured language
        const techTextObj = data.TechTexts ? data.TechTexts.find(text => text.LanguageCode === languageCode) : null;
        productData.techText = techTextObj ? this.cleanString(techTextObj.Content) : '';

        productData.description = productData.shortText || productData.longText || productData.techText;

        // create properties object
        productData.properties = {};

        // get all the properties from data
        const propertiesObj = data.ParameterValues;// ? data.Properties.find(prop => prop.LanguageCode === this.config.languageCode) : null;
        propertiesObj.forEach(function(item) {
            const property = item.ParameterName;
            const value = item.Description
            let valueLocalized = null;
            // get localized value for property in configured language
            if(item.LocalizedDescriptions && item.LocalizedDescriptions.length > 0) {
                valueLocalized = item.LocalizedDescriptions.find(text => text.LanguageCode === languageCode).Content;
            }
            productData.properties[property] = valueLocalized || value;
        });

        return productData;
    }
    // build product data for klaviyo from an Geins Product Item
    buildProductItemData(data, languageCode, currencyCode) {
        // DEBUG
        // console.log('*****  ---- buildProductItemData', data.Stock);

        // declare product data
        let itemData = {};

        // set id
        itemData.id = data.ItemId;

        // set the variant title
        itemData.title = data.Name;

        //set the variant sku
        itemData.sku  = data.ArticleNumber;
        
        // set inventory
        itemData.inventory = data.Stock.StockSellable;

        // set static innventory policy
        itemData.inventory_static = data.Stock.StockStatic > 0 ? true : false;  

        // set gitin
        itemData.gtin = data.Gtin;

        return itemData;
    }

    // build extrenal product id for klaviyo
    buildExtrenalProductId(productId) {
        return `${productId}`;
    }

    // build external product item id for klaviyo
    buildExtrenalProductItemId(productId, itemId) {
        return `${productId}-${itemId}`;
    }

    // build klaviyo catalog item id
    getKlaviyoCatalogItemId(productId) {
        return `$custom:::$default:::${productId}`;
    }

    // build klaviyo catalog item id
    getKlaviyoCatalogVariationId(productId, productItemId) {
        return `$custom:::$default:::${this.buildExtrenalProductId(productId, productItemId)}`;
    }

    // create response return value template
    createResponseReturnValue() {
        return {
            klaviyoId: null,
            status: null,
            statusCode: null,
            data: null,
        }; 
    }

    // handle catalog response error from klaviyo
    handleResponseError(error, retval) {
        if(error.response?.text){                
            const errorText = JSON.parse(error.response.text);
            retval.data = error.response.text;
            errorText.errors.forEach(function(err) {
                if(err.status == 409) {     
                    retval.statusCode = err.status;
                    retval.status = err.code;                    
                }
            });                
        }
        return retval;
    }

    // clean string, remove all tags and normalize spaces
    cleanString(string) {
        return string.replace(/(<([^>]+)>)/ig,"").replace(/\s+/g, ' ').trim();
    }


}
module.exports = KlavyioAPI;



/*class eventPayload {
    user: any;
    eventName: 'product-viewed';
    object: [{}];
}*/