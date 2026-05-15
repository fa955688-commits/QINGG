const http = require('http');
const { Client, GatewayIntentBits, PermissionsBitField, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require('discord.js');

// Keep-Alive Server for Render
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

// --- Configuration ---
let PREFIX = '??'; 
let WHITELIST = ['1302551987031900173']; 
const QUARANTINE_ROLE_ID = '1504790298377584650'; //

// --- Register Slash Commands ---
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Shows server stats'),
  new SlashCommandBuilder().setName('say').setDescription('Make the bot speak')
    .addStringOption(option => option.setName('text').setDescription('The message').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`System Online: ${client.user.tag}`);
    console.log(`Slash commands registered and Prefix set to: ${PREFIX}`);
  } catch (error) {
    console.error(error);
  }
});

// --- Anti-Nuke Logic ---
client.on('channelDelete', async (channel) => {
  const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
  const log = auditLogs.entries.first();
  if (!log) return;
  const { executor } = log;
  if (!WHITELIST.includes(executor.id)) {
    const member = await channel.guild.members.fetch(executor.id);
    await member.roles.set([QUARANTINE_ROLE_ID]).catch(() => member.ban({ reason: 'Anti-Nuke' }));
  }
});

// --- Slash Command Interaction Handler ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply(`Latency: ${client.ws.ping}ms`);
  }

  if (interaction.commandName === 'serverinfo') {
    await interaction.reply(`Server: ${interaction.guild.name}\nMembers: ${interaction.guild.memberCount}`);
  }

  if (interaction.commandName === 'say') {
    if (!WHITELIST.includes(interaction.user.id)) return interaction.reply({ content: "Permission Denied", ephemeral: true });
    const text = interaction.options.getString('text');
    await interaction.channel.send(text);
    await interaction.reply({ content: "Sent!", ephemeral: true });
  }
});

// --- Message (Prefix ??) Command Handler ---
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const isWhitelisted = WHITELIST.includes(message.author.id);

  if (command === 'ping') return message.reply(`Latency: ${client.ws.ping}ms`);

  if (command === 'say') {
    if (!isWhitelisted) return message.reply("Permission Denied.");
    const msg = args.join(' ');
    if (!msg) return message.reply("Say something!");
    message.delete();
    return message.channel.send(msg);
  }

  if (command === 'jail') {
    if (!isWhitelisted) return message.reply("Permission Denied.");
    const member = message.mentions.members.first();
    if (member) { 
      await member.roles.set([QUARANTINE_ROLE_ID]); 
      message.reply("Jailed."); 
    }
  }

  if (command === 'ban') {
    if (!isWhitelisted) return message.reply("Permission Denied.");
    const member = message.mentions.members.first();
    if (member) { await member.ban(); message.reply("Banned."); }
  }
});

client.login(process.env.DISCORD_TOKEN);
