const http = require('http');
const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');

// 1. Render Keep-Alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("QINGG is Awake!");
  res.end();
}).listen(process.env.PORT || 10000);

// 2. MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('QINGG connected to Database!'))
  .catch(err => console.error('Database Error:', err));

const SettingsSchema = new mongoose.Schema({
  guildId: String,
  whitelist: { type: [String], default: ['1302551987031900173'] }, 
  antinuke: { type: Boolean, default: true }
});
const Settings = mongoose.model('Settings', SettingsSchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// 3. Config
const PREFIX = '??';
const QUARANTINE_ROLE_ID = '1504790298377584650';

async function getSettings(guildId) {
  let s = await Settings.findOne({ guildId });
  if (!s) s = await Settings.create({ guildId });
  return s;
}

// 4. Register Commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check QINGG speed'),
  new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Anti-Nuke')
    .addStringOption(o => o.setName('status').setDescription('on/off').setRequired(true)),
  new SlashCommandBuilder().setName('wl-add').setDescription('Whitelist a user')
    .addUserOption(o => o.setName('user').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    client.user.setActivity('/help | QINGG', { type: ActivityType.Playing });
    console.log(`QINGG is online!`);
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
    await member.roles.set([QUARANTINE_ROLE_ID]).catch(() => member.ban({ reason: 'QINGG Anti-Nuke' }));
  }
});

// 6. Interaction Handler (/)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const s = await getSettings(interaction.guildId);
  const isWL = s.whitelist.includes(interaction.user.id);

  if (interaction.commandName === 'ping') return interaction.reply(`QINGG Speed: ${client.ws.ping}ms`);
  if (!isWL) return interaction.reply({ content: "You are not whitelisted in QINGG database.", ephemeral: true });

  if (interaction.commandName === 'antinuke') {
    s.antinuke = interaction.options.getString('status') === 'on';
    await s.save();
    interaction.reply(`Anti-Nuke is now: **${s.antinuke ? 'ENABLED' : 'DISABLED'}**`);
  }
});

// 7. Message Handler (??)
client.on('messageCreate', async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const s = await getSettings(message.guild.id);
  const isWL = s.whitelist.includes(message.author.id);

  if (cmd === 'ping') return message.reply("QINGG is active!");
  if (!isWL) return;

  if (cmd === 'antinuke') {
    const status = args[0]?.toLowerCase();
    s.antinuke = (status === 'on');
    await s.save();
    message.reply(`Anti-Nuke updated by QINGG: **${s.antinuke}**`);
  }

  if (cmd === 'wl') {
    const user = message.mentions.users.first();
    if (user && !s.whitelist.includes(user.id)) {
        s.whitelist.push(user.id);
        await s.save();
        message.reply(`QINGG added ${user.tag} to Whitelist.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
