const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ComponentType,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType
} = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
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

const defaultConfig = {
    prefix: '!',
    logChannelId: null,
    logLevel: 1,
    persistentLogIds: {},
    welcomeChannelId: null,
    welcomeMessage: '¡Bienvenido/a {user} a {server}!',
    welcomeBackground: null,
    welcomeBannerText: 'BIENVENIDO',
    rules: 'No se han configurado reglas aún.',
    autoRoleId: null,
    levelRewards: {}
};

module.exports = {
  category: '⚙️ CONFIGURACIÓN',
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Administración y configuración avanzada del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('show').setDescription('Muestra la configuración actual del bot'))
    .addSubcommand(sub => sub.setName('setup_server').setDescription('Generador profesional de servidores con plantillas y roles'))
    .addSubcommand(sub =>
      sub.setName('quick_edit').setDescription('Actualiza una opción rápida de texto o imagen')
        .addStringOption(o => o.setName('clave').setDescription('Opción a modificar').addChoices(
            { name: 'Prefijo', value: 'prefix' },
            { name: 'Mensaje de Bienvenida', value: 'welcomeMessage' },
            { name: 'Fondo de Bienvenida (URL)', value: 'welcomeBackground' },
            { name: 'Texto en Imagen de Bienvenida', value: 'welcomeBannerText' }
        ).setRequired(true))
        .addStringOption(o => o.setName('valor').setDescription('Nuevo valor').setRequired(true)))
    .addSubcommand(sub => sub.setName('panel').setDescription('Panel visual para configurar módulos (Canales, Roles, etc.)'))
    .addSubcommand(sub => sub.setName('rules').setDescription('Configura las reglas oficiales').addStringOption(o => o.setName('contenido').setDescription('Contenido de las reglas').setRequired(true)))
    .addSubcommand(sub => sub.setName('view_rules').setDescription('Visualiza las reglas actuales'))
    .addSubcommand(sub => sub.setName('rewards').setDescription('Configura roles por nivel')
        .addIntegerOption(o => o.setName('nivel').setDescription('Nivel requerido').setRequired(true))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a entregar').setRequired(true)))
    .addSubcommand(sub => sub.setName('reset').setDescription('Restaura los valores de configuración por defecto')),

  async execute(interaction) {
    const guildId = interaction.guild?.id;
    if (!guildId) return interaction.reply({ content: 'Este comando solo funciona en servidores.', flags: [MessageFlags.Ephemeral] });
    
    const sub = interaction.options.getSubcommand();
    const config = await DataManager.getFile(`configs/${guildId}.json`, defaultConfig);

    try {
      switch (sub) {
        case 'setup_server':
            return handleServerSetup(interaction);

        case 'show': {
          const levelNames = { 1: 'Moderación', 2: 'Miembros', 3: 'Actividad' };
          const embed = createEmbed('info', 'Panel de Control', 'Estado actual de la configuración del bot.', {
              fields: [
                  { name: '⌨️ Prefijo', value: `\`${config.prefix}\``, inline: true },
                  { name: '📝 Canal Logs', value: config.logChannelId ? `<#${config.logChannelId}>` : '`No configurado`', inline: true },
                  { name: '📊 Nivel Logs', value: `\`Nivel ${config.logLevel || 1} (${levelNames[config.logLevel || 1]})\``, inline: true },
                  { name: '👤 Rol Automático', value: config.autoRoleId ? `<@&${config.autoRoleId}>` : '`No configurado`', inline: true },
                  { name: '🖼️ Fondo Imagen', value: config.welcomeBackground ? `[Ver Imagen](${config.welcomeBackground})` : '`Por defecto`', inline: true },
                  { name: '✍️ Texto Imagen', value: `\`${config.welcomeBannerText || 'BIENVENID@'}\``, inline: true },
                  { name: '👋 Canal Bienvenida', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : '`No configurado`', inline: true },
                  { name: '📜 Mensaje Chat', value: `\`${config.welcomeMessage}\``, inline: false }
              ],
              thumbnail: interaction.guild.iconURL({ dynamic: true })
          });
          return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        case 'quick_edit': {
          const key = interaction.options.getString('clave', true);
          const val = interaction.options.getString('valor', true);
          
          if (key === 'prefix') config.prefix = val.slice(0, 5);
          else if (key === 'welcomeMessage') config.welcomeMessage = val.slice(0, 300);
          else if (key === 'welcomeBannerText') config.welcomeBannerText = val.slice(0, 20).toUpperCase();
          else if (key === 'welcomeBackground') {
            if (!val.startsWith('http')) return interaction.reply({ content: '❌ Debes proporcionar una URL válida para la imagen.', flags: [MessageFlags.Ephemeral] });
            // Verificación básica de extensión
            if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(val)) {
                return interaction.reply({ content: '❌ La URL debe ser un enlace directo a una imagen (.jpg, .png, .webp, .gif).', flags: [MessageFlags.Ephemeral] });
            }
            config.welcomeBackground = val;
          }
          
          await DataManager.saveFile(`configs/${guildId}.json`, config);
          return interaction.reply({ embeds: [createEmbed('success', 'Ajuste Guardado', `Opción **${key}** actualizada correctamente.`)], flags: [MessageFlags.Ephemeral] });
        }

        case 'panel':
            return handleInteractiveSetup(interaction, config, guildId);

        case 'rules': {
          config.rules = interaction.options.getString('contenido').replace(/\\n/g, '\n');
          await DataManager.saveFile(`configs/${guildId}.json`, config);
          return interaction.reply({ embeds: [createEmbed('success', 'Reglas Guardadas', 'Usa `/config view_rules` para verlas.')], flags: [MessageFlags.Ephemeral] });
        }

        case 'view_rules':
          return interaction.reply({ embeds: [createEmbed('info', '📜 REGLAS DEL SERVIDOR', config.rules, { footer: interaction.guild.name, thumbnail: interaction.guild.iconURL({ dynamic: true }) })], flags: [MessageFlags.Ephemeral] });

        case 'rewards': {
          const level = interaction.options.getInteger('nivel', true);
          const role = interaction.options.getRole('rol', true);
          
          if (!config.levelRewards) config.levelRewards = {};
          config.levelRewards[level] = role.id;
          
          await DataManager.saveFile(`configs/${guildId}.json`, config);
          return interaction.reply({ embeds: [createEmbed('success', 'Recompensa Guardada', `Se ha asignado el rol <@&${role.id}> para el nivel **${level}**.`)], flags: [MessageFlags.Ephemeral] });
        }

        case 'reset': {
          await DataManager.saveFile(`configs/${guildId}.json`, defaultConfig);
          return interaction.reply({ embeds: [createEmbed('success', 'Configuración Reiniciada', 'Todos los valores han vuelto a su estado original.')], flags: [MessageFlags.Ephemeral] });
        }

        default:
          return interaction.reply({ content: 'Subcomando no disponible.', flags: [MessageFlags.Ephemeral] });
      }
    } catch (error) {
        console.error(`[Config] Error:`, error);
        return interaction.reply({ embeds: [createEmbed('error', 'Error en Config', 'No se pudo procesar la configuración.')], flags: [MessageFlags.Ephemeral] });
    }
  }
};

