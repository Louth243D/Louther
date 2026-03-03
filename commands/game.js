const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');
const DataManager = require('../utils/dataManager.js');

module.exports = {
    category: '🎮 JUEGOS',
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Comandos de juegos y entretenimiento con apuestas')
        .addSubcommand(sub => 
            sub.setName('blackjack')
                .setDescription('Juega una partida de Blackjack contra el bot')
                .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(10))
        )
        .addSubcommand(sub => 
            sub.setName('slots')
                .setDescription('Máquina tragaperras clásica')
                .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(10))
        )
        .addSubcommand(sub => 
            sub.setName('coinflip')
                .setDescription('Lanza una moneda (cara o cruz) con apuesta')
                .addStringOption(o => o.setName('lado').setDescription('Elige cara o cruz').setRequired(true).addChoices({ name: 'Cara', value: 'cara' }, { name: 'Cruz', value: 'cruz' }))
                .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(10))
        )
        .addSubcommand(sub => 
            sub.setName('dice')
                .setDescription('Apuesta al resultado de un dado')
                .addIntegerOption(o => o.setName('numero').setDescription('Elige un número (1-6)').setRequired(true).setMinValue(1).setMaxValue(6))
                .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(10))
        )
        .addSubcommand(sub => 
            sub.setName('rps')
                .setDescription('Juega a Piedra, Papel o Tijera contra el bot')
        )
        .addSubcommand(sub => sub.setName('guess').setDescription('Adivina el número (1-100)'))
        .addSubcommand(sub => sub.setName('minesweeper').setDescription('Juego de buscaminas interactivo')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        
        // Obtener datos de economía para juegos con apuestas
        let ecoData = await DataManager.getFile(`economy/${guildId}.json`, {});
        if (!ecoData[userId]) ecoData[userId] = { balance: 1000, lastDaily: 0, lastWork: 0 };
        const userEco = ecoData[userId];

        switch (subcommand) {
            case 'blackjack':
                await interaction.deferReply();
                const apuestaBj = interaction.options.getInteger('apuesta');
                
                if (userEco.balance < apuestaBj) {
                    return interaction.editReply({ embeds: [createEmbed('error', 'Saldo Insuficiente', `No tienes suficientes monedas para apostar **$${apuestaBj}**.`)] });
                }

                const deck = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
                const getValue = (card) => {
                    if (['J', 'Q', 'K'].includes(card)) return 10;
                    if (card === 'A') return 11;
                    return parseInt(card);
                };

                let userHand = [deck[Math.floor(Math.random() * deck.length)], deck[Math.floor(Math.random() * deck.length)]];
                let botHand = [deck[Math.floor(Math.random() * deck.length)], deck[Math.floor(Math.random() * deck.length)]];

                const calculateScore = (hand) => {
                    let score = hand.reduce((a, b) => a + getValue(b), 0);
                    let aces = hand.filter(c => c === 'A').length;
                    while (score > 21 && aces > 0) {
                        score -= 10;
                        aces--;
                    }
                    return score;
                };

                const getEmbed = (finished = false, result = '') => {
                    const userScore = calculateScore(userHand);
                    const botScore = calculateScore(botHand);
                    
                    const embed = createEmbed('economy', '🃏 Blackjack Louther', result || `Has apostado \`$${apuestaBj}\``, {
                        fields: [
                            { name: '👤 Tu Mano', value: `${userHand.join(' ')} (Puntos: \`${userScore}\`)`, inline: true },
                            { name: '🤖 Mi Mano', value: finished ? `${botHand.join(' ')} (Puntos: \`${botScore}\`)` : `${botHand[0]} ❓`, inline: true }
                        ],
                        footer: finished ? 'Partida terminada' : '¿Quieres pedir carta o plantarte?'
                    });
                    return embed;
                };

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('bj_hit').setLabel('Pedir Carta').setStyle(ButtonStyle.Primary).setEmoji('➕'),
                    new ButtonBuilder().setCustomId('bj_stay').setLabel('Plantarse').setStyle(ButtonStyle.Secondary).setEmoji('🛑')
                );

                const response = await interaction.editReply({ embeds: [getEmbed()], components: [row] });
                const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'No es tu partida.', flags: [MessageFlags.Ephemeral] });

                    if (i.customId === 'bj_hit') {
                        userHand.push(deck[Math.floor(Math.random() * deck.length)]);
                        const score = calculateScore(userHand);
                        
                        if (score > 21) {
                            userEco.balance -= apuestaBj;
                            await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                            await i.update({ embeds: [getEmbed(true, `¡Te has pasado de 21! Has perdido **$${apuestaBj}**.`)], components: [] });
                            return collector.stop();
                        }
                        await i.update({ embeds: [getEmbed()] });
                    } else {
                        let botScore = calculateScore(botHand);
                        while (botScore < 17) {
                            botHand.push(deck[Math.floor(Math.random() * deck.length)]);
                            botScore = calculateScore(botHand);
                        }

                        const userScore = calculateScore(userHand);
                        let finalMsg = '';
                        let type = 'info';

                        if (botScore > 21 || userScore > botScore) {
                            finalMsg = `¡Has ganado la partida! 🎉 Recibes **$${apuestaBj * 2}**.`;
                            userEco.balance += apuestaBj;
                            type = 'success';
                        } else if (userScore < botScore) {
                            finalMsg = `He ganado yo. 🤖 Has perdido **$${apuestaBj}**.`;
                            userEco.balance -= apuestaBj;
                            type = 'error';
                        } else {
                            finalMsg = '¡Es un empate! 🤝 Tu apuesta ha sido devuelta.';
                            type = 'info';
                        }

                        await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                        const finalEmbed = getEmbed(true, finalMsg);
                        finalEmbed.setColor(type === 'success' ? '#2ecc71' : (type === 'error' ? '#e74c3c' : '#3498db'));
                        
                        await i.update({ embeds: [finalEmbed], components: [] });
                        collector.stop();
                    }
                });
                break;

            case 'slots':
                const apuestaSlots = interaction.options.getInteger('apuesta');
                if (userEco.balance < apuestaSlots) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Saldo Insuficiente', `No tienes suficientes monedas para apostar **$${apuestaSlots}**.`)] });
                }

                const sIcons = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
                const s1 = sIcons[Math.floor(Math.random() * sIcons.length)];
                const s2 = sIcons[Math.floor(Math.random() * sIcons.length)];
                const s3 = sIcons[Math.floor(Math.random() * sIcons.length)];
                
                const sWin = (s1 === s2 && s2 === s3);
                const sPartial = (s1 === s2 || s2 === s3 || s1 === s3);
                
                let sGain = 0;
                let sMsg = '';
                if (sWin) {
                    sGain = apuestaSlots * 5;
                    sMsg = `¡JACKPOT! 🎉 Has ganado **$${sGain}**`;
                    userEco.balance += sGain;
                } else if (sPartial) {
                    sGain = Math.floor(apuestaSlots * 1.5);
                    sMsg = `¡Casi! Has ganado **$${sGain}**`;
                    userEco.balance += (sGain - apuestaSlots);
                } else {
                    sMsg = `Has perdido **$${apuestaSlots}**`;
                    userEco.balance -= apuestaSlots;
                }

                await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                return interaction.reply({ 
                    embeds: [createEmbed(sWin ? 'success' : (sPartial ? 'info' : 'error'), '🎰 Tragaperras', `[ ${s1} | ${s2} | ${s3} ]\n\n${sMsg}`)] 
                });

            case 'coinflip':
                const lado = interaction.options.getString('lado');
                const apuestaCoin = interaction.options.getInteger('apuesta');
                
                if (userEco.balance < apuestaCoin) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Saldo Insuficiente', `No tienes suficientes monedas para apostar **$${apuestaCoin}**.`)] });
                }

                const coinResult = Math.random() > 0.5 ? 'cara' : 'cruz';
                const winCoin = lado === coinResult;
                
                if (winCoin) {
                    userEco.balance += apuestaCoin;
                    await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                    return interaction.reply({ 
                        embeds: [createEmbed('success', '🪙 Moneda: ¡Ganaste!', `Salió **${coinResult}**. Has ganado **$${apuestaCoin}**.`)] 
                    });
                } else {
                    userEco.balance -= apuestaCoin;
                    await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                    return interaction.reply({ 
                        embeds: [createEmbed('error', '🪙 Moneda: Perdiste', `Salió **${coinResult}**. Has perdido **$${apuestaCoin}**.`)] 
                    });
                }

            case 'dice':
                const numDado = interaction.options.getInteger('numero');
                const apuestaDice = interaction.options.getInteger('apuesta');
                
                if (userEco.balance < apuestaDice) {
                    return interaction.reply({ embeds: [createEmbed('error', 'Saldo Insuficiente', `No tienes suficientes monedas para apostar **$${apuestaDice}**.`)] });
                }

                const diceResult = Math.floor(Math.random() * 6) + 1;
                const winDice = numDado === diceResult;

                if (winDice) {
                    const gananciaDice = apuestaDice * 3;
                    userEco.balance += gananciaDice;
                    await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                    return interaction.reply({ 
                        embeds: [createEmbed('success', '🎲 Dado: ¡Acierto!', `Salió el **${diceResult}**. ¡Has triplicado tu apuesta ganando **$${gananciaDice}**!`)] 
                    });
                } else {
                    userEco.balance -= apuestaDice;
                    await DataManager.saveFile(`economy/${guildId}.json`, ecoData);
                    return interaction.reply({ 
                        embeds: [createEmbed('error', '🎲 Dado: Fallaste', `Salió el **${diceResult}**. Has perdido **$${apuestaDice}**.`)] 
                    });
                }

            case 'rps':
                const rpsEmbed = createEmbed('info', '✊ Piedra, Papel o Tijera ✌️', 'Elige tu opción para jugar contra Louther.', {
                    footer: 'Tienes 30 segundos para elegir'
                });

                const rpsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rps_rock').setLabel('Piedra').setStyle(ButtonStyle.Primary).setEmoji('✊'),
                    new ButtonBuilder().setCustomId('rps_paper').setLabel('Papel').setStyle(ButtonStyle.Primary).setEmoji('✋'),
                    new ButtonBuilder().setCustomId('rps_scissors').setLabel('Tijera').setStyle(ButtonStyle.Primary).setEmoji('✌️')
                );

                const rpsRes = await interaction.reply({ embeds: [rpsEmbed], components: [rpsRow], withResponse: true });
                const rpsCollector = (rpsRes.resource?.message || rpsRes).createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

                rpsCollector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este juego no es para ti.', flags: [MessageFlags.Ephemeral] });

                    const options = ['rps_rock', 'rps_paper', 'rps_scissors'];
                    const botChoice = options[Math.floor(Math.random() * options.length)];
                    const userChoice = i.customId;

                    const names = { rps_rock: 'Piedra ✊', rps_paper: 'Papel ✋', rps_scissors: 'Tijera ✌️' };
                    let result = '', type = 'info';

                    if (userChoice === botChoice) result = '¡Empate! 🤝';
                    else if ((userChoice === 'rps_rock' && botChoice === 'rps_scissors') || (userChoice === 'rps_paper' && botChoice === 'rps_rock') || (userChoice === 'rps_scissors' && botChoice === 'rps_paper')) {
                        result = '¡Has Ganado! 🎉'; type = 'success';
                    } else { result = '¡He ganado yo! 🤖'; type = 'error'; }

                    await i.update({ 
                        embeds: [createEmbed(type, `🎮 RPS - Resultado`, `¡Juego terminado!`, {
                            fields: [
                                { name: '👤 Tú', value: names[userChoice], inline: true },
                                { name: '🤖 Yo', value: names[botChoice], inline: true },
                                { name: '📊 Resultado', value: `**${result}**`, inline: false }
                            ]
                        })], components: [] 
                    });
                    rpsCollector.stop();
                });
                break;

            case 'guess':
                const gNum = Math.floor(Math.random() * 100) + 1;
                await interaction.reply({ embeds: [createEmbed('info', '🔢 Adivina el Número', 'He pensado un número entre 1 y 100. Tienes 3 intentos.')] });
                const gColl = interaction.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, time: 30000, max: 3 });
                gColl.on('collect', m => {
                    const g = parseInt(m.content);
                    if (g === gNum) { m.reply('🎉 ¡Correcto!'); gColl.stop(); }
                    else if (g < gNum) m.reply('📈 Más alto...');
                    else m.reply('📉 Más bajo...');
                });
                break;

            case 'minesweeper':
                return interaction.reply({ 
                    embeds: [createEmbed('info', '💣 Buscaminas', 'Haz clic en los spoilers para descubrir el campo minado.\n\n||1||||1||||1||\n||1||||M||||1||\n||1||||1||||1||')] 
                });
        }
    }
};
