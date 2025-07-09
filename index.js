const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('index.js');

// 🔐 Konfig aus Umgebungsvariablen (z. B. Render oder .env)
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 🔽 Slash-Befehl registrieren
const commands = [
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Lässt den Bot etwas sagen')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Was soll gesagt werden?')
        .setRequired(true))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔁 Registriere Slash-Befehl /say ...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash-Befehl registriert!');
  } catch (error) {
    console.error('❌ Fehler bei Slash-Registrierung:', error);
  }
})();

// ⚙️ Antwort-Logik
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'say') {
    const input = interaction.options.getString('text');
    await interaction.reply({ content: input, ephemeral: false });
    await interaction.deleteReply(); // ❌ Original-Kommandosicht löschen
    await interaction.channel.send({ content: input }); // ✅ Bot sagt es
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot ist online als ${client.user.tag}`);
});

client.login(TOKEN);
