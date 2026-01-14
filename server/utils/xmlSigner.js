/**
 * XML Signer Utility
 * Signs XML documents using XML-DSIG (Enveloped Signature)
 */
import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';

/**
 * Sign an XML string using XML-DSIG enveloped signature
 * @param {string} xmlString - The XML to sign
 * @param {string} pemKey - PEM-encoded private key
 * @param {string} pemCert - PEM-encoded X.509 certificate
 * @param {string} referenceUri - The URI to reference (e.g., '' for root, '#id' for specific element)
 * @returns {string} - Signed XML
 */
function signXml(xmlString, pemKey, pemCert, referenceUri = '') {
    const sig = new SignedXml();

    // Configure signature algorithm
    sig.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
    sig.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

    // Add reference with transforms
    sig.addReference(
        referenceUri,
        [
            'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
            'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
        ],
        'http://www.w3.org/2000/09/xmldsig#sha1'
    );

    // Set signing key
    sig.signingKey = pemKey;

    // Add KeyInfo with X509 certificate
    sig.keyInfoProvider = {
        getKeyInfo: function () {
            // Clean certificate (remove headers/footers and newlines)
            const cleanCert = pemCert
                .replace('-----BEGIN CERTIFICATE-----', '')
                .replace('-----END CERTIFICATE-----', '')
                .replace(/\r?\n|\r/g, '');

            return `<X509Data><X509Certificate>${cleanCert}</X509Certificate></X509Data>`;
        }
    };

    // Compute signature
    sig.computeSignature(xmlString, {
        location: { reference: '/*', action: 'append' }
    });

    return sig.getSignedXml();
}

/**
 * Create the signed seed XML for SII GetToken
 * @param {string} seed - The seed value from CrSeed
 * @param {string} pemKey - PEM private key
 * @param {string} pemCert - PEM certificate
 * @returns {string} - Complete signed XML envelope
 */
function createSignedSeedXml(seed, pemKey, pemCert) {
    // Build the XML structure that SII expects
    const xmlTemplate = `<?xml version="1.0"?>
<getToken>
<item>
<Semilla>${seed}</Semilla>
</item>
</getToken>`;

    // Sign the XML
    return signXml(xmlTemplate, pemKey, pemCert, '');
}

export { signXml, createSignedSeedXml };
