// env
const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../.env'),
});

// nodemailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.nodemailerEmail,
        pass: process.env.nodemailerPass,
    },
});

const punishmentPast = {
    ban: 'banned',
    unban: 'unbanned',
    kick: 'kicked',
    timeout: 'timedout',
    untimeout: 'untimedout',
};

function sendEmailAlert(info) {
    mailOptions = {
        from: process.env.nodemailerEmail,
        to: process.env.nodemailerEmailRecipient,
        subject: `${info.helper.username} has ${
            punishmentPast[info.punishmentType]
        } ${info.user.username}`,
        html: `<table style="border: 1px solid black; border-collapse: collapse; padding: 10px;">
            <tr style="border: 1px solid black; border-collapse: collapse; padding: 10px;">
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Punishment Type</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Helper Username</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Helper Id</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">User Username</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">User Id</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Duration</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Reason</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">DateTime</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">Attachment</td>
            </tr>
            <tr style="border: 1px solid black; border-collapse: collapse; padding: 10px;">
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.punishmentType}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.helper.username}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.helper.id}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.user.username}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.user.id}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.duration}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.reason}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.datetime}</td>
                <td style="border: 1px solid black; border-collapse: collapse; padding: 10px;">${info.attachment}</td>
            </tr>
        </table>`,
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) throw err;
        else console.log('Notification email sent: ' + info.response);
    });
}

// mysql
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.mysqlHost,
    user: process.env.mysqlUser,
    password: process.env.mysqlPass,
    database: process.env.mysqlDatabase,
});

function commitPunishmentToDatabase(info) {
    connection.connect(err => {
        if (err) throw err;
        console.log('Connected to the MySQL server.');

        connection.query(
            `INSERT INTO punishments(PunishmentType, HelperUsername, HelperId, UserUsername, UserId, Duration, Reason, Datetime, Attachment) VALUES ('${info.punishmentType}', '${info.helper.username}', '${info.helper.id}', '${info.user.username}', '${info.user.id}', '${info.duration}', '${info.reason}', '${info.datetime}', '${info.attachment}');`,
            (err, result) => {
                if (err) throw err;
                console.log('Inserted info in database');
            }
        );
    });
}

// discord js
const {
    Client,
    Events,
    GatewayIntentBits,
    InteractionCollector,
    Guild,
    GuildBan,
    ActivityType,
} = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const prefix = '$';

class CommandFormat1 {
    // In server
    // type @user reason
    userid(message) {
        let userid = message.content[1].split('');
        for (let i = 0; i < userid.length; i++) {
            if (
                userid[i] == '<' ||
                userid[i] == '>' ||
                userid[i] == '@' ||
                userid[i] == '!'
            ) {
                delete userid[i];
            }
        }
        return userid.join('');
    }
    reason(message) {
        let reason = message.content[2];
        for (let i = 3; i < message.content.length; i++) {
            reason = reason + ' ' + message.content[i];
        }
        return reason;
    }
    attachment(message) {
        try {
            return message.attachments.first().url;
        } catch {
            return undefined;
        }
    }

    constructor(message) {
        this.punishmentType = message.content[0];
        this.helper = {
            id: message.author.id,
            username:
                message.author.username + '#' + message.author.discriminator,
        };
        this.user = {
            id: this.userid(message),
            username:
                client.users.cache.get(this.userid(message)).username +
                '#' +
                client.users.cache.get(this.userid(message)).discriminator,
        };
        this.reason = this.reason(message);
        this.duration = undefined;
        this.attachment = this.attachment(message);
        this.datetime = new Date(message.createdTimestamp)
            .toJSON()
            .slice(0, 19)
            .replace('T', ' ');
    }
}

class CommandFormat2 {
    // Not in server
    // type id username reason
    reason(message) {
        let reason = message.content[3];
        for (let i = 4; i < message.content.length; i++) {
            reason = reason + ' ' + message.content[i];
        }
        return reason;
    }
    attachment(message) {
        try {
            return message.attachments.first().url;
        } catch {
            return undefined;
        }
    }

