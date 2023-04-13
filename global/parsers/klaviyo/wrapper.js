// Klavyio API Wrapper
var klaviyoSdk = require('klaviyo-api');

class KlavyioAPI {
    constructor() {
        // KlavyioAPI API Setup
        this.api = klaviyoSdk;
        klaviyoSdk.ConfigWrapper(process.env['KLAVIYO_API_KEY']);
    }

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

    async createProfile(payload) {
        // docs: https://developers.klaviyo.com/en/reference/create_profile
        var retval = {
            profileId: null,
            status: null,
            statusCode: null,
            data: null,
        };      

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
            retval.profileId = data.data.id;
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
                            retval.profileId = error.meta.duplicate_profile_id;
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

    async updateProfile(id, payload) {
        // docs: https://developers.klaviyo.com/en/reference/update_profile
        var retval = {
            profileId: null,
            status: null,
            statusCode: null,
            data: null,
        };        

        // build the body fom the payload
        const body = this.buildProfileBody(payload, id);        

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
            retval.profileId = data.data.id;
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
                            retval.profileId = err.meta.duplicate_profile_id;
                        }
                    });                
                }
            }            
        });        
        return retval;    
    }

    buildProfileBody(payload, id) {
        // build the body fom the payload
        var body = {
            data: {
                type: 'profile',
                id: id,
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
                        // TODO check timezones
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


 

}
module.exports = KlavyioAPI;
