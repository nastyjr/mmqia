
import requests
import xmltodict
from .utils.xml_signer import create_signed_seed_xml

# Configuration
ENVIRONMENT = 'maullin' # 'maullin' (cert) or 'produccion'

ENDPOINTS = {
    'maullin': {
        'crSeed': 'https://maullin.sii.cl/DTEWS/CrSeed.jws',
        'getToken': 'https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws'
    },
    'produccion': {
        'crSeed': 'https://palena.sii.cl/DTEWS/CrSeed.jws',
        'getToken': 'https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws'
    }
}

def get_endpoints():
    return ENDPOINTS[ENVIRONMENT]

def get_seed() -> str:
    endpoints = get_endpoints()
    print(f"[SII Auth] Solicitando semilla a: {endpoints['crSeed']}")

    soap_body = """<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<getSeed/>
</soapenv:Body>
</soapenv:Envelope>"""

    headers = {'Content-Type': 'text/xml; charset=utf-8'}
    
    try:
        response = requests.post(endpoints['crSeed'], data=soap_body, headers=headers)
        response.raise_for_status()
        
        # Parse response
        parsed = xmltodict.parse(response.text)
        
        # Navigate SOAP structure
        # Use safe navigation or try/except
        try:
            body = parsed['soapenv:Envelope']['soapenv:Body']
            # getSeedReturn might be a string containing XML or a dict depending on library behavior
            # usually it is just the return value, which contains nested XML
            seed_return = body['ns1:getSeedReturn'] if 'ns1:getSeedReturn' in body else body['getSeedReturn']
            
            # The return value is often an XML string itself in SII
            if isinstance(seed_return, str):
                 inner_xml = xmltodict.parse(seed_return)
                 seed = inner_xml['SII']['RESP_BODY']['SEMILLA']
            else:
                 seed = seed_return['SII']['RESP_BODY']['SEMILLA']

            print(f"[SII Auth] Semilla obtenida: {seed}")
            return str(seed)
            
        except KeyError as e:
            print(f"[SII Auth] Error parseando respuesta: {e}")
            raise ValueError(f"No se pudo extraer semilla: {e}")

    except Exception as e:
        print(f"[SII Auth] Error obteniendo semilla: {e}")
        raise

def get_token(seed: str, pem_key: str, pem_cert: str) -> str:
    endpoints = get_endpoints()
    print("[SII Auth] Firmando semilla y solicitando token...")

    signed_xml = create_signed_seed_xml(seed, pem_key, pem_cert)
    
    # We need to wrap the signed XML in CDATA or escape it properly, 
    # but the Node.js implementation uses CDATA block.
    
    soap_body = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<getToken>
<pszXml><![CDATA[{signed_xml}]]></pszXml>
</getToken>
</soapenv:Body>
</soapenv:Envelope>"""

    headers = {'Content-Type': 'text/xml; charset=utf-8'}
    
    try:
        response = requests.post(endpoints['getToken'], data=soap_body, headers=headers)
        response.raise_for_status()
        
        parsed = xmltodict.parse(response.text)
        
        try:
            body = parsed['soapenv:Envelope']['soapenv:Body']
            token_return = body['ns1:getTokenReturn'] if 'ns1:getTokenReturn' in body else body['getTokenReturn']
            
             # The return value is often an XML string itself
            if isinstance(token_return, str):
                 inner_xml = xmltodict.parse(token_return)
                 resp = inner_xml['SII']
            else:
                 resp = token_return['SII']
            
            estado = resp['RESP_HDR']['ESTADO']
            if estado != '00':
                glosa = resp['RESP_HDR'].get('GLOSA', 'Unknown Error')
                raise ValueError(f"SII Error [{estado}]: {glosa}")
                
            token = resp['RESP_BODY']['TOKEN']
            print(f"[SII Auth] Token obtenido: {token}")
            return str(token)
            
        except KeyError as e:
             raise ValueError(f"No se pudo extraer token: {e}")

    except Exception as e:
        print(f"[SII Auth] Error obteniendo token: {e}")
        raise

def authenticate(pem_key: str, pem_cert: str):
    print(f"[SII Auth] Iniciando autenticación en {ENVIRONMENT}...")
    
    seed = get_seed()
    token = get_token(seed, pem_key, pem_cert)
    
    return {"seed": seed, "token": token}
