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
    const botClient = interaction.client;
    
    // Obtener configuración del servidor para el prefijo
    const config = guildId ? await DataManager.getFile(`configs/${guildId}.json`, { prefix: '!' }) : { prefix: '!' };
    const prefix = config.prefix || '!';

    // Organizar comandos por categoría dinámicamente
    const categories = {};
    botClient.commands.forEach(cmd => {
        if (cmd.data.name === 'help') return; // Omitir el propio comando help
        
        const category = cmd.category || '❓ OTROS';
        if (!categories[category]) categories[category] = [];
        
        // Obtener subcomandos si existen
        const subcommands = cmd.data.options
            .filter(opt => opt.constructor.name === 'SlashCommandSubcommandBuilder' || opt.type === 1)
            .map(sub => sub.name);

        if (subcommands.length > 0) {
            categories[category].push(`\`/${cmd.data.name}\` (${subcommands.map(s => `\`${s}\``).join(', ')})`);
        } else {
            categories[category].push(`\`/${cmd.data.name}\``);
        }
    });

    const fields = Object.keys(categories).sort().map(cat => ({
        name: cat,
        value: categories[cat].join('\n'),
        inline: false
    }));

    const mainEmbed = createEmbed('info', 'Guía Maestra de Louther', 'Aquí tienes todos mis comandos disponibles, organizados por categoría y detectados automáticamente.', {
        fields: fields,
        thumbnail: botClient.user.displayAvatarURL(),
        footer: `Prefijo: ${prefix} | Usa /comando para más detalles`
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_prefix_list')
            .setLabel('Comandos por Prefijo')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⌨️'),
        new ButtonBuilder()
            .setURL('https://top.gg/bot/' + botClient.user.id)
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
            const prefixEmbed = createEmbed('info', 'Comandos por Prefijo', `Has establecido el prefijo \`${prefix}\`. Los comandos se usan así:\n\n` +
                `**Ejemplos:**\n` +
                `> \`${prefix}ping\` - Latencia del bot.\n` +
                `> \`${prefix}util profile\` - Tu perfil.\n\n` +
                `*La lista se sincroniza con los comandos de barra cargados.*`, {
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
