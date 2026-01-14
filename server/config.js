// SII Backend Server Configuration
const config = {
    // Ambiente: 'maullin' (Certificación) | 'palena' (Producción)
    environment: process.env.SII_ENV || 'maullin',

    endpoints: {
        maullin: {
            crSeed: 'https://maullin.sii.cl/DTEWS/CrSeed.jws',
            getToken: 'https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws',
            queryDte: 'https://maullin.sii.cl/DTEWS/QueryEstDte.jws',
            rcvPurchase: 'https://maullin.sii.cl/cgi_dte/RCV/RCV_IngresoDoc.cgi'
        },
        palena: {
            crSeed: 'https://palena.sii.cl/DTEWS/CrSeed.jws',
            getToken: 'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws',
            queryDte: 'https://palena.sii.cl/DTEWS/QueryEstDte.jws',
            rcvPurchase: 'https://palena.sii.cl/cgi_dte/RCV/RCV_IngresoDoc.cgi'
        }
    },

    getEndpoints() {
        return this.endpoints[this.environment];
    },

    port: process.env.PORT || 3001
};

export default config;
