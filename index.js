const http = require('http');
const { Client, GatewayIntentBits, PermissionsBitField, AuditLogEvent, REST, Routes, SlashCommandBuilder } = require('discord.js');

// 1. Keep-Alive for Render
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

// 2. Settings
let PREFIX = '??'; 
let WHITELIST = ['1302551987031900173']; 
let ANTINUKE_ENABLED = true;
const QUARANTINE_ROLE_ID = '1504790298377584650'; 

// 3. Command Definition for Slash
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot speed'),
  new SlashCommandBuilder().setName('wl-add').setDescription('Whitelist a user').addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)),
  new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Anti-Nuke').addStringOption(o => o.setName('status').setDescription('on/off').setRequired(true)),
  new SlashCommandBuilder().setName('jail').setDescription('Jail someone').addUserOption(o => o.setName('target').setDescription('The target').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban someone').addUserOption(o => o.setName('target').setDescription('The target').setRequired(true)),
  new SlashCommandBuilder().setName('say').setDescription('Bot speaks').addStringOption(o => o.setName('text').setDescription('The message').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// 4. Register Slash Commands Instantly
client.once('ready', async () => {
  try {
    console.log(`Bot Online: ${client.user.tag}`);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash Commands registered globally!');
  } catch (err) { console.error(err); }
});

// 5. Shared Logics (Function for Jail/Ban)
async function performAction(action, target, messageOrInteraction) {
  if (action === 'jail') {
    await target.roles.set([QUARANTINE_ROLE_ID]);
    return "User Jailed!";
  }
  if (action === 'ban') {
    await target.ban();
    return "User Banned!";
  }
}

// 6. Slash Command Logic (/)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const isWL = WHITELIST.includes(interaction.user.id);
  const { commandName } = interaction;

  if (commandName === 'ping') return interaction.reply(`Latency: ${client.ws.ping}ms`);
  if (!isWL) return interaction.reply({ content: "No Permission!", ephemeral: true });

  if (commandName === 'wl-add') {
    const user = interaction.options.getUser('user');
    WHITELIST.push(user.id);
    await interaction.reply(`${user.tag} whitelisted!`);
  } else if (commandName === 'antinuke') {
    ANTINUKE_ENABLED = interaction.options.getString('status') === 'on';
    await interaction.reply(`Anti-Nuke: ${ANTINUKE_ENABLED}`);
  } else if (commandName === 'jail' || commandName === 'ban') {
    const target = interaction.options.getMember('target');
    const res = await performAction(commandName, target, interaction);
    await interaction.reply(res);
  } else if (commandName === 'say') {
    await interaction.channel.send(interaction.options.getString('text'));
    await interaction.reply({ content: "Done", ephemeral: true });
  }
});

// 7. Prefix Command Logic (??)
client.on('messageCreate', async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const isWL = WHITELIST.includes(message.author.id);

  if (cmd === 'ping') return message.reply(`Speed: ${client.ws.ping}ms`);
  if (!isWL) return;

  if (cmd === 'jail' || cmd === 'ban') {
    const target = message.mentions.members.first();
    if (target) {
      const res = await performAction(cmd, target);
      message.reply(res);
    }
  } else if (cmd === 'say') {
    message.delete();
    message.channel.send(args.join(' '));
  } else if (cmd === 'antinuke') {
    ANTINUKE_ENABLED = args[0] === 'on';
    message.reply(`Anti-Nuke: ${ANTINUKE_ENABLED}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
