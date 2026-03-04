const cron = require('node-cron');
const DataManager = require('./dataManager.js');
const { getRandomMusicSuggestion } = require('./youtubeUtil.js');
const { createEmbed } = require('./embed.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Mapa para almacenar las tareas cron activas por servidor
// Clave: guildId, Valor: Array de objetos cron
const activeJobs = new Map();

/**
 * Inicializa el sistema de cron para todos los servidores configurados.
 * @param {Client} client - Cliente de discord.js
 */
async function initMusicCron(client) {
    const config = await DataManager.getFile('musicSuggest.json', {});
    
    for (const guildId in config) {
        setupGuildCron(client, guildId, config[guildId]);
    }
    console.log('[MusicCron] Sistema de sugerencias musicales inicializado.');
}

/**
 * Configura o actualiza las tareas cron para un servidor específico.
 * @param {Client} client - Cliente de discord.js
 * @param {string} guildId - ID del servidor
 * @param {Object} guildConfig - Configuración del servidor
 */
function setupGuildCron(client, guildId, guildConfig) {
    // Detener tareas existentes para este servidor si las hay
    if (activeJobs.has(guildId)) {
        activeJobs.get(guildId).forEach(job => job.stop());
        activeJobs.delete(guildId);
    }

    if (!guildConfig.enabled || !guildConfig.channelId || !guildConfig.horarios || guildConfig.horarios.length === 0) {
        return;
    }

    const jobs = [];

    guildConfig.horarios.forEach(horario => {
        const [hour, minute] = horario.split(':');
        // Formato cron: minuto hora * * *
        const cronTime = `${minute} ${hour} * * *`;

        const job = cron.schedule(cronTime, async () => {
            await sendMusicSuggestion(client, guildId, guildConfig);
        });

        jobs.push(job);
    });

    activeJobs.set(guildId, jobs);
}

/**
 * Ejecuta la lógica de enviar una sugerencia musical para un servidor específico.
 * @param {Client} client 
 * @param {string} guildId 
 * @param {Object} guildConfig 
 */
async function sendMusicSuggestion(client, guildId, guildConfig) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(guildConfig.channelId);
        if (!channel) {
            console.log(`[MusicCron] Canal no encontrado en ${guild.name}. Desactivando sistema.`);
            guildConfig.enabled = false;
            const config = await DataManager.getFile('musicSuggest.json', {});
            config[guildId] = guildConfig;
            await DataManager.saveFile('musicSuggest.json', config);
            stopGuildCron(guildId);
            return;
        }

        // Obtener sugerencia musical
        const suggestion = await getRandomMusicSuggestion();
        if (!suggestion) return;

        const embed = createEmbed('info', '🎵 Sugerencia Musical del Día', '¡Aquí tienes una canción recomendada para hoy!', {
            fields: [
                { name: '🎶 Canción', value: `\`${suggestion.title}\``, inline: false },
                { name: '🎤 Autor', value: `\`${suggestion.author}\``, inline: true },
                { name: '🔗 Enlace', value: `[Ver en YouTube](${suggestion.url})`, inline: true }
            ],
            thumbnail: suggestion.thumbnail,
            color: '#5865F2' // Color azul profesional
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('music_lyrics')
                .setLabel('Ver Lyrics')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('🔄 Otra Sugerencia')
                .setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error(`[MusicCron] Error ejecutando sugerencia en ${guildId}:`, error.message);
    }
}

/**
 * Detiene las tareas cron de un servidor.
 * @param {string} guildId 
 */
function stopGuildCron(guildId) {
    if (activeJobs.has(guildId)) {
        activeJobs.get(guildId).forEach(job => job.stop());
        activeJobs.delete(guildId);
    }
}

module.exports = { initMusicCron, setupGuildCron, stopGuildCron, sendMusicSuggestion };
