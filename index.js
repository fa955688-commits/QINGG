const http = require('http');
const { Client, GatewayIntentBits, PermissionsBitField, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require('discord.js');

// 1. Render Keep-Alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot is running!");
  res.end();
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// 2. Configuration
let PREFIX = '??'; 
let WHITELIST = ['1302551987031900173']; 
let ANTINUKE_ENABLED = true;
const QUARANTINE_ROLE_ID = '1504790298377584650'; 

// 3. Define Comprehensive Slash Commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('wl-add').setDescription('Add a user to whitelist')
    .addUserOption(option => option.setName('user').setDescription('User to whitelist').setRequired(true)),
  new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Anti-Nuke system')
    .addStringOption(option => option.setName('status').setDescription('on or off').setRequired(true)),
  new SlashCommandBuilder().setName('jail').setDescription('Jail a user')
    .addUserOption(option => option.setName('target').setDescription('User to jail').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a user')
    .addUserOption(option => option.setName('target').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('say').setDescription('Make the bot speak')
    .addStringOption(option => option.setName('text').setDescription('The message').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// 4. Registration
client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Bot Ready. Prefix: ${PREFIX} | Slash Commands Registered.`);
  } catch (error) { console.error(error); }
});

// 5. Anti-Nuke Logic
client.on('channelDelete', async (channel) => {
  if (!ANTINUKE_ENABLED) return;
  try {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const log = auditLogs.entries.first();
    if (log && !WHITELIST.includes(log.executor.id)) {
      const member = await channel.guild.members.fetch(log.executor.id);
      await member.roles.set([QUARANTINE_ROLE_ID]).catch(() => member.ban({ reason: 'Anti-Nuke Protection' }));
    }
  } catch (err) { console.error(err); }
});

// 6. ALL Interaction Handler (Slash /)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const isWhitelisted = WHITELIST.includes(interaction.user.id);

  if (interaction.commandName === 'ping') await interaction.reply(`Latency: ${client.ws.ping}ms`);

  if (!isWhitelisted) return interaction.reply({ content: "Access Denied.", ephemeral: true });

  if (interaction.commandName === 'wl-add') {
    const user = interaction.options.getUser('user');
    if (!WHITELIST.includes(user.id)) WHITELIST.push(user.id);
    await interaction.reply(`Added ${user.tag} to Whitelist.`);
  }

  if (interaction.commandName === 'antinuke') {
    const status = interaction.options.getString('status').toLowerCase();
    ANTINUKE_ENABLED = status === 'on';
    await interaction.reply(`Anti-Nuke is now ${ANTINUKE_ENABLED ? 'ENABLED' : 'DISABLED'}.`);
  }

  if (interaction.commandName === 'jail') {
    const target = interaction.options.getMember('target');
    await target.roles.set([QUARANTINE_ROLE_ID]);
    await interaction.reply(`Jailed ${target.user.tag}`);
  }

  if (interaction.commandName === 'ban') {
    const target = interaction.options.getMember('target');
    await target.ban();
    await interaction.reply(`Banned ${target.user.tag}`);
  }

  if (interaction.commandName === 'say') {
    const text = interaction.options.getString('text');
    await interaction.channel.send(text);
    await interaction.reply({ content: "Sent.", ephemeral: true });
  }
});

// 7. ALL Message Handler (Prefix ??)
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const isWhitelisted = WHITELIST.includes(message.author.id);

  if (command === 'ping') return message.reply(`Latency: ${client.ws.ping}ms`);

  if (!isWhitelisted) return; // Silent ignore for non-whitelisted users

  if (command === 'wl') {
    const user = message.mentions.users.first();
    if (user && !WHITELIST.includes(user.id)) WHITELIST.push(user.id);
    return message.reply(`Whitelisted ${user?.tag || 'User'}`);
  }

  if (command === 'antinuke') {
    ANTINUKE_ENABLED = args[0] === 'on';
    return message.reply(`Anti-Nuke: ${ANTINUKE_ENABLED}`);
  }

  if (command === 'jail') {
    const member = message.mentions.members.first();
    if (member) {
      await member.roles.set([QUARANTINE_ROLE_ID]);
      return message.reply(`Jailed ${member.user.tag}`);
    }
  }

  if (command === 'say') {
    message.delete();
    return message.channel.send(args.join(' '));
  }
});

client.login(process.env.DISCORD_TOKEN);
