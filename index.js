const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('index.js');

const TOKEN = 'DEIN_BOT_TOKEN';         // Ersetze hier mit deinem echten Bot Token
const CLIENT_ID = 'DEINE_CLIENT_ID';    // Ersetze hier mit deiner Client ID
const GUILD_ID = 'DEIN_SERVER_ID';      // Ersetze hier mit deiner Guild ID (Server ID)

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

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

client.on('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

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

client.login(TOKEN);
