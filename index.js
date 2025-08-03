const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// === Bot Setup ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// === Slash Command Registrierung ===
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
    .addStringOption(option =>
      option.setName('farbe')
        .setDescription('Farbe des Embeds')
        .addChoices(
          { name: 'Blau', value: 'blau' },
          { name: 'Rot', value: 'rot' },
          { name: 'Grün', value: 'gruen' },
          { name: 'Schwarz', value: 'schwarz' }
        )
        .setRequired(false))
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

// === Slash Command Verarbeitung ===
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'embed') {
    // Nur mit bestimmter Rolle ausführen
    const requiredRole = '1381291659492458549';
    if (!interaction.member.roles.cache.has(requiredRole)) {
      return interaction.reply({
        content: '❌ Du hast keine Berechtigung diesen Befehl zu verwenden.',
        ephemeral: true
      });
    }

    const titel = interaction.options.getString('titel');
    const nachricht = interaction.options.getString('nachricht');
    const farbe = interaction.options.getString('farbe');

    // Farbauswahl
    let farbwert = 0x00AEFF; // Standard: Hellblau
    if (farbe === 'rot') farbwert = 0xFF0000;
    else if (farbe === 'gruen') farbwert = 0x00FF00;
    else if (farbe === 'schwarz') farbwert = 0x2F3136;

    const embed = new EmbedBuilder()
      .setTitle(titel)
      .setDescription(nachricht)
      .setColor(farbwert)
      .setFooter({ text: `Pluezz Shop` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// === Willkommenssystem ===
client.on('guildMemberAdd', async member => {
  const welcomeChannel = member.guild.channels.cache.get('1381278996645412984');
  const role1 = member.guild.roles.cache.get('1381290464916930691');
  const role2 = member.guild.roles.cache.get('1381289341279670342');

  if (!welcomeChannel || !role1 || !role2) return console.error('Channel oder Rollen nicht gefunden!');

  try {
    await member.roles.add(role1);
    await member.roles.add(role2);
  } catch (error) {
    console.error('Fehler beim Rollen vergeben:', error);
  }

  const embed = new EmbedBuilder()
    .setTitle('Welcome')
    .setColor(0xFF0000)
    .setDescription(`Hello ${member}.\nWelcome to **${member.guild.name}**.\nYou are the **server member**.\nPlease verify to access all channels.`)
    .setThumbnail(member.user.displayAvatarURL());

  welcomeChannel.send({ embeds: [embed] });
});

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.login(TOKEN);
