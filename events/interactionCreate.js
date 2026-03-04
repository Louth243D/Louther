const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const { checkCooldown } = require('../utils/cooldown.js');
const { getSongLyrics } = require('../utils/lyricsUtil.js');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    try {
      // Manejar Comandos de Chat
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          const available = Array.from(client.commands.keys()).join(', ') || 'NINGUNO';
          console.warn(`[WARN] Comando "${interaction.commandName}" no encontrado en memoria. Comandos disponibles: ${available}`);
          
          const errorEmbed = createEmbed('error', 'Comando No Encontrado', `El comando \`/${interaction.commandName}\` no está cargado en el bot.\n\n**Comandos en memoria:**\n\`${available}\``);
          return interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
        }

        // --- SISTEMA DE COOLDOWNS GLOBAL ---
        // Eximir a los Administradores de los cooldowns
        const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
        const cooldownAmount = (command.cooldown || 3) * 1000; // Por defecto 3s
        
        if (!isAdmin) {
          const remaining = checkCooldown(interaction.user.id, interaction.commandName, cooldownAmount);
          
          if (remaining) {
            const waitTime = (remaining / 1000).toFixed(1);
            const cooldownEmbed = createEmbed('warn', '⏳ ¡Espera un poco!', `Por favor, espera **${waitTime}s** antes de volver a usar \`/${interaction.commandName}\`.\n\n*Esto evita el spam y ayuda al rendimiento del bot.*`);
            return interaction.reply({ embeds: [cooldownEmbed], flags: [MessageFlags.Ephemeral] });
          }
        }

        return await command.execute(interaction);
      }

      // Manejar Botones
      if (interaction.isButton()) {
          // Manejar Cierre de Tickets
          if (interaction.customId === 'close_ticket') {
              const botMember = interaction.guild.members.me;
              if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                  return interaction.reply({ content: '❌ No tengo permiso para borrar este canal.', flags: [MessageFlags.Ephemeral] });
              }
              
              await interaction.reply({ content: '🔒 El ticket se cerrará en 5 segundos...' });
              setTimeout(() => {
                  interaction.channel.delete().catch(() => {});
              }, 5000);
              return;
          }

          // Manejar Lyrics de Música
          if (interaction.customId === 'music_lyrics') {
              await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
              
              const embed = interaction.message.embeds[0];
              const songField = embed.fields.find(f => f.name === '🎶 Canción');
              const authorField = embed.fields.find(f => f.name === '🎤 Autor');

              if (!songField || !authorField) {
                  return interaction.editReply({ content: '❌ No pude extraer la información de la canción.' });
              }

              // Limpiar el título para mejorar la búsqueda en Genius
              let cleanTitle = songField.value.replace(/`/g, '')
                  .replace(/\(.*\)|\[.*\]/g, '') // Eliminar todo lo que esté entre paréntesis o corchetes
                  .replace(/official video|music video|m\/v|mv|lyric video|video oficial/gi, '') // Eliminar etiquetas comunes de YT
                  .trim();
              
              const cleanAuthor = authorField.value.replace(/`/g, '').trim();
              
              // Si el título ya contiene al autor, no lo repetimos para no confundir a la API
              const query = cleanTitle.toLowerCase().includes(cleanAuthor.toLowerCase()) 
                  ? cleanTitle 
                  : `${cleanAuthor} ${cleanTitle}`;

              const lyricsChunks = await getSongLyrics(query, cleanAuthor);

              if (!lyricsChunks || lyricsChunks.length === 0) {
                  return interaction.editReply({ embeds: [createEmbed('warn', 'Lyrics No Encontradas', `No se encontró la letra para: **${query}**`)] });
              }

              // Enviar el primer fragmento
              await interaction.editReply({ 
                  embeds: [createEmbed('info', `📜 Letras: ${query}`, lyricsChunks[0])] 
              });

              // Si hay más fragmentos, enviarlos como followUps (MÁXIMO 2 más para evitar spam)
              if (lyricsChunks.length > 1) {
                  const maxExtraEmbeds = 2;
                  for (let i = 1; i < Math.min(lyricsChunks.length, maxExtraEmbeds + 1); i++) {
                      await interaction.followUp({ 
                          embeds: [createEmbed('info', null, lyricsChunks[i])], 
                          flags: [MessageFlags.Ephemeral] 
                      });
                  }

                  if (lyricsChunks.length > maxExtraEmbeds + 1) {
                      await interaction.followUp({ 
                          content: `*... La letra es demasiado larga. Se han mostrado los primeros fragmentos.*`,
                          flags: [MessageFlags.Ephemeral] 
                      });
                  }
              }
              return;
          }
      }

      // Manejar Menús de Selección (como el Panel de Autoroles)
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'role_select') {
          // Si no hay roles configurados aún, avisar (para que el usuario sepa qué falta)
          if (!interaction.values || interaction.values.length === 0) {
              return interaction.reply({ embeds: [createEmbed('error', 'Selección Vacía', 'No has seleccionado ningún rol.')], flags: [MessageFlags.Ephemeral] });
          }

          const botMember = interaction.guild.members.me;
          if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
              return interaction.reply({ embeds: [createEmbed('error', 'Falta Permiso', 'No tengo el permiso **Gestionar Roles** para asignarte los roles.')], flags: [MessageFlags.Ephemeral] });
          }

          // Aquí iría la lógica de asignar roles basados en los valores seleccionados.
          // Como los roles actuales en config.js son descriptivos (role_notif, etc.),
          // necesitamos buscar si el servidor tiene roles con esos nombres o IDs.
          // POR AHORA, informamos que falta configuración si no coinciden.
          
          return interaction.reply({ 
              embeds: [createEmbed('info', 'Panel en Desarrollo', 'Has seleccionado roles, pero el panel aún no tiene IDs de roles reales vinculados. Configúralos en `/config setup`.')], 
              flags: [MessageFlags.Ephemeral] 
          });
        }
      }

      // Log para interacciones no manejadas globalmente (serán manejadas por collectors locales)
      // console.log(`[DEBUG] Interacción no manejada globalmente: ${interaction.customId || 'sin customId'}`);

    } catch (err) {
      // Ignorar el error 10062 (Unknown Interaction) que ocurre cuando la interacción ya expiró o fue respondida
      if (err.code === 10062) return;

      console.error(err);
      const errorEmbed = createEmbed('error', 'Error Crítico', 'Ha ocurrido un error inesperado al ejecutar el comando.');
      
      if (interaction.deferred || interaction.replied) {
        try { await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }); } catch {}
      } else {
        try { await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] }); } catch {}
      }
    }
  }
};
