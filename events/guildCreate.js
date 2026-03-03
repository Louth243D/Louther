const { Events } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');

module.exports = {
    name: Events.GuildCreate,
    once: false,
    async execute(guild) {
        // --- Registro de Comandos en el Servidor ---
        try {
            if (guild.client.commandData && guild.client.commandData.length > 0) {
                await guild.commands.set(guild.client.commandData);
                console.log(`- Comandos registrados correctamente en: ${guild.name} (al unirse)`);
            }
        } catch (err) {
            console.error(`- Error registrando comandos en ${guild.name} (${guild.id}):`, err.message);
        }

        // --- Mensaje al Dueño del Servidor ---
        try {
            const owner = await guild.fetchOwner();
            if (owner) {
                const ownerEmbed = createEmbed('success', `¡Gracias por añadir a Louther a ${guild.name}!`, 'Estoy listo para ayudarte a llevar tu comunidad al siguiente nivel. Aquí tienes unos pasos para empezar:', {
                    fields: [
                        { name: '1️⃣ Configuración Rápida', value: 'Usa el comando `/config setup` en tu servidor para abrir el panel de control y ajustar las funciones básicas.' },
                        { name: '2️⃣ Lista de Comandos', value: 'Escribe `/help` para ver todas las categorías de comandos que ofrezco.' },
                        { name: '3️⃣ Soporte y Comunidad', value: 'Si necesitas ayuda, únete a nuestro [servidor de soporte](https://discord.gg/louther).' } // Reemplaza con tu link
                    ],
                    image: '' // <-- ESPACIO PARA TU GIF
                });
                await owner.send({ embeds: [ownerEmbed] });
            }
        } catch (err) {
            console.error('Error enviando mensaje al dueño:', err);
        }

        // --- Mensaje de Bienvenida en el Servidor ---
        let targetChannel = guild.systemChannel;
        if (!targetChannel) {
            targetChannel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
        }

        if (targetChannel) {
            const serverEmbed = createEmbed('info', '👋 ¡Hola a todos!', `Gracias por invitarme a **${guild.name}**. Soy Louther, un bot multifunción diseñado para la gestión profesional de comunidades.`, {
                fields: [
                    { name: '🚀 Funciones Principales', value: '• Generador de Servidores\n• Sistema de Niveles y Rangos\n• Moderación Avanzada\n• Perfiles de Usuario' },
                    { name: '💡 Primeros Pasos', value: 'Un administrador puede usar `/config setup` para empezar a configurar mis módulos.' }
                ],
                thumbnail: guild.client.user.displayAvatarURL(),
                image: '' // <-- ESPACIO PARA TU GIF
            });
            await targetChannel.send({ embeds: [serverEmbed] });
        }
    },
};
