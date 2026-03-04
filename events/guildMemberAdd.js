const { Events, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const { sendLog } = require('../utils/logger.js');
const { generateWelcomeImage } = require('../utils/imageGenerator.js');

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

          // Generar Imagen de Bienvenida
          const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
          
          let welcomeBuffer;
          let hasImageError = false;

          try {
            // Intentar generar con el fondo configurado
            welcomeBuffer = await generateWelcomeImage(
              avatarUrl, 
              member.user.username, 
              member.user.discriminator,
              member.guild.name, 
              config.welcomeBackground,
              config.welcomeBannerText
            );

            // Verificación simple: si se configuró fondo pero loadImage falló (esto requeriría cambiar imageGenerator)
            // Por ahora, si config.welcomeBackground existe y falla, lo manejamos.
          } catch (err) {
            hasImageError = true;
            // Fallback a imagen sin fondo (gradiente)
            welcomeBuffer = await generateWelcomeImage(
              avatarUrl, 
              member.user.username, 
              member.user.discriminator,
              member.guild.name, 
              null,
              config.welcomeBannerText
            );
          }

          const attachment = new AttachmentBuilder(welcomeBuffer, { name: 'welcome.png' });

          const userTag = member.user.discriminator !== '0' ? `${member.user.username}#${member.user.discriminator}` : member.user.username;

          const welcomeEmbed = createEmbed('info', `¡BIENVENIDO, ${userTag.toUpperCase()}!`, finalMsg, {
            thumbnail: member.user.displayAvatarURL({ dynamic: true }),
            footer: `Tú eres el miembro #${member.guild.memberCount}`,
            image: 'attachment://welcome.png'
          });

          await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [welcomeEmbed], files: [attachment] });

          // Si hubo error con la imagen personalizada, avisar
          if (hasImageError && config.welcomeBackground) {
              const errorEmbed = createEmbed('warn', '⚠️ Error de Configuración', 
                  'La imagen de fondo de bienvenida no se pudo cargar.\n\n' +
                  '**Posibles causas:**\n' +
                  '• El enlace no es una imagen directa (debe terminar en .jpg, .png, etc)\n' +
                  '• El enlace es privado o ha expirado.\n\n' +
                  '**Solución:** Usa `/config quick_edit clave:welcomeBackground valor:URL_DIRECTA`');
              await welcomeChannel.send({ embeds: [errorEmbed] });
          }
        }
      }

    } catch (err) {
      console.error('[Event] Error en guildMemberAdd:', err);
    }
  }
};
