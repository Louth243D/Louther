const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const { sendLog } = require('../utils/logger.js');

module.exports = {
  name: Events.ChannelCreate,
  once: false,
  async execute(channel) {
    if (!channel.guild) return;
    try {
      const typeNames = { 0: 'Texto', 2: 'Voz', 4: 'Categoría', 5: 'Anuncios', 13: 'Escenario', 15: 'Foro' };
      const type = typeNames[channel.type] || 'Desconocido';

      const logEmbed = createEmbed('info', '🆕 Canal Creado', `Se ha creado un nuevo canal: **${channel.name}**`, {
          fields: [
              { name: '📂 Tipo', value: `\`${type}\``, inline: true },
              { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
              { name: '🔗 Mención', value: `<#${channel.id}>`, inline: true }
          ]
      });
      await sendLog(channel.guild, logEmbed, 'channels', 3);
    } catch (err) {
      console.error('[Event] Error en channelCreate:', err);
    }
  }
};
