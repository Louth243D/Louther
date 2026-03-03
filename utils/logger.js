const DataManager = require('./dataManager.js');
const { EmbedBuilder } = require('discord.js');

/**
 * Utilidad centralizada para enviar logs persistentes y seccionados.
 * @param {Guild} guild - Servidor donde ocurre el evento.
 * @param {object} logInfo - Información del log (título, descripción).
 * @param {string} category - Categoría del log (mod, members, channels, messages).
 * @param {number} level - Nivel del log (1, 2, 3).
 */
async function sendLog(guild, logInfo, category = 'mod', level = 1) {
    if (!guild) return;

    try {
        const config = await DataManager.getFile(`configs/${guild.id}.json`, { 
            logChannelId: null, 
            logLevel: 1,
            persistentLogIds: {} 
        });

        // Verificaciones básicas de nivel y canal
        if (!config.logChannelId) return;
        if ((config.logLevel || 1) < level) return;

        const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        const catNames = { 
            mod: 'Moderación', 
            members: 'Miembros', 
            channels: 'Canales', 
            messages: 'Mensajes' 
        };
        const catEmojis = { 
            mod: '🛡️', 
            members: '👥', 
            channels: '📂', 
            messages: '📝' 
        };
        const catColors = { 
            mod: 0xff0000, 
            members: 0x00ff00, 
            channels: 0x0099ff, 
            messages: 0xffff00 
        };

        // Obtener el ID del mensaje persistente para esta categoría
        if (!config.persistentLogIds) config.persistentLogIds = {};
        let logMsgId = config.persistentLogIds[category];
        let logMsg = null;

        if (logMsgId) {
            logMsg = await channel.messages.fetch(logMsgId).catch(() => null);
        }

        // Preparar el nuevo evento
        const timestamp = `<t:${Math.floor(Date.now() / 1000)}:T>`;
        const eventTitle = logInfo.data?.title || 'Evento';
        // Eliminar el icono del título si existe para que no se repita en la descripción compacta
        const cleanTitle = eventTitle.replace(/^[^\w\s]+\s*/, ''); 
        const newEvent = `**[${timestamp}]** ${cleanTitle}: ${logInfo.data?.description || ''}`;

        let embed;
        if (logMsg && logMsg.embeds.length > 0) {
            // Editar mensaje existente
            embed = EmbedBuilder.from(logMsg.embeds[0]);
            
            let description = embed.data.description || '';
            let lines = description.split('\n').filter(l => l.trim() !== '');
            
            // Mantener solo los últimos 10 eventos para no saturar el embed
            lines.unshift(newEvent);
            if (lines.length > 10) lines = lines.slice(0, 10);
            
            embed.setDescription(lines.join('\n\n'));
            embed.setTimestamp();
            
            await logMsg.edit({ embeds: [embed] });
        } else {
            // Crear nuevo mensaje
            embed = new EmbedBuilder()
                .setTitle(`${catEmojis[category]} Panel de Logs: ${catNames[category]}`)
                .setColor(catColors[category])
                .setDescription(newEvent)
                .setFooter({ text: `Categoría: ${catNames[category]} | Louther v1.0` })
                .setTimestamp();

            const sentMsg = await channel.send({ embeds: [embed] });
            
            // Guardar el ID del nuevo mensaje
            config.persistentLogIds[category] = sentMsg.id;
            await DataManager.saveFile(`configs/${guild.id}.json`, config);
        }

    } catch (error) {
        console.error(`[Logger Persistent] Error en ${guild.name} (Cat: ${category}):`, error.message);
    }
}

module.exports = { sendLog };
