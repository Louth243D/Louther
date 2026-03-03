const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const keepAlive = require('./utils/keepAlive.js');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Verificación de la versión de Node.js
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (Number.isFinite(nodeMajor) && nodeMajor < 20) {
  console.error('Se requiere Node.js v20 o superior para que el bot funcione correctamente.');
  process.exit(1);
}

// Verificación del Token de Discord
const token = process.env.DISCORD_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.error('Error: El DISCORD_TOKEN no está configurado. Por favor, añádelo al archivo .env dentro de la carpeta /bot.');
  process.exit(1);
}

// Creación del Cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

client.commands = new Collection();
client.commandData = [];

// --- Carga Dinámica de Comandos ---
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) return;
  
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  console.log(`Cargando ${commandFiles.length} comandos...`);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        if (typeof command.data.toJSON === 'function') {
            client.commandData.push(command.data.toJSON());
        }
        console.log(`- Comando cargado: ${command.data.name}`);
      } else {
        console.warn(`[ADVERTENCIA] El comando en ${filePath} no tiene la estructura correcta (falta 'data' o 'execute').`);
      }
    } catch (error) {
      console.error(`[ERROR] No se pudo cargar el comando en ${filePath}:`, error);
    }
  }
}

// --- Carga Dinámica de Eventos ---
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsPath)) return;

  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const event = require(filePath);
      if (event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
      } else {
        console.warn(`[ADVERTENCIA] El evento en ${filePath} no tiene la estructura correcta (falta 'name' o 'execute').`);
      }
    } catch (error) {
      console.error(`[ERROR] No se pudo cargar el evento en ${filePath}:`, error);
    }
  }
}

// --- Manejo de Errores Globales ---
process.on('unhandledRejection', (error) => {
  console.error('Error no manejado (Unhandled Rejection):', error);
});
process.on('uncaughtException', (error) => {
  console.error('Error no manejado (Uncaught Exception):', error);
});

// --- Inicio del Bot ---
(async () => {
  try {
    console.log('\n--- INICIANDO LOUTHER BOT ---');
    keepAlive(); // Iniciamos el servidor web
    loadCommands();
    loadEvents();
    console.log('Iniciando sesión en Discord...');
    await client.login(token);
  } catch (error) {
    console.error('\n[ERROR FATAL] No se pudo iniciar el bot:', error);
    process.exit(1);
  }
})();
