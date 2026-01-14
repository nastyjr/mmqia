
import base64
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.hazmat.primitives import serialization
from cryptography.x509.oid import NameOID

def parse_pkcs12(p12_data: bytes, password: str):
    """
    Parse a PKCS#12 file and extract credentials.
    Returns a dict with private_key, certificate, pem_key, pem_cert, and subject.
    """
    private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
        p12_data,
        password.encode('utf-8')
    )

    if not private_key or not certificate:
        raise ValueError("El archivo PKCS#12 debe contener una llave privada y un certificado")

    # Serialize to PEM
    pem_key = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    pem_cert = certificate.public_bytes(
        encoding=serialization.Encoding.PEM
    ).decode('utf-8')

    # Extract subject info
    subject = {}
    for attribute in certificate.subject:
        # Common Name (CN)
        if attribute.oid == NameOID.COMMON_NAME:
            subject['CN'] = attribute.value
        # Organization (O)
        if attribute.oid == NameOID.ORGANIZATION_NAME:
            subject['O'] = attribute.value
        # Country (C)
        if attribute.oid == NameOID.COUNTRY_NAME:
            subject['C'] = attribute.value
        
        # Add others as needed by short name mapping if available, 
        # or simplified mapping for the key ones used in JS

    print(f"[CertParser] Certificado cargado: {subject.get('CN', 'Unknown')}")

    return {
        "private_key": private_key,
        "certificate": certificate,
        "pem_key": pem_key,
        "pem_cert": pem_cert,
        "subject": subject
    }
