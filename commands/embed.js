const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea un mensaje embed personalizado y moderno')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(o => o.setName('titulo').setDescription('Título del embed').setRequired(true))
        .addStringOption(o => o.setName('descripcion').setDescription('Contenido del mensaje (usa \\n para saltos de línea)').setRequired(true))
        .addStringOption(o => o.setName('url').setDescription('URL para el título (hace clicable el título)'))
        .addStringOption(o => o.setName('color').setDescription('Color en HEX (ej: #FF0000)'))
        .addStringOption(o => o.setName('imagen').setDescription('URL de una imagen grande'))
        .addStringOption(o => o.setName('miniatura').setDescription('URL de una imagen pequeña (esquina)'))
        .addStringOption(o => o.setName('autor_nombre').setDescription('Nombre del autor (arriba del título)'))
        .addStringOption(o => o.setName('autor_icono').setDescription('URL del icono del autor'))
        .addStringOption(o => o.setName('autor_url').setDescription('URL para el nombre del autor'))
        .addStringOption(o => o.setName('footer').setDescription('Texto al pie del mensaje'))
        .addStringOption(o => o.setName('footer_icono').setDescription('URL del icono del pie de página'))
        .addStringOption(o => o.setName('timestamp').setDescription('¿Añadir hora actual?').addChoices({ name: 'Sí', value: 'yes' }, { name: 'No', value: 'no' }))
        .addStringOption(o => o.setName('botones').setDescription('Formato: Texto,URL_o_ID;Texto,URL_o_ID (ej: Google,https://google.com;Click,mi_id)'))
        .addStringOption(o => o.setName('campos').setDescription('Formato: Titulo,Valor,true/false;... (ej: Info,Hola,true)')),

    async execute(interaction, client, args, context = {}) {
        const isInteraction = interaction.commandName !== undefined;
        
        let title, titleUrl, description, color, image, thumbnail, footer, footerIcon, hasTimestamp, buttonsStr, fieldsStr, authorName, authorIcon, authorUrl;

        if (isInteraction) {
            title = interaction.options.getString('titulo');
            titleUrl = interaction.options.getString('url');
            description = interaction.options.getString('descripcion').replace(/\\n/g, '\n');
            color = interaction.options.getString('color') || '#5865F2';
            image = interaction.options.getString('imagen');
            thumbnail = interaction.options.getString('miniatura');
            authorName = interaction.options.getString('autor_nombre');
            authorIcon = interaction.options.getString('autor_icono');
            authorUrl = interaction.options.getString('autor_url');
            footer = interaction.options.getString('footer');
            footerIcon = interaction.options.getString('footer_icono');
            hasTimestamp = interaction.options.getString('timestamp') === 'yes';
            buttonsStr = interaction.options.getString('botones');
            fieldsStr = interaction.options.getString('campos');
        } else {
            // --- Soporte por Prefijo Inteligente ---
            // Formato alineado con los Slash Commands para evitar confusión
            // !embed Titulo | URL_Titulo | Desc | Color | Imagen | Miniatura | AutorNombre | AutorIcono | AutorURL | Footer | FooterIcono
            const parts = context.fullContent.split('|').map(p => p.trim());
            if (parts.length < 2) {
                return interaction.reply({ 
                    content: '❌ Uso incorrecto.\n' +
                             '**Formato:** `!embed Titulo | [URL_Titulo] | Descripcion | [Color] | [Imagen] | [Miniatura] | [Autor] | ...`' 
                });
            }
            title = parts[0];
            titleUrl = parts[1];
            description = parts[2] ? parts[2].replace(/\\n/g, '\n') : 'Sin descripción';
            color = parts[3];
            image = parts[4];
            thumbnail = parts[5];
            authorName = parts[6];
            authorIcon = parts[7];
            authorUrl = parts[8];
            footer = parts[9];
            footerIcon = parts[10];
            hasTimestamp = true;
            // Botones y campos se dejan para Slash por complejidad, o se pueden añadir al final si es necesario
        }

        // Validaciones de Color
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (color && !hexRegex.test(color)) color = '#5865F2';
        
        // Validación de URLs (Mejorada)
        const validateUrl = (url) => (url && url.length > 5 && url.startsWith('http')) ? url : null;
        
        image = validateUrl(image);
        thumbnail = validateUrl(thumbnail);
        titleUrl = validateUrl(titleUrl);
        authorIcon = validateUrl(authorIcon);
        authorUrl = validateUrl(authorUrl);
        footerIcon = validateUrl(footerIcon);

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color || '#5865F2');

        if (titleUrl) embed.setURL(titleUrl);
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);
        
        // --- Corrección del Autor ---
        if (authorName && authorName.length > 0) {
            const authorData = { name: authorName };
            if (authorIcon) authorData.iconURL = authorIcon;
            if (authorUrl) authorData.url = authorUrl;
            embed.setAuthor(authorData);
        }

        if (footer && footer.length > 0) {
            const footerData = { text: footer };
            if (footerIcon) footerData.iconURL = footerIcon;
            embed.setFooter(footerData);
        }
        
        if (hasTimestamp) embed.setTimestamp();

        // Procesar Campos
        if (fieldsStr) {
            const fields = fieldsStr.split(';').map(f => {
                const [name, value, inline] = f.split(',');
                if (name && value) {
                    return { name, value, inline: inline === 'true' };
                }
                return null;
            }).filter(f => f);
            if (fields.length > 0) embed.addFields(fields);
        }

        // Procesar Botones
        let row = null;
        if (buttonsStr) {
            const buttons = buttonsStr.split(';').map(b => {
                const [label, urlOrId] = b.split(',');
                if (!label || !urlOrId) return null;
                if (urlOrId.startsWith('http')) {
                    return new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(urlOrId);
                } else {
                    return new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Primary).setCustomId(urlOrId);
                }
            }).filter(b => b);
            if (buttons.length > 0) row = new ActionRowBuilder().addComponents(buttons);
        }

        try {
            const messagePayload = { embeds: [embed] };
            if (row) messagePayload.components = [row];

            if (isInteraction) {
                await interaction.reply({ content: '✅ ¡Embed enviado con éxito!', flags: [MessageFlags.Ephemeral] });
                return interaction.channel.send(messagePayload);
            } else {
                await interaction.delete().catch(() => {});
                return interaction.channel.send(messagePayload);
            }
        } catch (error) {
            console.error('[Embed Command] Error:', error);
            const errReply = { content: '❌ Hubo un error al crear el embed. Verifica los formatos.', flags: [MessageFlags.Ephemeral] };
            return isInteraction ? interaction.reply(errReply) : interaction.channel.send(errReply);
        }
    }
};
