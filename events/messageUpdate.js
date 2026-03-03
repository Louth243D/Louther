const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const { sendLog } = require('../utils/logger.js');

module.exports = {
  name: Events.MessageUpdate,
  once: false,
  async execute(oldMessage, newMessage) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // Ignorar cambios que no afecten al contenido (como embebidos automáticos)

    try {
      const oldContent = oldMessage.content ? (oldMessage.content.length > 500 ? oldMessage.content.substring(0, 497) + '...' : oldMessage.content) : '*Sin contenido previo*';
      const newContent = newMessage.content ? (newMessage.content.length > 500 ? newMessage.content.substring(0, 497) + '...' : newMessage.content) : '*Sin contenido nuevo*';

      const logEmbed = createEmbed('info', '✏️ Mensaje Editado', `Un mensaje de <@${oldMessage.author.id}> fue editado en <#${oldMessage.channelId}>. [Ver Mensaje](${newMessage.url})`, {
          fields: [
              { name: '👤 Autor', value: `**${oldMessage.author.tag}** (\`${oldMessage.author.id}\`)`, inline: false },
              { name: '📝 Antes', value: `\`\`\`${oldContent}\`\`\``, inline: false },
              { name: '📝 Después', value: `\`\`\`${newContent}\`\`\``, inline: false }
          ]
      });

      await sendLog(oldMessage.guild, logEmbed, 'messages', 3);
    } catch (err) {
      console.error('[Event] Error en messageUpdate:', err);
    }
  }
};
