const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const { sendLog } = require('../utils/logger.js');

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message) {
    // Si el mensaje no está en caché o es de un bot, no hacemos nada.
    if (!message || !message.author || message.author.bot) return;
    try {
      const content = message.content ? (message.content.length > 1000 ? message.content.substring(0, 997) + '...' : message.content) : '*Sin contenido de texto*';
      
      const logEmbed = createEmbed('error', '🗑️ Mensaje Borrado', `Un mensaje de <@${message.author.id}> fue eliminado en <#${message.channelId}>.`, {
          fields: [
              { name: '👤 Autor', value: `**${message.author.tag}** (\`${message.author.id}\`)`, inline: false },
              { name: '📝 Contenido', value: `\`\`\`${content}\`\`\``, inline: false }
          ]
      });
      
      if (message.attachments.size > 0) {
          logEmbed.addFields({ name: '📎 Archivos', value: `\`${message.attachments.size}\` archivo(s) adjunto(s).`, inline: true });
      }

      await sendLog(message.guild, logEmbed, 'messages', 3);
    } catch (err) {
      console.error('[Event] Error en messageDelete:', err);
    }
  }
};
