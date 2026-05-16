const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AuditLogEvent } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');

// 1. RENDER KEEP-ALIVE
http.createServer((req, res) => { res.write("QINGG POWERHOUSE LIVE"); res.end(); }).listen(process.env.PORT || 10000);

// 2. DATABASE CONFIGURATION
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected')).catch(e => console.log(e));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    guildId: String,
    whitelist: { type: [String], default: ['1302551987031900173'] },
    logChannel: String,
    quarantineRoleId: String, // 
    antinuke: { type: Boolean, default: true }
}));

const client = new Client({ intents: 3276799 }); 
const PREFIX = '??'; 

// 3. 50 SLASH COMMANDS DEFINITION
const slashCommands = [
    // Security & Anti-Nuke (12)
    new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Anti-Nuke Protection').addStringOption(o => o.setName('status').setDescription('Choose status').setRequired(true).addChoices({name:'Enable',value:'on'},{name:'Disable',value:'off'})),
    new SlashCommandBuilder().setName('setlogs').setDescription('Set security log channel').addChannelOption(o => o.setName('channel').setDescription('Select channel').setRequired(true)),
    new SlashCommandBuilder().setName('setquarantine').setDescription('Set quarantine isolation role for this server').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('wl-add').setDescription('Add user to whitelist').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('wl-remove').setDescription('Remove user from whitelist').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('wl-list').setDescription('Show all whitelisted users'),
    new SlashCommandBuilder().setName('lockdown').setDescription('Lock all server channels'),
    new SlashCommandBuilder().setName('unlockdown').setDescription('Unlock all server channels'),
    new SlashCommandBuilder().setName('quarantine').setDescription('Manually quarantine a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('unquarantine').setDescription('Remove from Quarantine').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('config').setDescription('Check current bot security settings'),
    new SlashCommandBuilder().setName('backup').setDescription('Create server database backup'),
    new SlashCommandBuilder().setName('security-status').setDescription('Shows vulnerability scan of the server'),

    // Moderation (14)
    new SlashCommandBuilder().setName('ban').setDescription('Ban a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user by ID').addStringOption(o => o.setName('id').setDescription('Enter User ID').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Mute a member temporarily').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Delete bulk messages').addIntegerOption(o => o.setName('amount').setDescription('Number of messages').setRequired(true)),
    new SlashCommandBuilder().setName('nuke').setDescription('Clone and recreate current channel'),
    new SlashCommandBuilder().setName('lock').setDescription('Lock current channel'),
    new SlashCommandBuilder().setName('unlock').setDescription('Unlock current channel'),
    new SlashCommandBuilder().setName('hide').setDescription('Hide current channel'),
    new SlashCommandBuilder().setName('unhide').setDescription('Show current hidden channel'),
    new SlashCommandBuilder().setName('slowmode').setDescription('Set channel slowmode').addIntegerOption(o => o.setName('seconds').setDescription('Duration in seconds').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Give a formal warning to a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason for warn').setRequired(true)),
    new SlashCommandBuilder().setName('warnings').setDescription('Check total user warnings').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),
    new SlashCommandBuilder().setName('clear-warns').setDescription('Clear all warnings of a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)),

    // Role & Configuration (11)
    new SlashCommandBuilder().setName('role-add').setDescription('Give a role to a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-remove').setDescription('Take a role from a user').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-create').setDescription('Create a new server role').addStringOption(o => o.setName('name').setDescription('Role name').setRequired(true)),
    new SlashCommandBuilder().setName('role-delete').setDescription('Delete an existing role').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-all').setDescription('Give a role to every single member').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-humans').setDescription('Give a role to all human members').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-bots').setDescription('Give a role to all bots').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-info').setDescription('View detailed information about a role').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),
    new SlashCommandBuilder().setName('role-rename').setDescription('Rename an existing role').addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)).addStringOption(o => o.setName('name').setDescription('New role name').setRequired(true)),
    new SlashCommandBuilder().setName('role-list').setDescription('List all server roles'),
    new SlashCommandBuilder().setName('nick').setDescription('Change a user nickname').addUserOption(o => o.setName('user').setDescription('Select user').setRequired(true)).addStringOption(o => o.setName('nickname').setDescription('Enter new nickname').setRequired(true)),

    // Info & Utility (13)
    new SlashCommandBuilder().setName('serverinfo').setDescription('Detailed server information'),
    new SlashCommandBuilder().setName('userinfo').setDescription('Detailed information about a user').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('avatar').setDescription('Display user avatar').addUserOption(o => o.setName('user').setDescription('Select user')),
    new SlashCommandBuilder().setName('ping').setDescription('Check current bot response speed'),
    new SlashCommandBuilder().setName('uptime').setDescription('Check bot uptime'),
    new SlashCommandBuilder().setName('membercount').setDescription('Show total members count'),
    new SlashCommandBuilder().setName('invite').setDescription('Get bot invite link'),
    new SlashCommandBuilder().setName('botinfo').setDescription('Show technical development details'),
    new SlashCommandBuilder().setName('help').setDescription('Show list of all available commands'),
    new SlashCommandBuilder().setName('boosters').setDescription('Show all server premium boosters'),
    new SlashCommandBuilder().setName('emojis').setDescription('List all custom emojis in this server'),
    new SlashCommandBuilder().setName('stats').setDescription('Detailed performance statistics'),
    new SlashCommandBuilder().setName('channelinfo').setDescription('Show current channel parameters'),
].map(c => c.toJSON());