// --- FUNCIONES DE APOYO ---

async function handleServerSetup(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ embeds: [createEmbed('error', 'Dueño Requerido', 'Solo el dueño o administradores pueden usar el generador.')], flags: [MessageFlags.Ephemeral] });
    }

    const guildId = interaction.guild.id;
    let genData = readGenData();

    if (genData[guildId]) {
        const existing = genData[guildId];
        const wipeEmbed = createEmbed('warn', 'Servidor ya Configurado', `Ya existe una estructura generada para el proyecto **${existing.projectName}**.\n\n¿Qué deseas hacer? Si eliges **Borrar y Recrear**, se eliminarán permanentemente todos los roles y canales creados anteriormente por el bot.`, {
            fields: [
                { name: '📊 Elementos', value: `Canales: \`${existing.channels.length}\` | Roles: \`${existing.roles.length}\``, inline: true }
            ]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('wipe_recreate').setLabel('Borrar y Recrear').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('wipe_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
        );

        const res = await interaction.reply({ embeds: [wipeEmbed], components: [row], flags: [MessageFlags.Ephemeral], withResponse: true });
        const msg = res.resource?.message || res;
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'wipe_cancel') {
                return i.update({ embeds: [createEmbed('info', 'Proceso Cancelado', 'No se han realizado cambios.')], components: [] });
            }
            
            await i.update({ embeds: [createEmbed('info', 'Limpiando...', 'Borrando canales y roles previos...') ], components: [] });
            
            let currentGenData = readGenData();
            let serverData = currentGenData[guildId];
            
            if (serverData) {
                for (const id of serverData.channels) await interaction.guild.channels.fetch(id).then(c => c?.delete()).catch(() => {});
                for (const id of serverData.categories) await interaction.guild.channels.fetch(id).then(c => c?.delete()).catch(() => {});
                for (const id of serverData.roles) await interaction.guild.roles.fetch(id).then(r => r?.delete()).catch(() => {});

                delete currentGenData[guildId];
                writeGenData(currentGenData);
            }
            
            return startFlow(interaction);
        });
        return;
    }

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    return startFlow(interaction);
}

