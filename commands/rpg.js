const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');
const { checkCooldown } = require('../utils/cooldown.js');

const defaultRpgData = {
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    lastAdventure: 0
};

const defaultEconomyData = {
    balance: 0
};

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('rpg')
        .setDescription('Comandos de rol y progreso')
        .addSubcommand(sub => sub.setName('adventure').setDescription('Inicia una aventura interactiva'))
        .addSubcommand(sub => sub.setName('level').setDescription('Muestra tu nivel y progreso').addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar'))),

    async execute(interaction, client, args, context = {}) {
        const isInteraction = interaction.commandName !== undefined;
        let subcommand, targetUser;

        if (isInteraction) {
            subcommand = interaction.options.getSubcommand();
            targetUser = interaction.options.getUser('usuario') || interaction.user;
        } else {
            subcommand = args[0];
            targetUser = context.user || interaction.author;
            if (!subcommand) return interaction.reply({ content: 'Uso: `!rpg <subcomando>` (adventure, level)' });
        }

        const guildId = interaction.guild.id;
        const userId = isInteraction ? interaction.user.id : interaction.author.id;

        // Función de respuesta universal
        const reply = async (options) => {
            if (isInteraction) return interaction.reply(options);
            return interaction.channel.send(options);
        };

        try {
            switch (subcommand) {
                case 'adventure': {
                    const rpgData = await DataManager.getFile(`rpg/${guildId}_${userId}.json`, defaultRpgData);
                    const cooldown = 300000; // 5 min
                    const timeLeft = cooldown - (Date.now() - (rpgData.lastAdventure || 0));

                    if (timeLeft > 0) {
                        const cdEmbed = createEmbed('error', '⏳ Aventura en Espera', `Aún estás cansado. Podrás volver <t:${Math.floor((Date.now() + timeLeft) / 1000)}:R>.`);
                        return reply({ embeds: [cdEmbed], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }
                    if (rpgData.hp <= 0) {
                        const deadEmbed = createEmbed('error', '💀 Estás Exhausto', 'No tienes HP para aventurarte. Descansa un poco.');
                        return reply({ embeds: [deadEmbed], flags: isInteraction ? [MessageFlags.Ephemeral] : [] });
                    }

                    rpgData.lastAdventure = Date.now();
                    await DataManager.saveFile(`rpg/${guildId}_${userId}.json`, rpgData);

                    const embed = createEmbed('info', '🌲 Aventura en el Bosque', 'Te adentras en el bosque, listo para lo que venga.', {
                        fields: [
                            { name: '❤️ Salud', value: `\`${rpgData.hp}/${rpgData.maxHp}\``, inline: true },
                            { name: '⭐ Nivel', value: `\`${rpgData.level}\``, inline: true }
                        ]
                    });
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('adv_explore').setLabel('Explorar').setStyle(ButtonStyle.Primary).setEmoji('🌲'),
                        new ButtonBuilder().setCustomId('adv_rest').setLabel('Descansar').setStyle(ButtonStyle.Success).setEmoji('💤'),
                        new ButtonBuilder().setCustomId('adv_flee').setLabel('Huir').setStyle(ButtonStyle.Secondary).setEmoji('🏠')
                    );

                    const response = isInteraction 
                        ? await interaction.reply({ embeds: [embed], components: [row], withResponse: true })
                        : await interaction.channel.send({ embeds: [embed], components: [row] });
                    
                    const msg = isInteraction ? (response.resource?.message || response) : response;
                    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 120000 });

                    collector.on('collect', async i => {
                        if (i.customId === 'adv_flee') {
                            await i.update({ embeds: [createEmbed('info', '🏠 Aventura Terminada', 'Has vuelto a la ciudad a salvo.')], components: [] });
                            return collector.stop();
                        }

                        let currentRpgData = await DataManager.getFile(`rpg/${guildId}_${userId}.json`);

                        if (i.customId === 'adv_rest') {
                            const heal = Math.floor(Math.random() * 20) + 10;
                            currentRpgData.hp = Math.min(currentRpgData.maxHp, currentRpgData.hp + heal);
                            await DataManager.saveFile(`rpg/${guildId}_${userId}.json`, currentRpgData);
                            return i.update({ embeds: [createEmbed('info', '💤 Descansando...', `✨ Has recuperado **${heal} HP**.`, { fields: [{ name: '❤️ Salud', value: `\`${currentRpgData.hp}/${currentRpgData.maxHp}\`` }] })] });
                        }

                        // Explorar
                        const rand = Math.random();
                        let logText = '';
                        if (rand > 0.7) {
                            const dmg = Math.floor(Math.random() * 15) + 5;
                            currentRpgData.hp -= dmg;
                            logText = `⚔️ ¡Un jabalí salvaje te atacó! Perdiste **${dmg} HP**.`;
                        } else if (rand > 0.3) {
                            const coins = Math.floor(Math.random() * 50) + 10;
                            const econData = await DataManager.getFile(`economy/${guildId}_${userId}.json`, defaultEconomyData);
                            econData.balance += coins;
                            await DataManager.saveFile(`economy/${guildId}_${userId}.json`, econData);
                            logText = `💰 ¡Encontraste una bolsa con **$${coins}** monedas!`;
                        } else {
                            logText = '🍃 Caminaste por el sendero, pero no viste nada fuera de lo común.';
                        }

                        if (currentRpgData.hp <= 0) {
                            currentRpgData.hp = 0;
                            await DataManager.saveFile(`rpg/${guildId}_${userId}.json`, currentRpgData);
                            await i.update({ embeds: [createEmbed('error', '💀 Has caído en combate', 'Te desmayas y despiertas en la ciudad.')], components: [] });
                            return collector.stop();
                        }

                        await DataManager.saveFile(`rpg/${guildId}_${userId}.json`, currentRpgData);
                        await i.update({ embeds: [createEmbed('info', '🌲 Explorando...', logText, { fields: [{ name: '❤️ Salud', value: `\`${currentRpgData.hp}/${currentRpgData.maxHp}\`` }] })] });
                    });

                    collector.on('end', (_, reason) => {
                        if (reason === 'time') {
                            msg.edit({ components: [] }).catch(() => {});
                        }
                    });
                    break;
                }

                case 'level': {
                    const data = await DataManager.getFile(`rpg/${guildId}_${targetUser.id}.json`, defaultRpgData);
                    const xpToNextLevel = data.level * 100;
                    const embed = createEmbed('rpg', `Perfil RPG de ${targetUser.username}`, '', {
                        fields: [
                            { name: '⭐ Nivel', value: `\`${data.level}\``, inline: true },
                            { name: '✨ XP', value: `\`${data.xp} / ${xpToNextLevel}\``, inline: true },
                            { name: '❤️ Salud', value: `\`${data.hp} / ${data.maxHp}\``, inline: true }
                        ],
                        thumbnail: targetUser.displayAvatarURL({ dynamic: true })
                    });
                    return reply({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(`[RPG Command] Error en subcomando ${subcommand}:`, error);
            return reply({ embeds: [createEmbed('error', 'Error Inesperado', 'Ocurrió un error al procesar tu solicitud.')] });
        }
    }
};
