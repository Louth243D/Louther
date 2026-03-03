const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-example')
        .setDescription('La Obra Maestra: Un embed con TODAS las funciones posibles.'),

    async execute(interaction) {
        const exampleEmbed = new EmbedBuilder()
            // 1. COLOR PERSONALIZADO
            .setColor('#00FFFF') 
            
            // 2. TÍTULO CON ENLACE
            .setTitle('🚀 ¡BIENVENIDOS A LA OBRA MAESTRA!')
            .setURL('https://discord.js.org/')
            
            // 3. AUTOR (Para darle un toque premium)
            .setAuthor({ 
                name: `Creado por ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL(),
                url: 'https://discord.com' 
            })
            
            // 4. MINIATURA
            .setThumbnail(interaction.client.user.displayAvatarURL())
            
            // 5. DESCRIPCIÓN CON PÁRRAFOS Y FORMATO
            .setDescription(
                '### ✨ Un Mensaje Profesional ✨\n' +
                'Este es un ejemplo de cómo Louther puede transformar un simple texto en una experiencia visual completa.\n\n' +
                '**Párrafos:** Gracias al uso de `\\n`, podemos separar ideas y hacer que la lectura sea mucho más cómoda para tus usuarios.\n\n' +
                '**Formato:** Podemos usar **negritas**, *itálicas*, __subrayados__ e incluso bloques de código para resaltar información importante.'
            )
            
            // 6. CAMPOS (Fields) ORGANIZADOS
            .addFields(
                { name: '📊 Estadísticas', value: '1,240 Miembros', inline: true },
                { name: '🟢 Estado', value: 'Online', inline: true },
                { name: '📅 Fecha', value: '<t:1772490000:d>', inline: true },
                { name: '📝 Nota Importante', value: 'Este embed usa todos los parámetros disponibles en el comando `/embed`.', inline: false }
            )
            
            // 7. IMAGEN GRANDE (La que proporcionaste)
            .setImage('https://media.discordapp.net/attachments/1470968215403233372/1476020855808196608/image.png?ex=69a6db4b&is=69a589cb&hm=e3fbe10f73182dbaf034b187ed5de8312f8d37953cf253f50f668fc51940b5c4&=&format=webp&quality=lossless&width=1056&height=663')
            
            // 8. FOOTER (Pie de página)
            .setFooter({ 
                text: 'Sistema de Comunicación Louther • v1.0', 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            
            // 9. TIMESTAMP (Hora actual)
            .setTimestamp();

        // 10. BOTONES DE TODO TIPO
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Documentación')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.js.org'),
                new ButtonBuilder()
                    .setCustomId('demo_success')
                    .setLabel('Aceptar')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('demo_danger')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('demo_primary')
                    .setLabel('Info')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('ℹ️')
            );

        const response = await interaction.reply({ 
            embeds: [exampleEmbed], 
            components: [row] 
        });

        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            const responses = {
                'demo_success': '✅ ¡Has aceptado los términos!',
                'demo_danger': '🗑️ Acción cancelada correctamente.',
                'demo_primary': 'ℹ️ Aquí tienes más información sobre el sistema.'
            };
            
            if (responses[i.customId]) {
                await i.reply({ content: responses[i.customId], flags: [MessageFlags.Ephemeral] });
            }
        });

        collector.on('end', () => {
            const disabledRow = ActionRowBuilder.from(row);
            disabledRow.components.forEach(c => c.setDisabled(true));
            response.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
