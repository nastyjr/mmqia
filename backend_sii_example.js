
/**
 * EJEMPLO DE BACKEND (NODE.JS) PARA CONEXIÓN SII
 * ------------------------------------------------
 * Este código debe correr en un servidor seguro (Backend), NO en el navegador.
 * Requerimientos: npm install axios xml-crypto xmldom
 */

const axios = require('axios');
const fs = require('fs');
const { DOMParser } = require('xmldom');
const { SignedXml } = require('xml-crypto');
const forge = require('node-forge'); // Para leer el PFX

// CONFIGURACIÓN
const CERT_PATH = './mi_certificado.pfx';
const CERT_PASS = 'mi_clave_secreta';
const SII_ENV = 'https://palena.sii.cl'; // Usar maullin.sii.cl para pruebas

async function autenticarConSII() {
    try {
        console.log("1. Solicitando Semilla...");
        // Paso 1: Obtener Semilla
        const seedResponse = await axios.get(`${SII_ENV}/DteWs/CrSeed.jws`);
        
        // El SII responde un XML simple: <RESPUESTA><SEMILLA>0000123</SEMILLA>...</RESPUESTA>
        const seedMatch = seedResponse.data.match(/<SEMILLA>(.*?)<\/SEMILLA>/);
        if (!seedMatch) throw new Error("No se pudo obtener la semilla");
        const seed = seedMatch[1];
        console.log("Semilla obtenida:", seed);

        // Paso 2: Preparar el XML para firmar
        // Esta es la estructura estricta que pide el SII
        const xmlToSign = `
<getToken>
<item>
<Semilla>${seed}</Semilla>
</item>
</getToken>`;

        console.log("2. Firmando Semilla digitalmente...");
        // Leer el certificado PFX
        const pfxBuffer = fs.readFileSync(CERT_PATH);
        const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
        const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, CERT_PASS);
        
        // Extraer llave privada y certificado público
        // (Simplificado para el ejemplo, requiere iterar los safeBags)
        const keyBags = pfx.getBags({ bagType: forge.pkcs12.bagTypes.keyBag });
        const certBags = pfx.getBags({ bagType: forge.pkcs12.bagTypes.certBag });
        
        const privateKey = forge.pki.privateKeyToPem(keyBags[forge.pkcs12.bagTypes.keyBag][0].key);
        const publicCert = forge.pki.certificateToPem(certBags[forge.pkcs12.bagTypes.certBag][0].cert);

        // Firmar usando XMLDsig (Canonicalization y RSA-SHA1)
        const sig = new SignedXml();
        sig.addReference("//*[local-name(.)='getToken']");
        sig.signingKey = privateKey;
        sig.computeSignature(xmlToSign);
        
        // El XML final firmado
        const signedXml = sig.getSignedXml();

        console.log("3. Obteniendo Token...");
        // Paso 3: Enviar Semilla Firmada para obtener Token
        // El SII espera el parámetro como string URL encoded o en el body directo dependiendo del endpoint
        const tokenResponse = await axios.post(`${SII_ENV}/DteWs/GetTokenFromSeed.jws`, signedXml, {
            headers: { 'Content-Type': 'application/xml' }
        });

        const tokenMatch = tokenResponse.data.match(/<TOKEN>(.*?)<\/TOKEN>/);
        if (!tokenMatch) throw new Error("Error obteniendo token");
        
        const token = tokenMatch[1];
        console.log(">>> TOKEN ÉXITO:", token);
        
        return token;

    } catch (error) {
        console.error("Error en proceso SII:", error.message);
    }
}

// Ejecutar
// autenticarConSII();
