const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Token, Client ID und Guild ID aus Umgebungsvariablen holen
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Fehler: Bitte BOT_TOKEN, CLIENT_ID und GUILD_ID als Umgebungsvariablen setzen!');
  process.exit(1);
}

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
