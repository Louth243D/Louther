const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

/**
 * Genera una imagen de bienvenida personalizada
 * @param {string} avatarUrl - URL del avatar del usuario
 * @param {string} username - Nombre del usuario
 * @param {string} serverName - Nombre del servidor
 * @param {string} backgroundUrl - URL de la imagen de fondo (opcional)
 */
async function generateWelcomeImage(avatarUrl, username, serverName, backgroundUrl) {
    const canvas = createCanvas(800, 350);
    const ctx = canvas.getContext('2d');

    // 1. Dibujar Fondo
    try {
        if (backgroundUrl) {
            const bg = await loadImage(backgroundUrl);
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        } else {
            // Fondo degradado por defecto si no hay URL
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } catch (e) {
        // Fallback a color sólido si falla la carga de imagen
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Capa de oscurecimiento para legibilidad
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Dibujar Avatar (Circular)
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 100, 75, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    try {
        const avatar = await loadImage(avatarUrl.replace(/\.webp$/, '.png'));
        ctx.drawImage(avatar, 325, 25, 150, 150);
    } catch (e) {
        // Si falla el avatar, no dibujamos nada (quedará el círculo del clip)
    }
    ctx.restore();

    // Borde del avatar
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(400, 100, 75, 0, Math.PI * 2, true);
    ctx.stroke();

    // 3. Dibujar Texto
    ctx.textAlign = 'center';
    
    // Sombra para el texto
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // "BIENVENID@"
    ctx.font = 'bold 50px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BIENVENID@', 400, 230);

    // Nombre de Usuario (con color destacado y borde)
    ctx.font = 'bold 65px sans-serif';
    ctx.fillStyle = '#00fbff';
    ctx.fillText(username.toUpperCase(), 400, 295);
    
    // Resetear sombra para texto pequeño
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Servidor o Mensaje Extra
    ctx.font = 'italic 28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(serverName.toUpperCase(), 400, 335);

    return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeImage };
