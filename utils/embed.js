const { EmbedBuilder } = require('discord.js');

const COLORS = {
    success: '#57F287', // Verde
    error: '#ED4245',   // Rojo
    warn: '#FEE75C',    // Amarillo
    info: '#5865F2',    // Azul
    mod: '#EB459E',     // Naranja/Rosa fuerte para Moderación
    economy: '#F1C40F'  // Dorado
};

const ICONS = {
    success: '✅',
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    mod: '🔨',
    economy: '💰'
};

/**
 * Genera un embed estandarizado para el bot
 * @param {string} type - Tipo de embed (success, error, warn, info, mod, economy)
 * @param {string} title - Título del embed
 * @param {string} description - Descripción del embed
 * @param {object} options - Opciones adicionales (fields, thumbnail, footer, etc)
 */
function createEmbed(type, title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setTitle(`${ICONS[type] || ''} ${title}`)
        .setColor(COLORS[type] || COLORS.info)
        .setTimestamp();

    if (description && description.trim().length > 0) {
        embed.setDescription(description);
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

    if (options.footer) {
        embed.setFooter({ text: options.footer, iconURL: options.footerIcon });
    } else {
        embed.setFooter({ text: 'Bot Multifunción • v1.0' });
    }

    return embed;
}

module.exports = { createEmbed, COLORS, ICONS };