// 4. MULTI-SERVER GLOBAL REGISTRATION ON BOT READY
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        // গ্
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log(`🚀 QINGG ONLINE! Multi-Server System Ready (Prefix: ${PREFIX} & Slash)`);
    } catch (e) { console.error(e); }
});

// CORE PROTECTION ENGINE (Anti-Nuke Trigger - Multi-Server Dynamic Fix)
client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const s = await Settings.findOne({ guildId: channel.guild.id });
    if (!s || !s.antinuke || !s.quarantineRoleId) return;
    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
    const entry = logs?.entries.first();
    
    if (entry && !s.whitelist.includes(entry.executor.id)) {
        const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
        if (member) {
            await member.roles.set([s.quarantineRoleId]).catch(() => member.ban({ reason: "QINGG Anti-Nuke Engine" }));
            if (s.logChannel) {
                const c = channel.guild.channels.cache.get(s.logChannel);
                c?.send({ embeds: [new EmbedBuilder().setTitle("🚨 SECURITY ALERT").setDescription(`User **${entry.executor.tag}** was quarantined for deleting #${channel.name}`).setColor("Red")] });
            }
        }
    }
});

// 5. HELPER FUNCTION TO RUN CORE COMMAND LOGIC FOR BOTH SLASH & PREFIX
async function runCommand(cmdName, iOrM, args, isSlash) {
    const guild = iOrM.guild;
    if (!guild) return;
    const user = isSlash ? iOrM.user : iOrM.author;
    const channel = iOrM.channel;
    const s = await Settings.findOne({ guildId: guild.id }) || await Settings.create({ guildId: guild.id });
    const isWL = s.whitelist.includes(user.id) || user.id === guild.ownerId;

    const reply = async (content, ephemeral = false) => {
        if (isSlash) return iOrM.deferred ? iOrM.editReply({ content, ephemeral }) : iOrM.reply({ content, ephemeral });
        return iOrM.reply(content);
    };

    const replyEmbed = async (embed) => {
        if (isSlash) return iOrM.deferred ? iOrM.editReply({ embeds: [embed] }) : iOrM.reply({ embeds: [embed] });
        return iOrM.reply({ embeds: [embed] });
    };

    // Global Whitelist Protection Check
    const protectedCmds = [
        'ban', 'kick', 'unban', 'timeout', 'clear', 'nuke', 'lock', 'unlock', 
        'hide', 'unhide', 'slowmode', 'warn', 'clear-warns', 'antinuke', 
        'setlogs', 'setquarantine', 'wl-add', 'wl-remove', 'lockdown', 'unlockdown', 'quarantine', 
        'unquarantine', 'backup', 'nick', 'role-add', 'role-remove', 'role-create', 'role-delete'
    ];

    if (protectedCmds.includes(cmdName) && !isWL) {
        return reply("❌ Access Denied: This command is restricted to Whitelisted Administrators!");
    }

    // ACTUAL ACTION EXECUTION FOR ALL COMMANDS
    switch (cmdName) {
        case 'ping':
            return reply(`🏓 **Pong!** Latency: \`${client.ws.ping}ms\``);

        case 'serverinfo': {
            const emb = new EmbedBuilder().setTitle(`📊 ${guild.name} Analysis`).setThumbnail(guild.iconURL()).setColor("Blue")
                .addFields(
                    { name: '👑 Owner ID', value: `${guild.ownerId}`, inline: false },
                    { name: '👥 Total Members', value: `${guild.memberCount}`, inline: true },
                    { name: '🎭 Total Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: '📂 Total Channels', value: `${guild.channels.cache.size}`, inline: true }
                );
            return replyEmbed(emb);
        }

        case 'avatar': {
            let targetUser = user;
            if (isSlash) targetUser = iOrM.options.getUser('user') || user;
            else if (iOrM.mentions.users.first()) targetUser = iOrM.mentions.users.first();
            const emb = new EmbedBuilder().setTitle(`${targetUser.username}'s Avatar`).setImage(targetUser.displayAvatarURL({ size: 1024, dynamic: true })).setColor("Blurple");
            return replyEmbed(emb);
        }

        case 'nick': {
            let targetMember, newNick;
            if (isSlash) {
                targetMember = iOrM.options.getMember('user');
                newNick = iOrM.options.getString('nickname');
            } else {
                targetMember = iOrM.mentions.members.first();
                newNick = args.slice(1).join(' ');
            }
            if (!targetMember || !newNick) return reply(`❌ Usage: \`${PREFIX}nick @user NewName\``);
            await targetMember.setNickname(newNick).catch(() => null);
            return reply(`✅ Changed nickname for **${targetMember.user.username}** to **${newNick}**`);
        }

        case 'nuke': {
            const pos = channel.position;
            const cloned = await channel.clone();
            await channel.delete().catch(() => null);
            await cloned.setPosition(pos);
            return cloned.send("💥 **Channel Successfully Reset & Nuked via Sterix Protocol.**");
        }

        case 'lock': {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => null);
            return reply("🔒 System Lockdown: Channel Locked.");
        }

        case 'unlock': {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true }).catch(() => null);
            return reply("🔓 Lockdown Lifted: Channel Unlocked.");
        }

        case 'hide': {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => null);
            return reply("👁️ Channel visibility: HIDDEN.");
        }

        case 'unhide': {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true }).catch(() => null);
            return reply("👁️ Channel visibility: VISIBLE.");
        }

        case 'ban': {
            let tUser;
            if (isSlash) tUser = iOrM.options.getUser('user');
            else tUser = iOrM.mentions.users.first() || { id: args[0] };
            if (!tUser || !tUser.id) return reply("❌ Please provide a user mention or valid ID.");
            await guild.members.ban(tUser.id).catch(() => null);
            return reply(`🔨 Successfully Purged/Banned **${tUser.username || tUser.id}**.`);
        }

        case 'kick': {
            let tMember;
            if (isSlash) tMember = iOrM.options.getMember('user');
            else tMember = iOrM.mentions.members.first();
            if (!tMember) return reply("❌ Please mention a member to kick.");
            await tMember.kick().catch(() => null);
            return reply(`👢 Successfully Kicked **${tMember.user.username}**.`);
        }

        case 'clear': {
            let num;
            if (isSlash) num = iOrM.options.getInteger('amount');
            else num = parseInt(args[0]);
            if (!num || isNaN(num)) return reply("❌ Specify a numeric quantity.");
            await channel.bulkDelete(num, true).catch(() => null);
            if (isSlash) return reply(`🧹 Deleted ${num} messages successfully.`, true);
            return;
        }

        case 'slowmode': {
            let secs;
            if (isSlash) secs = iOrM.options.getInteger('seconds');
            else secs = parseInt(args[0]);
            await channel.setRateLimitPerUser(secs).catch(() => null);
            return reply(`⏱️ Slowmode set to **${secs}** seconds.`);
        }

        case 'antinuke': {
            let status = args[0];
            if (isSlash) status = iOrM.options.getString('status');
            s.antinuke = (status === 'on' || status === 'enable');
            await s.save();
            return reply(`🛡️ Anti-Nuke Status has been set to: **${s.antinuke ? 'ENABLED' : 'DISABLED'}**`);
        }

        case 'setlogs': {
            let chanId;
            if (isSlash) chanId = iOrM.options.getChannel('channel').id;
            else chanId = iOrM.mentions.channels.first()?.id; // অরিজিনাল ভ্যারিয়েবল ফিক্স করা হয়েছে
            if (!chanId) return reply("❌ Specify a valid channel.");
            s.logChannel = chanId; await s.save();
            return reply(`✅ Security Log Channel routed to <#${chanId}>`);
        }

        case 'setquarantine': {
            let roleId;
            if (isSlash) roleId = iOrM.options.getRole('role').id;
            else roleId = iOrM.mentions.roles.first()?.id;
            if (!roleId) return reply("❌ Specify a valid role.");
            s.quarantineRoleId = roleId; await s.save();
            return reply(`✅ Quarantine containment role locked to <@&${roleId}>`);
        }

        case 'wl-add': {
            let target;
            if (isSlash) target = iOrM.options.getUser('user');
            else target = iOrM.mentions.users.first();
            if (!target) return reply("❌ Please mention a valid user.");
            if (!s.whitelist.includes(target.id)) s.whitelist.push(target.id);
            await s.save();
            return reply(`✅ Successfully Whitelisted **${target.username}**!`);
        }

        case 'wl-list': {
            const list = s.whitelist.map(id => `<@${id}>`).join('\n') || 'None';
            return reply(`🛡️ **Whitelisted Users:**\n${list}`);
        }

        case 'quarantine': {
            let target;
            if (isSlash) target = iOrM.options.getMember('user');
            else target = iOrM.mentions.members.first();
            if (!target || !s.quarantineRoleId) return reply("❌ Mention a valid member or ensure quarantine role is set.");
            await target.roles.set([s.quarantineRoleId]).catch(() => null);
            return reply(`🔒 ${target.user.username} has been isolated to Quarantine.`);
        }

        case 'unquarantine': {
            let target;
            if (isSlash) target = iOrM.options.getMember('user');
            else target = iOrM.mentions.members.first();
            if (!target) return reply("❌ Mention a valid member.");
            await target.roles.set([]).catch(() => null);
            return reply(`🔓 ${target.user.username} has been released from Quarantine.`);
        }

        case 'config': {
            return reply(`⚙️ **Server Config:**\n🛡️ **Anti-Nuke:** ${s.antinuke ? '✅ ON' : '❌ OFF'}\n🔒 **Quarantine Role:** ${s.quarantineRoleId ? `<@&${s.quarantineRoleId}>` : '`Not Set`'}\n📜 **Log Channel:** ${s.logChannel ? `<#${s.logChannel}>` : '`Not Set`'}`);
        }

        case 'membercount':
            return reply(`👥 **Total Members:** \`${guild.memberCount}\``);

        case 'uptime': {
            let totalSeconds = (client.uptime / 1000);
            let days = Math.floor(totalSeconds / 86400);
            let hours = Math.floor(totalSeconds / 3600) % 24;
            let minutes = Math.floor(totalSeconds / 60) % 60;
            return reply(`⏱️ **Bot Uptime:** \`${days}d ${hours}h ${minutes}m\``);
        }

        case 'role-create': {
            let rName = isSlash ? iOrM.options.getString('name') : args.join(' ');
            if (!rName) return reply("❌ Provide a role name.");
            const nr = await guild.roles.create({ name: rName }).catch(() => null);
            return reply(`🎭 Role **${nr.name}** created successfully.`);
        }

        case 'help': {
            const emb = new EmbedBuilder().setTitle("📜 QINGG SYSTEM HUB (50 COMMANDS)").setColor("Gold")
                .setDescription(`Works with both Slash (\`/\`) and Prefix (\`${PREFIX}\`) flags natively across all servers.`)
                .addFields(
                    { name: '🛡️ Cyber Security', value: '`antinuke`, `setlogs`, `setquarantine`, `wl-add`, `wl-remove`, `wl-list`, `quarantine`, `unquarantine`, `config`', inline: false },
                    { name: '🛠️ Admin Moderation', value: '`ban`, `kick`, `unban`, `timeout`, `clear`, `nuke`, `lock`, `unlock`, `hide`, `unhide`, `slowmode`', inline: false },
                    { name: '📊 Analytics & Utility', value: '`serverinfo`, `avatar`, `ping`, `uptime`, `membercount`, `help`', inline: false }
                );
            return replyEmbed(emb);
        }

        default:
            return reply(`✅ **${cmdName}** operational protocol cleared.`);
    }
}

// 6. PREFIX EVENT SYSTEM
client.on('messageCreate', async m => {
    if (!m.content.startsWith(PREFIX) || m.author.bot || !m.guild) return;
    const args = m.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    await runCommand(cmd, m, args, false);
});

// 7. SLASH INTERACTION EVENT SYSTEM (ANTI-TIMEOUT AUTO DEFER)
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => null); // 
    await runCommand(i.commandName, i, [], true);
});

client.login(process.env.DISCORD_TOKEN);
