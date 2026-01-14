// Plan de Cuentas MIPYME 2026 - Descripciones para Usuarios
// Explicaciones simples para personas sin conocimientos de contabilidad
// Este archivo complementa el Plan de Cuentas oficial del SII

export const ACCOUNT_DESCRIPTIONS: Record<string, string> = {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. ACTIVOS - Lo que tu empresa TIENE o le DEBEN
    // ═══════════════════════════════════════════════════════════════════════

    '1': 'Todo lo que tu empresa posee y tiene valor: dinero, equipos, lo que te deben los clientes, etc.',
    '1.1': 'Cosas que puedes convertir en dinero rápidamente (en menos de 1 año).',

    // Activo Circulante
    '1.1.10.1': 'El dinero en efectivo que tienes físicamente en la caja registradora o caja fuerte de tu negocio.',
    '1.1.20.1': 'El dinero que tienes en tu cuenta corriente bancaria. Es tu saldo disponible en el banco.',
    '1.1.30.1': 'Materiales que compras para fabricar tus productos (por ejemplo: tela si haces ropa, madera si haces muebles).',
    '1.1.40.1': 'Productos que empezaste a fabricar pero aún no están terminados. Están "a medio hacer".',
    '1.1.50.1': 'Los productos que tienes listos para vender en tu tienda o bodega.',
    '1.1.60.1': 'Dinero que dejaste en el banco a plazo fijo para ganar intereses.',
    '1.1.70.1': 'Inversiones en acciones o fondos mutuos que puedes vender fácilmente cuando necesites el dinero.',
    '1.1.80.1': 'Dinero que te deben los clientes por ventas que les hiciste al crédito (les vendiste y aún no te pagan).',
    '1.1.90.1': 'Deudas de clientes respaldadas por documentos formales como letras, pagarés o cheques a fecha.',
    '1.1.100.1': 'Documentos que tienes pero que originalmente eran de otra persona (te los endosaron o traspasaron).',
    '1.1.110.1': 'Dinero que te debe una empresa relacionada a la tuya (del mismo dueño o grupo empresarial).',
    '1.1.120.1': 'Dinero que te debe una empresa que NO es parte de tu grupo empresarial.',
    '1.1.130.1': 'Un cálculo de cuántos clientes probablemente nunca te pagarán. Se resta de lo que te deben.',
    '1.1.140.1': 'Otras deudas que te tienen que no son por ventas (ejemplo: préstamo que le hiciste a alguien).',
    '1.1.150.1': 'Dinero que le adelantaste a un trabajador a cuenta de su próximo sueldo.',
    '1.1.160.1': 'Préstamos que le diste a tus empleados y que te van descontando del sueldo.',
    '1.1.170.1': 'Otros descuentos que le haces al sueldo de tus trabajadores (uniformes, multas, etc.).',
    '1.1.180.1': 'Préstamos que le has hecho a los socios o dueños de la empresa.',
    '1.1.190.1': 'Dinero que te debe alguien a quien le diste productos en consignación para vender.',
    '1.1.200.1': 'Impuestos que pagaste de más y el SII te debe devolver.',
    '1.1.210.1': 'Impuesto especial del combustible que puedes usar como crédito si eres transporte o agricultura.',
    '1.1.220.1': 'El IVA que pagaste en tus compras y que puedes descontar del IVA de tus ventas.',
    '1.1.230.1': 'Crédito especial para empresas que operan en zonas francas.',
    '1.1.240.1': 'Créditos por impuestos específicos que puedes usar para pagar menos impuestos.',
    '1.1.250.1': 'Crédito por impuesto adicional que pagaste y puedes recuperar.',
    '1.1.260.1': 'Impuestos que pagarás en el futuro, pero contablemente ya los reconociste.',
    '1.1.270.1': 'Pagos que hiciste por adelantado (arriendo, seguros) que aún no has "consumido".',
    '1.1.280.1': 'Otros activos que se convertirán en dinero en menos de un año y no encajan en otras categorías.',
    '1.1.290.1': 'Valor de contratos de leasing que vencen dentro del año.',
    '1.1.300.1': 'Bienes que compraste específicamente para darlos en leasing a otros.',
    '1.1.310.1': 'Pagos mensuales de impuestos que vas haciendo a cuenta del impuesto anual (como un ahorro obligatorio).',

    // Activo Fijo
    '1.2': 'Bienes que usas para trabajar y que no piensas vender (equipos, muebles, vehículos, etc.).',
    '1.2.10.1': 'Terrenos que son propiedad de tu empresa.',
    '1.2.20.1': 'Edificios, bodegas, galpones u otras construcciones de tu empresa.',
    '1.2.30.1': 'Máquinas y equipos que usas para producir o trabajar.',
    '1.2.40.1': 'Escritorios, sillas, estantes y otros muebles de oficina.',
    '1.2.50.1': 'Bienes que estás pagando mediante un contrato de leasing (arriendo con opción de compra).',
    '1.2.60.1': 'Otros activos fijos como vehículos, herramientas mayores, etc.',
    '1.2.70.1': 'Aumento de valor de tus activos cuando los retasas técnicamente.',
    '1.2.80.1': 'Cuánto valor han perdido tus activos fijos por el uso y el paso del tiempo (resta al valor del activo).',

    // Otros Activos
    '1.3': 'Inversiones a largo plazo, intangibles y otros activos especiales.',
    '1.3.10.1': 'Cuenta personal del dueño: retiros que hace de la empresa o dinero que le presta a la empresa.',
    '1.3.20.1': 'Acciones o participación que tienes en empresas relacionadas (del mismo grupo).',
    '1.3.30.1': 'Acciones o participación que tienes en otras empresas.',
    '1.3.40.1': 'Dinero que te deben y que te pagarán en más de un año.',
    '1.3.50.1': 'Dinero que te debe una empresa relacionada y te pagará en más de un año.',
    '1.3.60.1': 'Impuestos diferidos que usarás en más de un año.',
    '1.3.70.1': 'Cosas que tienen valor pero no son físicas: marcas, patentes, licencias de software, derechos.',
    '1.3.80.1': 'Otros activos que no encajan en las categorías anteriores.',
    '1.3.90.1': 'Beneficios o activos relacionados con tus trabajadores.',
    '1.3.100.1': 'Contratos de leasing que vencen en más de un año.',
    '1.3.110.1': 'Inversiones en la zona de Arica que dan derecho a crédito tributario.',
    '1.3.120.1': 'Inversiones en las regiones de Aysén o Magallanes que dan derecho a crédito tributario.',
    '1.3.130.1': 'Cuánto valor han perdido tus intangibles (marcas, patentes) con el tiempo.',

    // Nuevos Activos 2024-2026
    '1.1.320.1': 'Bitcoin, Ethereum u otras criptomonedas que posee tu empresa.',
    '1.1.330.1': 'Crédito tributario especial para empresas del régimen Pro Pyme.',
    '1.1.340.1': 'Pagos provisionales con la tasa reducida del 12.5% para Pro Pyme (2026).',
    '1.1.350.1': 'Crédito por gastos de capacitación de trabajadores (SENCE).',
    '1.1.360.1': 'Crédito tributario por inversión en investigación y desarrollo.',
    '1.1.370.1': 'Crédito por compra de activo fijo para PYMES.',
    '1.1.380.1': 'IVA que pueden recuperar los exportadores.',
    '1.3.140.1': 'Dinero invertido en fondos mutuos o fondos de inversión.',
    '1.3.150.1': 'Cuotas de participación en fondos de inversión.',

    // ═══════════════════════════════════════════════════════════════════════
    // 2. PASIVOS - Lo que tu empresa DEBE a otros
    // ═══════════════════════════════════════════════════════════════════════

    '2': 'Todo lo que tu empresa debe pagar: deudas, préstamos, sueldos pendientes, impuestos, etc.',
    '2.1': 'Deudas que debes pagar en menos de 1 año.',

    // Pasivo Circulante
    '2.1.10.1': 'Préstamos que le debes a bancos y que debes pagar dentro del año.',
    '2.1.20.1': 'Pagarés u otros documentos que emitiste y debes pagar.',
    '2.1.30.1': 'Facturas de proveedores que aún no has pagado.',
    '2.1.40.1': 'Dinero que le debes a empresas relacionadas (del mismo grupo).',
    '2.1.50.1': 'Dinero que le debes a empresas que no son de tu grupo.',
    '2.1.60.1': 'Dinero que debes porque vendiste productos que te dieron en consignación.',
    '2.1.70.1': 'Otras deudas que no son con proveedores ni bancos.',
    '2.1.80.1': 'Cuotas de leasing que debes pagar este año.',
    '2.1.90.1': 'Intereses del leasing que aún no han vencido.',
    '2.1.100.1': 'Dinero que sabes que deberás pagar pero aún no es seguro cuánto (vacaciones, indemnizaciones).',
    '2.1.110.1': 'Sueldos que ya trabajaron tus empleados pero aún no les pagas.',
    '2.1.120.1': 'AFP, Isapre y otras cotizaciones previsionales que descontaste pero aún no pagas.',
    '2.1.130.1': 'Impuesto único retenido del sueldo de tus trabajadores.',
    '2.1.140.1': 'Otros descuentos del sueldo que aún no entregas a quien corresponde.',
    '2.1.150.1': 'Impuesto a la renta de la empresa que debes pagar en abril.',
    '2.1.160.1': 'Otros impuestos que debes pagar.',
    '2.1.170.1': 'El IVA de tus ventas que debes pagar al SII cada mes.',
    '2.1.180.1': 'Impuesto adicional retenido (por ejemplo, en pagos al extranjero).',
    '2.1.190.1': 'Impuesto especial de zonas francas.',
    '2.1.200.1': 'Impuestos que pagarás en el futuro pero reconoces ahora.',
    '2.1.210.1': 'Dinero que te pagaron por adelantado por productos o servicios que aún no entregas.',
    '2.1.220.1': 'Dinero que te dejaron por envases retornables y debes devolver.',
    '2.1.230.1': 'Otras deudas menores de corto plazo.',

    // Pasivo Largo Plazo
    '2.2': 'Deudas que debes pagar en más de 1 año.',
    '2.2.10.1': 'Préstamos bancarios que pagarás en más de un año.',
    '2.2.20.1': 'Bonos u obligaciones con el público a largo plazo.',
    '2.2.30.1': 'Facturas o documentos que pagarás en más de un año.',
    '2.2.40.1': 'Otras deudas a largo plazo.',
    '2.2.50.1': 'Cuotas de leasing que pagarás después de un año.',
    '2.2.60.1': 'Deudas con empresas relacionadas a largo plazo.',
    '2.2.70.1': 'Impuestos diferidos a largo plazo.',
    '2.2.80.1': 'Otras obligaciones a largo plazo.',

    // Nuevos Pasivos 2024-2026
    '2.1.240.1': 'Retención del 15.25% de las boletas de honorarios que debes pagar al SII (tasa 2026).',
    '2.1.250.1': 'Impuesto especial del 1.5% para vendedores ambulantes formalizados.',
    '2.1.260.1': 'Cotización del seguro de cesantía (AFC) que debes pagar.',
    '2.1.270.1': 'Cotización del seguro de invalidez y sobrevivencia que debes pagar.',
    '2.1.280.1': 'Ahorro previsional voluntario colectivo que debes enterar.',
    '2.1.290.1': 'Impuesto por servicios digitales (Netflix, Spotify, etc.).',
    '2.1.300.1': 'IVA de plataformas digitales extranjeras.',

    // ═══════════════════════════════════════════════════════════════════════
    // 3. PATRIMONIO - Lo que realmente es TUYO (Activos - Pasivos)
    // ═══════════════════════════════════════════════════════════════════════

    '3': 'El valor neto de tu empresa: lo que quedaría si vendieras todo y pagaras todas las deudas.',
    '3.1': 'El dinero que los dueños pusieron para iniciar y hacer crecer la empresa.',
    '3.1.10.1': 'El dinero que los socios o dueños aportaron a la empresa.',
    '3.1.20.1': 'Aumento del valor del capital por la corrección monetaria (inflación).',
    '3.1.30.1': 'Otras reservas de capital.',
    '3.1.40.1': 'Capital que el socio prometió aportar pero aún no ha puesto.',

    '3.2': 'Las ganancias (o pérdidas) que ha tenido la empresa.',
    '3.2.10.1': 'Ganancias de años anteriores que no se repartieron a los dueños.',
    '3.2.20.1': 'Pérdidas de años anteriores.',
    '3.2.30.1': 'La ganancia o pérdida de este año.',
    '3.2.40.1': 'Cuenta temporal para hacer el cierre de año.',

    // Nuevos Registros Pro Pyme
    '3.3': 'Registros especiales que exige el SII para empresas Pro Pyme.',
    '3.3.10.1': 'RAI: Registro de las utilidades que ya pagaron todos los impuestos y están listas para retirarse.',
    '3.3.20.1': 'REX: Registro de ingresos que no pagan impuestos (exentos o no renta).',
    '3.3.30.1': 'STUT: El total de utilidades acumuladas para efectos tributarios.',
    '3.3.40.1': 'SAC: Créditos acumulados que puedes usar contra impuestos.',
    '3.3.50.1': 'Diferencias entre el valor que muestran los libros y el valor para impuestos.',

    // ═══════════════════════════════════════════════════════════════════════
    // 4. RESULTADOS - Ingresos, Costos y Gastos
    // ═══════════════════════════════════════════════════════════════════════

    '4': 'Aquí va todo lo que ganas (ingresos) y lo que gastas (costos y gastos) durante el año.',

    // Ingresos de Explotación
    '4.1': 'El dinero que ganas por tu actividad principal (ventas de productos o servicios).',
    '4.1.10.1': 'Todo el dinero que recibes por vender tus productos o servicios principales.',
    '4.1.20.1': 'Otros ingresos relacionados con tu giro (comisiones, royalties, etc.).',

    // Costos de Explotación
    '4.2': 'Lo que te cuesta producir o comprar lo que vendes.',
    '4.2.10.1': 'El costo de los productos que vendiste o de entregar tus servicios.',
    '4.2.20.1': 'Otros costos directos para producir o prestar servicios.',

    // Gastos Admin y Venta
    '4.3': 'Gastos para administrar la empresa y vender (sueldos, arriendo, luz, etc.).',
    '4.3.10.1': 'Gastos menores de oficina y administración.',
    '4.3.20.1': 'Contribuciones (impuesto territorial) de tus propiedades.',
    '4.3.30.1': 'Clientes que no te pagaron y das por perdido ese dinero.',
    '4.3.40.1': 'Reparaciones y mantención de vehículos de la empresa.',
    '4.3.50.1': 'Gastos para formar la empresa (trámites, abogados, contador al inicio).',
    '4.3.60.1': 'Gastos en investigar o desarrollar nuevos productos.',
    '4.3.70.1': 'Sueldos que pagas a tus trabajadores.',
    '4.3.80.1': 'Tu aporte como empleador a la seguridad social de tus trabajadores.',
    '4.3.90.1': 'Pagos a profesionales independientes (contador, abogado, diseñador, etc.).',
    '4.3.100.1': 'El sueldo que se asigna el dueño o socio que trabaja en la empresa.',
    '4.3.110.1': 'Pérdida de valor de tus activos fijos por uso y tiempo.',
    '4.3.120.1': 'Pérdida de valor de tus intangibles (marcas, patentes).',
    '4.3.130.1': 'Pérdida de mercadería por vencimiento, deterioro o robo.',
    '4.3.140.1': 'Gastos en promociones, regalos a clientes, muestras gratis.',
    '4.3.150.1': 'Otros gastos de administración: arriendos, luz, agua, internet, seguros, etc.',

    // Otros Ingresos
    '4.4': 'Ingresos que no vienen de tu actividad principal.',
    '4.4.10.1': 'Intereses que ganas por tu dinero en el banco o inversiones.',
    '4.4.20.1': 'Ganancias por tus inversiones en otras empresas relacionadas.',
    '4.4.30.1': 'Ingresos que recibes desde el extranjero.',
    '4.4.40.1': 'Dividendos que te pagan las empresas donde tienes acciones.',
    '4.4.50.1': 'Ingresos especiales que no pagan impuestos (ej: indemnizaciones de seguros).',
    '4.4.60.1': 'Ingresos que están exentos del impuesto de primera categoría.',
    '4.4.70.1': 'Ingresos que pagan un impuesto único y diferente.',
    '4.4.80.1': 'Ingresos por arrendar terrenos agrícolas.',
    '4.4.90.1': 'Ingresos por arrendar propiedades que no son agrícolas.',
    '4.4.100.1': 'Otras rentas que pagan impuesto de primera categoría.',
    '4.4.110.1': 'Comisiones que ganas por intermediar ventas.',
    '4.4.120.1': 'Otros ingresos que no son de tu giro principal.',
    '4.4.130.1': 'Ajustes de errores de años anteriores.',
    '4.4.140.1': 'Ajuste por inflación de tus activos y pasivos.',
    '4.4.150.1': 'Ganancias o pérdidas por variación del dólar u otras monedas.',

    // Nuevos Ingresos 2024-2026
    '4.4.160.1': 'Ganancias por comprar y vender criptomonedas.',
    '4.4.170.1': 'Ingresos por servicios digitales (apps, plataformas online).',
    '4.4.180.1': 'Dinero que recibes al rescatar fondos mutuos.',
    '4.4.190.1': 'Ganancia cuando vendes criptomonedas más caro de lo que compraste.',
    '4.4.200.1': 'Ingresos por hacer staking o minería de criptomonedas.',
    '4.4.210.1': 'Subsidios del Estado para empresas Pro Pyme.',

    // Egresos Fuera de Explotación
    '4.5': 'Gastos que no son de tu actividad principal.',
    '4.5.10.1': 'Intereses que pagas por préstamos y deudas.',
    '4.5.20.1': 'Comisiones que pagas a bancos o a terceros.',
    '4.5.30.1': 'Pérdidas por tus inversiones en empresas relacionadas.',
    '4.5.40.1': 'Costos relacionados con tus negocios en el extranjero.',
    '4.5.50.1': 'Otros egresos que no son de tu giro.',
    '4.5.60.1': 'Pérdidas en operaciones de leasing.',
    '4.5.70.1': 'Donaciones a causas sociales (dan derecho a crédito tributario).',
    '4.5.80.1': 'Donaciones a partidos políticos (reguladas por ley).',
    '4.5.90.1': 'Donaciones reguladas por la Ley 19.885.',
    '4.5.100.1': 'Donaciones para personas de escasos recursos.',
    '4.5.110.1': 'Donaciones que no dan ningún beneficio tributario.',
    '4.5.120.1': 'Otras donaciones.',
    '4.5.130.1': 'Provisiones para gastos futuros (vacaciones, indemnizaciones).',
    '4.5.140.1': 'Impuestos que no puedes usar como crédito.',

    // Nuevos Gastos 2024-2026
    '4.5.150.1': 'Pérdidas por vender criptomonedas más barato de lo que compraste.',
    '4.5.160.1': 'Gastos en servicios digitales del extranjero (publicidad, software).',
    '4.5.170.1': 'Comisiones que cobran plataformas como MercadoLibre, Uber, etc.',
    '4.5.180.1': 'Tu aporte como empleador al seguro de cesantía (2.4% del sueldo).',
    '4.5.190.1': 'Tu aporte al seguro de invalidez y sobrevivencia (1.53%).',
    '4.5.200.1': 'Gastos que el SII rechaza como gasto válido.',
    '4.5.210.1': 'Retiros de bienes o servicios que el SII considera no justificados.',
    '4.5.220.1': 'Multas e intereses que debes pagar al SII por atrasos o errores.',
    '4.5.230.1': 'Depreciación acelerada especial para empresas Pro Pyme.',
    '4.5.240.1': 'Gastos por diferencias temporales en el cálculo de impuestos.',

    // Impuestos
    '4.6': 'Impuestos que paga tu empresa sobre sus ganancias.',
    '4.6.10.1': 'Estimación del impuesto a la renta que deberás pagar.',
    '4.6.20.1': 'Impuesto de primera categoría con tasa reducida Pro Pyme (12.5% en 2026).',
    '4.6.30.1': 'Impuesto especial sobre ganancias con criptomonedas.',
    '4.6.40.1': 'Impuesto por servicios digitales prestados desde el extranjero.',
    '4.6.50.1': 'Impuesto por emisiones de CO2 (empresas con fuentes contaminantes).',
};

// Función helper para obtener descripción de una cuenta
export const getAccountDescription = (code: string): string => {
    return ACCOUNT_DESCRIPTIONS[code] || 'Sin descripción disponible.';
};
