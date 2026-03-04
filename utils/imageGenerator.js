const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

/**
 * Genera una imagen de bienvenida personalizada
 * @param {string} avatarUrl - URL del avatar del usuario
 * @param {string} username - Nombre del usuario
 * @param {string} discriminator - Discriminador (#1234 o #0)
 * @param {string} serverName - Nombre del servidor
 * @param {string} backgroundUrl - URL de la imagen de fondo (opcional)
 * @param {string} customText - Texto personalizado para el banner (opcional)
 */
async function generateWelcomeImage(avatarUrl, username, discriminator, serverName, backgroundUrl, customText) {
    const canvas = createCanvas(800, 350);
    const ctx = canvas.getContext('2d');

    // 1. Dibujar Fondo
    try {
        if (backgroundUrl && backgroundUrl.startsWith('http')) {
            const bg = await loadImage(backgroundUrl);
            ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        } else {
            // Si no hay URL, dibujamos el gradiente por defecto
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#0f0c29');
            gradient.addColorStop(0.5, '#302b63');
            gradient.addColorStop(1, '#24243e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } catch (e) {
        // Si hay una URL pero falló la carga, lanzamos el error para que guildMemberAdd lo maneje
        if (backgroundUrl) {
            throw new Error(`Fallo al cargar la imagen de fondo: ${e.message}`);
        }
        
        // Si no hay URL, el gradiente ya se dibujó (esto no debería pasar por la lógica del else)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Capa de oscurecimiento para legibilidad
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Dibujar Avatar (Circular con borde)
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 110, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    try {
        const avatar = await loadImage(avatarUrl.replace(/\.webp$/, '.png'));
        ctx.drawImage(avatar, 320, 30, 160, 160);
    } catch (e) {
        // Fallback: Si no carga el avatar, dibujamos un círculo gris
        ctx.fillStyle = '#333333';
        ctx.fill();
    }
    ctx.restore();

    // Borde del avatar
    ctx.strokeStyle = '#00fbff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(400, 110, 80, 0, Math.PI * 2, true);
    ctx.stroke();

    // 3. Dibujar Texto
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    // Título Principal (Customizable)
    const titleText = (customText || 'BIENVENIDO').toUpperCase().substring(0, 20); // Límite de 20 caracteres
    ctx.font = 'bold 50px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(titleText, 400, 235);

    // Nombre del Usuario con Tag
    const tag = (discriminator && discriminator !== '0') ? `#${discriminator}` : '';
    const userTag = `${username}${tag}`;
    
    let fontSize = 60;
    if (userTag.length > 20) fontSize = 35;
    else if (userTag.length > 15) fontSize = 45;
    else if (userTag.length > 10) fontSize = 55;
    
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#00fbff';
    ctx.fillText(userTag, 400, 295);
    
    // Nombre del Servidor (Footer)
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = 'italic 26px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(serverName.toUpperCase(), 400, 335);

    return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeImage };
