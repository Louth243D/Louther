const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const { setupGuildCron, stopGuildCron, sendMusicSuggestion } = require('../utils/musicCron.js');
const { getRandomMusicSuggestion } = require('../utils/youtubeUtil.js');
const { ActionRowBuilder: ActionRow, ButtonBuilder: Button, ButtonStyle } = require('discord.js');

module.exports = {
    category: '🎵 MÚSICA',
    data: new SlashCommandBuilder()
        .setName('music-suggest')
        .setDescription('Configura el sistema de sugerencias musicales automáticas')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('set')
                .setDescription('Configura el canal y horarios de sugerencias'))
        .addSubcommand(sub => 
            sub.setName('disable')
                .setDescription('Desactiva el sistema de sugerencias'))
        .addSubcommand(sub => 
            sub.setName('info')
                .setDescription('Muestra la configuración actual'))
        .addSubcommand(sub => 
            sub.setName('test')
                .setDescription('Realiza una prueba inmediata del sistema de sugerencias'))
        .addSubcommand(sub => 
            sub.setName('force-run')
                .setDescription('Ejecuta la lógica del sistema automático inmediatamente (para pruebas)')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Verificar permisos (aunque ya está en data)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ 
                embeds: [createEmbed('error', 'Falta de Permisos', 'Solo los administradores o el dueño del servidor pueden usar este comando.')], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        switch (subcommand) {
            case 'force-run': {
                const config = await DataManager.getFile('musicSuggest.json', {});
                const guildConfig = config[guildId];

                if (!guildConfig || !guildConfig.enabled) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Sistema No Configurado', 'Primero debes configurar el sistema con `/music-suggest set`.')], flags: [MessageFlags.Ephemeral] });
                }

                await interaction.reply({ content: '⏳ Ejecutando sistema automático...', flags: [MessageFlags.Ephemeral] });
                await sendMusicSuggestion(interaction.client, guildId, guildConfig);
                return interaction.editReply({ content: '✅ Sistema ejecutado. Revisa el canal configurado.' });
            }

            case 'test': {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                
                const suggestion = await getRandomMusicSuggestion();
                if (!suggestion) {
                    return interaction.editReply({ content: '❌ No pude obtener una sugerencia musical. Revisa tu `YOUTUBE_API_KEY`.' });
                }

                const embed = createEmbed('info', '🧪 Prueba: Sugerencia Musical', 'Esta es una prueba manual del sistema.', {
                    fields: [
                        { name: '🎶 Canción', value: `\`${suggestion.title}\``, inline: false },
                        { name: '🎤 Autor', value: `\`${suggestion.author}\``, inline: true },
                        { name: '🔗 Enlace', value: `[Ver en YouTube](${suggestion.url})`, inline: true }
                    ],
                    thumbnail: suggestion.thumbnail,
                    color: '#9b59b6' // Color púrpura para diferenciar de la automática
                });

                const row = new ActionRow().addComponents(
                    new Button()
                        .setCustomId('music_lyrics')
                        .setLabel('Ver Lyrics')
                        .setStyle(ButtonStyle.Primary)
                );

                await interaction.channel.send({ embeds: [embed], components: [row] });
                return interaction.editReply({ content: '✅ ¡Prueba enviada con éxito!' });
            }

            case 'set': {
                const initialEmbed = createEmbed('info', '🎵 Configuración de Sugerencias Musicales', 
                    'Este sistema enviará sugerencias musicales de YouTube automáticamente.\n\n**Paso 1:** Selecciona el canal donde se enviarán las sugerencias.');

                const row = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('music_channel_select')
                        .setPlaceholder('Selecciona un canal...')
                        .addChannelTypes(ChannelType.GuildText)
                );

                const response = await interaction.reply({ embeds: [initialEmbed], components: [row], flags: [MessageFlags.Ephemeral] });

                const collector = response.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async i => {
                    if (i.customId === 'music_channel_select') {
                        const channelId = i.values[0];
                        
                        await i.update({ 
                            embeds: [createEmbed('info', '🎵 Configuración: Horarios', 
                                `Canal seleccionado: <#${channelId}>\n\n**Paso 2:** Escribe hasta 5 horarios en formato 24h (HH:MM) separados por comas.\n*Ejemplo: 08:00, 14:30, 21:00*\n\n**Nota:** Debe haber al menos 3 horas de diferencia entre cada horario.`)],
                            components: []
                        });

                        const msgFilter = m => m.author.id === interaction.user.id;
                        const msgCollector = interaction.channel.createMessageCollector({ filter: msgFilter, time: 60000, max: 1 });

                        msgCollector.on('collect', async m => {
                            const input = m.content.split(',').map(t => t.trim());
                            const horarios = [];
                            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

                            // Validar formato y duplicados
                            for (const t of input) {
                                if (!timeRegex.test(t)) {
                                    return m.reply({ embeds: [createEmbed('error', 'Formato Inválido', `El horario \`${t}\` no tiene un formato válido (HH:MM).`)] });
                                }
                                if (horarios.includes(t)) continue;
                                if (horarios.length >= 5) break;
                                horarios.push(t);
                            }

                            if (horarios.length === 0) {
                                return m.reply({ embeds: [createEmbed('error', 'Sin Horarios', 'No se proporcionaron horarios válidos.')] });
                            }

                            // Ordenar horarios para validar diferencia de 3 horas
                            horarios.sort();

                            // Validar diferencia de 3 horas
                            for (let j = 0; j < horarios.length; j++) {
                                const current = horarios[j];
                                const next = horarios[(j + 1) % horarios.length];
                                
                                const [h1, m1] = current.split(':').map(Number);
                                const [h2, m2] = next.split(':').map(Number);
                                
                                let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
                                if (diffMinutes < 0) diffMinutes += 24 * 60; // Caso de dar la vuelta al día

                                // Si solo hay un horario, no hay conflicto. Si hay más, check diff.
                                if (horarios.length > 1 && diffMinutes < 180) {
                                    return m.reply({ 
                                        embeds: [createEmbed('error', 'Intervalo Insuficiente', 'El intervalo mínimo entre sugerencias debe ser de **3 horas**. Revisa tus horarios.')] 
                                    });
                                }
                            }

                            // Guardar configuración
                            const config = await DataManager.getFile('musicSuggest.json', {});
                            config[guildId] = {
                                channelId,
                                horarios,
                                enabled: true
                            };
                            await DataManager.saveFile('musicSuggest.json', config);

                            // Configurar cron
                            setupGuildCron(interaction.client, guildId, config[guildId]);

                            const successEmbed = createEmbed('success', '✅ Configuración Guardada', 
                                `El sistema de sugerencias musicales ha sido activado.\n\n**Canal:** <#${channelId}>\n**Horarios:** ${horarios.join(', ')}\n**Estado:** Activado`);
                            
                            await m.reply({ embeds: [successEmbed] });
                            msgCollector.stop();
                        });
                    }
                });
                break;
            }

            case 'disable': {
                const config = await DataManager.getFile('musicSuggest.json', {});
                if (!config[guildId] || !config[guildId].enabled) {
                    return interaction.reply({ embeds: [createEmbed('warn', 'Sistema ya Desactivado', 'El sistema no está activo en este servidor.')], flags: [MessageFlags.Ephemeral] });
                }

                config[guildId].enabled = false;
                await DataManager.saveFile('musicSuggest.json', config);
                stopGuildCron(guildId);

                return interaction.reply({ embeds: [createEmbed('success', '🚫 Sistema Desactivado', 'Las sugerencias musicales automáticas han sido desactivadas.')] });
            }

            case 'info': {
                const config = await DataManager.getFile('musicSuggest.json', {});
                const guildConfig = config[guildId];

                if (!guildConfig) {
                    return interaction.reply({ embeds: [createEmbed('info', 'Sin Configuración', 'Aún no has configurado el sistema. Usa `/music-suggest set`.')], flags: [MessageFlags.Ephemeral] });
                }

                const infoEmbed = createEmbed('info', '🎵 Información de Sugerencias Musicales', 
                    `**Estado:** ${guildConfig.enabled ? '✅ Activado' : '❌ Desactivado'}\n` +
                    `**Canal:** <#${guildConfig.channelId}>\n` +
                    `**Horarios:** ${guildConfig.horarios.join(', ')}`);

                return interaction.reply({ embeds: [infoEmbed] });
            }
        }
    }
};
