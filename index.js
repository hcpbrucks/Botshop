// index.js
const http = require('http');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Webserver starten (für Render)
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot läuft\n');
});
server.listen(port, () => {
  console.log(`Webserver läuft auf Port ${port}`);
});

// Umgebungsvariablen auslesen
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Discord Client initialisieren
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Slash Command definieren
const commands = [
  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Sende eine Embed-Nachricht')
    .addStringOption(option =>
      option.setName('titel')
        .setDescription('Titel des Embeds')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nachricht')
        .setDescription('Inhalt des Embeds')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON()
];

// Command registrieren
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📨 Slash-Command wird registriert...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash-Command erfolgreich registriert!');
  } catch (err) {
    console.error(err);
  }
})();

// Bot ready Event
client.on('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

// Command Handling
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'embed') {
    const titel = interaction.options.getString('titel');
    const nachricht = interaction.options.getString('nachricht');

    const embed = new EmbedBuilder()
      .setTitle(titel)
      .setDescription(nachricht)
      .setColor(0x00AEFF)
      .setTimestamp()
      .setFooter({ text: `Gesendet von ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  }
});

// Bot einloggen
client.login(TOKEN);
