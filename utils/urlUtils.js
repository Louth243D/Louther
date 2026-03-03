
const fetch = require('node-fetch');

/**
 * Resuelve una URL para obtener un enlace de imagen directo, con soporte especial para Tenor.
 * @param {string} url - La URL a resolver.
 * @returns {Promise<string|null>} La URL de la imagen directa o null si no se puede resolver.
 */
async function resolveImageUrl(url) {
    if (!url) return null;

    // Si ya es una imagen directa, la devolvemos.
    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
        return url;
    }

    // Soporte para Tenor
    if (url.includes('tenor.com/view')) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const match = html.match(/<meta property="og:image" content="([^"]+)"/);
            if (match && match[1]) {
                return match[1];
            }
        } catch (error) {
            console.error('[urlUtils] Error resolviendo URL de Tenor:', error);
            return null;
        }
    }

    // Si no es un enlace de Tenor y no es una imagen directa, no podemos hacer mucho.
    // Podríamos añadir soporte para otros sitios aquí en el futuro.
    return url; // Devolvemos la URL original como último recurso.
}

module.exports = { resolveImageUrl };
