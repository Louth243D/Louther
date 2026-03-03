const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles'),
  async execute(interaction, client, args) {
    const guildId = interaction.guild.id;
    const isInteraction = interaction.commandName !== undefined;
    
    // Obtener configuración del servidor para el prefijo
    const config = await DataManager.getFile(`configs/${guildId}.json`, { prefix: '!' });
    const prefix = config.prefix || '!';

    const mainEmbed = createEmbed('info', '📚 Guía Maestra de Louther', 'Explora las infinitas posibilidades del bot agrupadas por categorías.', {
        fields: [
            { name: '💰 Economía (`/eco`)', value: '`balance`, `daily`, `weekly`, `work`, `shop`, `buy`, `inventory`, `leaderboard`, `give`', inline: true },
            { name: '🎮 Juegos (`/game`)', value: '`blackjack`, `rps`', inline: true },
            { name: '⚔️ RPG (`/rpg`)', value: '`adventure`, `level`', inline: true },
            { name: '🛡️ Moderación (`/mod`)', value: '`warn`, `ban`, `kick`, `timeout`, `warnings`, `clear`', inline: true },
            { name: '⚙️ Configuración (`/config`)', value: '`show`, `set`, `reset`, `setup`, `rules`, `view_rules`', inline: true },
            { name: '🌟 Social (`/social`)', value: '`marry`, `divorce`, `love`, `rep`, `birthday`, `todaybirthdays`', inline: true },
            { name: 'ℹ️ Utilidad (`/util`)', value: '`ping`, `profile`, `server`, `user`, `avatar`, `roles`, `stats`, `rank`, `reminder`, `suggest`, `timer`, `todo`, `vote`, `banner`', inline: true },
            { name: '🎌 Otros', value: '`/anime` - Comandos de interacciones anime', inline: false }
        ],
        thumbnail: interaction.client.user.displayAvatarURL(),
        footer: `Prefijo en este servidor: ${prefix} | Louther v1.0`
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_prefix_list')
            .setLabel('Comandos por Prefijo')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⌨️'),
        new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('Volver')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙')
            .setDisabled(true)
    );

    const response = isInteraction 
        ? await interaction.reply({ embeds: [mainEmbed], components: [row], withResponse: true })
        : await interaction.channel.send({ embeds: [mainEmbed], components: [row] });

    const msg = isInteraction ? (response.resource?.message || response) : response;
    const collector = msg.createMessageComponentCollector({ 
        filter: i => i.user.id === (isInteraction ? interaction.user.id : interaction.author.id), 
        time: 60000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'help_prefix_list') {
            const prefixEmbed = createEmbed('info', '⌨️ Comandos por Prefijo', `Has establecido el prefijo \`${prefix}\`. Los comandos se usan así:\n\n` +
                `**Ejemplos:**\n` +
                `> \`${prefix}ping\` - Muestra la latencia del bot.\n` +
                `> \`${prefix}util profile\` - Muestra tu perfil completo.\n` +
                `> \`${prefix}eco balance\` - Consulta tu saldo actual.\n` +
                `> \`${prefix}mod warn @usuario\` - Advierte a un miembro.\n\n` +
                `*Nota: La mayoría de los comandos siguen el formato \`${prefix}<comando> <subcomando>\`.*`, {
                footer: `Prefijo actual: ${prefix} | Louther v1.0`
            });

            const newRow = ActionRowBuilder.from(row);
            newRow.components[0].setDisabled(true);
            newRow.components[1].setDisabled(false);

            await i.update({ embeds: [prefixEmbed], components: [newRow] });
        }

        if (i.customId === 'help_back') {
            const backRow = ActionRowBuilder.from(row);
            backRow.components[0].setDisabled(false);
            backRow.components[1].setDisabled(true);

            await i.update({ embeds: [mainEmbed], components: [backRow] });
        }
    });

    collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
    });
  }
};
