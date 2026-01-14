/**
 * SII Authentication Service
 * Implements CrSeed (get seed) and GetTokenFromSeed (get token) flows
 */
import https from 'https';
import { XMLParser } from 'fast-xml-parser';
import { createSignedSeedXml } from '../utils/xmlSigner.js';
import config from '../config.js';

const parser = new XMLParser();

/**
 * Make HTTPS request to SII
 */
function httpsRequest(url, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });

        req.on('error', reject);

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

/**
 * Step 1: Get Seed from SII
 * Calls CrSeed.jws to obtain a random seed value
 */
async function getSeed() {
    const endpoints = config.getEndpoints();
    console.log('[SII Auth] Solicitando semilla a:', endpoints.crSeed);

    // SOAP envelope for CrSeed
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<getSeed/>
</soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await httpsRequest(endpoints.crSeed, 'POST', soapBody);
        console.log('[SII Auth] Respuesta CrSeed:', response.status);

        // Parse XML response
        const parsed = parser.parse(response.data);

        // Navigate SOAP response structure
        // Expected: <SOAP-ENV:Body><getSeedReturn>...</getSeedReturn></SOAP-ENV:Body>
        const body = parsed['SOAP-ENV:Envelope']?.['SOAP-ENV:Body'] ||
            parsed['soap:Envelope']?.['soap:Body'] ||
            parsed['soapenv:Envelope']?.['soapenv:Body'];

        if (!body) {
            console.log('[SII Auth] Raw response:', response.data);
            throw new Error('Respuesta SOAP inválida');
        }

        const seedResponse = body.getSeedReturn || body['ns1:getSeedReturn'];

        // Parse the inner XML (getSeedReturn contains XML as string or nested)
        let innerXml;
        if (typeof seedResponse === 'string') {
            innerXml = parser.parse(seedResponse);
        } else {
            innerXml = seedResponse;
        }

        // Extract seed value
        const seed = innerXml?.SII?.RESP_BODY?.SEMILLA;

        if (!seed) {
            console.log('[SII Auth] Parsed structure:', JSON.stringify(parsed, null, 2));
            throw new Error('No se pudo extraer la semilla de la respuesta');
        }

        console.log('[SII Auth] Semilla obtenida:', seed);
        return seed;

    } catch (error) {
        console.error('[SII Auth] Error obteniendo semilla:', error);
        throw error;
    }
}

/**
 * Step 2: Get Token using signed seed
 * Signs the seed and calls GetTokenFromSeed.jws
 */
async function getToken(seed, pemKey, pemCert) {
    const endpoints = config.getEndpoints();
    console.log('[SII Auth] Firmando semilla y solicitando token...');

    // Create signed XML
    const signedXml = createSignedSeedXml(seed, pemKey, pemCert);
    console.log('[SII Auth] XML firmado generado');

    // SOAP envelope for GetToken
    // Note: The signed XML goes inside the pszXml parameter
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<getToken>
<pszXml><![CDATA[${signedXml}]]></pszXml>
</getToken>
</soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await httpsRequest(endpoints.getToken, 'POST', soapBody);
        console.log('[SII Auth] Respuesta GetToken:', response.status);

        // Parse response
        const parsed = parser.parse(response.data);

        const body = parsed['SOAP-ENV:Envelope']?.['SOAP-ENV:Body'] ||
            parsed['soap:Envelope']?.['soap:Body'] ||
            parsed['soapenv:Envelope']?.['soapenv:Body'];

        if (!body) {
            console.log('[SII Auth] Raw response:', response.data);
            throw new Error('Respuesta SOAP inválida');
        }

        const tokenResponse = body.getTokenReturn || body['ns1:getTokenReturn'];

        // Parse inner XML
        let innerXml;
        if (typeof tokenResponse === 'string') {
            innerXml = parser.parse(tokenResponse);
        } else {
            innerXml = tokenResponse;
        }

        // Check for errors
        const estado = innerXml?.SII?.RESP_HDR?.ESTADO;
        if (estado && estado !== '00') {
            const glosa = innerXml?.SII?.RESP_HDR?.GLOSA || 'Error desconocido';
            throw new Error(`SII Error [${estado}]: ${glosa}`);
        }

        // Extract token
        const token = innerXml?.SII?.RESP_BODY?.TOKEN;

        if (!token) {
            console.log('[SII Auth] Parsed structure:', JSON.stringify(parsed, null, 2));
            throw new Error('No se pudo extraer el token de la respuesta');
        }

        console.log('[SII Auth] Token obtenido:', token.substring(0, 20) + '...');
        return token;

    } catch (error) {
        console.error('[SII Auth] Error obteniendo token:', error);
        throw error;
    }
}

/**
 * Full authentication flow
 */
async function authenticate(pemKey, pemCert) {
    console.log('[SII Auth] Iniciando flujo de autenticación...');
    console.log('[SII Auth] Ambiente:', config.environment);

    // Step 1: Get seed
    const seed = await getSeed();

    // Step 2: Get token
    const token = await getToken(seed, pemKey, pemCert);

    return { seed, token };
}

export { getSeed, getToken, authenticate };