    constructor(message) {
        this.punishmentType = message.content[0];
        this.helper = {
            id: message.author.id,
            username:
                message.author.username + '#' + message.author.discriminator,
        };
        this.user = {
            id: message.content[1],
            username: message.content[2],
        };
        this.reason = this.reason(message);
        this.duration = undefined;
        this.attachment = this.attachment(message);
        this.datetime = new Date(message.createdTimestamp)
            .toJSON()
            .slice(0, 19)
            .replace('T', ' ');
    }
}

class CommandFormat3 {
    // In server
    // type @user reason
    userid(message) {
        let userid = message.content[1].split('');
        for (let i = 0; i < userid.length; i++) {
            if (
                userid[i] == '<' ||
                userid[i] == '>' ||
                userid[i] == '@' ||
                userid[i] == '!'
            ) {
                delete userid[i];
            }
        }
        return userid.join('');
    }
    reason(message) {
        let reason = message.content[3];
        for (let i = 4; i < message.content.length; i++) {
            reason = reason + ' ' + message.content[i];
        }
        return reason;
    }
    attachment(message) {
        try {
            return message.attachments.first().url;
        } catch {
            return undefined;
        }
    }
    duration(message) {
        const durationMultiplyer = {
            s: 1_000,
            m: 60_000,
            h: 3_600_000,
            d: 86_400_000,
        };

        let duration = message.content[2].split('');
        duration.pop();

        return (
            Number(duration.join('')) *
            durationMultiplyer[
                message.content[2].split('')[
                    message.content[2].split('').length - 1
                ]
            ]
        );
    }

    constructor(message) {
        this.punishmentType = message.content[0];
        this.helper = {
            id: message.author.id,
            username:
                message.author.username + '#' + message.author.discriminator,
        };
        this.user = {
            id: this.userid(message),
            username:
                client.users.cache.get(this.userid(message)).username +
                '#' +
                client.users.cache.get(this.userid(message)).discriminator,
        };
        this.reason = this.reason(message);
        this.duration = this.duration(message);
        this.attachment = this.attachment(message);
        this.datetime = new Date(message.createdTimestamp)
            .toJSON()
            .slice(0, 19)
            .replace('T', ' ');
    }
}

function checkCommandIsValid(info, client, message) {
    if (!process.env.discordHelperIds.split(' ').includes(message.author.id)) {
        message.reply('You do not have the permissions to use me.');
        return false;
    }
    if (process.env.discordHelperIds.split(' ').includes(info.user.id)) {
        message.reply(
            `You can not ${info.punishmentType} another member of staff.`
        );
        return false;
    }
    if (info.user.id == client.user.id) {
        message.reply(`You can not ${info.punishmentType} me.`);
        return false;
    }
    if (!info.reason) {
        message.reply('You need to add a reason');
        return false;
    }
    return true;
}

// Login to discord application
client.once('ready', () => {
    console.log(`${client.user.username} has successfully logged in!`);

    client.user.setPresence({
        activities: [
            { name: `${prefix}help for help`, type: ActivityType.Listening },
        ],
        status: 'online',
    });
});

