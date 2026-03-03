const { 
    SlashCommandBuilder, 
    MessageFlags, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType 
} = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📚 Explora la guía completa de comandos de Louther'),
    
  async execute(interaction, client) {
    const guildId = interaction.guild?.id;
    const isInteraction = interaction.commandName !== undefined;
    const user = isInteraction ? interaction.user : interaction.author;
    
    // Obtener configuración del servidor para el prefijo
    const config = guildId ? await DataManager.getFile(`configs/${guildId}.json`, { prefix: '!' }) : { prefix: '!' };
    const prefix = config.prefix || '!';

    const mainEmbed = createEmbed('info', 'Guía Maestra de Louther', 'Bienvenido al centro de ayuda. Aquí tienes un resumen de mis capacidades categorizadas.', {
        fields: [
            { 
                name: '⚙️ CONFIGURACIÓN (`/config`)', 
                value: '`show`, `setup_server`, `set`, `interactive`, `rules`, `view_rules`, `role_panel`, `level_rewards`', 
                inline: false 
            },
            { 
                name: '🛡️ MODERACIÓN (`/mod`)', 
                value: '`warn`, `ban`, `kick`, `timeout`, `warnings`, `clear`', 
                inline: true 
            },
            { 
                name: '💰 ECONOMÍA (`/eco`)', 
                value: '`balance`, `daily`, `weekly`, `work`, `shop`, `buy`, `inventory`, `leaderboard`, `give`', 
                inline: true 
            },
            { 
                name: '⚔️ RPG (`/rpg`)', 
                value: '`adventure`, `level`', 
                inline: true 
            },
            { 
                name: '🎮 JUEGOS (`/game`)', 
                value: '`blackjack`, `rps`', 
                inline: true 
            },
            { 
                name: '🌟 SOCIAL (`/social`)', 
                value: '`marry`, `divorce`, `love`, `rep`, `birthday`, `todaybirthdays`', 
                inline: true 
            },
            { 
                name: 'ℹ️ UTILIDAD (`/util`)', 
                value: '`ping`, `profile`, `server`, `user`, `avatar`, `roles`, `stats`, `rank`, `suggest`, `timer`, `todo`, `vote`, `banner`', 
                inline: true 
            },
            { 
                name: '🎌 INTERACCIÓN', 
                value: '`/anime` - Reacciones y acciones animadas.', 
                inline: false 
            }
        ],
        thumbnail: client.user.displayAvatarURL(),
        footer: `Prefijo: ${prefix} | Usa /comando para más detalles`
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_prefix_list')
            .setLabel('Comandos por Prefijo')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⌨️'),
        new ButtonBuilder()
            .setURL('https://top.gg/bot/' + client.user.id) // Enlace dinámico a Top.gg
            .setLabel('Votar en Top.gg')
            .setStyle(ButtonStyle.Link)
            .setEmoji('💎')
    );

    const response = isInteraction 
        ? await interaction.reply({ embeds: [mainEmbed], components: [row], withResponse: true })
        : await interaction.channel.send({ embeds: [mainEmbed], components: [row] });

    const msg = isInteraction ? (response.resource?.message || response) : response;
    
    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === user.id, 
        time: 60000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'help_prefix_list') {
            const prefixEmbed = createEmbed('info', 'Comandos por Prefijo', `Has establecido el prefijo \`${prefix}\`. Los comandos se usan de la siguiente manera:\n\n` +
                `**Ejemplos Rápidos:**\n` +
                `> \`${prefix}ping\` - Latencia del bot.\n` +
                `> \`${prefix}util profile\` - Tu perfil de usuario.\n` +
                `> \`${prefix}eco balance\` - Tu saldo bancario.\n` +
                `> \`${prefix}mod warn @usuario\` - Sistema de advertencias.\n\n` +
                `*La mayoría de comandos siguen el patrón \`${prefix}<comando> <subcomando>\`.*`, {
                footer: `Prefijo actual: ${prefix} • Louther v1.0`
            });

            const backRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Volver')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

            await i.update({ embeds: [prefixEmbed], components: [backRow] });
        }

        if (i.customId === 'help_back') {
            await i.update({ embeds: [mainEmbed], components: [row] });
        }
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
  }
};
