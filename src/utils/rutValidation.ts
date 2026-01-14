/**
 * Chilean RUT Validation Utility
 * Validates RUT using Módulo 11 algorithm
 */

export const validateRUT = (rut: string): boolean => {
    if (!rut || rut.trim() === '') return false;

    // Remove dots and hyphens
    const cleanRut = rut.replace(/[.-]/g, '');

    // Must have at least 2 characters (number + verifier)
    if (cleanRut.length < 2) return false;

    // Extract body and verifier digit
    const body = cleanRut.slice(0, -1);
    const verifier = cleanRut.slice(-1).toUpperCase();

    // Body must be numeric
    if (!/^\d+$/.test(body)) return false;

    // Calculate expected verifier using Módulo 11
    let sum = 0;
    let multiplier = 2;

    // Process from right to left
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const calculatedVerifier = 11 - remainder;

    let expectedVerifier: string;
    if (calculatedVerifier === 11) {
        expectedVerifier = '0';
    } else if (calculatedVerifier === 10) {
        expectedVerifier = 'K';
    } else {
        expectedVerifier = calculatedVerifier.toString();
    }

    return verifier === expectedVerifier;
};

/**
 * Format RUT with standard Chilean format: XX.XXX.XXX-X
 */
export const formatRUT = (rut: string): string => {
    if (!rut) return '';

    // Remove all non-alphanumeric characters
    const clean = rut.replace(/[^0-9kK]/g, '');

    if (clean.length < 2) return clean;

    // Extract body and verifier
    const body = clean.slice(0, -1);
    const verifier = clean.slice(-1).toUpperCase();

    // Format body with dots (reverse, add dots every 3 digits, reverse again)
    const reversedBody = body.split('').reverse().join('');
    const formattedReversed = reversedBody.match(/.{1,3}/g)?.join('.') || '';
    const formattedBody = formattedReversed.split('').reverse().join('');

    return `${formattedBody}-${verifier}`;
};

/**
 * Clean RUT to raw format (only numbers and K)
 */
export const cleanRUT = (rut: string): string => {
    return rut.replace(/[^0-9kK]/g, '').toUpperCase();
};

/**
 * Validate and format RUT
 */
export const validateAndFormatRUT = (rut: string): { isValid: boolean; formatted: string; error?: string } => {
    const trimmed = rut.trim();

    if (!trimmed) {
        return { isValid: false, formatted: '', error: 'RUT no puede estar vacío' };
    }

    const isValid = validateRUT(trimmed);
    const formatted = formatRUT(trimmed);

    if (!isValid) {
        return { isValid: false, formatted, error: 'RUT inválido (dígito verificador incorrecto)' };
    }

    return { isValid: true, formatted };
};
