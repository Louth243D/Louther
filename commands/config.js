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
    rules: 'No se han configurado reglas aún.',
    autoRoleId: null,
    levelRewards: {}
};

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Administración y configuración avanzada del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('show').setDescription('Muestra la configuración actual del bot'))
    .addSubcommand(sub => sub.setName('setup_server').setDescription('Generador profesional de servidores con plantillas y roles'))
    .addSubcommand(sub =>
      sub.setName('set').setDescription('Actualiza una opción rápida')
        .addStringOption(o => o.setName('clave').setDescription('Opción a modificar').addChoices(
            { name: 'prefix', value: 'prefix' },
            { name: 'welcomeMessage', value: 'welcomeMessage' }
        ).setRequired(true))
        .addStringOption(o => o.setName('valor').setDescription('Nuevo valor').setRequired(true)))
    .addSubcommand(sub => sub.setName('reset').setDescription('Restaura los valores de configuración por defecto'))
    .addSubcommand(sub => sub.setName('interactive').setDescription('Panel visual para configurar módulos del bot'))
    .addSubcommand(sub => sub.setName('rules').setDescription('Configura las reglas oficiales').addStringOption(o => o.setName('contenido').setDescription('Contenido de las reglas').setRequired(true)))
    .addSubcommand(sub => sub.setName('view_rules').setDescription('Visualiza las reglas actuales'))
    .addSubcommand(sub => sub.setName('role_panel').setDescription('Crea un panel de auto-roles'))
    .addSubcommand(sub => sub.setName('level_rewards').setDescription('Configura roles por nivel')
        .addIntegerOption(o => o.setName('nivel').setDescription('Nivel requerido').setRequired(true))
        .addRoleOption(o => o.setName('rol').setDescription('Rol a entregar').setRequired(true))),

  async execute(interaction) {
    const guildId = interaction.guild?.id;
    if (!guildId) return interaction.reply({ content: 'Este comando solo funciona en servidores.', flags: [MessageFlags.Ephemeral] });
    
    const sub = interaction.options.getSubcommand();
    const config = await DataManager.getFile(`configs/${guildId}.json`, defaultConfig);

    try {
      switch (sub) {
        case 'setup_server': {
            // Reutilizamos la lógica del antiguo create-server integrada aquí
            return handleServerSetup(interaction);
        }

        case 'show': {
          const levelNames = { 1: 'Moderación', 2: 'Miembros', 3: 'Actividad' };
          const embed = createEmbed('info', 'Panel de Control', 'Estado actual de la configuración del bot.', {
              fields: [
                  { name: '⌨️ Prefijo', value: `\`${config.prefix}\``, inline: true },
                  { name: '📝 Canal Logs', value: config.logChannelId ? `<#${config.logChannelId}>` : '`No configurado`', inline: true },
                  { name: '📊 Nivel Logs', value: `\`Nivel ${config.logLevel || 1} (${levelNames[config.logLevel || 1]})\``, inline: true },
                  { name: '👤 Rol Automático', value: config.autoRoleId ? `<@&${config.autoRoleId}>` : '`No configurado`', inline: true },
                  { name: '👋 Bienvenida', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : '`Canal no configurado`', inline: true },
                  { name: '📜 Mensaje', value: `\`${config.welcomeMessage}\``, inline: false }
              ],
              thumbnail: interaction.guild.iconURL({ dynamic: true })
          });
          return interaction.reply({ embeds: [embed] });
        }

        case 'set': {
          const key = interaction.options.getString('clave', true);
          const val = interaction.options.getString('valor', true);
          if (key === 'prefix') config.prefix = val.slice(0, 5);
          else if (key === 'welcomeMessage') config.welcomeMessage = val.slice(0, 300);
          
          await DataManager.saveFile(`configs/${guildId}.json`, config);
          return interaction.reply({ embeds: [createEmbed('success', 'Ajuste Guardado', `Opción **${key}** actualizada a \`${val}\`.`)] });
        }

        case 'rules': {
          config.rules = interaction.options.getString('contenido').replace(/\\n/g, '\n');
          await DataManager.saveFile(`configs/${guildId}.json`, config);
          return interaction.reply({ embeds: [createEmbed('success', 'Reglas Guardadas', 'Usa `/config view_rules` para verlas.')] });
        }

        case 'view_rules': {
          return interaction.reply({ embeds: [createEmbed('info', '📜 REGLAS DEL SERVIDOR', config.rules, { footer: interaction.guild.name, thumbnail: interaction.guild.iconURL({ dynamic: true }) })] });
        }

        case 'interactive': {
            // Lógica del panel interactivo (antes era 'setup')
            return handleInteractiveSetup(interaction, config, guildId);
        }

        case 'reset': {
          await DataManager.saveFile(`configs/${guildId}.json`, defaultConfig);
          return interaction.reply({ embeds: [createEmbed('success', 'Configuración Reiniciada', 'Todos los valores han vuelto a su estado original.')] });
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
            
            // Usamos la variable local freshGenData para evitar cierres de ámbito
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
                { label: 'Gaming/Casual', value: 'casual', emoji: '🎮' },
                { label: 'Streamer', value: 'streamer', emoji: '🎥' },
                { label: 'GameDev', value: 'gamedev', emoji: '🛠️' },
                { label: 'Base Moderna', value: 'base', emoji: '✨' }
            ]);

        await interaction.followUp({ 
            embeds: [createEmbed('info', '📂 Plantilla para: ' + projectName, 'Selecciona el estilo de tu servidor.')], 
            components: [new ActionRowBuilder().addComponents(select)], 
            flags: [MessageFlags.Ephemeral]
        }).then(res => {
            const col = res.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30000 });
            col.on('collect', async i => {
                const type = i.values[0];
                const templates = getTemplates(projectName);
                const template = templates[type];
                
                await i.update({ 
                    embeds: [createEmbed('warn', '⚠️ Confirmar Creación', `Se crearán ${template.roles.length} roles y ${template.structure.length} categorías.\n¿Confirmas?`) ],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('cancel').setLabel('Cancelar').setStyle(ButtonStyle.Danger)
                    )]
                }).then(confirmRes => {
                    const btnCol = confirmRes.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
                    btnCol.on('collect', async bi => {
                        if (bi.customId === 'cancel') return bi.update({ content: 'Cancelado.', embeds: [], components: [] });
                        await bi.update({ embeds: [createEmbed('info', '⚙️ Creando...', 'Generando estructura profesional...') ], components: [] });
                        
                        // Lógica de creación (Roles y Canales) simplificada para integración
                        const results = await createStructure(interaction.guild, template, projectName);
                        
                        const finalGenData = readGenData();
                        finalGenData[interaction.guild.id] = { projectName, type, createdAt: Date.now(), ...results };
                        writeGenData(finalGenData);

                        await bi.editReply({ embeds: [createEmbed('success', '✨ Servidor Listo', `Estructura de **${projectName}** generada correctamente.`)] });
                    });
                });
            });
        });
    });
}

