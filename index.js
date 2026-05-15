const http = require('http');
const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');

// 1. Render Keep-Alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot is running!");
  res.end();
}).listen(process.env.PORT || 10000);

// 2. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('Database Error:', err));

// Database Schema (Saving settings permanently)
const SettingsSchema = new mongoose.Schema({
  guildId: String,
  whitelist: { type: [String], default: ['1302551987031900173'] }, 
  antinuke: { type: Boolean, default: true }
});
const Settings = mongoose.model('Settings', SettingsSchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// 3. Settings & Config
const PREFIX = '??';
const QUARANTINE_ROLE_ID = '1504790298377584650';

async function getSettings(guildId) {
  let s = await Settings.findOne({ guildId });
  if (!s) s = await Settings.create({ guildId });
  return s;
}

// 4. Slash Commands Registration
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check latency'),
  new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Anti-Nuke')
    .addStringOption(o => o.setName('status').setDescription('on/off').setRequired(true)),
  new SlashCommandBuilder().setName('wl-add').setDescription('Whitelist a user')
    .addUserOption(o => o.setName('user').setRequired(true)),
  new SlashCommandBuilder().setName('jail').setDescription('Jail a user')
    .addUserOption(o => o.setName('target').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Logged in as ${client.user.tag}`);
  } catch (err) { console.error(err); }
});

// 5. Anti-Nuke Event
client.on('channelDelete', async (channel) => {
  const s = await getSettings(channel.guild.id);
  if (!s.antinuke) return;

  const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
  const log = logs.entries.first();
  
  if (log && !s.whitelist.includes(log.executor.id)) {
    const member = await channel.guild.members.fetch(log.executor.id);
    await member.roles.set([QUARANTINE_ROLE_ID]).catch(() => member.ban({ reason: 'Anti-Nuke' }));
  }
});

// 6. Interaction Handler (/)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const s = await getSettings(interaction.guildId);
  const isWL = s.whitelist.includes(interaction.user.id);

  if (interaction.commandName === 'ping') return interaction.reply(`Speed: ${client.ws.ping}ms`);
  if (!isWL) return interaction.reply({ content: "No Permission.", ephemeral: true });

  if (interaction.commandName === 'antinuke') {
    const status = interaction.options.getString('status').toLowerCase();
    s.antinuke = (status === 'on' || status === 'enable');
    await s.save();
    interaction.reply(`Anti-Nuke is now: **${s.antinuke ? 'ENABLED' : 'DISABLED'}**`);
  }

  if (interaction.commandName === 'wl-add') {
    const user = interaction.options.getUser('user');
    if (!s.whitelist.includes(user.id)) s.whitelist.push(user.id);
    await s.save();
    interaction.reply(`${user.tag} added to database whitelist.`);
  }

  if (interaction.commandName === 'jail') {
    const target = interaction.options.getMember('target');
    await target.roles.set([QUARANTINE_ROLE_ID]);
    interaction.reply(`Jailed ${target.user.tag}`);
  }
});

// 7. Message Handler (?? Prefix)
client.on('messageCreate', async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  const s = await getSettings(message.guild.id);
  const isWL = s.whitelist.includes(message.author.id);

  if (cmd === 'ping') return message.reply(`Latency: ${client.ws.ping}ms`);
  if (!isWL) return;

  if (cmd === 'antinuke') {
    const status = args[0]?.toLowerCase();
    if (!status) return message.reply("Use: `??antinuke on/off` ");
    s.antinuke = (status === 'on');
    await s.save();
    message.reply(`Anti-Nuke is now: **${s.antinuke}**`);
  }

  if (cmd === 'wl') {
    const user = message.mentions.users.first();
    if (user && !s.whitelist.includes(user.id)) {
        s.whitelist.push(user.id);
        await s.save();
        message.reply(`Added ${user.tag} to Whitelist.`);
    }
  }

  if (cmd === 'jail') {
    const target = message.mentions.members.first();
    if (target) {
        await target.roles.set([QUARANTINE_ROLE_ID]);
        message.reply(`Jailed ${target.user.tag}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
