const { EmbedBuilder } = require('discord.js');

const COLORS = {
    success: '#2ecc71', // Esmeralda
    error: '#e74c3c',   // Alizarina (Rojo suave)
    warn: '#f1c40f',    // Girasol
    info: '#3498db',    // Pedro (Azul suave)
    mod: '#9b59b6',     // Amatista (Púrpura)
    economy: '#f39c12', // Naranja oscuro
    anime: '#ff79c6',   // Rosa neón
    rpg: '#82aaff'      // Azul RPG
};

const ICONS = {
    success: '✨',
    error: '🚫',
    warn: '🚨',
    info: '💎',
    mod: '🛡️',
    economy: '💵',
    anime: '🌸',
    rpg: '⚔️'
};

/**
 * Genera un embed estandarizado y profesional para el bot
 * @param {string} type - Tipo de embed
 * @param {string} title - Título del embed
 * @param {string} description - Descripción del embed
 * @param {object} options - Opciones adicionales
 */
function createEmbed(type, title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(COLORS[type] || COLORS.info);

    if (title) {
        embed.setTitle(`${ICONS[type] || ''} ${title.toUpperCase()}`);
    }

    if (description && description.trim().length > 0) {
        // Mejoramos la visual de la descripción con un formato más limpio
        embed.setDescription(`\n${description}\n\u200b`);
    }

    if (options.fields && Array.isArray(options.fields)) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    // Footer estilizado con versión y marca
    const footerText = options.footer || 'Louther Bot • El compañero definitivo para tu comunidad';
    embed.setFooter({ 
        text: footerText, 
        iconURL: options.footerIcon || 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png' 
    });

    // Añadir timestamp solo si no se desactiva explícitamente
    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    return embed;
}

module.exports = { createEmbed, COLORS, ICONS };