async function createStructure(guild, template, projectName) {
    const roles = [], channels = [], categories = [];
    const createdRoles = {};

    for (const rName of template.roles) {
        let perms = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];
        let color = '#99aab5';
        if (rName.includes('Fundador') || rName.includes('Admin')) { perms.push(PermissionFlagsBits.Administrator); color = '#e74c3c'; }
        if (rName.includes('Mod')) { perms.push(PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers); color = '#2ecc71'; }
        
        const role = await guild.roles.create({ name: rName, permissions: perms, color, hoist: true, reason: 'Setup ' + projectName });
        createdRoles[rName] = role;
        roles.push(role.id);
    }

    for (const catData of template.structure) {
        const overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }];
        if (createdRoles['🛡 Moderador'] || createdRoles['Mod']) overwrites.push({ id: (createdRoles['🛡 Moderador'] || createdRoles['Mod']).id, allow: [PermissionFlagsBits.ViewChannel] });

        const cat = await guild.channels.create({ name: catData.name, type: ChannelType.GuildCategory, permissionOverwrites: catData.private ? overwrites : [] });
        categories.push(cat.id);

        for (const cName of catData.channels) {
            const chan = await guild.channels.create({ name: typeof cName === 'string' ? cName : cName.name, type: ChannelType.GuildText, parent: cat.id });
            channels.push(chan.id);
        }
    }
    return { roles, channels, categories };
}

function getTemplates(projectName) {
    return {
        casual: { roles: ['👑 Líder', '🛡 Staff', '🎮 Gamer'], structure: [{ name: '💬 Social', channels: ['general', 'media'] }, { name: '🎮 Gaming', channels: ['busco-partida'] }] },
        streamer: { roles: ['🎥 Streamer', '🛡 Mod', '💎 Sub'], structure: [{ name: '📺 Live', channels: ['anuncios', 'chat-stream'] }, { name: '👥 Fans', channels: ['general'] }] },
        gamedev: { roles: ['👑 CEO', '🛠 Dev', '🧪 Tester'], structure: [{ name: '📢 Devlogs', channels: ['noticias', 'roadmap'] }, { name: '💻 Interno', private: true, channels: ['bugs', 'codigo'] }] },
        base: { roles: ['Admin', 'Mod', 'User'], structure: [{ name: 'General', channels: ['bienvenida', 'chat'] }] }
    };
}

async function handleInteractiveSetup(interaction, config, guildId) {
    const menu = new StringSelectMenuBuilder().setCustomId('menu').setPlaceholder('Elige un módulo')
        .addOptions([
            { label: 'Logs', value: 'log', description: 'Canal y nivel de registros.' },
            { label: 'Bienvenidas', value: 'welcome', description: 'Canal de entrada.' },
            { label: 'Auto-Rol', value: 'autorole', description: 'Rol al unirse.' }
        ]);

    const res = await interaction.reply({ embeds: [createEmbed('info', 'Panel Interactivo', 'Configura los módulos del bot visualmente.')], components: [new ActionRowBuilder().addComponents(menu)], flags: [MessageFlags.Ephemeral], withResponse: true });
    const collector = res.resource?.message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async i => {
        const val = i.values[0];
        if (val === 'log') {
            const sel = new ChannelSelectMenuBuilder().setCustomId('c').setPlaceholder('Elige canal de logs').addChannelTypes([ChannelType.GuildText]);
            await i.reply({ content: 'Selecciona el canal:', components: [new ActionRowBuilder().addComponents(sel)], flags: [MessageFlags.Ephemeral] });
        } else if (val === 'welcome') {
            const sel = new ChannelSelectMenuBuilder().setCustomId('w').setPlaceholder('Elige canal de bienvenidas').addChannelTypes([ChannelType.GuildText]);
            await i.reply({ content: 'Selecciona el canal:', components: [new ActionRowBuilder().addComponents(sel)], flags: [MessageFlags.Ephemeral] });
        } else if (val === 'autorole') {
            const sel = new RoleSelectMenuBuilder().setCustomId('r').setPlaceholder('Elige rol automático');
            await i.reply({ content: 'Selecciona el rol:', components: [new ActionRowBuilder().addComponents(sel)], flags: [MessageFlags.Ephemeral] });
        }
    });
}
