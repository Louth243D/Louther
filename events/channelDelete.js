const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const { sendLog } = require('../utils/logger.js');

module.exports = {
  name: Events.ChannelDelete,
  once: false,
  async execute(channel) {
    if (!channel.guild) return;
    try {
      const logEmbed = createEmbed('error', '🗑️ Canal Borrado', `Se ha eliminado el canal: **${channel.name}**`, {
          fields: [
              { name: '📂 Tipo', value: `\`${channel.type === 0 ? 'Texto' : 'Otro'}\``, inline: true },
              { name: '🆔 ID', value: `\`${channel.id}\``, inline: true }
          ]
      });
      await sendLog(channel.guild, logEmbed, 'channels', 3);
    } catch (err) {
      console.error('[Event] Error en channelDelete:', err);
    }
  }
};
