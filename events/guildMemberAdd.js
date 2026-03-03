const { Events, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const { sendLog } = require('../utils/logger.js');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    try {
      const guildId = member.guild.id;
      const config = await DataManager.getFile(`configs/${guildId}.json`, { autoRoleId: null, welcomeMessage: null });
      const botMember = member.guild.members.me;

      // 1. Asignar Rol Automático
      if (config.autoRoleId) {
        try {
          const role = await member.guild.roles.fetch(config.autoRoleId).catch(() => null);
          if (role && botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            if (role.comparePositionTo(botMember.roles.highest) < 0) {
              await member.roles.add(role);
            }
          }
        } catch (err) {
          console.error(`[Autorole] Error en ${member.guild.name}:`, err.message);
        }
      }

      // 2. Log de Entrada (Informativo)
      const logEmbed = createEmbed('success', '📥 Miembro Unido', `**${member.user.tag}** se ha unido al servidor.`, {
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
          fields: [
              { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
              { name: '📅 Cuenta Creada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
              { name: '📊 Miembros', value: `\`${member.guild.memberCount}\``, inline: true }
          ]
      });
      await sendLog(member.guild, logEmbed, 'members', 2);

      // 3. Mensaje de Bienvenida Personalizado
      if (config.welcomeChannelId) {
        const welcomeChannel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
        if (welcomeChannel && welcomeChannel.isTextBased()) {
          const rawMsg = config.welcomeMessage || '¡Bienvenido/a {user} a {server}!';
          const finalMsg = rawMsg
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount);

          const welcomeEmbed = createEmbed('info', `¡BIENVENIDO, ${member.user.username.toUpperCase()}!`, finalMsg, {
            thumbnail: member.user.displayAvatarURL({ dynamic: true }),
            footer: `Tú eres el miembro #${member.guild.memberCount}`,
            image: member.guild.bannerURL({ size: 1024 }) || 'https://i.imgur.com/vA7unZ2.png'
          });

          await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [welcomeEmbed] });
        }
      }

    } catch (err) {
      console.error('[Event] Error en guildMemberAdd:', err);
    }
  }
};
