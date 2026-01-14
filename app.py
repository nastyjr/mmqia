
import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
import os
import sys

# Cloud mode detection - SII auth disabled in cloud
CLOUD_MODE = os.environ.get('STREAMLIT_SHARING_MODE') is not None or 'streamlit' in os.environ.get('HOME', '')

# Only import crypto modules if running locally
if not CLOUD_MODE:
    try:
        sys.path.append(os.path.join(os.path.dirname(__file__), 'python_server'))
        from services.sii_auth import authenticate
        from utils.cert_parser import parse_pkcs12
        SII_AVAILABLE = True
    except ImportError:
        SII_AVAILABLE = False
else:
    SII_AVAILABLE = False

# Configuration
st.set_page_config(
    page_title="Sistema Contable Pro",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CSS Styling ---
st.markdown("""
<style>
    .main .block-container {
        padding-top: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
        color: #0f172a;
    }
</style>
""", unsafe_allow_html=True)

# --- Session State ---
if 'user' not in st.session_state:
    st.session_state.user = None

if 'journal_entries' not in st.session_state:
    # Initial Mock Data
    st.session_state.journal_entries = [
        {"id": 1, "date": "2024-01-01", "glosa": "Inicio de Actividades", "debit": 1000000, "credit": 1000000},
        {"id": 2, "date": "2024-01-15", "glosa": "Venta Factura #1", "debit": 150000, "credit": 150000},
    ]

# --- Sidebar ---
with st.sidebar:
    st.image("https://via.placeholder.com/150x50?text=LOGO", use_column_width=True)
    st.title("Navegación")
    
    if st.session_state.user:
        st.success(f"Hola, {st.session_state.user.get('name', 'Usuario')}")
        if st.button("Cerrar Sesión"):
            st.session_state.user = None
            st.rerun()
            
        page = st.radio("Ir a:", [
            "Dashboard", 
            "Libro Diario", 
            "Conexión SII", 
            "Reportes"
        ])
    else:
        st.info("Por favor inicie sesión")
        page = "Login"

# --- Pages ---

def login_page():
    st.title("Bienvenido al Sistema Contable")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Acceso Administrativo")
        # Mock login for simplicity as requested "bypass auth" before
        if st.button("Ingresar como Administrador (Demo)", type="primary"):
            st.session_state.user = {"name": "Administrador", "email": "admin@empresa.cl"}
            st.rerun()

    with col2:
        st.subheader("Acceso con Certificado Digital")
        if SII_AVAILABLE:
            cert_file = st.file_uploader("Subir Certificado (.p12)", type=['p12'])
            password = st.text_input("Contraseña Certificado", type="password")
            
            if st.button("Ingresar con SII"):
                if cert_file and password:
                    with st.spinner("Autenticando con SII..."):
                        try:
                            with open("temp_cert.p12", "wb") as f:
                                f.write(cert_file.getbuffer())
                            with open("temp_cert.p12", "rb") as f:
                                p12_data = f.read()
                            cert_data = parse_pkcs12(p12_data, password)
                            auth_result = authenticate(cert_data['pem_key'], cert_data['pem_cert'])
                            st.session_state.user = {
                                "name": cert_data['subject'].get('CN', 'Usuario SII'),
                                "token": auth_result['token']
                            }
                            st.success("Autenticación exitosa!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error: {str(e)}")
                else:
                    st.warning("Debe subir certificado y contraseña")
        else:
            st.warning("🔒 El acceso con Certificado SII no está disponible en la versión Cloud. Use el botón Demo o ejecute la aplicación localmente.")

def dashboard_page():
    st.title("Dashboard Financiero")
    
    # KPIs
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Ingresos Mes", "$ 4.500.000", "+12%")
    with col2:
        st.metric("Gastos Mes", "$ 2.100.000", "-5%")
    with col3:
        st.metric("Resultado", "$ 2.400.000", "+25%")
    with col4:
        st.metric("IVA a Pagar", "$ 850.000", "0%")
        
    # Charts
    st.subheader("Tendencia de Flujo de Caja")
    df = pd.DataFrame({
        "Mes": ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
        "Ingresos": [300, 450, 400, 500, 480, 550],
        "Gastos": [200, 250, 220, 280, 260, 300]
    })
    
    fig = px.line(df, x="Mes", y=["Ingresos", "Gastos"], markers=True)
    st.plotly_chart(fig, use_container_width=True)

    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader("Composición de Gastos")
        df_expenses = pd.DataFrame({
            "Categoría": ["Arriendo", "Sueldos", "Insumos", "Servicios"],
            "Monto": [100, 300, 150, 50]
        })
        fig_pie = px.pie(df_expenses, values='Monto', names='Categoría', hole=0.4)
        st.plotly_chart(fig_pie, use_container_width=True)
        
    with col_b:
        st.subheader("Alertas Inteligentes")
        st.info("⚠️ Posible discrepancia en F29 de Abril")
        st.warning("⚠️ 2 Facturas de compra sin acuse de recibo")
        st.success("✅ Conciliación bancaria al día")

def journal_page():
    st.title("Libro Diario")
    
    if st.button("Nueva Asiento"):
         # Simple entry creation for demo
         new_id = len(st.session_state.journal_entries) + 1
         st.session_state.journal_entries.append({
             "id": new_id, 
             "date": datetime.now().strftime("%Y-%m-%d"), 
             "glosa": "Nuevo Asiento Manual", 
             "debit": 0, "credit": 0
         })
         st.rerun()

    df = pd.DataFrame(st.session_state.journal_entries)
    
    # Editable Grid
    edited_df = st.data_editor(df, num_rows="dynamic", use_container_width=True)
    
    # We could sync back to session_state if needed, but Streamlit handles state well

def sii_page():
    st.title("Conexión SII")
    st.info("Estado: Conectado (Simulado)")
    
    st.subheader("Registro de Compras y Ventas (RCV)")
    
    tab1, tab2 = st.tabs(["Compras", "Ventas"])
    
    with tab1:
        st.write("Consulta de Compras desde SII")
        if st.button("Sincronizar Compras"):
            # Here we would call services.sii.rcv
            st.toast("Sincronizando con SII...", icon="🔄")
            
        mock_rcv = pd.DataFrame([
            {"Folio": 1023, "Fecha": "2024-12-01", "RUT": "76.123.456-7", "Razón Social": "PROVEEDOR 1", "Monto": 150000},
            {"Folio": 592, "Fecha": "2024-12-05", "RUT": "96.888.111-K", "Razón Social": "PROVEEDOR 2", "Monto": 45990},
        ])
        st.dataframe(mock_rcv, use_container_width=True)

# --- Router ---
if page == "Login":
    login_page()
elif page == "Dashboard":
    dashboard_page()
elif page == "Libro Diario":
    journal_page()
elif page == "Conexión SII":
    sii_page()
elif page == "Reportes":
    st.title("Reportes")
    st.write("Módulo de reportes en construcción...")
