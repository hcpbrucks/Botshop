const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TOKEN = 'DEIN_BOT_TOKEN';
const CLIENT_ID = 'DEINE_CLIENT_ID';
const GUILD_ID = 'DEINE_SERVER_ID'; // optional nur für testing

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
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
        .setDescription('Nachricht im Embed')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON()
];

// Slash-Commands registrieren
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('⏳ Slash-Commands werden registriert...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash-Commands registriert!');
  } catch (error) {
    console.error(error);
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