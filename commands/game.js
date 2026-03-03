const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { createEmbed } = require('../utils/embed.js');

module.exports = {
    category: '🎮 JUEGOS',
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Comandos de juegos y entretenimiento')
        .addSubcommand(sub => 
            sub.setName('blackjack')
                .setDescription('Juega una partida de Blackjack contra el bot')
                .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(10))
        )
        .addSubcommand(sub => 
            sub.setName('rps')
                .setDescription('Juega a Piedra, Papel o Tijera contra el bot')
        )
        .addSubcommand(sub => 
            sub.setName('dice')
                .setDescription('Tira un dado de 6 caras')
        )
        .addSubcommand(sub => 
            sub.setName('coinflip')
                .setDescription('Lanza una moneda (cara o cruz)')
        )
        .addSubcommand(sub => sub.setName('guess').setDescription('Adivina el número (1-100)'))
        .addSubcommand(sub => sub.setName('hangman').setDescription('Juego del ahorcado'))
        .addSubcommand(sub => sub.setName('minesweeper').setDescription('Juego de buscaminas'))
        .addSubcommand(sub => sub.setName('roulette').setDescription('Ruleta de la suerte'))
        .addSubcommand(sub => sub.setName('slots').setDescription('Máquina tragaperras'))
        .addSubcommand(sub => sub.setName('trivia').setDescription('Preguntas de cultura general')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'blackjack':
                await interaction.deferReply();
                const apuesta = interaction.options.getInteger('apuesta');
                
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

                const getEmbed = (finished = false) => {
                    const userScore = calculateScore(userHand);
                    const botScore = calculateScore(botHand);
                    
                    return createEmbed('economy', '🃏 Blackjack Louther', `Has apostado \`$${apuesta}\``, {
                        fields: [
                            { name: '👤 Tu Mano', value: `${userHand.join(' ')} (Puntos: \`${userScore}\`)`, inline: true },
                            { name: '🤖 Mi Mano', value: finished ? `${botHand.join(' ')} (Puntos: \`${botScore}\`)` : `${botHand[0]} ❓`, inline: true }
                        ],
                        footer: finished ? 'Partida terminada' : '¿Quieres pedir carta o plantarte?'
                    });
                };

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('bj_hit').setLabel('Pedir Carta').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('bj_stay').setLabel('Plantarse').setStyle(ButtonStyle.Secondary)
                );

                const response = await interaction.editReply({ embeds: [getEmbed()], components: [row] });
                const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'No es tu partida.', flags: [MessageFlags.Ephemeral] });

                    if (i.customId === 'bj_hit') {
                        userHand.push(deck[Math.floor(Math.random() * deck.length)]);
                        const score = calculateScore(userHand);
                        
                        if (score > 21) {
                            await i.update({ embeds: [getEmbed(true).setDescription('¡Te has pasado de 21! Has perdido.')], components: [] });
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
                        if (botScore > 21 || userScore > botScore) finalMsg = '¡Has ganado la partida! 🎉';
                        else if (userScore < botScore) finalMsg = 'He ganado yo. 🤖';
                        else finalMsg = '¡Es un empate! 🤝';

                        await i.update({ embeds: [getEmbed(true).setDescription(finalMsg)], components: [] });
                        collector.stop();
                    }
                });
                break;

            case 'rps':
                const rpsEmbed = createEmbed('economy', '✊ Piedra, Papel o Tijera ✌️', 'Elige tu opción para jugar contra Louther.', {
                    footer: 'Tienes 30 segundos para elegir'
                });

                const rpsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('rps_rock').setLabel('Piedra').setStyle(ButtonStyle.Primary).setEmoji('✊'),
                    new ButtonBuilder().setCustomId('rps_paper').setLabel('Papel').setStyle(ButtonStyle.Primary).setEmoji('✋'),
                    new ButtonBuilder().setCustomId('rps_scissors').setLabel('Tijera').setStyle(ButtonStyle.Primary).setEmoji('✌️')
                );

                const rpsRes = await interaction.reply({ embeds: [rpsEmbed], components: [rpsRow], withResponse: true });
                const rpsResponseMsg = rpsRes.resource?.message || rpsRes;
                const rpsCollector = rpsResponseMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

                rpsCollector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este juego no es para ti.', flags: [MessageFlags.Ephemeral] });

                    const options = ['rps_rock', 'rps_paper', 'rps_scissors'];
                    const botChoice = options[Math.floor(Math.random() * options.length)];
                    const userChoice = i.customId;

                    const names = { rps_rock: 'Piedra ✊', rps_paper: 'Papel ✋', rps_scissors: 'Tijera ✌️' };
                    let result = '';
                    let type = '';

                    if (userChoice === botChoice) {
                        result = '¡Empate! 🤝';
                        type = 'info';
                    } else if (
                        (userChoice === 'rps_rock' && botChoice === 'rps_scissors') ||
                        (userChoice === 'rps_paper' && botChoice === 'rps_rock') ||
                        (userChoice === 'rps_scissors' && botChoice === 'rps_paper')
                    ) {
                        result = '¡Has Ganado! 🎉';
                        type = 'success';
                    } else {
                        result = '¡He ganado yo! 🤖';
                        type = 'error';
                    }

                    const resultEmbed = createEmbed(type, `🎮 RPS - Resultado`, `¡Juego terminado!`, {
                        fields: [
                            { name: '👤 Tú elegiste', value: names[userChoice], inline: true },
                            { name: '🤖 Yo elegí', value: names[botChoice], inline: true },
                            { name: '📊 Resultado', value: `**${result}**`, inline: false }
                        ]
                    });

                    await i.update({ embeds: [resultEmbed], components: [] });
                    rpsCollector.stop();
                });
                break;

            case 'dice':
                const diceResult = Math.floor(Math.random() * 6) + 1;
                const diceEmbed = createEmbed('economy', '🎲 Lanzamiento de Dado', `Has lanzado el dado y ha salido...`, {
                    fields: [{ name: 'Resultado', value: `**${diceResult}**`, inline: true }],
                    thumbnail: 'https://cdn-icons-png.flaticon.com/512/3257/3257013.png'
                });
                return interaction.reply({ embeds: [diceEmbed] });

            case 'coinflip':
                const coinResult = Math.random() > 0.5 ? 'Cara' : 'Cruz';
                const coinEmbed = createEmbed('economy', '🪙 Lanzamiento de Moneda', `La moneda gira en el aire y cae en...`, {
                    fields: [{ name: 'Resultado', value: `**${coinResult}**`, inline: true }],
                    thumbnail: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
                });
                return interaction.reply({ embeds: [coinEmbed] });

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

            case 'hangman':
                const hWords = ['discord', 'javascript', 'bot', 'ahorcado', 'louther'];
                const hWord = hWords[Math.floor(Math.random() * hWords.length)];
                return interaction.reply({ embeds: [createEmbed('info', '🪢 Ahorcado', `Palabra: \`${'_'.repeat(hWord.length)}\` (Simulación)`)] });

            case 'minesweeper':
                return interaction.reply({ content: '||1||||1||||1||\n||1||||M||||1||\n||1||||1||||1||' });

            case 'roulette':
                const rRes = ['Rojo', 'Negro', 'Verde'][Math.floor(Math.random() * 3)];
                return interaction.reply({ embeds: [createEmbed('economy', '🎡 Ruleta', `La bola gira y cae en: **${rRes}**`)] });

            case 'slots':
                const sIcons = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
                const s1 = sIcons[Math.floor(Math.random() * 5)], s2 = sIcons[Math.floor(Math.random() * 5)], s3 = sIcons[Math.floor(Math.random() * 5)];
                const sWin = (s1 === s2 && s2 === s3);
                return interaction.reply({ embeds: [createEmbed(sWin ? 'success' : 'error', '🎰 Tragaperras', `[ ${s1} | ${s2} | ${s3} ]\n\n${sWin ? '¡JACKPOT! 🎉' : 'Has perdido. 😢'}`)] });

            case 'trivia':
                return interaction.reply({ embeds: [createEmbed('info', '❓ Trivia', '¿Cuál es el lenguaje principal de este bot?\n\n1. Java\n2. JavaScript\n3. Python', { footer: 'Responde con el número.' })] });
        }
    }
};
