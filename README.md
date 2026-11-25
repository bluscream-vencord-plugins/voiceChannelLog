# VoiceChannelChatLog

Equicord user plugin: posts local messages in a voice channel's chat when people connect, disconnect, move, mute, deafen, stream, turn their camera on or off, or get muted or deafened by the server.

The messages are local only, like Clyde messages. Nothing is sent to Discord, and nobody else sees them.

## How it differs from the built-in VoiceChannelLog

Equicord's built-in VoiceChannelLog keeps a log you open from the voice channel. This plugin instead writes each event into the voice channel's text chat (or a text channel with the same name in the same category), with message templates you can change.

## Settings

- **Only monitor own channel**: only log events in the voice channel you're in or the channel you're viewing. Servers listed under whitelisted servers are always logged.
- **Trigger on own events**: also log your own events. Only this Discord window counts as "you" for connect, move and disconnect.
- **Event toggles and message templates**: one pair per event. Templates can use `{username}`, `{displayname}`, `{userid}`, `{oldChannelName}`, `{oldChannelId}`, `{newChannelName}`, `{newChannelId}`, `{guildName}`, `{guildId}` and `{now}`.
- **Sender name and icon**: the name and icon shown on the messages. The icon must be an https address, or `{avatar}` for the user's avatar.

## Install

```sh
cd src/userplugins
git clone https://github.com/bluscream-vencord-plugins/voiceChannelLog
```

Rebuild Equicord and enable VoiceChannelChatLog. Update with `git pull`.
