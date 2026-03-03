const { SlashCommandBuilder, ChannelType, time, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const fs = require('fs');
const path = require('path');

const economyDir = path.join(__dirname, '..', 'data', 'economy');
const usersFile = path.join(__dirname, '..', 'data', 'users.json');
const profilesDir = path.join(__dirname, '..', 'data', 'profiles');
const animeStatsFile = path.join(__dirname, '..', 'data', 'anime_stats.json');
const socialDir = path.join(__dirname, '..', 'data', 'social');
const rpgDir = path.join(__dirname, '..', 'data', 'rpg');
const todoDir = path.join(__dirname, '..', 'data', 'todo');

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getBalance(guildId, userId) {
    const userFile = path.join(economyDir, `${guildId}_${userId}.json`);
    try {
        if (!fs.existsSync(userFile)) return { balance: 0 };
        return JSON.parse(fs.readFileSync(userFile, 'utf-8'));
    } catch (e) { return { balance: 0 }; }
}

function getUsersData() {
    try {
        if (!fs.existsSync(usersFile)) return {};
        const data = fs.readFileSync(usersFile, 'utf-8');
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
}

function getProfile(guildId, userId) {
    ensureDir(profilesDir);
    const profileFile = path.join(profilesDir, `${guildId}_${userId}.json`);
    try {
        if (!fs.existsSync(profileFile)) return { rep: 0, bio: 'Sin biografía', achievements: [], banner: null };
        const data = fs.readFileSync(profileFile, 'utf-8');
        return data ? JSON.parse(data) : { rep: 0, bio: 'Sin biografía', achievements: [], banner: null };
    } catch (e) { return { rep: 0, bio: 'Sin biografía', achievements: [], banner: null }; }
}

function saveProfile(guildId, userId, profile) {
    ensureDir(profilesDir);
    const profileFile = path.join(profilesDir, `${guildId}_${userId}.json`);
    fs.writeFileSync(profileFile, JSON.stringify(profile, null, 2));
}

function getAnimeStats() {
    try {
        if (!fs.existsSync(animeStatsFile)) return {};
        return JSON.parse(fs.readFileSync(animeStatsFile, 'utf-8'));
    } catch (e) { return {}; }
}

function getMarriages(guildId) {
    const file = path.join(socialDir, `${guildId}_marriages.json`);
    try {
        if (!fs.existsSync(file)) return {};
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) { return {}; }
}

function getRPGData(guildId, userId) {
    const file = path.join(rpgDir, `${guildId}_${userId}.json`);
    try {
        if (!fs.existsSync(file)) return { hp: 100, maxHp: 100, level: 1, xp: 0 };
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) { return { hp: 100, maxHp: 100, level: 1, xp: 0 }; }
}

function getTodo(userId) {
    ensureDir(todoDir);
    const file = path.join(todoDir, `${userId}.json`);
    try {
        if (!fs.existsSync(file)) return [];
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) { return []; }
}

function saveTodo(userId, data) {
    ensureDir(todoDir);
    const file = path.join(todoDir, `${userId}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('util')
        .setDescription('Comandos de utilidad e información')
        .addSubcommand(sub => sub.setName('ping').setDescription('Muestra la latencia del bot'))
        .addSubcommand(sub => sub.setName('profile').setDescription('Muestra tu perfil completo').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')))
        .addSubcommand(sub => sub.setName('server').setDescription('Muestra información del servidor'))
        .addSubcommand(sub => sub.setName('user').setDescription('Muestra información de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')))
        .addSubcommand(sub => sub.setName('avatar').setDescription('Muestra el avatar de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')))
        .addSubcommand(sub => sub.setName('roles').setDescription('Muestra los roles del servidor'))
        .addSubcommand(sub => sub.setName('stats').setDescription('Muestra estadísticas del bot'))
        .addSubcommand(sub => sub.setName('rank').setDescription('Muestra tu tarjeta de rango').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')))
        .addSubcommand(sub => sub.setName('register').setDescription('Regístrate para desbloquear funciones avanzadas')
            .addStringOption(o => o.setName('nombre').setDescription('Tu nombre o apodo').setRequired(true))
            .addStringOption(o => o.setName('descripcion').setDescription('Una breve descripción sobre ti').setRequired(true).setMaxLength(100)))
        .addSubcommand(sub => sub.setName('reminder').setDescription('Crea un recordatorio personal')
            .addStringOption(o => o.setName('tiempo').setDescription('Tiempo (ej: 10m, 1h, 1d)').setRequired(true))
            .addStringOption(o => o.setName('mensaje').setDescription('¿Qué quieres que te recuerde?').setRequired(true)))
        .addSubcommand(sub => sub.setName('suggest').setDescription('Envía una sugerencia al servidor')
            .addStringOption(o => o.setName('contenido').setDescription('Tu sugerencia').setRequired(true)))
        .addSubcommand(sub => sub.setName('timer').setDescription('Establece un temporizador rápido')
            .addIntegerOption(o => o.setName('segundos').setDescription('Segundos (1-3600)').setRequired(true).setMinValue(1).setMaxValue(3600)))
        .addSubcommand(sub => sub.setName('todo').setDescription('Gestiona tu lista de tareas personal')
            .addStringOption(o => o.setName('accion').setDescription('¿Qué quieres hacer?').setRequired(true).addChoices(
                { name: 'Ver Lista', value: 'list' },
                { name: 'Añadir Tarea', value: 'add' },
                { name: 'Borrar Tarea', value: 'remove' },
                { name: 'Limpiar Todo', value: 'clear' }
            ))
            .addStringOption(o => o.setName('tarea').setDescription('Tarea o número de índice')))
        .addSubcommand(sub => sub.setName('vote').setDescription('Crea una votación simple')
            .addStringOption(o => o.setName('pregunta').setDescription('Pregunta a votar').setRequired(true)))
        .addSubcommandGroup(group => group.setName('banner').setDescription('Gestiona tu banner de perfil')
            .addSubcommand(sub => sub.setName('ver').setDescription('Ver tu banner').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')))
            .addSubcommand(sub => sub.setName('set').setDescription('Establecer tu banner (URL)').addStringOption(o => o.setName('url').setDescription('URL de la imagen').setRequired(true))))
        .addSubcommand(sub => sub.setName('bio').setDescription('Establece tu biografía de perfil').addStringOption(o => o.setName('texto').setDescription('Tu nueva biografía').setRequired(true).setMaxLength(100)))
        .addSubcommand(sub => sub.setName('invite').setDescription('Obtén el enlace de invitación del bot')),

    async execute(interaction, client, args, context = {}) {
        // --- Soporte para Comandos por Prefijo ---
        let subcommand, group, user, targetUser;
        let isInteraction = interaction.commandName !== undefined;

        if (isInteraction) {
            subcommand = interaction.options.getSubcommand();
            group = interaction.options.getSubcommandGroup(false);
            user = interaction.options.getUser('usuario') || interaction.user;
        } else {
            // interaction es en realidad un Message, client es el Client, args son los argumentos
            subcommand = args[0];
            // Para comandos por prefijo, buscamos la mención o usamos el autor
            user = context.user || interaction.author;
            
            // Si no hay subcomando, mostrar ayuda rápida o aviso
            if (!subcommand) return interaction.reply({ content: 'Debes especificar un subcomando (ej: `!util ping`)', flags: [MessageFlags.Ephemeral] });
        }

        const guild = interaction.guild;
        const guildId = guild.id;

        // Función de respuesta universal
        const reply = async (options) => {
            if (isInteraction) return interaction.reply(options);
            return interaction.channel.send(options);
        };

        const editReply = async (options) => {
            if (isInteraction) return interaction.editReply(options);
            // Para mensajes de texto, editamos el mensaje enviado anteriormente (sent)
            if (sent && sent.edit) return sent.edit(options);
            return interaction.channel.send(options);
        };

        let sent;

        // --- Manejo de Grupos de Subcomandos (Banner) ---
        if (group === 'banner' || subcommand === 'banner') {
            const sub = isInteraction ? subcommand : args[1];
            const target = isInteraction ? (interaction.options.getUser('usuario') || interaction.user) : (interaction.mentions.users.first() || interaction.author);

            if (sub === 'ver') {
                const profile = getProfile(guildId, target.id);
                let bUrl = null;
                try { 
                    const fUser = await (isInteraction ? interaction.client : client).users.fetch(target.id, { force: true }); 
                    bUrl = fUser.bannerURL({ size: 1024 }); 
                } catch {}

                const finalBanner = profile.banner || bUrl;
                if (!finalBanner) {
                    return reply({ embeds: [createEmbed('info', `Sin Banner`, `**${target.username}** no tiene un banner configurado ni en su perfil de Discord ni en el bot.`)] });
                }

                return reply({ embeds: [createEmbed('info', `Banner de ${target.username}`, '', { image: finalBanner })] });
            }

            if (sub === 'set') {
                const url = isInteraction ? interaction.options.getString('url') : args[2];
                
                // Verificación de formato de imagen/gif
                const imageRegex = /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i;
                const isValidImage = url && (url.startsWith('http') && imageRegex.test(url));

                if (!isValidImage) {
                    const errorEmbed = createEmbed('error', 'Formato Inválido', 
                        'La URL proporcionada no parece ser una imagen o GIF válido.\n\n' +
                        '**Formatos permitidos:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`.\n\n' +
                        '**Ejemplo de uso:**\n' +
                        `> \`${isInteraction ? '/util banner set' : 'y!util banner set'} https://ejemplo.com/mi_imagen.gif\``
                    );
                    return reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
                }
                
                const profile = getProfile(guildId, (isInteraction ? interaction.user.id : interaction.author.id));
                profile.banner = url;
                saveProfile(guildId, (isInteraction ? interaction.user.id : interaction.author.id), profile);
                
                return reply({ embeds: [createEmbed('success', 'Banner Actualizado', 'Tu nuevo banner se ha guardado correctamente.', { image: url })] });
            }
            
            if (!isInteraction) return reply({ content: 'Uso: `!util banner ver [@usuario]` o `!util banner set <url>`' });
        }

        switch (subcommand) {
            case 'invite': {
                const inviteEmbed = createEmbed('info', '📨 Invita a Louther', '¡Haz que tu servidor sea increíble con Louther!', {
                    fields: [
                        { name: '🔗 Enlace de Invitación', value: `[Haz clic aquí para invitar al bot](https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands)`, inline: false },
                        { name: '🛡️ Permisos Recomendados', value: 'Administrador (para todas las funciones) o permisos de Moderación, Gestión de Mensajes y Roles.', inline: false }
                    ],
                    thumbnail: interaction.client.user.displayAvatarURL()
                });
                return reply({ embeds: [inviteEmbed] });
            }

            case 'ping':
                sent = await reply({ embeds: [createEmbed('info', 'Ping', 'Calculando...') ], withResponse: true });
                const responseMsg = isInteraction ? (sent.resource ? sent.resource.message : sent) : sent;
                const latency = responseMsg.createdTimestamp - interaction.createdTimestamp;
                return editReply({ embeds: [createEmbed('success', 'Ping', `🌐 API: \`${latency}ms\`\n🔌 WS: \`${interaction.client.ws.ping}ms\``)] });

            case 'profile':
                const econ = getBalance(guildId, user.id);
                const users = getUsersData();
                const uStats = (users[guildId] && users[guildId][user.id]) ? users[guildId][user.id] : { level: 0, messages: 0 };
                const prof = getProfile(guildId, user.id);
                const marriages = getMarriages(guildId);
                const partnerId = marriages[user.id];
                const rpg = getRPGData(guildId, user.id);
                const aStats = getAnimeStats();
                
                let totalAnime = 0;
                if (aStats[guildId]) {
                    for (const pair in aStats[guildId]) {
                        if (pair.includes(user.id)) {
                            for (const action in aStats[guildId][pair]) {
                                totalAnime += aStats[guildId][pair][action];
                            }
                        }
                    }
                }

                const profileEmbed = createEmbed('info', `Perfil de ${user.username}`, prof.bio || 'Sin biografía.', {
                    fields: [
                        { name: '📊 Servidor', value: `⭐ Nivel: \`${uStats.level}\`\n💬 Mensajes: \`${uStats.messages}\``, inline: true },
                        { name: '💰 Economía', value: `💵 Monedas: \`$${econ.balance}\`\n🎖️ Rep: \`${prof.rep || 0}\``, inline: true },
                        { name: '💍 Social', value: `❤️ Pareja: ${partnerId ? `<@${partnerId}>` : '`Soltero/a`'}\n🎂 Cumple: \`${prof.birthday ? `${prof.birthday.dia}/${prof.birthday.mes}` : 'No definido'}\``, inline: true },
                        { name: '⚔️ RPG', value: `⭐ Nivel: \`${rpg.level}\`\n❤️ HP: \`${rpg.hp}/${rpg.maxHp}\``, inline: true },
                        { name: '🎌 Anime', value: `✨ Interacciones: \`${totalAnime}\``, inline: true }
                    ],
                    thumbnail: user.displayAvatarURL({ dynamic: true }),
                    image: prof.banner || null
                });
                return interaction.reply({ embeds: [profileEmbed] });

            case 'server':
                const owner = await guild.fetchOwner();
                return interaction.reply({ embeds: [createEmbed('info', `Servidor: ${guild.name}`, '', {
                    fields: [
                        { name: '👑 Dueño', value: owner.user.tag, inline: true },
                        { name: '👥 Miembros', value: `\`${guild.memberCount}\``, inline: true },
                        { name: '🛡️ Roles', value: `\`${guild.roles.cache.size}\``, inline: true }
                    ],
                    thumbnail: guild.iconURL({ dynamic: true })
                })] });

            case 'user':
                const member = await guild.members.fetch(user.id);
                return interaction.reply({ embeds: [createEmbed('info', `Usuario: ${user.tag}`, '', {
                    fields: [
                        { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                        { name: '📅 Ingreso', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
                    ],
                    thumbnail: user.displayAvatarURL({ dynamic: true })
                })] });

            case 'avatar':
                return interaction.reply({ embeds: [createEmbed('info', `Avatar de ${user.username}`, '', { image: user.displayAvatarURL({ size: 1024, dynamic: true }) })] });

            case 'roles':
                const roles = guild.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).join(', ');
                return interaction.reply({ embeds: [createEmbed('info', `Roles de ${guild.name}`, roles.length > 2000 ? roles.substring(0, 1997) + '...' : roles)] });

            case 'stats':
                return interaction.reply({ embeds: [createEmbed('info', 'Estadísticas del Bot', `Servidores: ${interaction.client.guilds.cache.size}\nUsuarios: ${interaction.client.users.cache.size}`)] });

            case 'rank':
                const rData = getUsersData();
                const rStats = (rData[guildId] && rData[guildId][user.id]) ? rData[guildId][user.id] : { level: 0, messages: 0 };
                const prog = rStats.messages % 20;
                const bar = '🟦'.repeat(Math.round((prog/20)*10)) + '⬛'.repeat(10 - Math.round((prog/20)*10));
                const rankEmbed = createEmbed('info', `Rango de ${user.username}`, '', {
                    fields: [
                        { name: '⭐ Nivel', value: `\`${rStats.level}\``, inline: true },
                        { name: '📈 Progreso', value: `${bar} (${prog}/20 MSG)`, inline: false }
                    ],
                    thumbnail: user.displayAvatarURL({ dynamic: true })
                });
                return interaction.reply({ embeds: [rankEmbed] });

            case 'register':
                const regName = interaction.options.getString('nombre');
                const regDesc = interaction.options.getString('descripcion');
                const regProfile = getProfile(guildId, interaction.user.id);
                
                regProfile.nickname = regName;
                regProfile.bio = regDesc;
                regProfile.registeredAt = Date.now();
                
                saveProfile(guildId, interaction.user.id, regProfile);
                
                const regEmbed = createEmbed('success', '✨ Registro Completado', `¡Bienvenido/a a la comunidad, **${regName}**!`, {
                    fields: [
                        { name: '👤 Nombre', value: regName, inline: true },
                        { name: '📝 Bio', value: regDesc, inline: true },
                        { name: '🔓 Beneficio', value: 'Has desbloqueado funciones de perfil extendidas.', inline: false }
                    ],
                    thumbnail: interaction.user.displayAvatarURL({ dynamic: true })
                });
                return interaction.reply({ embeds: [regEmbed] });

            case 'reminder':
                const rTimeStr = interaction.options.getString('tiempo');
                const rMsg = interaction.options.getString('mensaje');
                const rMatch = rTimeStr.match(/^(\d+)([smhd])$/);
                if (!rMatch) return interaction.reply({ content: 'Formato de tiempo inválido.', flags: [MessageFlags.Ephemeral] });
                const rDuration = parseInt(rMatch[1]) * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[rMatch[2]];
                const rTargetTime = Date.now() + rDuration;
                await interaction.reply({ embeds: [createEmbed('success', 'Recordatorio Creado', `Te recordaré esto <t:${Math.floor(rTargetTime / 1000)}:R>.`, { fields: [{ name: '📝 Mensaje', value: rMsg }] })] });
                setTimeout(async () => {
                    const rEmbed = createEmbed('info', '⏰ ¡Recordatorio!', `Hola <@${interaction.user.id}>, me pediste que te recordara:`, { fields: [{ name: '📝 Mensaje', value: rMsg }] });
                    try { await interaction.user.send({ embeds: [rEmbed] }); } catch (e) { await interaction.channel.send({ content: `<@${interaction.user.id}>`, embeds: [rEmbed] }).catch(() => {}); }
                }, rDuration);
                break;

            case 'suggest':
                const sCont = interaction.options.getString('contenido');
                const sEmbed = createEmbed('info', '💡 Nueva Sugerencia', sCont, { footer: `Enviada por ${interaction.user.tag}`, thumbnail: interaction.user.displayAvatarURL({ dynamic: true }) });
                await interaction.reply({ embeds: [createEmbed('success', 'Sugerencia Enviada', 'Tu sugerencia ha sido publicada.')], flags: [MessageFlags.Ephemeral] });
                const sMsg = await interaction.channel.send({ embeds: [sEmbed] });
                await sMsg.react('✅'); await sMsg.react('❌');
                break;

            case 'timer':
                const tSec = interaction.options.getInteger('segundos');
                const tEnd = Math.floor((Date.now() / 1000) + tSec);
                await interaction.reply({ embeds: [createEmbed('info', '⏲️ Temporizador Iniciado', `Se te notificará en \`${tSec}\` segundos.`, { fields: [{ name: '⌛ Finaliza', value: `<t:${tEnd}:R>`, inline: true }] })] });
                setTimeout(async () => {
                    try { await interaction.followUp({ content: `${interaction.user}`, embeds: [createEmbed('success', '⏰ ¡Tiempo Terminado!', `El temporizador de \`${tSec}\` segundos ha finalizado.`)] }); } catch (e) {}
                }, tSec * 1000);
                break;

            case 'todo':
                const tdAcc = interaction.options.getString('accion');
                const tdTarea = interaction.options.getString('tarea');
                let tdList = getTodo(interaction.user.id);

                if (tdAcc === 'list') {
                    if (tdList.length === 0) return interaction.reply({ embeds: [createEmbed('info', '📝 Lista de Tareas', 'Tu lista está vacía. ¡Buen trabajo!')], flags: [MessageFlags.Ephemeral] });
                    const listStr = tdList.map((t, i) => `${i + 1}. \`${t}\``).join('\n');
                    return interaction.reply({ embeds: [createEmbed('info', '📝 Tu Lista de Tareas', listStr)], flags: [MessageFlags.Ephemeral] });
                }

                if (tdAcc === 'add') {
                    if (!tdTarea) return interaction.reply({ content: 'Escribe la tarea que quieres añadir.', flags: [MessageFlags.Ephemeral] });
                    if (tdList.length >= 10) return interaction.reply({ content: 'Límite de 10 tareas alcanzado.', flags: [MessageFlags.Ephemeral] });
                    tdList.push(tdTarea);
                    saveTodo(interaction.user.id, tdList);
                    return interaction.reply({ embeds: [createEmbed('success', '✅ Tarea Añadida', `Se ha guardado: \`${tdTarea}\``)], flags: [MessageFlags.Ephemeral] });
                }

                if (tdAcc === 'remove') {
                    const idx = parseInt(tdTarea) - 1;
                    if (isNaN(idx) || idx < 0 || idx >= tdList.length) return interaction.reply({ content: 'Número de tarea inválido.', flags: [MessageFlags.Ephemeral] });
                    const removed = tdList.splice(idx, 1);
                    saveTodo(interaction.user.id, tdList);
                    return interaction.reply({ embeds: [createEmbed('success', '🗑️ Tarea Eliminada', `Se ha eliminado: \`${removed[0]}\``)], flags: [MessageFlags.Ephemeral] });
                }

                if (tdAcc === 'clear') {
                    saveTodo(interaction.user.id, []);
                    return interaction.reply({ embeds: [createEmbed('success', '🧹 Lista Limpiada', 'Se han borrado todas tus tareas.')], flags: [MessageFlags.Ephemeral] });
                }

            case 'vote':
                const vPreg = interaction.options.getString('pregunta');
                let vSi = 0, vNo = 0; const vVot = new Set();
                const vRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('v_si').setLabel('SÍ').setStyle(ButtonStyle.Success).setEmoji('✅'), new ButtonBuilder().setCustomId('v_no').setLabel('NO').setStyle(ButtonStyle.Danger).setEmoji('❌'));
                const vRes = await interaction.reply({ embeds: [createEmbed('info', '📊 Votación', vPreg, { fields: [{ name: '✅ SÍ', value: '`0`', inline: true }, { name: '❌ NO', value: '`0`', inline: true }] })], components: [vRow], withResponse: true });
                const vResponseMsg = vRes.resource?.message || vRes;
                const vColl = vResponseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
                vColl.on('collect', async i => {
                    if (vVot.has(i.user.id)) return i.reply({ content: 'Ya votaste.', flags: [MessageFlags.Ephemeral] });
                    if (i.customId === 'v_si') vSi++; else vNo++; vVot.add(i.user.id);
                    await i.update({ embeds: [createEmbed('info', '📊 Votación', vPreg, { fields: [{ name: '✅ SÍ', value: `\`${vSi}\``, inline: true }, { name: '❌ NO', value: `\`${vNo}\``, inline: true }] })] });
                });
                vColl.on('end', () => { interaction.editReply({ embeds: [createEmbed('info', '📊 Votación Finalizada', vPreg, { fields: [{ name: '✅ SÍ', value: `\`${vSi}\``, inline: true }, { name: '❌ NO', value: `\`${vNo}\``, inline: true }] })], components: [] }).catch(() => {}); });
                break;
        }
    }
};
