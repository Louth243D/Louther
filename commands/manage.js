const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Comandos de gestión de comunidad y servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub => 
            sub.setName('announcement').setDescription('Crea un anuncio formal')
                .addStringOption(o => o.setName('titulo').setDescription('Título del anuncio').setRequired(true))
                .addStringOption(o => o.setName('mensaje').setDescription('Contenido del anuncio').setRequired(true))
                .addBooleanOption(o => o.setName('ping').setDescription('¿Mencionar a todos?')))
        .addSubcommand(sub => 
            sub.setName('event').setDescription('Crea un evento en el servidor')
                .addStringOption(o => o.setName('nombre').setDescription('Nombre del evento').setRequired(true))
                .addStringOption(o => o.setName('descripcion').setDescription('Descripción del evento').setRequired(true))
                .addStringOption(o => o.setName('fecha').setDescription('Fecha y hora (ej: Mañana a las 20:00)').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('giveaway').setDescription('Crea un sorteo rápido')
                .addStringOption(o => o.setName('premio').setDescription('¿Qué se sortea?').setRequired(true))
                .addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('poll').setDescription('Crea una encuesta rápida')
                .addStringOption(o => o.setName('pregunta').setDescription('La pregunta de la encuesta').setRequired(true))
                .addStringOption(o => o.setName('opciones').setDescription('Opciones separadas por comas').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('ticket').setDescription('Abre un ticket de soporte')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const botMember = guild.members.me;

        switch (subcommand) {
            case 'announcement':
                if (!botMember.permissionsIn(interaction.channel).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Falta Permiso', 'No tengo permiso para enviar mensajes con embeds en este canal.')], flags: [MessageFlags.Ephemeral] });
                }
                const titulo = interaction.options.getString('titulo');
                const mensaje = interaction.options.getString('mensaje');
                const ping = interaction.options.getBoolean('ping');
                const aEmbed = createEmbed('info', `📢 ANUNCIO: ${titulo}`, mensaje, { footer: `Anuncio por ${interaction.user.username}`, thumbnail: guild.iconURL({ dynamic: true }) });
                
                try {
                    await interaction.reply({ content: '✅ Anuncio enviado.', flags: [MessageFlags.Ephemeral] });
                    return await interaction.channel.send({ content: ping ? '@everyone' : null, embeds: [aEmbed] });
                } catch (err) {
                    return interaction.followUp({ content: '❌ Error al enviar el anuncio.', flags: [MessageFlags.Ephemeral] });
                }

            case 'event':
                if (!botMember.permissionsIn(interaction.channel).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions])) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Falta Permiso', 'Necesito permisos para enviar mensajes, embeds y añadir reacciones.')], flags: [MessageFlags.Ephemeral] });
                }
                const eNombre = interaction.options.getString('nombre');
                const eDesc = interaction.options.getString('descripcion');
                const eFecha = interaction.options.getString('fecha');
                const eEmbed = createEmbed('info', `📅 EVENTO: ${eNombre}`, eDesc, { fields: [{ name: '🕒 Fecha y Hora', value: `\`${eFecha}\``, inline: true }], thumbnail: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png', footer: `Organizado por ${interaction.user.username}` });
                
                try {
                    await interaction.reply({ content: '✅ Evento publicado.', flags: [MessageFlags.Ephemeral] });
                    const eMsg = await interaction.channel.send({ embeds: [eEmbed] });
                    await eMsg.react('✅'); 
                    await eMsg.react('❓');
                } catch (err) {
                    return interaction.followUp({ content: '❌ Error al publicar el evento.', flags: [MessageFlags.Ephemeral] });
                }
                break;

            case 'giveaway':
                const gPremio = interaction.options.getString('premio');
                const gMins = interaction.options.getInteger('minutos');
                const gEnd = Date.now() + (gMins * 60 * 1000);
                const gParticipants = new Set();
                
                const gEmbed = createEmbed('economy', '🎉 ¡NUEVO SORTEO!', `¡Participa ahora para ganar **${gPremio}**!`, { 
                    fields: [
                        { name: '🎁 Premio', value: `\`${gPremio}\``, inline: true }, 
                        { name: '⏱️ Finaliza', value: `<t:${Math.floor(gEnd / 1000)}:R>`, inline: true }, 
                        { name: '👥 Participantes', value: `\`0\``, inline: true }
                    ], 
                    footer: 'Haz clic en el botón para participar' 
                });
                
                const gRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join_giveaway').setLabel('Participar').setStyle(ButtonStyle.Primary).setEmoji('🎉')
                );
                
                const gRes = await interaction.reply({ embeds: [gEmbed], components: [gRow], withResponse: true });
                const gResponseMsg = gRes.resource?.message || gRes;
                const gColl = gResponseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: gMins * 60 * 1000 });
                
                gColl.on('collect', async i => {
                    if (gParticipants.has(i.user.id)) {
                        return i.reply({ content: '❌ Ya estás participando en este sorteo.', flags: [MessageFlags.Ephemeral] });
                    }
                    gParticipants.add(i.user.id);
                    const uE = createEmbed('economy', '🎉 ¡NUEVO SORTEO!', `¡Participa ahora para ganar **${gPremio}**!`, { 
                        fields: [
                            { name: '🎁 Premio', value: `\`${gPremio}\``, inline: true }, 
                            { name: '⏱️ Finaliza', value: `<t:${Math.floor(gEnd / 1000)}:R>`, inline: true }, 
                            { name: '👥 Participantes', value: `\`${gParticipants.size}\``, inline: true }
                        ] 
                    });
                    await i.update({ embeds: [uE] });
                });
                
                gColl.on('end', async () => {
                    const winnerId = gParticipants.size > 0 ? Array.from(gParticipants)[Math.floor(Math.random() * gParticipants.size)] : null;
                    const fE = createEmbed('economy', '🎊 Sorteo Finalizado 🎊', `El sorteo por **${gPremio}** ha terminado.`, { 
                        fields: [
                            { name: '🏆 Ganador/a', value: winnerId ? `<@${winnerId}>` : 'Nadie participó 😢', inline: false }
                        ] 
                    });
                    await interaction.editReply({ embeds: [fE], components: [] });
                    if (winnerId) {
                        await interaction.channel.send({ content: `¡Felicidades <@${winnerId}>! Has ganado **${gPremio}**. 🎊` }).catch(() => {});
                    }
                });
                break;

            case 'poll':
                if (!botMember.permissionsIn(interaction.channel).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions])) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Falta Permiso', 'Necesito permisos para enviar mensajes, embeds y añadir reacciones.')], flags: [MessageFlags.Ephemeral] });
                }
                const pPreg = interaction.options.getString('pregunta');
                const pOpc = interaction.options.getString('opciones').split(',').map(o => o.trim()).filter(o => o.length > 0).slice(0, 10);
                
                if (pOpc.length < 2) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Opciones Insuficientes', 'La encuesta debe tener al menos 2 opciones válidas.')], flags: [MessageFlags.Ephemeral] });
                }
                
                const pEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                let pDesc = ''; 
                pOpc.forEach((o, i) => { pDesc += `${pEmojis[i]} ${o}\n\n`; });
                
                const pEmbed = createEmbed('info', `📊 Encuesta: ${pPreg}`, pDesc, { footer: `Por ${interaction.user.username}`, thumbnail: guild.iconURL({ dynamic: true }) });
                
                try {
                    const pRes = await interaction.reply({ embeds: [pEmbed], withResponse: true });
                    const pMsg = pRes.resource?.message || pRes;
                    for (let i = 0; i < pOpc.length; i++) {
                        await pMsg.react(pEmojis[i]).catch(() => {});
                    }
                } catch (err) {
                    return interaction.followUp({ content: '❌ Error al crear la encuesta.', flags: [MessageFlags.Ephemeral] });
                }
                break;

            case 'ticket':
                if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Falta Permiso', 'No tengo el permiso **Gestionar Canales** para crear tickets.')], flags: [MessageFlags.Ephemeral] });
                }
                
                try {
                    const tName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    const tChan = await guild.channels.create({ 
                        name: tName, 
                        type: ChannelType.GuildText, 
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, 
                            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
                            { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
                        ] 
                    });
                    
                    const tEmbed = createEmbed('info', '🎫 Nuevo Ticket', `Hola <@${interaction.user.id}>, gracias por abrir un ticket. Describe tu problema detalladamente para que el staff pueda ayudarte.`, { footer: 'Usa los botones de abajo para gestionar el ticket.' });
                    const tRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('close_ticket').setLabel('Cerrar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                    );
                    
                    await tChan.send({ content: `<@${interaction.user.id}>`, embeds: [tEmbed], components: [tRow] });
                    return interaction.reply({ embeds: [createEmbed('success', 'Ticket Creado', `Tu ticket ha sido abierto en <#${tChan.id}>.`) ], flags: [MessageFlags.Ephemeral] });
                } catch (err) {
                    console.error('Error al crear ticket:', err);
                    return interaction.reply({ embeds: [createEmbed('error', 'Error', 'No se pudo crear el canal del ticket. Revisa mis permisos.')], flags: [MessageFlags.Ephemeral] });
                }
        }
    }
};


