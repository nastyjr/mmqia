/**
 * Certificate Parser Utility
 * Extracts private key and certificate from PKCS#12 (.p12/.pfx) files
 */
import forge from 'node-forge';

/**
 * Parse a PKCS#12 file and extract credentials
 * @param {Buffer} p12Buffer - The .p12 file contents as a Buffer
 * @param {string} password - The certificate password
 * @returns {{ privateKey: forge.pki.PrivateKey, certificate: forge.pki.Certificate, pemKey: string, pemCert: string }}
 */
function parsePKCS12(p12Buffer, password) {
    try {
        // Convert Buffer to forge-compatible format
        const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

        // Extract bags
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

        // Get first certificate
        const certBag = certBags[forge.pki.oids.certBag];
        if (!certBag || certBag.length === 0) {
            throw new Error('No se encontró certificado en el archivo .p12');
        }
        const certificate = certBag[0].cert;

        // Get first private key
        const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
        if (!keyBag || keyBag.length === 0) {
            throw new Error('No se encontró llave privada en el archivo .p12');
        }
        const privateKey = keyBag[0].key;

        // Convert to PEM format
        const pemKey = forge.pki.privateKeyToPem(privateKey);
        const pemCert = forge.pki.certificateToPem(certificate);

        // Extract subject info
        const subject = certificate.subject.attributes.reduce((acc, attr) => {
            acc[attr.shortName] = attr.value;
            return acc;
        }, {});

        console.log('[CertParser] Certificado cargado correctamente');
        console.log('[CertParser] Titular:', subject.CN || 'Desconocido');
        console.log('[CertParser] Emisor:', certificate.issuer.attributes.find(a => a.shortName === 'O')?.value || 'Desconocido');

        return {
            privateKey,
            certificate,
            pemKey,
            pemCert,
            subject
        };

    } catch (error) {
        console.error('[CertParser] Error al parsear .p12:', error.message);
        throw new Error(`Error al leer certificado: ${error.message}`);
    }
}

export { parsePKCS12 };