async function startFlow(interaction) {
    const flowMsg = await interaction.editReply({ 
        embeds: [createEmbed('info', '🚀 Generador de Servidor', 'Escribe el nombre de tu proyecto en el chat para comenzar.')], 
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('flow_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger))],
        flags: [MessageFlags.Ephemeral] 
    });

    const nameCol = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 30000, max: 1 });
    const btnCol = flowMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    btnCol.on('collect', async i => {
        if (i.customId === 'flow_cancel') {
            nameCol.stop('cancelled');
            await i.update({ embeds: [createEmbed('error', 'Proceso Cancelado', 'Has cancelado la creación del servidor.')], components: [] });
            return btnCol.stop();
        }
    });
    
    nameCol.on('collect', async m => {
        const projectName = m.content.trim();
        if (m.deletable) m.delete().catch(() => {});

        const select = new StringSelectMenuBuilder()
            .setCustomId('select_type')
            .setPlaceholder('Elige una plantilla')
            .addOptions([
                { label: 'Juegos y Comunidad Casual', value: 'casual', emoji: '🎮' },
                { label: 'Comunidad para Streamers', value: 'streamer', emoji: '🎥' },
                { label: 'Desarrollo de Videojuegos', value: 'gamedev', emoji: '🛠️' },
                { label: 'Alianzas y Bots', value: 'partnership', emoji: '🤝' },
                { label: 'Plantilla Base Moderna', value: 'base', emoji: '✨' }
            ]);

        await interaction.editReply({ 
            embeds: [createEmbed('info', '📂 Plantilla para: ' + projectName, 'Selecciona el estilo de tu servidor.')], 
            components: [
                new ActionRowBuilder().addComponents(select),
                new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('flow_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger))
            ], 
            flags: [MessageFlags.Ephemeral]
        });

        const menuCol = flowMsg.createMessageComponentCollector({ time: 30000 });
        
        menuCol.on('collect', async i => {
            if (i.customId === 'flow_cancel') {
                await i.update({ embeds: [createEmbed('error', 'Proceso Cancelado', 'Has cancelado la creación del servidor.')], components: [] });
                return menuCol.stop();
            }

            if (i.isStringSelectMenu()) {
                const type = i.values[0];
                const templates = getTemplates(projectName);
                const template = templates[type];
                
                await i.update({ 
                    embeds: [createEmbed('warn', '⚠️ Confirmar Creación', `Se crearán ${template.roles.length} roles y ${template.structure.length} categorías.\n¿Confirmas?`) ],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger)
                    )]
                });

                const btnColFinal = flowMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 1 });
                btnColFinal.on('collect', async bi => {
                    if (bi.customId === 'cancel') {
                        return bi.update({ embeds: [createEmbed('error', 'Proceso Cancelado', 'Has cancelado la creación.')], components: [] });
                    }
                    
                    await bi.update({ embeds: [createEmbed('info', '⚙️ Creando...', 'Generando estructura profesional completa...') ], components: [] });
                    
                    const results = await createStructure(interaction.guild, template, projectName);
                    
                    const finalGenData = readGenData();
                    finalGenData[interaction.guild.id] = { projectName, type, createdAt: Date.now(), ...results };
                    writeGenData(finalGenData);

                    await bi.editReply({ embeds: [createEmbed('success', '✨ Servidor Listo', `Estructura de **${projectName}** generada con éxito.`)] });
                });
            }
        });
    });
}

