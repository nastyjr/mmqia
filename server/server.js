/**
 * SII Backend Server
 * Express server that handles authentication, RCV, and DTE operations
 */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';

import config from './config.js';
import { parsePKCS12 } from './utils/certParser.js';
import { authenticate } from './services/siiAuth.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json());

// Store current session (in production, use Redis or DB)
let currentSession = {
    token: null,
    tokenExpiry: null,
    certificate: null,
    privateKey: null
};

// ===== ROUTES =====

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: config.environment,
        hasToken: !!currentSession.token,
        tokenExpiry: currentSession.tokenExpiry
    });
});

/**
 * Upload certificate and authenticate
 * POST /api/sii/auth
 * Body: multipart/form-data with 'certificate' file and 'password' field
 */
app.post('/api/sii/auth', upload.single('certificate'), async (req, res) => {
    console.log('\n===== INICIANDO AUTENTICACIÓN SII =====');

    try {
        // Validate inputs
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se recibió archivo de certificado' });
        }

        const password = req.body.password;
        if (!password) {
            return res.status(400).json({ success: false, message: 'Se requiere contraseña del certificado' });
        }

        console.log('[Server] Archivo recibido:', req.file.originalname, '-', req.file.size, 'bytes');

        // Parse certificate
        const { pemKey, pemCert, subject } = parsePKCS12(req.file.buffer, password);

        // Authenticate with SII
        const { token } = await authenticate(pemKey, pemCert);

        // Store session
        currentSession = {
            token,
            tokenExpiry: new Date(Date.now() + 55 * 60 * 1000), // 55 minutes
            certificate: pemCert,
            privateKey: pemKey,
            subject
        };

        console.log('[Server] Autenticación exitosa');

        res.json({
            success: true,
            message: 'Autenticación exitosa',
            token: token.substring(0, 20) + '...', // Only show partial token
            subject: subject,
            expiresAt: currentSession.tokenExpiry.toISOString()
        });

    } catch (error) {
        console.error('[Server] Error en autenticación:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * Get current authentication status
 */
app.get('/api/sii/status', (req, res) => {
    const isValid = currentSession.token && currentSession.tokenExpiry > new Date();

    res.json({
        authenticated: isValid,
        subject: currentSession.subject,
        expiresAt: currentSession.tokenExpiry?.toISOString(),
        environment: config.environment
    });
});

/**
 * Disconnect / Clear session
 */
app.post('/api/sii/disconnect', (req, res) => {
    currentSession = {
        token: null,
        tokenExpiry: null,
        certificate: null,
        privateKey: null
    };

    console.log('[Server] Sesión cerrada');
    res.json({ success: true, message: 'Desconectado' });
});

/**
 * Get RCV (Registro de Compra y Venta) - Mock for now
 * In production, this would call real SII endpoints
 */
app.get('/api/sii/rcv/purchase', (req, res) => {
    if (!currentSession.token) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    // Mock data for testing
    // In production: use currentSession.token to query real SII RCV
    const mockData = [
        { folio: 1023, date: '2024-12-01', rut: '76.123.456-7', name: 'PROVEEDOR TECNOLÓGICO SPA', amount: 150000 },
        { folio: 592, date: '2024-12-05', rut: '96.888.111-K', name: 'COMERCIALIZADORA INSUMOS LTDA', amount: 45990 },
        { folio: 33, date: '2024-12-10', rut: '12.345.678-9', name: 'CONSULTORA LEGAL Y TRIBUTARIA', amount: 850000 },
    ];

    res.json({
        success: true,
        data: mockData,
        count: mockData.length,
        period: req.query.period || new Date().toISOString().slice(0, 7).replace('-', '')
    });
});

// ===== START SERVER =====

app.listen(config.port, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('   🏛️  SII Backend Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`   Puerto:     ${config.port}`);
    console.log(`   Ambiente:   ${config.environment.toUpperCase()}`);
    console.log(`   Endpoints:  ${config.environment === 'maullin' ? 'Certificación' : 'Producción'}`);
    console.log('');
    console.log('   Rutas disponibles:');
    console.log('   POST /api/sii/auth        - Autenticar con certificado');
    console.log('   GET  /api/sii/status      - Estado de conexión');
    console.log('   GET  /api/sii/rcv/purchase - Obtener RCV Compras');
    console.log('   POST /api/sii/disconnect  - Cerrar sesión');
    console.log('═══════════════════════════════════════════════');
    console.log('');
});
