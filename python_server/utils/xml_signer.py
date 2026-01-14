
from lxml import etree
from signxml import XMLSigner, methods

def sign_xml(xml_string: str, pem_key: str, pem_cert: str) -> str:
    """
    Signs an XML string using XML-DSIG (Enveloped Signature) for SII.
    Uses RSA-SHA1.
    """
    # Clean certificate for inclusion
    clean_cert = pem_cert.replace('-----BEGIN CERTIFICATE-----', '').replace('-----END CERTIFICATE-----', '').replace('\n', '').replace('\r', '')

    root = etree.fromstring(xml_string.encode('utf-8'))
    
    signer = XMLSigner(
        method=methods.enveloped,
        signature_algorithm="rsa-sha1",
        digest_algorithm="sha1",
        c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    )

    signed_root = signer.sign(
        root,
        key=pem_key.encode('utf-8'),
        cert=pem_cert.encode('utf-8')
    )

    # signxml might return just the signature or the signed tree depending on usage,
    # but .sign() returns the root element with signature appended.
    
    # SII often expects specific formatting.
    # The default output of signxml is usually compliant with standard XML-DSIG.
    
    return etree.tostring(signed_root, encoding='ISO-8859-1').decode('ISO-8859-1') # SII typically uses ISO-8859-1

def create_signed_seed_xml(seed: str, pem_key: str, pem_cert: str) -> str:
    """
    Create the signed seed XML for SII GetToken
    """
    xml_template = f"""<?xml version="1.0"?>
<getToken>
<item>
<Semilla>{seed}</Semilla>
</item>
</getToken>"""

    # For manual signing construction (if signxml is too heavy or differs in structure),
    # we might need to build the Signature node manually. 
    # However, let's try specific configuration with signxml first or fallback to manual if needed.
    
    # NOTE: The node.js code uses 'xml-crypto' which produces standard enveloped signature.
    # We will assume signxml produces compatible output.
    
    # We strip the prologue before signing because signxml parses the element
    body = xml_template.replace('<?xml version="1.0"?>\n', '')
    
    signed_xml = sign_xml(body, pem_key, pem_cert)
    
    # Add prologue back if needed, but often SII consumes the fragment inside pszXml
    return f'<?xml version="1.0"?>\n{signed_xml}'
