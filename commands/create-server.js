const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ComponentType, 
    MessageFlags 
} = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'server_gen.json');

function readGenData() {
    try {
        if (!fs.existsSync(dataFile)) return {};
        return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    } catch (e) { return {}; }
}

function writeGenData(data) {
    try {
        const dir = path.dirname(dataFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (e) { console.error('Error guardando gen data:', e); }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-server')
        .setDescription('Generador profesional de servidores con plantillas avanzadas')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // --- SEGURIDAD ABSOLUTA ---
        if (interaction.user.id !== interaction.guild.ownerId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                embeds: [createEmbed('error', 'Acceso Denegado', 'Solo el dueño del servidor o administradores pueden usar este comando.')], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const guildId = interaction.guild.id;
        let genData = readGenData();

        // --- VERIFICACIÓN DE EXISTENCIA Y OPCIÓN DE BORRADO ---
        if (genData[guildId]) {
            const existing = genData[guildId];
            const wipeEmbed = createEmbed('warn', '⚠️ Servidor ya Configurado', `Ya existe una estructura generada para el proyecto **${existing.projectName}**.\n\n¿Qué deseas hacer? Si eliges **Borrar Todo**, se eliminarán permanentemente todos los roles y canales creados anteriormente por el bot para poder instalar una nueva plantilla.`, {
                fields: [
                    { name: '📅 Fecha de creación', value: `<t:${Math.floor(existing.createdAt / 1000)}:R>`, inline: true },
                    { name: '📊 Elementos', value: `Canales: \`${existing.channels.length}\` | Roles: \`${existing.roles.length}\``, inline: true }
                ]
            });

            const wipeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('wipe_recreate').setLabel('Borrar Todo y Empezar de Nuevo').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                new ButtonBuilder().setCustomId('wipe_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
            );

            const wipeRes = await interaction.reply({ embeds: [wipeEmbed], components: [wipeRow], flags: [MessageFlags.Ephemeral], withResponse: true });
            const wipeMsg = wipeRes.resource?.message || wipeRes;
            const wipeCollector = wipeMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

            wipeCollector.on('collect', async wi => {
                if (wi.customId === 'wipe_cancel') {
                    await wi.update({ embeds: [createEmbed('info', 'Proceso Cancelado', 'No se han realizado cambios.')], components: [] });
                    return wipeCollector.stop();
                }

                if (wi.customId === 'wipe_recreate') {
                    await wi.update({ embeds: [createEmbed('info', '🧹 Borrando Estructura...', 'Eliminando canales, categorías y roles previos para empezar de nuevo.')], components: [] });
                    
                    try {
                        for (const id of existing.channels) {
                            const chan = await interaction.guild.channels.fetch(id).catch(() => null);
                            if (chan) await chan.delete('Limpieza para nueva generación').catch(() => {});
                        }
                        for (const id of existing.categories) {
                            const cat = await interaction.guild.channels.fetch(id).catch(() => null);
                            if (cat) await cat.delete('Limpieza para nueva generación').catch(() => {});
                        }
                        for (const id of existing.roles) {
                            const role = await interaction.guild.roles.fetch(id).catch(() => null);
                            if (role) await role.delete('Limpieza para nueva generación').catch(() => {});
                        }

                        const currentGenData = readGenData();
                        delete currentGenData[guildId];
                        writeGenData(currentGenData);

                        await new Promise(r => setTimeout(r, 1500));
                        return startFlow(interaction);

                    } catch (err) {
                        console.error('Error al limpiar servidor:', err);
                        await wi.editReply({ embeds: [createEmbed('error', 'Error en Limpieza', 'Hubo un problema al intentar borrar algunos elementos.')], components: [] }).catch(() => {});
                    }
                }
            });
            return;
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        return startFlow(interaction);
    }
};

async function startFlow(interaction) {
    const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('flow_cancel').setLabel('Cancelar Proceso').setStyle(ButtonStyle.Danger)
    );

    // Usamos editReply porque la interacción ya está deferred o ya tiene una respuesta previa (wipe prompt)
    const flowMsg = await interaction.editReply({ 
        embeds: [createEmbed('info', '🚀 Generador de Servidor', '¡Limpieza completada! Ahora, ¿cuál será el nombre del proyecto o comunidad?\n\n*Escribe el nombre directamente en el chat.*')], 
        components: [cancelRow],
        flags: [MessageFlags.Ephemeral] 
    });

    const filter = m => m.author.id === interaction.user.id;
    const nameCollector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    const btnFilter = i => i.user.id === interaction.user.id;
    const flowCollector = flowMsg.createMessageComponentCollector({ filter: btnFilter, time: 60000 });

    flowCollector.on('collect', async i => {
        if (i.customId === 'flow_cancel') {
            nameCollector.stop('cancelled');
            await i.update({ embeds: [createEmbed('error', 'Proceso Cancelado', 'Has cancelado la creación del servidor.')], components: [] });
            return flowCollector.stop();
        }
    });

    nameCollector.on('collect', async m => {
        const projectName = m.content.trim();
        if (m.deletable) m.delete().catch(() => {});

        const typeSelect = new StringSelectMenuBuilder()
            .setCustomId('select_type')
            .setPlaceholder('Selecciona el tipo de servidor')
            .addOptions([
                { label: 'Juegos y Comunidad Casual', value: 'casual', description: 'Para grupos de amigos y gamers casuales.', emoji: '🎮' },
                { label: 'Comunidad para Streamers', value: 'streamer', description: 'Enfoque en contenido, avisos y fans.', emoji: '🎥' },
                { label: 'Desarrollo de Videojuegos', value: 'gamedev', description: 'Estudio Indie: Devlogs, Bugs, Roadmap.', emoji: '🛠️' },
                { label: 'Alianzas y Bots', value: 'partnership', description: 'Enfocado en interacciones entre servidores.', emoji: '🤝' },
                { label: 'Plantilla Base Moderna', value: 'base', description: 'Estructura limpia e inteligente.', emoji: '✨' }
            ]);

        const selectRow = new ActionRowBuilder().addComponents(typeSelect);
        
        const selectRes = await interaction.followUp({ 
            embeds: [createEmbed('info', '📂 Selecciona la Plantilla', `Proyecto: **${projectName}**\n\nElige el propósito principal del servidor para configurar canales y roles.`)], 
            components: [selectRow], 
            flags: [MessageFlags.Ephemeral],
            withResponse: true
        });

        const selectResponseMsg = selectRes.resource?.message || selectRes;
        const typeCollector = selectResponseMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

        typeCollector.on('collect', async i => {
            const type = i.values[0];
            
            const templates = {
                gamedev: {
                    name: 'Desarrollo de Videojuegos (Estudio Indie)',
                    roles: ['👑 Fundador', '🛠 Desarrollador', '🎨 Artista', '🎵 Sonido', '🧪 Tester', '🛡 Moderador', '🌎 Comunidad'],
                    structure: [
                        { name: '📢 Información Oficial', channels: ['reglas', 'anuncios', `roadmap-${projectName}`, 'changelog', `devlogs-${projectName}`] },
                        { name: '🧠 Diseño del Juego', channels: ['ideas', 'mecanicas', 'historia-lore', 'documentos'] },
                        { name: '💻 Desarrollo Técnico', channels: ['programacion', 'sistemas', 'base-de-datos', 'integraciones', { name: 'bugs-internos', private: true }] },
                        { name: '🎨 Producción Creativa', channels: ['arte', 'modelado', 'animaciones', 'sonido-musica'] },
                        { name: '🧪 Testing Público', channels: [`reporte-de-bugs-${projectName}`, 'feedback', 'sugerencias', { name: 'testers-chat', roles: ['Tester', 'Desarrollador'] }] },
                        { name: '👥 Comunidad', channels: ['chat-general', 'preguntas', 'media', 'fan-art', 'memes'] },
                        { name: '📊 Administración', private: true, channels: ['staff-chat', 'moderacion', 'reportes-usuarios', 'decisiones-internas'] },
                        { name: '🔊 Voz', type: 'voice', channels: ['Desarrollo', 'Testing', 'Reunión Staff', 'Comunidad'] }
                    ]
                },
                casual: {
                    name: 'Juegos y Comunidad Casual',
                    roles: ['👑 Líder', '⭐ VIP', '🛡 Staff', '🎮 Gamer'],
                    structure: [
                        { name: '📌 Info', channels: ['reglas', 'anuncios', 'roles'] },
                        { name: '💬 Social', channels: ['general', 'fotos', 'comandos'] },
                        { name: '🎮 Juegos', channels: ['busco-partida', 'clips'] },
                        { name: '🔊 Voz', type: 'voice', channels: ['General', 'Gaming 1', 'Gaming 2', 'Música'] }
                    ]
                },
                streamer: {
                    name: 'Comunidad para Streamers',
                    roles: ['🎥 Streamer', '🛠 Moderador', '💎 Suscriptor', '🔔 Notificaciones'],
                    structure: [
                        { name: '📺 Directos', channels: ['anuncios-stream', 'chat-en-vivo', 'sugerencias-stream'] },
                        { name: '💬 Comunidad', channels: ['general', 'fan-arts', 'off-topic'] },
                        { name: '📸 Media', channels: ['clips-destacados', 'fotos-videos'] },
                        { name: '🔊 Voz', type: 'voice', channels: ['Charla', 'Gaming', 'Dúos'] }
                    ]
                },
                partnership: {
                    name: 'Alianzas y Bots',
                    roles: ['👑 Admin', '🤝 Partner', '🤖 Bot Manager'],
                    structure: [
                        { name: '📜 Reglas', channels: ['normas', 'anuncios'] },
                        { name: '🤝 Alianzas', channels: ['info-alianzas', 'nuestras-alianzas', 'tus-alianzas'] },
                        { name: '🤖 Bots', channels: ['comandos-bots', 'spam-bots'] },
                        { name: '🔊 Soporte', type: 'voice', channels: ['espera-soporte', 'ayuda-staff'] }
                    ]
                },
                base: {
                    name: 'Plantilla Base Moderna',
                    roles: ['Admin', 'Mod', 'Miembro'],
                    structure: [
                        { name: 'General', channels: ['bienvenida', 'reglas', 'chat-general'] },
                        { name: 'Voz', type: 'voice', channels: ['Salón 1', 'Salón 2'] },
                        { name: 'Admin', private: true, channels: ['staff-chat', 'logs'] }
                    ]
                }
            };

            const template = templates[type];
            const confirmEmbed = createEmbed('warn', '⚠️ Confirmación Requerida', 'Estás a punto de crear una estructura completa de servidor.', {
                fields: [
                    { name: '📁 Proyecto', value: projectName, inline: true },
                    { name: '📑 Plantilla', value: template.name, inline: true },
                    { name: '🎭 Roles a crear', value: template.roles.join(', '), inline: false },
                    { name: '🏗 Categorías', value: template.structure.map(s => s.name).join(', '), inline: false }
                ],
                footer: 'Este proceso puede tardar unos segundos.'
            });

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_create').setLabel('Confirmar Creación').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('cancel_create').setLabel('Cancelar').setStyle(ButtonStyle.Danger)
            );

            await i.update({ embeds: [confirmEmbed], components: [confirmRow] });

            const btnCollector = selectResponseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, max: 1 });

            btnCollector.on('collect', async bi => {
                try {
                    // Desactivar botones inmediatamente para evitar doble ejecución
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('confirm_create').setLabel('Procesando...').setStyle(ButtonStyle.Success).setDisabled(true),
                        new ButtonBuilder().setCustomId('cancel_create').setLabel('Cancelar').setStyle(ButtonStyle.Danger).setDisabled(true)
                    );

                    if (bi.customId === 'cancel_create') {
                        await bi.update({ embeds: [createEmbed('error', 'Proceso Cancelado', 'Has cancelado la creación.')], components: [] }).catch(() => {});
                        return;
                    }

                    // ID 'confirm_create' (o cualquier otro botón que no sea cancelar) inicia la creación
                    await bi.update({ embeds: [createEmbed('info', '⚙️ Procesando...', 'Iniciando la creación de roles, categorías y canales. Por favor espera.')], components: [disabledRow] }).catch(async err => {
                        if (err.status === 503) {
                            await new Promise(r => setTimeout(r, 1000));
                            return bi.editReply({ embeds: [createEmbed('info', '⚙️ Procesando (Reintento)...', 'Discord está bajo mucha carga, reintentando...') ] }).catch(() => {});
                        }
                    });

                    // Preparar recolector para el botón final de "Deshacer"
                    const biMsg = bi.message;
                    const biCollector = biMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000, max: 1 });
                    
                    biCollector.on('collect', async biWipe => {
                        try {
                            // Desactivar botones de deshacer tras clic
                            const finalDisabled = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId('wipe_undo').setLabel('Deshaciendo...').setStyle(ButtonStyle.Danger).setDisabled(true),
                                new ButtonBuilder().setCustomId('wipe_final_cancel').setLabel('Finalizar').setStyle(ButtonStyle.Secondary).setDisabled(true)
                            );

                            if (biWipe.customId === 'wipe_final_cancel') {
                                await biWipe.update({ embeds: [createEmbed('success', '✨ Creación Finalizada', 'La estructura se ha guardado correctamente.')], components: [] });
                                return;
                            }

                            if (biWipe.customId === 'wipe_undo') {
                                await biWipe.update({ embeds: [createEmbed('info', '🧹 Deshaciendo cambios...', 'Eliminando canales, categorías y roles creados. Por favor espera.')], components: [finalDisabled] });
                                
                                const freshGenData = readGenData();
                                const currentData = freshGenData[interaction.guild.id];
                                if (currentData) {
                                    for (const id of currentData.channels) {
                                        const chan = await interaction.guild.channels.fetch(id).catch(() => null);
                                        if (chan) await chan.delete(`Deshacer creación`).catch(() => {});
                                    }
                                    for (const id of currentData.categories) {
                                        const cat = await interaction.guild.channels.fetch(id).catch(() => null);
                                        if (cat) await cat.delete(`Deshacer creación`).catch(() => {});
                                    }
                                    for (const id of currentData.roles) {
                                        const role = await interaction.guild.roles.fetch(id).catch(() => null);
                                        if (role) await role.delete(`Deshacer creación`).catch(() => {});
                                    }
                                    delete freshGenData[interaction.guild.id];
                                    writeGenData(freshGenData);
                                    await biWipe.editReply({ embeds: [createEmbed('success', '✨ Deshecho con Éxito', `Se han eliminado todos los elementos.`) ], components: [] });
                                }
                            }
                        } catch (err) { if (err.code !== 10062) console.error(err); }
                    });

                    const guild = interaction.guild;
                    const createdRoles = {};
                    const metadata = { projectName, type, createdAt: Date.now(), roles: [], channels: [], categories: [] };

                    // 1. Crear Roles
                    for (const roleName of template.roles) {
                        try {
                            let perms = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory];
                            let color = '#99aab5'; // Color gris por defecto

                            if (roleName.includes('Fundador') || roleName.includes('Líder') || roleName.includes('Admin')) {
                                perms.push(PermissionFlagsBits.Administrator);
                                color = '#e74c3c'; // Rojo
                            }
                            if (roleName.includes('Moderador') || roleName.includes('Staff')) {
                                perms.push(PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers);
                                color = '#2ecc71'; // Verde
                            }
                            if (roleName.includes('Desarrollador') || roleName.includes('🛠')) {
                                perms.push(PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageWebhooks);
                                color = '#3498db'; // Azul
                            }
                            if (roleName.includes('VIP') || roleName.includes('💎') || roleName.includes('⭐')) {
                                color = '#f1c40f'; // Oro
                            }

                            const role = await guild.roles.create({ 
                                name: roleName, 
                                permissions: perms, 
                                color: color,
                                hoist: true, // Mostrar por separado en la lista de miembros
                                reason: `Generación: ${projectName}` 
                            });
                            createdRoles[roleName] = role;
                            metadata.roles.push(role.id);
                        } catch (e) {
                            console.error(`Error creando rol ${roleName}:`, e.message);
                        }
                    }

                    // 2. Crear Estructura (Categorías y Canales)
                    for (const catData of template.structure) {
                        const overwrites = [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }
                        ];

                        // Añadir permisos para roles de staff según el nombre del rol en la plantilla
                        const staffRoles = template.roles.filter(r => r.includes('🛡') || r.includes('Mod') || r.includes('Staff') || r.includes('👑') || r.includes('Admin'));
                        staffRoles.forEach(rName => {
                            if (createdRoles[rName]) {
                                overwrites.push({ id: createdRoles[rName].id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages] });
                            }
                        });

                        const cat = await guild.channels.create({
                            name: catData.name,
                            type: ChannelType.GuildCategory,
                            permissionOverwrites: catData.private ? overwrites : []
                        });
                        metadata.categories.push(cat.id);

                        for (const chan of catData.channels) {
                            const cName = typeof chan === 'string' ? chan : chan.name;
                            const cType = catData.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
                            const cPerms = [];
                            if (chan.private) {
                                cPerms.push({ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] });
                                const devRole = createdRoles['🛠 Desarrollador'] || createdRoles['Admin'];
                                if (devRole) cPerms.push({ id: devRole.id, allow: [PermissionFlagsBits.ViewChannel] });
                            }
                            if (chan.roles) {
                                cPerms.push({ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] });
                                chan.roles.forEach(rName => {
                                    const r = Object.values(createdRoles).find(v => v.name.includes(rName));
                                    if (r) cPerms.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] });
                                });
                            }

                            const createdChan = await guild.channels.create({ name: cName, type: cType, parent: cat.id, permissionOverwrites: cPerms });
                            metadata.channels.push(createdChan.id);

                            if (cName === 'reglas' || cName === 'normas') {
                                await createdChan.send({ embeds: [createEmbed('info', '📜 Normas del Servidor', `Bienvenido a **${projectName}**.`)] }).then(m => m.pin());
                            }
                        }
                    }

                    // Guardar metadata final
                    const allGenData = readGenData();
                    allGenData[guild.id] = metadata;
                    writeGenData(allGenData);

                    const finalRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('wipe_undo').setLabel('Deshacer y Borrar Todo').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                        new ButtonBuilder().setCustomId('wipe_final_cancel').setLabel('Finalizar Creación').setStyle(ButtonStyle.Secondary)
                    );

                    await bi.editReply({ 
                        embeds: [createEmbed('success', '✅ Servidor Configurado', `Estructura para **${projectName}** creada con éxito.\n\nUsa el botón de abajo si quieres deshacer los cambios.`) ],
                        components: [finalRow]
                    });

                } catch (err) {
                    console.error('Error creando servidor:', err);
                    await interaction.editReply({ embeds: [createEmbed('error', 'Error Crítico', 'Fallo al crear la estructura.')] }).catch(() => {});
                }
            });
        });

        nameCollector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                interaction.editReply({ embeds: [createEmbed('error', 'Tiempo Agotado', 'No proporcionaste un nombre.')], components: [] }).catch(() => {});
            }
        });
    });
}
