const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Obtén el enlace de invitación oficial de Louther'),

    async execute(interaction) {
        const clientId = '1465525868938924207';
        // Permisos calculados: Administrator (8) + otros necesarios para el flujo normal
        // Usaremos Administrator para asegurar que todas las funciones (crear canales, roles, etc) funcionen sin problemas.
        const permissions = '8';
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;

        const embed = createEmbed('info', '✨ ¡Lleva a Louther a tu Servidor!', 'Haz que tu comunidad crezca con las herramientas más potentes de gestión y automatización.', {
            fields: [
                { 
                    name: '🚀 ¿Por qué Louther?', 
                    value: '• **Gestión Profesional**: Generación de servidores completa.\n• **Niveles & Rangos**: Sistema de XP con recompensas automáticas.\n• **Seguridad Staff**: Roles de moderación configurables.\n• **Utilidades**: Perfiles personalizados, recordatorios y más.',
                    inline: false 
                },
                {
                    name: '🛡️ Permisos Requeridos',
                    value: 'Se recomienda otorgar permisos de **Administrador** para que Louther pueda gestionar canales, roles y mensajes sin restricciones.',
                    inline: false
                }
            ],
            thumbnail: interaction.client.user.displayAvatarURL({ dynamic: true }),
            image: 'https://miro.medium.com/v2/resize:fit:720/format:webp/1*UbsW0kUUpNIDjrYDqnYHJw.gif' // Opcional: puedes añadir un banner si tienes uno
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Invitar a Louther')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
                .setEmoji('🔗'),
            new ButtonBuilder()
                .setLabel('Servidor de Soporte')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/hBpw68VZFT') // Reemplaza con tu servidor si tienes uno
                .setEmoji('🛡️')
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
