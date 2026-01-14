
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import Optional
from datetime import datetime, timedelta
import uvicorn
import os
from pathlib import Path

# Import our services
from utils.cert_parser import parse_pkcs12
from services.sii_auth import authenticate

app = FastAPI(title="SII Backend Server", version="1.0.0")

# Get the project root (one level up from python_server)
PROJECT_ROOT = Path(__file__).parent.parent
DIST_DIR = PROJECT_ROOT / "dist"

# CORS setup
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*",  # Allow all origins in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (single user for local dev)
current_session = {
    "token": None,
    "token_expiry": None,
    "certificate": None,
    "private_key": None,
    "subject": None
}

ENVIRONMENT = "maullin"

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "environment": ENVIRONMENT,
        "hasToken": bool(current_session["token"]),
        "tokenExpiry": current_session["token_expiry"]
    }

@app.post("/api/sii/auth")
async def login_sii(certificate: UploadFile = File(...), password: str = Form(...)):
    print("\n===== INICIANDO AUTENTICACIÓN SII (Python) =====")
    
    try:
        content = await certificate.read()
        print(f"[Server] Archivo recibido: {certificate.filename} - {len(content)} bytes")
        
        if not password:
            raise HTTPException(status_code=400, detail="Se requiere contraseña del certificado")
            
        # Parse certificate
        try:
            cert_data = parse_pkcs12(content, password)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error al leer certificado: {str(e)}")
            
        # Authenticate with SII
        try:
            auth_result = authenticate(cert_data['pem_key'], cert_data['pem_cert'])
            token = auth_result['token']
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error en autenticación SII: {str(e)}")
            
        # Update session
        current_session["token"] = token
        current_session["token_expiry"] = datetime.now() + timedelta(minutes=55)
        current_session["certificate"] = cert_data['pem_cert']
        current_session["private_key"] = cert_data['pem_key']
        current_session["subject"] = cert_data['subject']
        
        print(f"[Server] Autenticación exitosa. Token: {token[:20]}...")
        
        return {
            "success": True,
            "message": "Autenticación exitosa",
            "token": f"{token[:20]}...",
            "subject": cert_data['subject'],
            "expiresAt": current_session["token_expiry"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Server] Error inesperado: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sii/status")
async def get_status():
    is_valid = False
    if current_session["token"] and current_session["token_expiry"]:
        if current_session["token_expiry"] > datetime.now():
            is_valid = True
            
    return {
        "authenticated": is_valid,
        "subject": current_session["subject"],
        "expiresAt": current_session["token_expiry"],
        "environment": ENVIRONMENT
    }

@app.post("/api/sii/disconnect")
async def disconnect():
    current_session["token"] = None
    current_session["token_expiry"] = None
    current_session["certificate"] = None
    current_session["private_key"] = None
    
    print("[Server] Sesión cerrada")
    return {"success": True, "message": "Desconectado"}

@app.get("/api/sii/rcv/purchase")
async def get_rcv_purchase(period: Optional[str] = None):
    if not current_session["token"]:
        raise HTTPException(status_code=401, detail="No autenticado")
        
    # Mock data compatible with React frontend
    mock_data = [
        { "folio": 1023, "date": "2024-12-01", "rut": "76.123.456-7", "name": "PROVEEDOR TECNOLÓGICO SPA", "amount": 150000 },
        { "folio": 592, "date": "2024-12-05", "rut": "96.888.111-K", "name": "COMERCIALIZADORA INSUMOS LTDA", "amount": 45990 },
        { "folio": 33, "date": "2024-12-10", "rut": "12.345.678-9", "name": "CONSULTORA LEGAL Y TRIBUTARIA", "amount": 850000 },
    ]
    
    return {
        "success": True,
        "data": mock_data,
        "count": len(mock_data),
        "period": period or datetime.now().strftime("%Y%m")
    }

# --- PRODUCTION: Serve React Frontend ---
# Mount static files if dist folder exists (production build)
if DIST_DIR.exists():
    # Serve static assets
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    # Catch-all route for SPA (must be last)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Try to serve the file directly
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Otherwise return index.html for SPA routing
        return FileResponse(DIST_DIR / "index.html")

if __name__ == "__main__":
    print("")
    print("═══════════════════════════════════════════════")
    print("   🐍  SII Backend Server (Python/FastAPI)")
    print("═══════════════════════════════════════════════")
    print(f"   Puerto:     3001")
    print(f"   Ambiente:   {ENVIRONMENT.upper()}")
    print("")
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)

