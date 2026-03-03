const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const fs = require('fs').promises; // Usamos la versión de promesas de fs
const path = require('path');

module.exports = {
    category: '🌟 SOCIAL',
    data: new SlashCommandBuilder()
        .setName('social')
        .setDescription('Comandos de interacción social y perfiles')
        .addSubcommand(sub => 
            sub.setName('marry').setDescription('Propón matrimonio virtual a otro usuario')
                .addUserOption(o => o.setName('usuario').setDescription('Tu media naranja').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('divorce').setDescription('Divórciate de tu pareja virtual'))
        .addSubcommand(sub => 
            sub.setName('love').setDescription('Calcula la compatibilidad entre dos usuarios')
                .addUserOption(o => o.setName('usuario1').setDescription('Primer usuario').setRequired(true))
                .addUserOption(o => o.setName('usuario2').setDescription('Segundo usuario')))
        .addSubcommand(sub => 
            sub.setName('rep').setDescription('Da un punto de reputación a otro usuario (cada 24h)')
                .addUserOption(o => o.setName('usuario').setDescription('Usuario a quien dar reputación').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('birthday').setDescription('Registra tu cumpleaños')
                .addIntegerOption(o => o.setName('dia').setDescription('Día de nacimiento').setRequired(true).setMinValue(1).setMaxValue(31))
                .addIntegerOption(o => o.setName('mes').setDescription('Mes de nacimiento').setRequired(true).setMinValue(1).setMaxValue(12)))
        .addSubcommand(sub => 
            sub.setName('todaybirthdays').setDescription('Muestra los cumpleaños del día de hoy')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'marry': {
                const target = interaction.options.getUser('usuario');
                if (target.id === userId) return interaction.reply({ content: 'No puedes casarte contigo mismo...', flags: [MessageFlags.Ephemeral] });
                if (target.bot) return interaction.reply({ content: 'Los bots no tienen sentimientos (por ahora).', flags: [MessageFlags.Ephemeral] });

                const marriages = await DataManager.getFile(`social/${guildId}_marriages.json`, {});
                if (marriages[userId]) return interaction.reply({ content: 'Ya estás casado/a. ¡Sé fiel!', flags: [MessageFlags.Ephemeral] });
                if (marriages[target.id]) return interaction.reply({ content: 'Esa persona ya está casada.', flags: [MessageFlags.Ephemeral] });

                const embed = createEmbed('success', '💍 Propuesta de Matrimonio', `**${interaction.user.username}** le ha propuesto matrimonio a **${target.username}**.\n\n¿Aceptas, <@${target.id}>?`, {
                    thumbnail: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                    footer: 'Responde con "si" en el chat para aceptar.'
                });
                await interaction.reply({ content: `<@${target.id}>`, embeds: [embed] });

                const filter = m => m.author.id === target.id && m.content.toLowerCase() === 'si';
                const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

                collector.on('collect', async () => {
                    marriages[userId] = target.id;
                    marriages[target.id] = userId;
                    await DataManager.saveFile(`social/${guildId}_marriages.json`, marriages);
                    const successEmbed = createEmbed('success', '🎊 ¡RECIÉN CASADOS! 🎊', `¡Felicidades! **${interaction.user.username}** y **${target.username}** ahora están casados virtualmente.`);
                    await interaction.followUp({ embeds: [successEmbed] });
                });
                break;
            }

            case 'divorce': {
                const marriages = await DataManager.getFile(`social/${guildId}_marriages.json`, {});
                const partnerId = marriages[userId];
                if (!partnerId) return interaction.reply({ content: 'No estás casado/a con nadie.', flags: [MessageFlags.Ephemeral] });
                
                delete marriages[userId];
                delete marriages[partnerId];
                await DataManager.saveFile(`social/${guildId}_marriages.json`, marriages);

                const embed = createEmbed('error', '💔 Divorcio', `**${interaction.user.username}** se ha divorciado de <@${partnerId}>. El amor se acabó...`);
                return interaction.reply({ embeds: [embed] });
            }

            case 'love': {
                const user1 = interaction.options.getUser('usuario1');
                const user2 = interaction.options.getUser('usuario2') || interaction.user;
                const lovePercent = Math.floor(Math.random() * 101);
                let loveMsg = '';
                if (lovePercent > 80) loveMsg = '💖 ¡Pareja perfecta! El amor está en el aire.';
                else if (lovePercent > 50) loveMsg = '❤️ Tienen una buena conexión.';
                else if (lovePercent > 20) loveMsg = '💛 Podría funcionar, pero necesitan esforzarse.';
                else loveMsg = '💔 Mejor sigan siendo amigos...';
                const embed = createEmbed('success', '💘 Calculadora de Amor', `Compatibilidad entre **${user1.username}** y **${user2.username}**`, {
                    fields: [
                        { name: '📊 Porcentaje', value: `\`${lovePercent}%\``, inline: true },
                        { name: '💌 Resultado', value: loveMsg, inline: false }
                    ]
                });
                return interaction.reply({ embeds: [embed] });
            }

            case 'rep': {
                const target = interaction.options.getUser('usuario');
                if (target.id === userId) return interaction.reply({ embeds: [createEmbed('error', 'Acción Inválida', 'No puedes darte reputación a ti mismo.')], flags: [MessageFlags.Ephemeral] });
                if (target.bot) return interaction.reply({ embeds: [createEmbed('error', 'Acción Inválida', 'No puedes dar reputación a un bot.')], flags: [MessageFlags.Ephemeral] });

                const cooldowns = await DataManager.getFile(`social/${guildId}_rep_cooldowns.json`, {});
                const now = Date.now();
                const userCooldown = cooldowns[userId];
                const cooldownTime = 24 * 60 * 60 * 1000; // 24 horas

                if (userCooldown && now < userCooldown) {
                    const timeLeft = (userCooldown - now) / 1000;
                    const hours = Math.floor(timeLeft / 3600);
                    const minutes = Math.floor((timeLeft % 3600) / 60);
                    return interaction.reply({
                        embeds: [createEmbed('error', 'Cooldown Activo', `Debes esperar **${hours}h y ${minutes}m** para dar reputación de nuevo.`)],
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                const profile = await DataManager.getFile(`profiles/${guildId}_${target.id}.json`, { rep: 0 });
                profile.rep = (profile.rep || 0) + 1;
                await DataManager.saveFile(`profiles/${guildId}_${target.id}.json`, profile);

                cooldowns[userId] = now + cooldownTime;
                await DataManager.saveFile(`social/${guildId}_rep_cooldowns.json`, cooldowns);

                const embed = createEmbed('success', 'Reputación Entregada', `Has dado un punto de reputación a **${target.username}**.`, {
                    fields: [{ name: '🎖️ Nueva Reputación', value: `\`${profile.rep}\``, inline: true }],
                    thumbnail: target.displayAvatarURL({ dynamic: true })
                });
                return interaction.reply({ embeds: [embed] });
            }

            case 'birthday': {
                const dia = interaction.options.getInteger('dia');
                const mes = interaction.options.getInteger('mes');
                const profile = await DataManager.getFile(`profiles/${guildId}_${userId}.json`, {});
                profile.birthday = { dia, mes };
                await DataManager.saveFile(`profiles/${guildId}_${userId}.json`, profile);
                const embed = createEmbed('success', 'Cumpleaños Registrado', `He guardado tu cumpleaños para el **${dia}/${mes}**.`);
                return interaction.reply({ embeds: [embed] });
            }

            case 'todaybirthdays': {
                const now = new Date();
                const diaActual = now.getDate();
                const mesActual = now.getMonth() + 1;
                const profilesDir = path.join(__dirname, '..', 'data', 'profiles');
                const cumpleañeros = [];

                try {
                    const files = await fs.readdir(profilesDir);
                    for (const file of files) {
                        if (file.startsWith(guildId) && file.endsWith('.json')) {
                            const data = await DataManager.getFile(`profiles/${file}`);
                            if (data.birthday && data.birthday.dia === diaActual && data.birthday.mes === mesActual) {
                                const userIdFromFile = file.split('_')[1].replace('.json', '');
                                cumpleañeros.push(`<@${userIdFromFile}>`);
                            }
                        }
                    }
                } catch (error) {
                    // El directorio de perfiles podría no existir, lo cual es normal.
                }

                if (cumpleañeros.length === 0) return interaction.reply({ embeds: [createEmbed('info', '🎂 Cumpleaños de Hoy', 'No hay nadie cumpliendo años hoy en el servidor.')] });
                
                const embed = createEmbed('success', '🎂 ¡Cumpleaños de Hoy!', `¡Felicidades a los cumpleañeros del día!`, {
                    fields: [{ name: '🎉 Celebrados', value: cumpleañeros.join('\n') }]
                });
                return interaction.reply({ embeds: [embed] });
            }
        }
    }
};