async function createStructure(guild, template, projectName) {
    const roles = [], channels = [], categories = [];
    const createdRoles = {};

    for (const rData of template.roles) {
        const role = await guild.roles.create({ 
            name: rData.name, 
            permissions: rData.perms, 
            color: rData.color, 
            hoist: true, 
            reason: 'Setup ' + projectName 
        });
        createdRoles[rData.name] = role;
        roles.push(role.id);
    }

    for (const catData of template.structure) {
        const overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }];
        if (catData.private) {
            const staffRoles = template.roles.filter(r => r.staff).map(r => createdRoles[r.name]);
            staffRoles.forEach(r => { if (r) overwrites.push({ id: r.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages] }); });
        }

        const cat = await guild.channels.create({ name: catData.name, type: ChannelType.GuildCategory, permissionOverwrites: catData.private ? overwrites : [] });
        categories.push(cat.id);

        for (const chanData of catData.channels) {
            const cName = typeof chanData === 'string' ? chanData : chanData.name;
            const cType = catData.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
            const chan = await guild.channels.create({ name: cName, type: cType, parent: cat.id, topic: chanData.topic || `Canal de ${projectName}` });
            channels.push(chan.id);
            if (cName === 'reglas' || cName === 'normas') {
                await chan.send({ embeds: [createEmbed('info', '📜 Normas', `Bienvenido a **${projectName}**. Por favor lee las reglas.`)] }).then(m => m.pin());
            }
        }
    }
    return { roles, channels, categories };
}

function getTemplates(projectName) {
    const adminPerms = [PermissionFlagsBits.Administrator];
    const modPerms = [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers];
    const userPerms = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak];
    return {
        casual: { roles: [{ name: '👑 Fundador', perms: adminPerms, color: '#e74c3c', staff: true }, { name: '🛡️ Moderador', perms: modPerms, color: '#2ecc71', staff: true }, { name: '👤 Miembro', perms: userPerms, color: '#99aab5' }], structure: [{ name: '📌 INFORMACIÓN', channels: ['reglas', 'anuncios'] }, { name: '💬 COMUNIDAD', channels: ['general', 'fotos'] }, { name: '🔊 VOZ', type: 'voice', channels: ['General', 'Gaming'] }] },
        streamer: { roles: [{ name: '🎥 Streamer', perms: adminPerms, color: '#9b59b6', staff: true }, { name: '🛠️ Mod', perms: modPerms, color: '#2ecc71', staff: true }, { name: '💎 Sub', perms: userPerms, color: '#f1c40f' }], structure: [{ name: '📺 LIVE', channels: ['avisos-en-vivo', 'sugerencias'] }, { name: '💬 COMUNIDAD', channels: ['general', 'off-topic'] }, { name: '🔊 VOZ', type: 'voice', channels: ['Charla', 'Gaming'] }] },
        gamedev: { roles: [{ name: '👑 CEO', perms: adminPerms, color: '#e67e22', staff: true }, { name: '🛠️ Dev', perms: modPerms, color: '#3498db', staff: true }, { name: '🧪 Tester', perms: userPerms, color: '#1abc9c' }], structure: [{ name: '📢 DEVLOGS', channels: ['noticias', 'roadmap'] }, { name: '💻 INTERNO', private: true, channels: ['bugs', 'codigo'] }] },
        partnership: { roles: [{ name: '👑 CEO', perms: adminPerms, color: '#000000', staff: true }, { name: '🤝 Manager', perms: modPerms, color: '#2ecc71', staff: true }], structure: [{ name: '📜 INFO', channels: ['normas', 'anuncios'] }, { name: '🤝 ALIANZAS', channels: ['nuestras-alianzas', 'tus-alianzas'] }] },
        base: { roles: [{ name: 'Admin', perms: adminPerms, color: '#000000', staff: true }, { name: 'Mod', perms: modPerms, color: '#2ecc71', staff: true }, { name: 'User', perms: userPerms, color: '#99aab5' }], structure: [{ name: 'General', channels: ['bienvenida', 'chat'] }, { name: 'Admin', private: true, channels: ['staff-chat', 'logs'] }] }
    };
}

