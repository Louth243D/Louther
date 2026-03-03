const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const { sendLog } = require('../utils/logger.js');
const { checkCooldown } = require('../utils/cooldown.js');

const defaultModData = {
    warns: []
};

const defaultConfig = {
    logChannelId: null,
    modRoleId: null,
    logLevel: 1
};

async function isStaff(member) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const config = await DataManager.getFile(`configs/${member.guild.id}.json`, defaultConfig);
    if (!config.modRoleId) return false;
    return member.roles.cache.has(config.modRoleId);
}

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Comandos de moderación general')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(sub => sub.setName('warn').setDescription('Advierte a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a advertir').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón de la advertencia')))
        .addSubcommand(sub => sub.setName('ban').setDescription('Banea a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón del baneo')))
        .addSubcommand(sub => sub.setName('kick').setDescription('Expulsa a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón de la expulsión')))
        .addSubcommand(sub => sub.setName('timeout').setDescription('Silencia temporalmente a un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a silenciar').setRequired(true)).addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setRequired(true)).addStringOption(o => o.setName('razon').setDescription('Razón del silencio')))
        .addSubcommand(sub => sub.setName('warnings').setDescription('Muestra las advertencias de un usuario').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar').setRequired(true)))
        .addSubcommand(sub => sub.setName('clear').setDescription('Borra mensajes del canal').addIntegerOption(o => o.setName('cantidad').setDescription('Mensajes a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))),

    async execute(interaction, client, args, context = {}) {
        const isInteraction = interaction.commandName !== undefined;
        let subcommand, targetUser, reason, amount;

        if (isInteraction) {
            subcommand = interaction.options.getSubcommand();
            targetUser = interaction.options.getUser('usuario');
            reason = interaction.options.getString('razon') || 'No especificada';
            amount = interaction.options.getInteger('cantidad');
        } else {
            subcommand = args[0];
            targetUser = context.user;
            amount = context.amount;
            // Para prefijo, la razón suele ser el resto del contenido
            reason = args.slice(1).join(' ').replace(/<@!?\d+>/g, '').trim() || 'No especificada';
            if (!subcommand) return interaction.reply({ content: 'Uso: `!mod <subcomando> <usuario> [razón]`' });
        }

        const guild = interaction.guild;
        const moderator = isInteraction ? interaction.member : interaction.member;
        const userId = isInteraction ? interaction.user.id : interaction.author.id;

        // 1. Cooldown (3 segundos para moderación para evitar doble ejecución accidental)
        const cooldownTime = checkCooldown(userId, 'mod', 3000);
        if (cooldownTime) {
            const cdEmbed = createEmbed('error', '⏳ Cooldown', `Por favor espera \`${(cooldownTime / 1000).toFixed(1)}s\` antes de usar moderación otra vez.`);
            return isInteraction ? interaction.reply({ embeds: [cdEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.channel.send({ embeds: [cdEmbed] });
        }

        // 2. Verificación de Staff
        if (!await isStaff(moderator)) {
            const noStaffEmbed = createEmbed('error', 'Acceso Denegado', 'Este comando solo puede ser utilizado por el **Staff** del servidor.');
            return isInteraction ? interaction.reply({ embeds: [noStaffEmbed], flags: [MessageFlags.Ephemeral] }) : interaction.channel.send({ embeds: [noStaffEmbed] });
        }

        // Función de respuesta universal
        const reply = async (options) => {
            if (isInteraction) return interaction.reply(options);
            return interaction.channel.send(options);
        };

        try {
            switch (subcommand) {
                case 'warn': {
                    if (!targetUser || targetUser.id === userId) return reply({ content: 'Debes mencionar a un usuario válido que no seas tú.' });
                    if (targetUser.bot) return reply({ content: 'No puedes advertir bots.' });

                    const modData = await DataManager.getFile(`moderation/${guild.id}_${targetUser.id}.json`, defaultModData);
                    modData.warns.push({ moderatorId: userId, reason, timestamp: Date.now() });
                    await DataManager.saveFile(`moderation/${guild.id}_${targetUser.id}.json`, modData);

                    const logEmbed = createEmbed('mod', '⚠️ Usuario Advertido', '', {
                        fields: [
                            { name: '👤 Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                            { name: '🛡️ Moderador', value: `${moderator.user.tag}`, inline: false },
                            { name: '📝 Razón', value: reason, inline: false },
                            { name: '🔢 Total de Advertencias', value: `\`${modData.warns.length}\``, inline: false }
                        ]
                    });
                    await sendLog(guild, logEmbed, 'mod', 1);
                    
                    try {
                        await targetUser.send({ embeds: [createEmbed('warn', `Has sido advertido en ${guild.name}`, `**Razón:** ${reason}`)] });
                    } catch (e) {}

                    return reply({ embeds: [createEmbed('success', 'Advertencia Aplicada', `Se ha advertido a **${targetUser.tag}**.`)] });
                }

                case 'warnings': {
                    if (!targetUser) return reply({ content: 'Debes mencionar a un usuario.' });
                    const modData = await DataManager.getFile(`moderation/${guild.id}_${targetUser.id}.json`, defaultModData);
                    if (!modData.warns.length) {
                        return reply({ embeds: [createEmbed('info', `Advertencias de ${targetUser.tag}`, 'Este usuario no tiene ninguna advertencia.')] });
                    }
                    const fields = modData.warns.map((w, i) => ({
                        name: `Advertencia #${i + 1} - <t:${Math.floor(w.timestamp / 1000)}:d>`,
                        value: `**Razón:** ${w.reason}\n**Moderador:** <@${w.moderatorId}>`
                    }));
                    const embed = createEmbed('info', `Advertencias de ${targetUser.tag}`, `Total: **${modData.warns.length}**`, { fields });
                    return reply({ embeds: [embed] });
                }

                case 'ban': {
                    if (!targetUser) return reply({ content: 'Debes mencionar a un usuario.' });
                    const member = await guild.members.fetch(targetUser.id).catch(() => null);
                    if (member && !member.bannable) {
                        return reply({ embeds: [createEmbed('error', 'Acción Imposible', 'No puedo banear a este usuario.')] });
                    }

                    await guild.bans.create(targetUser.id, { reason });
                    
                    const logEmbed = createEmbed('mod', '🚫 Usuario Baneado', '', {
                        fields: [
                            { name: '👤 Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                            { name: '🛡️ Moderador', value: `${moderator.user.tag}`, inline: false },
                            { name: '📝 Razón', value: reason, inline: false }
                        ]
                    });
                    await sendLog(guild, logEmbed, 'mod', 1);

                    return reply({ embeds: [createEmbed('success', 'Usuario Baneado', `**${targetUser.tag}** ha sido baneado del servidor.`)] });
                }

                case 'kick': {
                    if (!targetUser) return reply({ content: 'Debes mencionar a un usuario.' });
                    const member = await guild.members.fetch(targetUser.id).catch(() => null);
                    if (!member) return reply({ content: 'El usuario no está en el servidor.' });
                    if (!member.kickable) return reply({ embeds: [createEmbed('error', 'Acción Imposible', 'No puedo expulsar a este usuario.')] });

                    await member.kick(reason);

                    const logEmbed = createEmbed('mod', '👢 Usuario Expulsado', '', {
                        fields: [
                            { name: '👤 Usuario', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                            { name: '🛡️ Moderador', value: `${moderator.user.tag}`, inline: false },
                            { name: '📝 Razón', value: reason, inline: false }
                        ]
                    });
                    await sendLog(guild, logEmbed, 'mod', 1);

                    return reply({ embeds: [createEmbed('success', 'Usuario Expulsado', `**${targetUser.tag}** ha sido expulsado del servidor.`)] });
                }

                case 'timeout': {
                    if (!targetUser) return reply({ content: 'Debes mencionar a un usuario.' });
                    const member = await guild.members.fetch(targetUser.id).catch(() => null);
                    if (!member) return reply({ content: 'El usuario no está en el servidor.' });
                    if (!member.moderatable) return reply({ embeds: [createEmbed('error', 'Acción Imposible', 'No puedo silenciar a este usuario.')] });

                    // Si es por prefijo, buscamos el número de minutos en los argumentos
                    const minutes = amount || (isInteraction ? interaction.options.getInteger('minutos') : 10);
                    await member.timeout(minutes * 60 * 1000, reason);

                    const logEmbed = createEmbed('mod', '🔇 Usuario Silenciado', '', {
                        fields: [
                            { name: '👤 Usuario', value: `${targetUser.tag}`, inline: false },
                            { name: '🛡️ Moderador', value: `${moderator.user.tag}`, inline: false },
                            { name: '⏳ Duración', value: `${minutes} minuto(s)`, inline: false },
                            { name: '📝 Razón', value: reason, inline: false }
                        ]
                    });
                    await sendLog(guild, logEmbed, 'mod', 1);

                    return reply({ embeds: [createEmbed('success', 'Usuario Silenciado', `**${targetUser.tag}** ha sido silenciado por **${minutes} minuto(s)**.`)] });
                }

                case 'clear': {
                    const clearAmount = amount || (isInteraction ? interaction.options.getInteger('cantidad') : 0);
                    if (clearAmount <= 0 || clearAmount > 100) return reply({ content: 'Debes especificar una cantidad entre 1 y 100.' });
                    
                    const channel = interaction.channel;
                    const messages = await channel.bulkDelete(clearAmount, true);

                    const embed = createEmbed('success', 'Mensajes Eliminados', `Se han eliminado **${messages.size}** mensajes de este canal.`);
                    const replyMsg = await reply({ embeds: [embed], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });

                    // Auto-borrar mensaje de confirmación si no es interacción
                    if (!isInteraction) setTimeout(() => replyMsg.delete().catch(() => {}), 5000);

                    const logEmbed = createEmbed('mod', '🧹 Mensajes Eliminados', '', {
                        fields: [
                            { name: '📄 Canal', value: `${channel}`, inline: false },
                            { name: '🛡️ Moderador', value: `${moderator.user.tag}`, inline: false },
                            { name: '🔢 Cantidad', value: `${messages.size}`, inline: false }
                        ]
                    });
                    return sendLog(guild, logEmbed, 'mod', 1);
                }
            }
        } catch (error) {
            console.error(`[Mod Command] Error en subcomando ${subcommand}:`, error);
            return reply({ embeds: [createEmbed('error', 'Error Inesperado', 'Ocurrió un error al procesar tu solicitud.')] });
        }
    }
};
