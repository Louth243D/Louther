const { Events, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const { checkCooldown } = require('../utils/cooldown.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    
    // --- 1. Obtener Configuración y Datos de Usuario (Asíncrono) ---
    const [config, data] = await Promise.all([
        DataManager.getFile(`configs/${guildId}.json`, { prefix: '!' }),
        DataManager.getFile(`users/${guildId}_${userId}.json`, { messages: 0, level: 0 })
    ]);

    const prefix = config.prefix || '!';

    // --- 2. Manejo de Comandos por Prefijo ---
    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // 1. Buscar comando directo
        let command = client.commands.get(commandName);
        let finalArgs = args;
        let finalCommandName = commandName;

        // 2. Si no existe, buscar si es un subcomando de un grupo principal
        if (!command) {
            const groups = ['util', 'eco', 'mod', 'rpg', 'social', 'game', 'config'];
            for (const group of groups) {
                const groupCmd = client.commands.get(group);
                if (groupCmd && groupCmd.data.options.some(opt => opt.name === commandName)) {
                    command = groupCmd;
                    finalArgs = [commandName, ...args]; // Insertamos el subcomando como primer argumento
                    break;
                }
            }
        }

        if (command) {
            try {
                // --- Procesador de Argumentos Mejorado ---
                // Extraemos menciones, números y strings de forma limpia
                const mentionedUser = message.mentions.users.first();
                const amount = args.find(a => !isNaN(a) && a.trim() !== '') ? parseInt(args.find(a => !isNaN(a))) : null;
                
                // Creamos un objeto de "contexto" para facilitar la vida a los comandos
                const context = {
                    isInteraction: false,
                    args: finalArgs,
                    user: mentionedUser || message.author,
                    amount: amount,
                    fullContent: args.join(' ')
                };

                await command.execute(message, client, finalArgs, context);
            } catch (error) {
                console.error(`Error ejecutando comando por prefijo ${commandName}:`, error);
                const errorEmbed = createEmbed('error', 'Error de Ejecución', `Hubo un error al intentar ejecutar el comando \`${commandName}\`.`);
                message.reply({ embeds: [errorEmbed] }).catch(() => {});
            }
            return;
        }
    }

    // --- 3. Sistema de Auto-Moderación básica (Anti-Spam) ---
    const spamCooldown = checkCooldown(userId, 'spam_check', 1000); // 1 mensaje por segundo
    if (spamCooldown) {
        // Podrías opcionalmente borrar el mensaje o avisar en logs
        // Por ahora, solo evitamos que gane XP
        return;
    }

    // --- 4. Sistema de Niveles (Si no es un comando) ---
    data.messages += 1;

    // Subir nivel cada 20 mensajes
    const currentLevel = data.level || 0;
    const newLevel = Math.floor(data.messages / 20);

    if (newLevel > currentLevel) {
      data.level = newLevel;
      
      let rewardText = "";
      // Asignar rol de recompensa si existe
      if (config.levelRewards && config.levelRewards[newLevel]) {
          const rewardRoleId = config.levelRewards[newLevel];
          try {
              const role = await message.guild.roles.fetch(rewardRoleId).catch(() => null);
              const botMember = message.guild.members.me;
              
              if (role && botMember.permissions.has(PermissionFlagsBits.ManageRoles) && role.comparePositionTo(botMember.roles.highest) < 0) {
                  await message.member.roles.add(role).catch(() => {});
                  rewardText = `\n\n🎁 **¡Recompensa Desbloqueada!**\nHas recibido el rol <@&${rewardRoleId}>.`;
              }
          } catch (e) {
              console.error(`[Niveles] Error asignando rol en ${message.guild.name}:`, e.message);
          }
      }

      const levelEmbed = createEmbed('success', '¡Subida de Nivel!', `¡Felicidades **${message.author.username}**! Has alcanzado un nuevo nivel.${rewardText}`, {
          fields: [
              { name: '⭐ Nuevo Nivel', value: `\`${newLevel}\``, inline: true },
              { name: '💬 Mensajes Totales', value: `\`${data.messages}\``, inline: true }
          ],
          thumbnail: message.author.displayAvatarURL({ dynamic: true })
      });

      message.channel.send({ embeds: [levelEmbed] }).catch(() => {});
    }

    // Guardar datos actualizados
    await DataManager.saveFile(`users/${guildId}_${userId}.json`, data);
  }
};