// Listen for messages
client.on('messageCreate', async message => {
    if (message.content.split('')[0] != prefix || message.author.bot) return;

    // remove prefix and split command into an array and remove empty string in array
    message.content = message.content
        .slice(1)
        .split(' ')
        .filter(elm => {
            return elm !== '';
        });

    if (message.content[0] === 'ban') {
        let info;
        try {
            info = new CommandFormat1(message);
        } catch {
            message.reply('An error has occured obtaining user info');
            return;
        }

        if (!checkCommandIsValid(info, client, message)) return;

        try {
            message.mentions.members.first().ban({ reason: info.reason });
            message.reply(
                `${punishmentPast[info.punishmentType]} ${
                    info.user.username
                } for ${info.reason}.`
            );
        } catch {
            message.reply(
                `An error has occured ${info.punishmentType + 'ing'} the user`
            );
            return;
        }

        sendEmailAlert(info);
        commitPunishmentToDatabase(info);
    } else if (message.content[0] === 'kick') {
        let info;
        try {
            info = new CommandFormat1(message);
        } catch {
            message.reply('An error has occured obtaining user info');
            return;
        }

        if (!checkCommandIsValid(info, client, message)) return;

        try {
            message.mentions.members.first().kick({ reason: info.reason });
            message.reply(
                `${punishmentPast[info.punishmentType]} ${
                    info.user.username
                } for ${info.reason}.`
            );
        } catch {
            message.reply(
                `An error has occured ${info.punishmentType + 'ing'} the user`
            );
            return;
        }

        sendEmailAlert(info);
        commitPunishmentToDatabase(info);
    } else if (message.content[0] === 'unban') {
        let info;
        try {
            info = new CommandFormat2(message);
        } catch {
            message.reply('An error has occured obtaining user info');
            return;
        }

        if (!checkCommandIsValid(info, client, message)) return;

        try {
            await message.guild.members.unban(info.user.id);
            message.reply(
                `${punishmentPast[info.punishmentType]} ${
                    info.user.username
                } for ${info.reason}.`
            );
        } catch {
            message.reply(
                `An error has occured ${info.punishmentType + 'ing'} the user`
            );
            return;
        }

        sendEmailAlert(info);
        commitPunishmentToDatabase(info);
    } else if (message.content[0] === 'timeout') {
        let info;
        try {
            info = new CommandFormat3(message);
        } catch {
            message.reply('An error has occured obtaining user info');
            return;
        }

        if (!checkCommandIsValid(info, client, message)) return;

        try {
            message.mentions.members
                .first()
                .timeout(info.duration, info.reason);
            message.reply(
                `${punishmentPast[info.punishmentType]} ${
                    info.user.username
                } for ${info.reason}.`
            );
        } catch {
            message.reply(
                `An error has occured ${info.punishmentType + 'ing'} the user`
            );
            return;
        }

        sendEmailAlert(info);
        commitPunishmentToDatabase(info);
    } else if (message.content[0] === 'untimeout') {
        let info;
        try {
            info = new CommandFormat1(message);
        } catch {
            message.reply('An error has occured obtaining user info');
            return;
        }

        if (!checkCommandIsValid(info, client, message)) return;

        try {
            message.mentions.members.first().timeout(1, info.reason);
            message.reply(
                `${info.punishmentType} ${info.user.username} for ${info.reason}.`
            );
        } catch {
            message.reply(
                `An error has occured removing the ${info.punishmentType} on the user`
            );
            return;
        }

        sendEmailAlert(info);
        commitPunishmentToDatabase(info);
    } else if (message.content[0] === 'help') {
        message.reply(
            `
            > **Ban**:\n > \`${prefix}ban 'usermention' 'reason'\` \n > \`${prefix}ban @BabyMole Spamming in general\` \n
            > **Unban**:\n > \`${prefix}unban 'userid' 'username' 'reason'\` \n > \`${prefix}unban 556184736251248659 BabyMole#5476 Mistakenly banned\` \n
            > **Kick**:\n > \`${prefix}kick 'usermention' 'reason'\` \n > \`${prefix}kick @BabyMole Spamming in general\` \n
            > **Timeout**:\n > \`${prefix}timeout 'usermention' 'duration' 'reason'\` \n > \`${prefix}timeout @BabyMole 6d Spamming in general\` \n
            > **UnTimeout**:\n > \`${prefix}untimeout 'usermention' 'reason'\` \n > \`${prefix}untimeout @BabyMole Mistake\`
            `
        );
    } else {
        message.reply('Command not found.');
    }
});

client.login(process.env.discordAuthToken);
