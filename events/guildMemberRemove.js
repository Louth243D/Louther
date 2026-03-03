const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const { sendLog } = require('../utils/logger.js');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member) {
    try {
      const logEmbed = createEmbed('error', '📤 Miembro Salido', `**${member.user.tag}** ha abandonado el servidor.`, {
          thumbnail: member.user.displayAvatarURL({ dynamic: true }),
          fields: [
              { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
              { name: '📊 Miembros Restantes', value: `\`${member.guild.memberCount}\``, inline: true }
          ]
      });
      await sendLog(member.guild, logEmbed, 'members', 2);
    } catch (err) {
      console.error('[Event] Error en guildMemberRemove:', err);
    }
  }
};