async function handleInteractiveSetup(interaction, config, guildId) {
    const menu = new StringSelectMenuBuilder().setCustomId('cfg_menu').setPlaceholder('Elige un módulo para configurar')
        .addOptions([
            { label: 'Canal de Logs', value: 'log', emoji: '📝' },
            { label: 'Nivel de Logs', value: 'log_level', emoji: '📊' },
            { label: 'Canal de Bienvenidas', value: 'welcome', emoji: '👋' },
            { label: 'Texto en Imagen', value: 'welcome_text', emoji: '✍️' },
            { label: 'Rol Automático', value: 'autorole', emoji: '👤' },
            { label: 'Cerrar Panel', value: 'close', emoji: '❌' }
        ]);

    const row = new ActionRowBuilder().addComponents(menu);
    const response = await interaction.reply({ 
        embeds: [createEmbed('info', '⚙️ Panel de Configuración', 'Selecciona una opción para configurar los canales y roles del bot.')], 
        components: [row], 
        flags: [MessageFlags.Ephemeral]
    });

    const collector = interaction.channel.createMessageComponentCollector({ 
        filter: i => i.user.id === interaction.user.id,
        time: 120000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: 'No puedes usar este panel.', flags: [MessageFlags.Ephemeral] });

        try {
            if (i.customId === 'cfg_menu') {
                const val = i.values[0];
                if (val === 'close') {
                    await i.update({ embeds: [createEmbed('success', 'Panel Cerrado', 'Configuración finalizada.')], components: [] });
                    return collector.stop();
                }

                let component;
                let text = '';

                if (val === 'log') {
                    text = 'Selecciona el canal para los **Logs**:';
                    component = new ChannelSelectMenuBuilder().setCustomId('sel_log').setPlaceholder('Elegir canal').addChannelTypes([ChannelType.GuildText]);
                } else if (val === 'welcome') {
                    text = 'Selecciona el canal para las **Bienvenidas**:';
                    component = new ChannelSelectMenuBuilder().setCustomId('sel_welcome').setPlaceholder('Elegir canal').addChannelTypes([ChannelType.GuildText]);
                } else if (val === 'welcome_text') {
                    await i.update({ 
                        content: 'Escribe el texto que aparecerá en la imagen de bienvenida (Máx 20 caracteres):', 
                        embeds: [], 
                        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cfg_back').setLabel('Cancelar').setStyle(ButtonStyle.Danger))] 
                    });

                    const msgCol = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 30000, max: 1 });
                    msgCol.on('collect', async m => {
                        const newText = m.content.substring(0, 20).toUpperCase();
                        config.welcomeBannerText = newText;
                        await DataManager.saveFile(`configs/${guildId}.json`, config);
                        if (m.deletable) m.delete().catch(() => {});
                        await interaction.editReply({ content: `✅ Texto de imagen actualizado a: \`${newText}\``, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cfg_back').setLabel('Continuar').setStyle(ButtonStyle.Success))] });
                    });
                    return;
                } else if (val === 'autorole') {
                    text = 'Selecciona el **Rol Automático** para nuevos miembros:';
                    component = new RoleSelectMenuBuilder().setCustomId('sel_role').setPlaceholder('Elegir rol');
                }

                await i.update({ 
                    content: text, 
                    embeds: [], 
                    components: [new ActionRowBuilder().addComponents(component), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cfg_back').setLabel('Volver al Menú').setStyle(ButtonStyle.Secondary))] 
                });
            } else if (i.customId === 'cfg_back') {
                await i.update({ content: '', embeds: [createEmbed('info', '⚙️ Panel de Configuración', 'Selecciona una opción para configurar.')], components: [row] });
            } else if (i.isChannelSelectMenu()) {
                const val = i.values[0];
                if (i.customId === 'sel_log') {
                    config.logChannelId = val;
                    await DataManager.saveFile(`configs/${guildId}.json`, config);
                    await i.update({ content: `✅ Canal de logs guardado: <#${config.logChannelId}>`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cfg_back').setLabel('Continuar').setStyle(ButtonStyle.Success))] });
                } else if (i.customId === 'sel_welcome') {
                    config.welcomeChannelId = val;
                    await DataManager.saveFile(`configs/${guildId}.json`, config);
                    await i.update({ content: `✅ Canal de bienvenidas guardado: <#${config.welcomeChannelId}>`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cfg_back').setLabel('Continuar').setStyle(ButtonStyle.Success))] });
                }
            } else if (i.isRoleSelectMenu()) {
                config.autoRoleId = i.values[0];
                await DataManager.saveFile(`configs/${guildId}.json`, config);
                await i.update({ content: `✅ Rol automático guardado: <@&${config.autoRoleId}>`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('cfg_back').setLabel('Continuar').setStyle(ButtonStyle.Success))] });
            }
        } catch (err) {
            console.error('Error en el panel interactivo:', err);
            if (!i.replied && !i.deferred) {
                await i.reply({ content: '❌ Hubo un error procesando tu selección.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
        }
    });

    collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
    });
}
