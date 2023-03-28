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
}
module.exports = MgmtAPI;
